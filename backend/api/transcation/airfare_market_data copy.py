import pandas as pd
import numpy as np
import traceback
from datetime import datetime

from api.capi_api.capi_utils import master_data_save_to_table
from api.utils import db_connection


def process_airfare_item_data(market_table):
    try:
        # ----------------------------------------------------
        # 1. Connect to databases
        # ----------------------------------------------------
        master_engine = db_connection.get_engine("master_db2")
        item_price_engine = db_connection.get_engine("item_prices_db")

        # ----------------------------------------------------
        # 2. Load data
        # ----------------------------------------------------
        master_data = pd.read_sql("SELECT * FROM vw_market_master", master_engine)
        item_view_master = pd.read_sql("SELECT * FROM item_view", master_engine)
        airfare_data = pd.read_sql(f"SELECT * FROM {market_table}", item_price_engine)

        print(f"✅ Loaded: master={len(master_data)}, item_view={len(item_view_master)}, airfare={len(airfare_data)}")

        # ----------------------------------------------------
        # 3. Validate essential columns
        # ----------------------------------------------------
        required_cols = [
            "state_code", "district_code", "town_code", "item_code", 
            "item_price", "spcl_code", "price_month", "price_year",
            "remarks", "week", "price_date", "journey_date"
        ]
        missing_cols = [c for c in required_cols if c not in airfare_data.columns]
        if missing_cols:
            raise KeyError(f"Missing required columns in {market_table}: {missing_cols}")

        # ----------------------------------------------------
        # 4. Normalize codes
        # ----------------------------------------------------
        for col, width in [("state_code", 2), ("district_code", 3), ("town_code", 6)]:
            airfare_data[col] = airfare_data[col].astype(str).str.zfill(width)

        master_data["nss_state_code"] = master_data["nss_state_code"].astype(str).str.zfill(2)
        master_data["nss_district_code"] = master_data["nss_district_code"].astype(str).str.zfill(3)
        master_data["nss_town_code"] = master_data["nss_town_code"].astype(str).str.zfill(6)

        master_data.rename(columns={
            "nss_state_code": "state_code",
            "nss_district_code": "district_code",
            "nss_town_code": "town_code"
        }, inplace=True)

        # ----------------------------------------------------
        # 5. Merge to get market_id
        # ----------------------------------------------------
        mapped_data = pd.merge(
            airfare_data,
            master_data[["market_id", "state_code", "district_code", "town_code"]],
            how="inner",
            on=["state_code", "district_code", "town_code"]
        )

        print(f"✅ Mapped market_id: {len(mapped_data)} rows")

        # ----------------------------------------------------
        # 6. Build item_code in item_view_master
        # ----------------------------------------------------
        item_view_master["priced_item_code"] = (
            item_view_master["priced_item_code"].astype(str).str.strip().str.lstrip("0")
        )
        item_view_master["item_code"] = (
            item_view_master["group_code"].astype(str).str.strip() + "." +
            item_view_master["category_code"].astype(str).str.strip() + "." +
            item_view_master["subgroup_code"].astype(str).str.strip() + "." +
            item_view_master["section_code"].astype(str).str.strip() + "." +
            item_view_master["gs_code"].astype(str).str.strip() + "." +
            item_view_master["weighted_item_code"].astype(str).str.strip() + "." +
            item_view_master["priced_item_code"].astype(str).str.strip()
        )

        # ----------------------------------------------------
        # 7. Merge with item master to get pitem_id
        # ----------------------------------------------------
        
        print(f"Mapping with item_view_master on item_code...",mapped_data.columns)
        final_merge = pd.merge(
            mapped_data,
            item_view_master[["pitem_id", "item_code"]],
            how="inner",
            on="item_code"
        )

        print(f"✅ Final merged data: {len(final_merge)} rows")

        # ----------------------------------------------------
        # 8. Clean and prepare final dataframe for insert
        # ----------------------------------------------------
        final_merge["price_date"] = pd.to_datetime(final_merge["price_date"], errors="coerce")
        final_merge["journey_date"] = pd.to_datetime(final_merge["journey_date"], errors="coerce")

        # Rename columns to match trans_airfare schema
        final_merge.rename(columns={
            "price_month": "month",
            "week": "price_week_no",
            "spcl_code": "spcl_id",
            "item_price": "price",
            "remarks": "price_remarks"
        }, inplace=True)

        final_columns = [
            "month", "price_week_no", "price_date", "journey_date",
            "market_id", "pitem_id", "price", "spcl_id",
            "price_remarks"
        ]

        # Fill optional columns
        final_merge["channel_id"] = np.nan
        final_merge["spf_id"] = np.nan
        final_merge["is_active"] = True

        final_data = final_merge[final_columns + ["channel_id", "spf_id", "is_active"]]

        print(f"✅ Prepared {len(final_data)} records for insertion")

        # ----------------------------------------------------
        # 9. Convert to records and insert
        # ----------------------------------------------------
        column_mapping = {
            "month": "month",
            "price_week_no": "price_week_no",
            "price_date": "price_date",
            "journey_date": "journey_date",
            "market_id": "market_id",
            "pitem_id": "pitem_id",
            "price": "price",
            "spcl_id": "spcl_id",
            "channel_id": "channel_id",
            "spf_id": "spf_id",
            "price_remarks": "price_remarks",
            "is_active": "is_active",
        }

        # Convert to dictionary
        records = final_data.to_dict(orient="records")

        # ✅ Uncomment to save to DB
        # master_data_save_to_table(records, column_mapping, "trans_airfare")

        return {"status": "success", "rows_written": len(records)}

    except KeyError as ke:
        print("❌ Missing Key Error:", str(ke))
        return {"status": "error", "message": f"Missing key: {ke}"}

    except pd.errors.DatabaseError as db_err:
        print("❌ Database error:", str(db_err))
        return {"status": "error", "message": f"Database error: {db_err}"}

    except Exception as e:
        print("❌ Unexpected Error:", str(e))
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

    finally:
        # Explicitly close DB connections
        try:
            master_engine.dispose()
            item_price_engine.dispose()
        except Exception:
            pass
