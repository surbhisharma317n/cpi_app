import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
API_CAPI_URL = os.getenv("API_CAPI_URL")
# API Config
API_LOGIN_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/login"
API_AIRFARE_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_AirfarePricesByDateAsync"
API_ECOMMERCE_PRICES_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_EcommercePricesByDateAsync"
API_ELECTRICITY_URBAN_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_Electricity_Urban_PricesByDateAsync"
API_ELECTRICITY_RURAL_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_Electricity_Rural_PricesByDateAsync"

API_PRICE_LIST_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_PriceList_PricesByDateAsync"
API_MARKET_URBAN_PRICES_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_MarkerPrice_Urban_PricesByDateAsync"

API_MARKET_RURAL_PRICES_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_MarkerPrice_Rural_PricesByDateAsync"

API_HOUSERENT_URBAN_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_HouseRent_Urban_PricesByDateAsync"
API_HOUSERENT_RURAL_DATA_URL = f"{API_CAPI_URL}/ApiCompilation/api/SURVEY/v1/Compilation/Get_Compilation_HouseRent_Rural_PricesByDateAsync"

API_USERNAME = os.getenv("API_USERNAME")
API_PASSWORD = os.getenv("API_PASSWORD")

# Table Names
AIRFARE_TABLE_NAME = "airfare"
RURAL_ELECTRICITY_TABLE_NAME = "rural_electricity"
URBAN_ELECTRICITY_TABLE_NAME = "urban_electricity"
RURAL_HOUSE_RENT_TABLE_NAME = "rural_housing_rent"
URBAN_HOUSE_RENT_TABLE_NAME = "urban_housing_rent"
URBAN_ONLINE_PRICE_TABLE_NAME = "urban_online"
PDS_PRICE_TABLE_NAME = "urban_pds_price"
RURAL_ITEM_PRICE_TABLE_NAME = "rural_item_price"
URBAN_ITEM_PRICE_TABLE_NAME = "urban_item_price"


# DB Config
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

MASTER_DB_CONFIG = {
    "host": os.getenv("MASTER_DB_HOST"),
    "port": os.getenv("MASTER_DB_PORT"),
    "database": os.getenv("MASTER_DB_NAME"),
    "user": os.getenv("MASTER_DB_USER"),
    "password": os.getenv("MASTER_DB_PASSWORD")
}
