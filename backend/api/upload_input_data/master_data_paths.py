from doctest import master

import pandas as pd
import os

# Set the variable for data
# price_reference_year = 2024
# Set the compilation month as dd-mm-yyy where dd = 01
price_data_month_year = pd.to_datetime(f'01-02-2026', format='%d-%m-%Y')
#base_price_month_year = pd.to_datetime(f'01-12-2024', format='%d-%m-%Y')
# Set the prev_month as dd-mm-yyyy where dd=01
prev_month = (price_data_month_year - pd.DateOffset(months=1)).replace(day=1)
prev_month_prev_year = prev_month - pd.DateOffset(years=1)
prev_month_prev_year = prev_month_prev_year.replace(day=1)
# Set the price reference year index month saved in db as dd-mm-yyy where dd=01
#price_ref_year_idx_month = pd.to_datetime(f'01-12-2024', format='%d-%m-%Y')
prev_year_month = price_data_month_year - pd.DateOffset(years=1)
prev_year_month = prev_year_month.replace(day=1)

# P : Provisional
# F : Final Price Status
price_data_status = 'P'

rural_sector_name = "Rural"
rural_sector_id = 1
urban_sector_name = "Urban"
urban_sector_id = 2

# Set the flag to finalize the release output. In application, it is set by the approver of the release output.
# finalize_release = True

# HR item codes
airfare_old_item_code = "6.1.03.3.2.07.0"
# HR item codes
hr_old_item_code = "4.1.01.1.2.01.1"

iteration_id = 1

#########################################################################################################
# Flags for Traces
#########################################################################################################
# level 1 : Function names and count of records at each step
LEVEL1_TRACE = False
# level 2 : Level1 + count of markets, items at each step and any NA values
LEVEL2_TRACE = False
# Level 2 + save the intermediate dataframes at each step
LEVEL3_TRACE = False

# At any time only one level of trace can be True
if LEVEL3_TRACE:
    LEVEL2_TRACE = False
    LEVEL1_TRACE = False
elif LEVEL2_TRACE:
    LEVEL1_TRACE = False
    LEVEL2_TRACE = False

# FLAG FOR Input raw data file path extension conversion
CLOUD_ENV = False


input_raw_data_path = os.path.join("data", "input", "raw")
validated_fpath = os.path.join("data", "input", "validated")
output_data_path = os.path.join("data", "output")

price_db_path = os.path.join("data", "comp_db_final", "prices")
idx_db_path = os.path.join("data", "comp_db_final", "price_idx")
wt_db_path = os.path.join("data", "comp_db_final", "weights")
master_db_path = os.path.join("data", "comp_db_final", "mapping")
##########################################################################################################
# Set the path for saving all elementary index

pidx_db = os.path.join(output_data_path, "elementary_idx.parquet")
pidx_db_final = os.path.join(idx_db_path, "elementary_idx.parquet")

# Set the path for saving all the indexes
all_idx_db = os.path.join(output_data_path, "all_idx.parquet")
all_idx_db_final = os.path.join(idx_db_path, "all_idx.parquet")

###########################################################################################################
# Mkt Item Index - File Paths
###########################################################################################################
# offline market items


mkt_offline_rural_uploaded_data_path = os.path.join(input_raw_data_path, "rural_mkt_prices.csv")
mkt_offline_urban_uploaded_data_path = os.path.join(input_raw_data_path, "urban_mkt_prices.csv")
mkt_online_urban_uploaded_data_path = os.path.join(input_raw_data_path, "urban_online_mkt_prices.xlsx")
# Airfare prices
airfare_urban_uploaded_data_path = os.path.join(input_raw_data_path, "urban_airfare.xlsx")

mkt_rural_price_db_final = os.path.join(price_db_path, "rural_mkt_prices.parquet")
mkt_urban_price_db_final = os.path.join(price_db_path, "urban_mkt_prices.parquet")
# Saving the data older than 4 months in final db
mkt_rural_price_legacy_db_final = os.path.join(price_db_path, "rural_mkt_prices_legacy.parquet")
mkt_urban_price_legacy_db_final = os.path.join(price_db_path, "urban_mkt_prices_legacy.parquet")

mkt_online_urban_price_db_final = os.path.join(price_db_path, "urban_mkt_online_prices.parquet")
airfare_urban_price_db_final = os.path.join(price_db_path, "urban_airfare_prices.parquet")

# Set the price item weight db
pitem_exp_db_final = os.path.join(wt_db_path, "priced_item_expenditure_shares.parquet")
witem_exp_db_final = os.path.join(wt_db_path, "weighted_item_expenditure_shares.parquet")

# Set the jurisdiction path and coicop master path
district_master_db_final = os.path.join(master_db_path, "district_master.parquet")
market_master_db_final = os.path.join(master_db_path, "vw_market_master.parquet")
classification_master_db_final = os.path.join(master_db_path, "coicop_mapping.parquet")

#######################################################################################
# House Rent (Urban + Rural)
#######################################################################################
hr_rural_price_uploaded_data_path = os.path.join(input_raw_data_path, "rural_hr_prices.xlsx")
hr_urban_price_uploaded_data_path = os.path.join(input_raw_data_path, "urban_hr_prices.xlsx")

hr_rural_price_db_final = os.path.join(price_db_path, "rural_hr_prices.parquet")
hr_urban_price_db_final = os.path.join(price_db_path, "urban_hr_prices.parquet")

hr_category_weights_db_final = os.path.join(wt_db_path, "hr_category_weights.parquet")
hr_own_rent_exp_share_db_final = os.path.join(wt_db_path, "hr_own_rent_exp_share.parquet")

# This will contains only current month index
hr_cat_wise_idx_db = os.path.join(output_data_path, "hr_category_index.parquet")
hr_own_wise_idx_db = os.path.join(output_data_path, "hr_ownership_index.parquet")

# This contains all previous months index
hr_cat_wise_idx_db_final = os.path.join(idx_db_path, "hr_category_index.parquet")
hr_own_wise_idx_db_final = os.path.join(idx_db_path, "hr_ownership_index.parquet")

##############################################################################
# path for electricity price data
##############################################################################

elect_rural_price_uploaded_data_path = os.path.join(input_raw_data_path, "rural_elect_prices.xlsx")
elect_urban_price_uploaded_data_path = os.path.join(input_raw_data_path, "urban_elect_prices.xlsx")

elect_rural_price_db_final = os.path.join(price_db_path, "rural_elect_prices.parquet")
elect_urban_price_db_final = os.path.join(price_db_path, "urban_elect_prices.parquet")

elect_weights_db_final = os.path.join(wt_db_path, "discom_slab_weights.parquet")

elect_dslab_pidx_db = os.path.join(output_data_path, "elect_dslab_price_index.parquet")

elect_dslab_pidx_db_final = os.path.join(idx_db_path, "elect_dslab_price_index.parquet")

#########################################################################################################
## Path for PDS Price Data
#########################################################################################################
pds_urban_price_uploaded_data_path = os.path.join(input_raw_data_path, "urban_pds.xlsx")

pds_price_db_final = os.path.join(price_db_path, "pds_prices.parquet")

pds_pitem_exp_share_db_final = os.path.join(wt_db_path, "pds_pitem_exp_shares.parquet")

pds_pidx_db = os.path.join(output_data_path, "pds_pidx.parquet")
pds_pidx_db_final = os.path.join(idx_db_path, "pds_pidx.parquet")

###############################################################################
# Administrative Data Sources Data : Fuel(Petrol, Diesel, LPG, CNG, PNG), OTT, Telecom, Postal and Railway
###############################################################################
# offline market items
petrol_data_path = os.path.join(input_raw_data_path, "petrol.xlsx")
diesel_data_path = os.path.join(input_raw_data_path, "diesel.xlsx")
lpg_data_path = os.path.join(input_raw_data_path, "lpg.xlsx")
cng_data_path = os.path.join(input_raw_data_path, "cng.xlsx")
png_data_path = os.path.join(input_raw_data_path, "png.xlsx")

# petrol, diesel, lpg, cng, png price db final paths
petrol_price_db_final = os.path.join(price_db_path, "petrol_prices.parquet")
diesel_price_db_final = os.path.join(price_db_path, "diesel_prices.parquet")
lpg_price_db_final = os.path.join(price_db_path, "lpg_prices.parquet")
cng_price_db_final = os.path.join(price_db_path, "cng_prices.parquet")
png_price_db_final = os.path.join(price_db_path, "png_prices.parquet")

# telecom prices , wts and pidx

telecom_prices_data_path = os.path.join(input_raw_data_path, "telecom.xlsx")
telecom_prices_db_final = os.path.join(price_db_path, "telecom_prices.parquet")
telecom_weights_db_final = os.path.join(wt_db_path, "telecom_op_wts.parquet")
telecom_operator_pidx_db = os.path.join(output_data_path, "telecom_operator_pidx.parquet")
telecom_operator_pidx_db_final = os.path.join(idx_db_path, "telecom_operator_pidx.parquet")

# Railfare and Metro prices
railfare_prices_data_path = os.path.join(input_raw_data_path, "rail_fare.xlsx")
metro_prices_data_path = os.path.join(input_raw_data_path, "metro_fare.xlsx")
railfare_prices_db_final = os.path.join(price_db_path, "railfare_prices.parquet")
metro_prices_db_final = os.path.join(price_db_path, "metro_prices.parquet")
railfare_weights_db_final = os.path.join(wt_db_path, "railfare_wts.parquet")
railfare_pidx_db = os.path.join(output_data_path, "railfare_pidx.parquet")
railfare_pidx_db_final = os.path.join(idx_db_path, "railfare_pidx.parquet")

# OTT Prices
ott_prices_data_path = os.path.join(input_raw_data_path, "ott.xlsx")
ott_prices_db_final = os.path.join(price_db_path, "ott_prices.parquet")

# Postal Prices
postal_prices_data_path = os.path.join(input_raw_data_path, "postal.xlsx")
postal_prices_db_final = os.path.join(price_db_path, "postal_prices.parquet")

######################################################################################################
# Set path of all validated monthly data
# Set validated data paths
#########################################################################################################
# Validated file path for saving all validated files


mkt_rural_price_validated_data_path = os.path.join(validated_fpath, "rural_mkt_prices.parquet")
mkt_urban_price_validated_data_path = os.path.join(validated_fpath, "urban_mkt_prices.parquet")
mkt_online_urban_validated_data_path = os.path.join(validated_fpath, "urban_mkt_online_prices.parquet")
airfare_urban_validated_data_path = os.path.join(validated_fpath, "urban_airfare_prices.parquet")
hr_rural_price_validated_data_path = os.path.join(validated_fpath, "rural_hr_prices.parquet")
hr_urban_price_validated_data_path = os.path.join(validated_fpath, "urban_hr_prices.parquet")
elect_rural_price_validated_data_path = os.path.join(validated_fpath, "rural_elect_prices.parquet")
elect_urban_price_validated_data_path = os.path.join(validated_fpath, "urban_elect_prices.parquet")
pds_price_validated_data_path = os.path.join(validated_fpath, "pds_prices.parquet")
petrol_price_validated_data_path = os.path.join(validated_fpath, "petrol_prices.parquet")
diesel_price_validated_data_path = os.path.join(validated_fpath, "diesel_prices.parquet")
lpg_price_validated_data_path = os.path.join(validated_fpath, "lpg_prices.parquet")
cng_price_validated_data_path = os.path.join(validated_fpath, "cng_prices.parquet")
png_price_validated_data_path = os.path.join(validated_fpath, "png_prices.parquet")
telecom_prices_validated_data_path = os.path.join(validated_fpath, "telecom_prices.parquet")
railfare_prices_validated_data_path = os.path.join(validated_fpath, "railfare_prices.parquet")
metro_prices_validated_data_path = os.path.join(validated_fpath, "metro_prices.parquet")
ott_prices_validated_data_path = os.path.join(validated_fpath, "ott_prices.parquet")
postal_prices_validated_data_path = os.path.join(validated_fpath, "postal_prices.parquet")







