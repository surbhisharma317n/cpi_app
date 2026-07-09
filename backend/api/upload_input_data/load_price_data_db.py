from .master_data_paths import *

# 1. Urban Market item, 2. Urban Online, 3. Urban Airfare, 4. Urban Electricity,  5. Urban PDS
# 6. Urban HR, 7. Rural Market Item, 8. Rural Electricity, 9. Rural HR 
# 10. petrol,  11. diesel,  12. LPG,  13. CNG,  14. PNG
# 15. Telecom
def get_curr_month_prices(data_type):
    print("Test")
    if data_type == 1:
        df = pd.read_parquet(mkt_urban_price_validated_data_path)
    elif data_type == 2:
        df = pd.read_parquet(mkt_rural_price_validated_data_path)
    elif data_type == 3:
        df = pd.read_parquet(mkt_online_urban_validated_data_path)
    elif data_type == 4:
        df = pd.read_parquet(airfare_urban_validated_data_path)
    elif data_type == 5:
        df = pd.read_parquet(elect_urban_price_validated_data_path)
    elif data_type == 6:
        df = pd.read_parquet(elect_rural_price_validated_data_path)
    elif data_type == 7:
        df = pd.read_parquet(hr_urban_price_validated_data_path)
    elif data_type == 8:
        df = pd.read_parquet(hr_rural_price_validated_data_path)
    elif data_type == 9:
        df = pd.read_parquet(pds_price_validated_data_path)
    elif data_type == 10:
        df = pd.read_parquet(petrol_price_validated_data_path)
    elif data_type == 11:
        df = pd.read_parquet(diesel_price_validated_data_path)
    elif data_type == 12:
        df = pd.read_parquet(lpg_price_validated_data_path)
    elif data_type == 13:
        df = pd.read_parquet(cng_price_validated_data_path)
    elif data_type == 14:
        df = pd.read_parquet(png_price_validated_data_path)
    elif data_type == 15:
        df = pd.read_parquet(telecom_prices_validated_data_path)
    elif data_type == 16:
        df = pd.read_parquet(railfare_prices_validated_data_path)
    elif data_type == 17:
        df = pd.read_parquet(metro_prices_validated_data_path)
    elif data_type == 18:
        df = pd.read_parquet(ott_prices_validated_data_path)
    elif data_type == 19:
        df = pd.read_parquet(postal_prices_validated_data_path)
    else:
        print("Invalid data_type Code")
        return None  
    df = df[(df.price_month_year == price_data_month_year) &
            (df.price_data_status == price_data_status)]
    
    return df
    
def get_prev_month_prices(data_type):
    if data_type == 1:
        df = pd.read_parquet(mkt_urban_price_db_final)
    elif data_type == 2:
        df = pd.read_parquet(mkt_rural_price_db_final)
    elif data_type == 3:
        df = pd.read_parquet(mkt_online_urban_price_db_final)
    elif data_type == 4:
        df = pd.read_parquet(airfare_urban_price_db_final)
    elif data_type == 5:
        df = pd.read_parquet(elect_urban_price_db_final)
    elif data_type == 6:
        df = pd.read_parquet(elect_rural_price_db_final)
    elif data_type == 7:
        df = pd.read_parquet(hr_urban_price_db_final)
    elif data_type == 8:
        df = pd.read_parquet(hr_rural_price_db_final)
    elif data_type == 9:
        df = pd.read_parquet(pds_price_db_final)
    elif data_type == 10:
        df = pd.read_parquet(petrol_price_db_final)
    elif data_type == 11:
        df = pd.read_parquet(diesel_price_db_final)
    elif data_type == 12:
        df = pd.read_parquet(lpg_price_db_final)
    elif data_type == 13:
        df = pd.read_parquet(cng_price_db_final)
    elif data_type == 14:
        df = pd.read_parquet(png_price_db_final)
    elif data_type == 15:
        df = pd.read_parquet(telecom_prices_db_final)
    elif data_type == 16:
        df = pd.read_parquet(railfare_prices_db_final)
    elif data_type == 17:
        df = pd.read_parquet(metro_prices_db_final)
    elif data_type == 18:
        df = pd.read_parquet(ott_prices_db_final)
    elif data_type == 19:
        df = pd.read_parquet(postal_prices_db_final)
    else:
        print("Invalid data_type Code")
        return None
    
    df = df[(df.price_month_year == prev_month) &
            (df.price_data_status == "F")]
    return df
