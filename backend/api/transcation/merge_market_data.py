import pandas as pd
import numpy as np

from api.capi_api.capi_utils import master_data_save_to_table
from api.utils import db_connection
# from . import db_connection

def process_market_item_data(market_table):
    try:
        # Connect to databases
        master_engine = db_connection.get_engine("master_db2")
        item_price_engine = db_connection.get_engine("item_prices_db")

        # Load views
        master_data = pd.read_sql("SELECT * FROM vw_market_master", master_engine)
        item_view_master = pd.read_sql("SELECT * FROM item_view", master_engine)
        rural_prices = pd.read_sql(f"SELECT * FROM {market_table}", item_price_engine)
        
        print(f"Master rows: {len(master_data)}, Item View rows: {len(item_view_master)}, Rural Prices rows: {len(rural_prices)}")

        # Normalize code formats
        for col in ["nss_state_code", "nss_district_code", "nss_village_code"]:
            master_data[col] = master_data[col].astype(str).str.zfill(6 if 'village' in col else 2)
        for col in ["state_code", "district_code", "village_code"]:
            rural_prices[col] = rural_prices[col].astype(str).str.zfill(6 if 'village' in col else 2)

        master_data.rename(columns={
            'nss_state_code': 'state_code',
            'nss_district_code': 'district_code',
            'nss_village_code': 'village_code'
        }, inplace=True)

        # Merge for mapping
        mapping = rural_prices.merge(master_data, how='inner',
                                     on=['state_code', 'district_code', 'village_code'])
        mapping = mapping[['market_id', 'item_code', 'item_price', 'spcl_code', 'price_month', 'price_year', 'remarks', 'week']]
        print(f"Mapping rows: {mapping}")
        # Build item_code
        item_view_master['priced_item_code'] = item_view_master['priced_item_code'].astype(str).str.strip().str.lstrip('0')
        item_view_master['item_code'] = (
            item_view_master['group_code'].astype(str).str.strip() + '.' +
            item_view_master['category_code'].astype(str).str.strip() + '.' +
            item_view_master['subgroup_code'].astype(str).str.strip() + '.' +
            item_view_master['section_code'].astype(str).str.strip() + '.' +
            item_view_master['gs_code'].astype(str).str.strip() + '.' +
            item_view_master['weighted_item_code'].astype(str).str.strip() + '.' +
            item_view_master['priced_item_code'].astype(str).str.strip()
        )

        # Final merge
        print(f"Item View rows before merge: {len(item_view_master)}")
        final_data = item_view_master.merge(mapping, how='inner', on='item_code')
        final_data = final_data[['market_id', 'pitem_id', 'item_price',
                                 'spcl_code', 'price_month', 'price_year', 'remarks', 'week']]
        print(f"Final data rows: {len(final_data)}", final_data['price_month'].dtype)
        column_mapping = {
            "market_id": "market_id",
            "pitem_id": "pitem_id",
            "item_price": "price",
            # "spcl_code": "spcl_code", #spcl_id #channel_id #spf_id
            "price_month": "month",
            "price_year": "year",
            "remarks": "price_remark",
            "week": "price_week",
                        }
        records = final_data.to_dict(orient="records")
        print(f"Prepared {len(records)} records for insertion.")
        # Save to DB
        # final_data.to_sql('market_item_prices', master_engine, if_exists='append', index=False)
        # master_data_save_to_table(records, column_mapping, 'trans_market_item_price')
        # master_data_save_to_table(records, column_mapping, 'trans_airfare_price')
        return {"status": "success", "rows_written": len(records)}

    except Exception as e:
        return {"status": "error", "message": str(e)}
