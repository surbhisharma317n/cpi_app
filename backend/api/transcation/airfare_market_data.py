import pandas as pd
import numpy as np
import traceback
import logging

from api.capi_api.capi_utils import master_data_save_to_table
from api.utils import db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def process_airfare_item_data(market_table):
    """
    Process airfare market price data, validate codes, join with master tables, 
    and prepare records for insertion into transaction tables.
    """
    try:
        logging.info("Starting airfare data processing...")

        # ---------------------------
        # 1️⃣ Database Connections
        # ---------------------------
        try:
            master_engine = db_connection.get_engine("master_db2")
            item_price_engine = db_connection.get_engine("item_prices_db")
        except Exception as db_err:
            logging.error("Database connection failed: %s", db_err)
            return {"status": "error", "message": f"DB connection failed: {db_err}"}

        # ---------------------------
        # 2️⃣ Load Source Tables
        # ---------------------------
        try:
            master_data = pd.read_sql("SELECT * FROM vw_market_master", master_engine)
            item_view_master = pd.read_sql("SELECT * FROM item_view", master_engine)
            rural_prices = pd.read_sql(f"SELECT * FROM {market_table}", item_price_engine)
        except Exception as load_err:
            logging.error("Error loading data: %s", load_err)
            return {"status": "error", "message": f"Error loading data: {load_err}"}

        logging.info(f"Loaded rows — Market Master: {len(master_data)}, "
                     f"Item View: {len(item_view_master)}, Rural Prices: {len(rural_prices)}")

        if master_data.empty or item_view_master.empty or rural_prices.empty:
            return {"status": "error", "message": "One or more required datasets are empty."}

        # ---------------------------
        # 3️⃣ Normalize Code Formats
        # ---------------------------
        try:
            # Master data codes
            for col in ["nss_state_code", "nss_district_code", "nss_village_code"]:
                if col in master_data.columns:
                    master_data[col] = master_data[col].astype(str).str.zfill(6 if 'village' in col else 2)

            # Rural prices codes
            for col in ["state_code", "district_code", "village_code", "town_code"]:
                if col in rural_prices.columns:
                    rural_prices[col] = rural_prices[col].astype(str).str.zfill(6 if 'village' in col else 2)

            # Standardize master_data column names
            rename_cols = {
                'nss_state_code': 'state_code',
                'nss_district_code': 'district_code',
                'nss_village_code': 'village_code'
            }
            master_data.rename(columns=rename_cols, inplace=True)
        except Exception as norm_err:
            logging.error("Error normalizing code formats: %s", norm_err)
            return {"status": "error", "message": f"Normalization error: {norm_err}"}

        # ---------------------------
        # 4️⃣ Merge for Market Mapping
        # ---------------------------
        try:
            # Determine merge keys dynamically
            merge_keys = ['state_code', 'district_code']
            if 'village_code' in rural_prices.columns and 'village_code' in master_data.columns:
                merge_keys.append('village_code')
            elif 'town_code' in rural_prices.columns and 'town_code' in master_data.columns:
                merge_keys.append('town_code')

            logging.info(f"Merging on columns: {merge_keys}")
            mapping = rural_prices.merge(master_data, how='inner', on=merge_keys)

            mapping = mapping[['market_id', 'item_code', 'item_price', 'spcl_code', 
                               'price_month', 'price_year', 'remarks', 'week']]
            logging.info(f"Mapping rows after merge: {len(mapping)}")
        except Exception as merge_err:
            logging.error("Error merging mapping data: %s", merge_err)
            return {"status": "error", "message": f"Mapping merge error: {merge_err}"}

        # ---------------------------
        # 5️⃣ Build Composite Item Code
        # ---------------------------
        try:
            item_view_master['priced_item_code'] = (
                item_view_master['priced_item_code']
                .astype(str).str.strip().str.lstrip('0')
            )

            item_view_master['item_code'] = (
                item_view_master['group_code'].astype(str).str.strip() + '.' +
                item_view_master['category_code'].astype(str).str.strip() + '.' +
                item_view_master['subgroup_code'].astype(str).str.strip() + '.' +
                item_view_master['section_code'].astype(str).str.strip() + '.' +
                item_view_master['gs_code'].astype(str).str.strip() + '.' +
                item_view_master['weighted_item_code'].astype(str).str.strip() + '.' +
                item_view_master['priced_item_code'].astype(str).str.strip()
            )
        except KeyError as key_err:
            logging.error("Missing column in item_view_master: %s", key_err)
            return {"status": "error", "message": f"Missing column: {key_err}"}
        except Exception as build_err:
            logging.error("Error building item_code: %s", build_err)
            return {"status": "error", "message": f"Item code build error: {build_err}"}

        # ---------------------------
        # 6️⃣ Final Merge and Validation
        # ---------------------------
        try:
            final_data = item_view_master.merge(mapping, how='inner', on='item_code')
            final_data = final_data[['market_id', 'pitem_id', 'item_price',
                                     'spcl_code', 'price_month', 'price_year', 'remarks', 'week']]
            logging.info(f"Final merged rows: {len(final_data)}")
        except Exception as final_merge_err:
            logging.error("Error merging final data: %s", final_merge_err)
            return {"status": "error", "message": f"Final merge error: {final_merge_err}"}

        # ---------------------------
        # 7️⃣ Prepare for Database Save
        # ---------------------------
        column_mapping = {
            "market_id": "market_id",
            "pitem_id": "pitem_id",
            "item_price": "price",
            "price_month": "month",
            "price_year": "year",
            "remarks": "price_remark",
            "week": "price_week"
        }

        try:
            records = final_data.to_dict(orient="records")
            logging.info(f"Prepared {len(records)} records for insertion.")
            
            if not records:
                return {"status": "warning", "message": "No valid records to insert."}

            # Uncomment to save data
            # master_data_save_to_table(records, column_mapping, 'trans_airfare_price')

        except Exception as save_err:
            logging.error("Error preparing or saving records: %s", save_err)
            return {"status": "error", "message": f"Save operation failed: {save_err}"}

        logging.info("Airfare item data processing completed successfully.")
        return {"status": "success", "rows_written": len(records)}

    except Exception as e:
        logging.critical("Unexpected failure: %s\n%s", e, traceback.format_exc())
        return {"status": "error", "message": str(e)}
