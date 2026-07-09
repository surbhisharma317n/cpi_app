from operator import index

# import only uploaded and validated variable names from master_func.py
from .master_func import *
from .load_price_data_db import get_prev_month_prices

def load_rural_mkt_price_data():
    try:
        # Read the uploaded price data file and validate
        rural_mkt_uploaded_data, r1, r2 = load_mkt_item_price_data(mkt_offline_rural_uploaded_data_path, rural_sector_id, channel_id=1)
        print(r1, r2)
        
        return rural_mkt_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading rural market price data: {e}")
        return None, None, None

def save_validated_rural_mkt_price_data(rural_mkt_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        rural_mkt_uploaded_data.to_parquet(mkt_rural_price_validated_data_path, index=False)
        print("Validated rural market price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated rural market price data: {e}")

def load_urban_mkt_price_data():
    try:
        urban_mkt_uploaded_data, r1, r2 = load_mkt_item_price_data(mkt_offline_urban_uploaded_data_path, urban_sector_id, channel_id=1)
        print(r1, r2)
        return urban_mkt_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading urban market price data: {e}")
        return None, None, None

def save_validated_urban_mkt_price_data(urban_mkt_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_mkt_uploaded_data.to_parquet(mkt_urban_price_validated_data_path, index=False)
        print("Validated urban market price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban market price data: {e}")

def load_urban_airfare_price_data():
    try:
        urban_airfare_uploaded_data, r1, r2 = load_airfare_price_data(airfare_urban_uploaded_data_path)
        print(r1, r2)
        return urban_airfare_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading urban airfare price data: {e}")
        return None, None, None
    
def save_validated_urban_airfare_price_data(urban_airfare_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_airfare_uploaded_data.to_parquet(airfare_urban_validated_data_path, index=False)
        print("Validated urban airfare price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban airfare price data: {e}")

def load_urban_online_price_data():
    try:
        urban_online_uploaded_data, r1, r2 = load_mkt_item_price_data(mkt_online_urban_uploaded_data_path, urban_sector_id, channel_id=2)
        print(r1, r2)
        return urban_online_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading urban online price data: {e}")
        return None, None, None
    
def save_validated_urban_online_price_data(urban_online_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_online_uploaded_data.to_parquet(mkt_online_urban_validated_data_path, index=False)
        print("Validated urban online price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban online price data: {e}")

def load_urban_hr_price_data():
    try:
        urban_hr_uploaded_data, r1, r2 = load_hr_price_data(hr_urban_price_uploaded_data_path, urban_sector_id)
        print(r1, r2)
        return urban_hr_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading urban house rent price data: {e}")
        return None, None, None
    
def save_validated_urban_hr_price_data(urban_hr_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_hr_uploaded_data.to_parquet(hr_urban_price_validated_data_path, index=False)
        print("Validated urban house rent price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban house rent price data: {e}")

def load_rural_hr_price_data():
    try:
        rural_hr_uploaded_data, r1, r2 = load_hr_price_data(hr_rural_price_uploaded_data_path, rural_sector_id)
        print(r1, r2)
        return rural_hr_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading rural house rent price data: {e}")
        return None, None, None
    
def save_validated_rural_hr_price_data(rural_hr_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        rural_hr_uploaded_data.to_parquet(hr_rural_price_validated_data_path, index=False)
        print("Validated rural house rent price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated rural house rent price data: {e}")

def load_rural_elec_price_data():
    try:
        rural_elec_uploaded_data, r1, r2 = load_elect_price_data(elect_rural_price_uploaded_data_path, rural_sector_id)
        print(r1, r2)
        return rural_elec_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading rural electricity price data: {e}")
        return None, None, None
    
def save_validated_rural_elec_price_data(rural_elec_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        rural_elec_uploaded_data.to_parquet(elect_rural_price_validated_data_path, index=False)
        print("Validated rural electricity price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated rural electricity price data: {e}")

def load_urban_elec_price_data():
    try:
        urban_elec_uploaded_data, r1, r2 = load_elect_price_data(elect_urban_price_uploaded_data_path, urban_sector_id)
        print(r1, r2)
        return urban_elec_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading urban electricity price data: {e}")
        return None, None, None

def save_validated_urban_elec_price_data(urban_elec_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_elec_uploaded_data.to_parquet(elect_urban_price_validated_data_path, index=False)
        print("Validated urban electricity price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban electricity price data: {e}")

def load_uploaded_pds_price_data():
    try:
        pds_uploaded_data, r1, r2 = load_pds_price_data(pds_urban_price_uploaded_data_path, sector_code=2)
        print(r1, r2)
        return pds_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading PDS price data: {e}")
        return None, None, None
    
def save_validated_pds_price_data(pds_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        pds_uploaded_data.to_parquet(pds_price_validated_data_path, index=False)
        print("Validated PDS price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated PDS price data: {e}")


def load_uploaded_fuel_price_data(fuel_type_id):
    try:
        if fuel_type_id == 1:
            fuel_price_uploaded_data, r1, r2 = load_fuel_price_data(petrol_data_path, fuel_type_id)
        elif fuel_type_id == 2:
            fuel_price_uploaded_data, r1, r2 = load_fuel_price_data(diesel_data_path, fuel_type_id)
        elif fuel_type_id == 3:
            fuel_price_uploaded_data, r1, r2 = load_fuel_price_data(lpg_data_path, fuel_type_id)
        elif fuel_type_id == 4:
            fuel_price_uploaded_data, r1, r2 = load_fuel_price_data(cng_data_path, fuel_type_id)
        elif fuel_type_id == 5:
            fuel_price_uploaded_data, r1, r2 = load_fuel_price_data(png_data_path, fuel_type_id)
        else:
            print("Invalid fuel type id. Data Loading Failed")
            return
        
        print("Fuel price successfully read.")
        return fuel_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error uploading fuel price data to DB: {e}")

def save_validated_fuel_price(fuel_price_uploaded_data, fuel_type_id):
    try:
        if fuel_type_id == 1:
            # if return successfully, then save the validated data in a parquet file
            fuel_price_uploaded_data.to_parquet(petrol_price_validated_data_path, index = False)
        elif fuel_type_id == 2:
            fuel_price_uploaded_data.to_parquet(diesel_price_validated_data_path, index = False)
        elif fuel_type_id == 3:
            fuel_price_uploaded_data.to_parquet(lpg_price_validated_data_path, index = False)
        elif fuel_type_id == 4:
            fuel_price_uploaded_data.to_parquet(cng_price_validated_data_path, index = False)
        elif fuel_type_id == 5:
            fuel_price_uploaded_data.to_parquet(png_price_validated_data_path, index = False)
        else:
            print("Invalid fuel type id. Data Loading Failed")
            return
        print("Fuel price data uploaded to DB successfully.")
    except Exception as e:
        print(f"Error uploading fuel price data to DB: {e}")

def load_uploaded_telecom_price_data():
    try:
        telecom_price_uploaded_data, r1, r2 = load_telecom_price_data(telecom_prices_data_path)
        print(r1, r2)
        return telecom_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading telecom price data: {e}")
        return None, None, None

def save_validated_telecom_price_data(telecom_price_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        telecom_price_uploaded_data.to_parquet(telecom_prices_validated_data_path, index=False)
        print("Validated telecom price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated telecom price data: {e}")


def save_all_urban_hr_price_data_db():
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        urban_hr_uploaded_data = pd.read_parquet(hr_urban_price_validated_data_path)
        urban_hr_prev_price = get_prev_month_prices(data_type=7)
        urban_hr_complete_sample = get_all_hr_prices(urban_hr_uploaded_data, urban_hr_prev_price)
        # Save to comp_db after preparing all month data
        urban_hr_complete_sample.to_parquet(hr_urban_price_validated_data_path, index=False)
        print("Validated urban HR price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated urban HR price data: {e}")


def save_all_rural_hr_price_data_db():
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files

        rural_online_uploaded_data = pd.read_parquet(hr_rural_price_validated_data_path)
        rural_hr_prev_price = get_prev_month_prices(data_type=8)
        rural_hr_complete_sample = get_all_hr_prices(rural_online_uploaded_data, rural_hr_prev_price)
        # Save to comp_db after preparing all month data
        rural_hr_complete_sample.to_parquet(hr_rural_price_validated_data_path, index=False)
        print("Validated rural HR data saved successfully.")
    except Exception as e:
        print(f"Error saving validated rural HR price data: {e}")

def load_uploaded_railfare_data():
    try:
        railfare_price_uploaded_data, r1, r2 = load_railfare_price_data(railfare_prices_data_path)
        print(r1, r2)
        return railfare_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading railfare price data: {e}")
        return None, None, None
    

def load_uploaded_metro_fare_data():
    try:
        metro_fare_price_uploaded_data, r1, r2 = load_metro_fare_price_data(metro_prices_data_path)
        print(r1, r2)
        return metro_fare_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading metro fare price data: {e}")
        return None, None, None
    
def save_validated_railfare_price_data(railfare_price_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        railfare_price_uploaded_data.to_parquet(railfare_prices_validated_data_path, index=False)
        print("Validated railfare price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated railfare price data: {e}")

def save_validated_metro_fare_price_data(metro_fare_price_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        metro_fare_price_uploaded_data.to_parquet(metro_prices_validated_data_path, index=False)
        print("Validated metro fare price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated metro fare price data: {e}")

def load_uploaded_ott_price_data():
    try:
        ott_price_uploaded_data, r1, r2 = load_ott_price_data(ott_prices_data_path)
        print(r1, r2)
        return ott_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading OTT price data: {e}")
        return None, None, None

def save_validated_ott_price_data(ott_price_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        ott_price_uploaded_data.to_parquet(ott_prices_validated_data_path, index=False)
        print("Validated OTT price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated OTT price data: {e}")

def load_uploaded_postal_price_data():
    try:
        postal_price_uploaded_data, r1, r2 = load_postal_price_data(postal_prices_data_path)
        print(r1, r2)
        return postal_price_uploaded_data, r1, r2
    except Exception as e:
        print(f"Error loading postal price data: {e}")
        return None, None, None
def save_validated_postal_price_data(postal_price_uploaded_data):
    try:
        # If validation is successfull, then write the selected cols with validated data into a parquet files
        postal_price_uploaded_data.to_parquet(postal_prices_validated_data_path, index=False)
        print("Validated postal price data saved successfully.")
    except Exception as e:
        print(f"Error saving validated postal price data: {e}")
        
def read_validate():
    try:
        #electricity price data validation
        rural_elec_uploaded_data, r1, r2 = load_rural_elec_price_data()
        if rural_elec_uploaded_data is not None:
            save_validated_rural_elec_price_data(rural_elec_uploaded_data)

        urban_elec_uploaded_data, r1, r2 = load_urban_elec_price_data()
        if urban_elec_uploaded_data is not None:
            save_validated_urban_elec_price_data(urban_elec_uploaded_data)
            
            
        #house rent data validation
        
        urban_hr_uploaded_data, r1, r2 = load_urban_hr_price_data()
        if urban_hr_uploaded_data is not None:
            save_validated_urban_hr_price_data(urban_hr_uploaded_data)

        rural_hr_uploaded_data, r1, r2 = load_rural_hr_price_data()
        if rural_hr_uploaded_data is not None:
            save_validated_rural_hr_price_data(rural_hr_uploaded_data)
            
        save_all_urban_hr_price_data_db()
        save_all_rural_hr_price_data_db()  
        

        #PDS price data validation
        pds_uploaded_data, r1, r2 = load_uploaded_pds_price_data()
        if pds_uploaded_data is not None:
            save_validated_pds_price_data(pds_uploaded_data)
            
            
        #Ott_Postal price data validation
        ott_uploaded_data, r1, r2 = load_uploaded_ott_price_data()
        if ott_uploaded_data is not None:
            save_validated_ott_price_data(ott_uploaded_data)

        postal_uploaded_data, r1, r2 = load_uploaded_postal_price_data()
        if postal_uploaded_data is not None:
            save_validated_postal_price_data(postal_uploaded_data) 
            
        #fuel price data validation
        petrol_uploaded_data, r1, r2 = load_uploaded_fuel_price_data(fuel_type_id=1)
        diesel_uploaded_data, r1, r2 = load_uploaded_fuel_price_data(fuel_type_id=2)
        lpg_uploaded_data, r1, r2 = load_uploaded_fuel_price_data(fuel_type_id=3)
        cng_uploaded_data, r1, r2 = load_uploaded_fuel_price_data(fuel_type_id=4)
        png_uploaded_data, r1, r2 = load_uploaded_fuel_price_data(fuel_type_id=5)

        # save the validated data in a parquet file
        save_validated_fuel_price(petrol_uploaded_data, fuel_type_id=1)
        save_validated_fuel_price(diesel_uploaded_data, fuel_type_id=2)
        save_validated_fuel_price(lpg_uploaded_data, fuel_type_id=3)
        save_validated_fuel_price(cng_uploaded_data, fuel_type_id=4)
        save_validated_fuel_price(png_uploaded_data, fuel_type_id=5)
            
            
        #telecom price data validation
    
        telecom_uploaded_data, r1, r2 = load_uploaded_telecom_price_data()
        if telecom_uploaded_data is not None:
            save_validated_telecom_price_data(telecom_uploaded_data)
        
        
# market price data validation
        rural_mkt_uploaded_data, r1, r2 = load_rural_mkt_price_data()
        if rural_mkt_uploaded_data is not None:
            # Save the excel read file in the parquet file
            save_validated_rural_mkt_price_data(rural_mkt_uploaded_data)

        urban_mkt_uploaded_data, r1, r2 = load_urban_mkt_price_data()
        if urban_mkt_uploaded_data is not None:
            save_validated_urban_mkt_price_data(urban_mkt_uploaded_data)
            
            #airfare price data validation

        urban_airfare_uploaded_data, r1, r2 = load_urban_airfare_price_data()
        if urban_airfare_uploaded_data is not None:
            save_validated_urban_airfare_price_data(urban_airfare_uploaded_data)
            
            #online shopping price data validation

        urban_online_uploaded_data, r1, r2 = load_urban_online_price_data()
        if urban_online_uploaded_data is not None:
            save_validated_urban_online_price_data(urban_online_uploaded_data)
            
            
        railfare_uploaded_data, r1, r2 = load_uploaded_railfare_data()
        metro_fare_uploaded_data, r1, r2 = load_uploaded_metro_fare_data()

        save_validated_railfare_price_data(railfare_uploaded_data)
        save_validated_metro_fare_price_data(metro_fare_uploaded_data)

        
    
    except Exception as e:
        print(f"Error in reading and validating price data: {e}")