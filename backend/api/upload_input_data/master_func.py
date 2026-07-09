from turtle import pos

import pandas as pd
import numpy as np
from .master_data_paths import *
import re


state_code_len = 2
district_code_len = 2
town_code_len = 3
village_code_len = 6
market_code_len = 3
discom_code_len = 3

# Train type ids and coach type ids mapping
train_type_ids = {
    'Mail Express' : 4,
    'Shatabdi/Vande Bharat/Tejas': 1,
    'Rajdhani/Duronto': 2,
    'UTS Non-Suburban' : 3, 
    'UTS Suburban': 5
}

coach_type_ids = {
    '1AC': 1,
    '2AC': 2,
    '3AC': 3,
    'Sleeper': 4,
    'CC': 5,
    '2S+VS': 6,
    'EC+EA+EV': 7,
    'EC': 8,
    np.nan: 9
}

# Create a master for spcl_code_master dataframe 
item_type_master = pd.DataFrame({
    'item_type_id': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'item_type_desc': ['Open Market', 'PDS Free', 'PDS Subsidised', 'Airfare', 'Electricity Charges', 'House Rent', 
                        'Railfare', 'Telephone Charges', 'Postal Charges', 'OTT', 'Fuel']
})

# dwelling code mapping
dwelling_code_mapping = {'Original': 1, 'Casualty': 2, 'Substituted': 3}

# Create a master for spcl_code_master dataframe 
mkt_spcl_code_master = pd.DataFrame({
    'spcl_id': [0, 1, 2, 3],
    'spcl_code': ['0', '1', '2', '3'],
    'spcl_code_desc': ['No Change', 'Shop/Website/Website Type Change', 'Item Specification Change', 
                       'Both Shop/Website/Website Type and Item Specification Change']
})

airfare_spcl_code_master = pd.DataFrame({
    'spcl_id': [0, 1, 2, 3, 4],
    'spcl_code': ['0', '1', '2', '3', '4'],
    'spcl_code_desc': ['No Change', 'Website Change', 'Time Slot Change', '', 'Route Change']
})

# Create a master for spcl_code_master dataframe 
channel_master = pd.DataFrame({
    'channel_id': [1, 2],
    'channel_desc': ['Offline', 'Online E-Commerce']
})

def get_district_master(states='All'):
    district_df = pd.read_parquet(district_master_db_final)
    if states != 'All':
        district_df = district_df[district_df['nss_state_code'].isin(states)]
    return district_df

def get_market_master(master='All', sector=0):
    if (master in ['All']) and (sector in [0, 1, 2]):
        market_df = pd.read_parquet(market_master_db_final)

        if sector == 1:
            select_cols = ['market_id', 'nss_sector_code', 'nss_sector_name', 'nss_state_code', 'nss_district_code',
                            'nss_village_code', 'sector_id', 'state_id']
            market_df = market_df[select_cols].drop_duplicates()
            # Rural Markets
            market_df.dropna(subset=['nss_village_code'], inplace=True)
            
        elif sector == 2:
            select_cols = ['market_id', 'nss_sector_code', 'nss_sector_name', 'nss_state_code', 'nss_district_code', 
                'nss_town_code', 'nss_market_code', 'sector_id', 'state_id']
            market_df = market_df[select_cols].drop_duplicates()
            # Urban Markets
            market_df.dropna(subset=['nss_town_code'], inplace=True)

        if master != 'All':
            market_df = market_df[market_df['market_master'] == master]
        return market_df
    else:
        print("inavlid Input")
        return -1


def get_pitem_master(items='All'):
    copicop_item_df = pd.read_parquet(classification_master_db_final)
    #if items != 'All':
    #    copicop_item_df = copicop_item_df[copicop_item_df['priced_item_name'].isin(items)]
    copicop_item_df = copicop_item_df[['pitem_id', 'pitem_code', 'old_pitem_code']].drop_duplicates()
    return copicop_item_df

def get_pitem_type():
    copicop_item_df = pd.read_parquet(classification_master_db_final)
    copicop_item_df = copicop_item_df[['pitem_id', 'item_type_id']].drop_duplicates()
    return copicop_item_df

def get_new_pitem_code():
    copicop_item_df = pd.read_parquet(classification_master_db_final)
    #if items != 'All':
    #    copicop_item_df = copicop_item_df[copicop_item_df['priced_item_name'].isin(items)]
    copicop_item_df = copicop_item_df[['pitem_id', 'pitem_code']].drop_duplicates()
    copicop_item_df.rename(columns={'coicop_pitem_code':'pitem_code'}, inplace=True)
    return copicop_item_df

def get_coicop_pitem_code(old_pitem_code):
    coicop_item_df = pd.read_parquet(classification_master_db_final)
    coicop_item_df = coicop_item_df[['pitem_id', 'pitem_code', 'old_pitem_code', 'pitem_name']].drop_duplicates()
    coicop_item_df = coicop_item_df[coicop_item_df['old_pitem_code'] == old_pitem_code]

    if coicop_item_df[coicop_item_df.pitem_name == 'Electricity'].shape[0] > 0:
        coicop_item_df = coicop_item_df[coicop_item_df.pitem_name == 'Electricity']
    if coicop_item_df.shape[0] == 0:
        print("No matching COICOP pitem code found")
        return None
    else:
        return coicop_item_df['pitem_code'].values[0]

def get_hr_category_list():
    hr_cat_df = pd.read_parquet(hr_cat_wise_idx_db_final)
    # Filter out for pd.datetime('2024-12-01')
    hr_cat_df = hr_cat_df[hr_cat_df['price_month_year'] == pd.to_datetime('2024-12-01')]
    hr_cat_df = hr_cat_df[['nss_state_code', 'nss_sector_code', 'house_category']].drop_duplicates()
    return hr_cat_df

# compute price index
def compute_price_index(prices_df, index_df):
    price_cols = ['state_id', 'sector_id', 'pitem_id', 'revised_item_price', 'prev_item_price']
    index_cols = ['state_id', 'sector_id', 'pitem_id', 'prev_price_index']
    
    if np.sum([1 for var in price_cols if var in prices_df.columns]) != len(price_cols):
        print("Required variables are not present in the price dataframe")
        return 1
    
    if np.sum([1 for var in index_cols if var in index_df.columns]) != len(index_cols):
        print("Required variables are not present in the index dataframe")
        return 2
    
    if np.sum(prices_df.isna().sum().values) > 0:
        print("NA Values are present in the price dataframe")
        return 3
    
    if np.sum(index_df.isna().sum().values) > 0:
        print("NA Values are present in the index dataframe")
        return 4
    
    prices_df = prices_df[price_cols]
    index_df = index_df[index_cols]

    prices_df['price_relative'] = prices_df['revised_item_price'] / prices_df['prev_item_price']
    # Take geometric mean of price_relative 
    pitem_index = prices_df.groupby(['state_id', 'sector_id', 'pitem_id'], as_index=False)['price_relative'].apply(
    lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'gm_pr'})


    pitem_index = pitem_index.merge(index_df,
                                    how='left',
                                    on = ['state_id', 'sector_id', 'pitem_id'])
    

    # rename price_index to prev_price_index
    pitem_index['price_index'] = pitem_index['gm_pr'] * pitem_index['prev_price_index']
    pitem_index.drop(columns=['gm_pr', 'prev_price_index'], inplace=True)

    return pitem_index

def get_coicop_heirarchy():
    df = pd.read_parquet(classification_master_db_final)
    df = df[['pitem_id', 'witem_id', 'subclass_id', 'class_id', 'group_id', 
             'division_id']].drop_duplicates()
    return df

def get_coicop_names_codes():
    df = pd.read_parquet(classification_master_db_final)
    return df

def get_pitem_exp_share():
    df = pd.read_parquet(pitem_exp_db_final)
    # select the items with exp_share greater than 0 and drop duplicates
    df = df[df['exp_share'] > 0]
    df = df[['state_id', 'sector_id', 'pitem_id', 'exp_share']].drop_duplicates()
    return df

def get_weighted_expenditure():
    df = pd.read_parquet(witem_exp_db_final)
    df = df[['state_id', 'sector_id', 'witem_id', 'exp_share']].drop_duplicates()
    return df

def get_telecom_operator_wts():
        # get the telecom weights
    telecom_wts_df = pd.read_parquet(telecom_weights_db_final)
    # select only positive weights
    telecom_wts_df = telecom_wts_df[telecom_wts_df['operator_wt'] > 0]
    # select only state_id, pitem_id, operator_name, weight
    cols_req = ['state_id', 'witem_id', 'operator_name', 'operator_wt']
    telecom_wts_df = telecom_wts_df[cols_req]

    pitem_with_witem = get_coicop_heirarchy()[['pitem_id', 'witem_id']].drop_duplicates()

    # merge telecom_wts_df with pitem_with_witem on witem_id
    telecom_wts_df = telecom_wts_df.merge(pitem_with_witem,
                                                on='witem_id',
                                                how='left')
    # if no NA values in any column of the telecom_wts_df then return the dataframe
    if telecom_wts_df.isna().sum().sum() == 0:
        return telecom_wts_df
    else:
        print("NA values present in telecom weights dataframe")
        return None

def get_imp_factor(idx_df, level):
    # level : 1(witem), 2(subclass), 3(class), 4(group), 5(division), 6(all items)
    if level == 1:
        group_vars = ['state_id', 'sector_id', 'witem_id']
    elif level == 2:
        group_vars = ['state_id', 'sector_id', 'subclass_id']
    elif level == 3:
        group_vars = ['state_id', 'sector_id', 'class_id']
    elif level == 4:
        group_vars = ['state_id', 'sector_id', 'group_id']
    elif level == 5:
        group_vars = ['state_id', 'sector_id', 'division_id']
    elif level == 6:
        group_vars = ['state_id', 'sector_id']
    else:
        print("Invalid level")
        return None
    
    try:
        idx_df = idx_df[group_vars + ['pitem_id', 'price_index', 'prev_price_index', 'exp_share']]

        idx_df['price_index'] = idx_df['price_index'] * idx_df['exp_share']
        idx_df['prev_price_index'] = idx_df['prev_price_index'] * idx_df['exp_share']

        idx_df = (idx_df
            .groupby(group_vars, as_index=False)
            .agg(curr_idx_sum=('price_index', 'sum'),
                prev_idx_sum=('prev_price_index', 'sum'),
                exp_sum=('exp_share', 'sum'))
        )
        
        idx_df['imp_factor'] = (idx_df['curr_idx_sum'] / idx_df['exp_sum']) / \
            (idx_df['prev_idx_sum'] / idx_df['exp_sum'])
        idx_df = idx_df[group_vars + ['imp_factor']]
        return idx_df, group_vars
    except Exception as e:
        print(f"Error in computing imputation factor at level {level}: {e}")


def get_curr_pidx(month, pitem_code=None, pitem_id=None):
    if (pitem_code is not None) and (pitem_id is not None):
        print("Either pitem_code or pitem_id is provided. Not both.")
        return None
    pidx_df = pd.read_parquet(pidx_db)
    # Add user id , iteration id and data updation date later
    mask = (pidx_df.price_month_year == month) & (pidx_df.price_data_status == price_data_status)

    if (pitem_code is not None) or (pitem_id is not None):
        if pitem_code is not None:
            mask = mask & (pidx_df.pitem_code.isin(pitem_code))
        if pitem_id is not None:
            mask = mask & (pidx_df.pitem_id.isin(pitem_id))
    
    cols = ['state_id', 'sector_id', 'pitem_id', 'pitem_code', 'price_index', 'imputed']
    pidx_df = pidx_df.loc[mask, cols]
    if pidx_df.shape[0] == 0:
        print("Previous month price index data not found")
        return None
    else:
        return pidx_df

# Take either one of the pitem_code or pitem_id
def get_finalized_pidx(month, pitem_code=None, pitem_id=None):
    if (pitem_code is not None) and (pitem_id is not None):
        print("Either pitem_code or pitem_id is provided. Not both.")
        return None
    pidx_df = pd.read_parquet(pidx_db_final)

    if month < pd.to_datetime(f'01-12-2024', format='%d-%m-%Y'):
        month = pd.to_datetime(f'01-12-2024', format='%d-%m-%Y')
        
    mask = (pidx_df.price_month_year == month) & (pidx_df.price_data_status == "F")
    if (pitem_code is not None) or (pitem_id is not None):
        if pitem_code is not None:
            mask = mask & (pidx_df.pitem_code.isin(pitem_code))
        if pitem_id is not None:
            mask = mask & (pidx_df.pitem_id.isin(pitem_id))
    
    cols = ['state_id', 'sector_id', 'pitem_id', 'pitem_code', 'price_index', 'imputed']
    pidx_df = pidx_df.loc[mask, cols]
    if pidx_df.shape[0] == 0:
        print("Previous month price index data not found")
        return None
    else:
        return pidx_df 



# Create a function which returns item_id in state and sector for which the weights are available
def get_final_pitem_list():
    wts_df = get_weighted_expenditure()
    pitem_df = get_coicop_names_codes()[['witem_id', 'pitem_id']].drop_duplicates()
    wts_df = wts_df.merge(pitem_df,
                        on = ['witem_id'],
                        how='left')
    wts_df = wts_df[wts_df.pitem_id.notnull() & (wts_df.exp_share > 0.0)]

    pitem_df = wts_df[['state_id', 'sector_id', 'pitem_id']].drop_duplicates()
    return pitem_df

# Get the monthly price and specifications data for online market prices
def update_latest_week_price(group):
    # Check if all spcl_code values are 0
    spcl_weeks = group[group['spcl_code'].astype(int) > 0]['price_collection_week_no']
    group['sflag'] = 0  # Initialize sflag to 0
    
    if len(spcl_weeks) == 0:
        if group[group['item_price'] > 0].shape[0] > 0:
            # Calculate average of item_price excluding 0 prices
            avg_price = group[group['item_price'] > 0]['item_price'].mean()
        else:
            avg_price = 0.0
        group.loc[:, 'item_price'] = avg_price
        group.loc[group.price_collection_week_no == 4, 'sflag'] = 1
    else:
        # Find the maximum week where spcl_code > 0
        max_spcl_week = spcl_weeks.max()
        
        # Get all rows from the special code week onwards (including that week)
        rows_from_spcl = group[group['price_collection_week_no'] >= max_spcl_week]
        
        # Take the spcl_code of the max_spcl_week row
        max_spcl_code = group.loc[group['price_collection_week_no'] == max_spcl_week, 'spcl_code'].iloc[0]
        
        if len(rows_from_spcl) > 0:
            if rows_from_spcl[rows_from_spcl['item_price'] > 0].shape[0] > 0:
                # Calculate average of item_price for rows from special code week onwards
                avg_price = rows_from_spcl[rows_from_spcl['item_price'] > 0]['item_price'].mean()
            else:
                avg_price = 0.0
            
            # Update week 4 with the calculated values
            group.loc[group['price_collection_week_no'] == max_spcl_week, 'item_price'] = avg_price
            group.loc[group.price_collection_week_no == max_spcl_week, 'sflag'] = 1
    return group

def load_mkt_item_price_data(file_path, sector_code, channel_id):

    revised_market_col_names = {
        'state_no': 'nss_state_code', 'state_code': 'nss_state_code', 'statename': 'nss_state_name', 'districtcode': 'nss_district_code',  
        'districtname': 'nss_district_name', 'town_code': 'nss_town_code',  'townname': 'nss_town_name',
        'village_code': 'nss_village_code',  'villagename': 'nss_village_name', 'quotation': 'nss_market_code',  
        'week': 'price_collection_week_no', 'week_no': 'price_collection_week_no', 'item_code': 'old_pitem_code',  
        'item_name': 'old_pitem_name', 'unit': 'unit', 'quantity': 'quantity', 'marketname': 'market_name',     
        'priceyear': 'price_year', 'pricemonth': 'price_month', 'price': 'item_price', 'remarks': 'price_remarks',  
        'region_code': 'sector_code', 'region_name': 'sector_name', 'specialcode': 'spcl_code', 'brand_name': 'brand',
        'package_name': 'packaging'
        }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if (file_path.endswith('.parquet')) and os.path.exists(file_path):
        try:
            print("Reading Started...")
            if sector_code == 1:
                cols = ['state_no', 'districtcode', 'village_code', 'week_no', 'item_code', 'item_name', 'brand_name', 
                        'variety', 'quality', 'Size', 'package_name', 'composition', 'unit', 'quantity', 'PriceYear', 
                        'SpecialCode', 'PriceMonth', 'price', 'remarks']
            elif sector_code == 2:
                if channel_id == 1:
                    cols = ['state_no', 'Districtcode', 'town_code', 'quotation', 'week_no', 
                            'item_code', 'item_name', 'brand_name', 'variety', 'quality', 'Size', 
                            'package_name', 'composition', 'unit', 'quantity', 'PriceYear', 
                            'SpecialCode', 'PriceMonth', 'price', 'remarks']                        
                else:
                    cols = ['state_code', 'Districtcode', 'town_code', 'quotation', 'week_no', 
                            'item_code', 'item_name', 'brand_name', 'variety', 'quality', 'size', 
                            'package_name', 'composition', 'unit', 'quantity', 'PriceYear', 
                            'SpecialCode', 'PriceMonth', 'price', 'remarks']

            market_prices = pd.read_parquet(file_path, columns=cols)

            #print("Reading Success")
            if market_prices.shape[0] == 0:
                print("File with zero records")
                return -1
            
            uploaded_rcount = market_prices.shape[0]
            market_prices.drop_duplicates(inplace=True)
            market_prices.columns = market_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            market_prices.rename(columns=revised_market_col_names, inplace=True)
            
            # fill na values with 0 in spcl_code
            market_prices['spcl_code'] = market_prices['spcl_code'].fillna('0')
            
            market_prices['spcl_code'] = market_prices['spcl_code'].str.replace(r'[^0-9]', '', regex=True)
            
            market_prices['price_collection_week_no'] = market_prices['price_collection_week_no'].astype(int)

            market_prices['item_price'] = market_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            # if item_price is empty string after removing characters, then replace it with np.nan
            market_prices['item_price'] = market_prices['item_price'].replace('', 0.0)
            market_prices['item_price'] = market_prices['item_price'].fillna(0.0)
            market_prices['item_price'] = market_prices['item_price'].astype(float).round(2)

            # Comply the varibales with PSD variable length rules
            # fill the values by zero to a length 2 in statecode in dataframe
            market_prices['nss_state_code'] = market_prices['nss_state_code'].apply(lambda x: str(x).zfill(2))
            market_prices['nss_district_code'] = market_prices['nss_district_code'].apply(lambda x: str(x).zfill(2))

            sector_df = get_market_master()[['sector_id', 'nss_sector_code', 'nss_sector_name']].drop_duplicates()

            if sector_code == sector_df[sector_df.nss_sector_name == rural_sector_name].sector_id.values[0]:
                market_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
                market_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_name.values[0]
                market_prices['nss_village_code'] = market_prices['nss_village_code'].apply(lambda x: str(x).zfill(6))
                # If any of these variables are na then remove the row
                col_names = ['nss_state_code', 'nss_district_code', 'nss_village_code', 'price_year', 'price_month', 
                             'old_pitem_code', 'spcl_code']
                # Later on add 'unit', 'quantity' in both dataframes
                market_prices = market_prices.dropna(subset=col_names)

                # Map the market id
                #print(market_prices.shape[0])
                market_prices = market_prices.merge(get_market_master(sector=rural_sector_id)[['nss_village_code', 'sector_id', 'state_id', 'market_id']],
                                            on = ['nss_village_code'],
                                            how='left')
                #print(market_prices.shape[0])
                market_prices = market_prices.merge(mkt_spcl_code_master[['spcl_id', 'spcl_code']],
                                                    on='spcl_code',
                                                    how='left')
                market_prices = market_prices.merge(get_pitem_master(),
                                            on ='old_pitem_code',
                                            how='left')
                market_prices.drop(columns=['old_pitem_code'], inplace=True)
                #print(market_prices.shape[0])
                # Remove the records if the item is not available in the master list
                market_prices = market_prices[market_prices.pitem_id.notnull()]

                cols_required = ['price_year', 'price_month', 'price_collection_week_no', 'nss_sector_code', 'nss_state_code', 'nss_district_code', 
                                 'nss_village_code', 'pitem_code', 'brand', 'variety', 'quality', 'size', 'packaging', 'composition',
                                 'unit', 'quantity', 'spcl_code', 'item_price', 'price_remarks', 'market_id', 'state_id', 'sector_id', 'spcl_id', 'pitem_id']
                #print(market_prices.columns)
                market_prices = market_prices[cols_required]
                
            elif sector_code == sector_df[sector_df.nss_sector_name == urban_sector_name].sector_id.values[0]:
                market_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
                market_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_name.values[0]
                market_prices['nss_town_code'] = market_prices['nss_town_code'].apply(lambda x: str(x).zfill(3))
                market_prices['nss_market_code'] = market_prices['nss_market_code'].apply(lambda x: str(x).zfill(3))
                # If any of these variables are na then remove the row
                col_names = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code',  'price_year', 'price_month', 
                             'old_pitem_code', 'spcl_code']
                market_prices = market_prices.dropna(subset=col_names)

                # Map the market id
                market_prices = market_prices.merge(get_market_master(sector=urban_sector_id)[['nss_state_code', 'nss_district_code', 
                                                                                             'nss_town_code', 'nss_market_code', 'sector_id', 
                                                                                             'state_id', 'market_id']],
                                            on = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code'],
                                            how='left')
                
                market_prices = market_prices.merge(mkt_spcl_code_master[['spcl_id', 'spcl_code']],
                                                    on='spcl_code',
                                                    how='left')
                
                market_prices = market_prices.merge(get_pitem_master(),
                                            on ='old_pitem_code',
                                            how='left')
                market_prices.drop(columns=['old_pitem_code'], inplace=True)
                #print(market_prices.shape[0])
                # Remove the records if the item is not available in the master list
                market_prices = market_prices[market_prices.pitem_id.notnull()]

                cols_required = ['price_year', 'price_month', 'price_collection_week_no', 'nss_state_code', 'nss_district_code', 
                                 'nss_town_code', 'nss_market_code', 'pitem_code', 'brand', 'variety', 'quality', 
                                 'size', 'packaging', 'composition', 'unit', 'quantity', 'spcl_code', 'item_price', 'price_remarks', 
                                 'market_id', 'state_id', 'sector_id', 'spcl_id', 'pitem_id']
                #print(market_prices.columns)
                market_prices = market_prices[cols_required]               

            if (market_prices.isna().sum()['pitem_id'] > 0):
                print("There is mismatch between transaction data and price item master")
                return -1
            
            if (market_prices.isna().sum()['market_id'] > 0):
                print("There is mismatch between transaction data and market master")
                return -1
            
            # Only filter out the items for which weights are available
            market_prices = market_prices.merge(get_final_pitem_list(),
                                                on = ['state_id', 'sector_id', 'pitem_id'],
                                                how = "inner")

            # convert the price in both urban_item_prices and rural_item_prices to float
            market_prices['item_price'] = market_prices['item_price'].astype(float).round(2)

            market_prices.loc[:, 'price_month_year'] = pd.to_datetime(market_prices['price_year'].astype(str) + '-' + 
                                                                      market_prices['price_month'].astype(str), format='%Y-%m')

            if (channel_id == 2):
                print("Convert weekly prices to monthy prices for online e-commerce data")
                # Online e-commerce data
                # For special code handling and week 4 price updation
                market_prices = (
                    market_prices
                    .groupby(['market_id', 'pitem_id'], group_keys=False)
                    .apply(update_latest_week_price, include_groups=True)
                    )
                market_prices = market_prices[market_prices.sflag == 1].copy()
                market_prices.drop(columns=['sflag'], inplace=True)            

            market_prices['revised_item_price'] = market_prices['item_price']
            market_prices['price_imputed'] = 0

            # convert all variables with _id suffix to integer
            id_cols = [col for col in market_prices.columns if col.endswith('_id')]
            for col in id_cols:
                if 'spcl_id' in col:
                    continue
                market_prices[col] = market_prices[col].astype('int32')
            
            # convert price_year and price_month to integer
            market_prices['price_year'] = market_prices['price_year'].astype('int32')
            market_prices['price_month'] = market_prices['price_month'].astype('int32')

            # Exclude the items which are covered in administrative price collection
            # 474, 475, 476 : Prepaid, Postpaid and landline charges
            admin_pitem_ids = [439, 479, 457, 458, 456, 440, 284, 436, 437, 438, 474, 475, 476]
            lpg_pitem_code = 283
            market_prices = market_prices[~market_prices.pitem_id.isin(admin_pitem_ids)]
            # Except Lakshadweep (state_id = 31), don't take LPG prices from market data
            market_prices = market_prices[~((market_prices.pitem_id == lpg_pitem_code) & (market_prices.state_id != 31))]

            # Add information related to uploader and private status i.e. provisional / final
            market_prices['price_data_status'] = price_data_status
            market_prices['iteration_id'] = iteration_id

            final_rcount = market_prices.shape[0]

            if final_rcount == 0:
                # raise ValueError("No records to upload after processing")
                print("No records to upload after processing")

            return market_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e
    else:
        raise FileNotFoundError(f"The file {file_path} does not exist or is not an Excel file.")
    

# Correct the airline names
def replace_goa(text):
    if pd.isna(text):
        return text

    if re.search(r'DABOLIM', text, re.IGNORECASE):
        # Replace GOA with ''
        text = re.sub(r'GOA', '', text, flags=re.IGNORECASE)
    else:
        # Replace GOA with DABOLIM
        text = re.sub(r'GOA', 'DABOLIM', text, flags=re.IGNORECASE)
    # Replace multiple spaces again in case GOA removal created extra spaces
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r',', '', text)
    # Replace multiple spaces with single space
    return text.strip()

def get_airline_websites_mapping(collected_website_list):
    website_list = ['ixigo', 'Goibibo', 'irctc', 'makemytrip', 'paytm', 'airindia', 'civilaviation.arunachal.gov.in', 
                    'Amazon', 'EaseMyTrip', 'Cleartrip', 'allianceair', 'spicejet', 'goindigo', 'allianceair', 'starair', 
                    'flybig', 'airasia', 'indiaoneair', 'akasaair', 'flyin.com/airlines/trujet.en.html', 'GoAir', 'fly91']
    website_mapping = {}
    for cwbste in collected_website_list:
        flag = True
        for wbste in website_list:
            if str(cwbste).lower().find(wbste.lower()) != -1:
                #print(cwbste , wbste)
                website_mapping[cwbste] = wbste
                flag = False
                break
        if flag:
            #print(cwbste)
            continue

    website_mapping['Google'] = 'YET TO UPDATE'
    website_mapping['Make My Trip'] = 'makemytrip'
    website_mapping['Make my trip'] = 'makemytrip'
    website_mapping['make my trip'] = 'makemytrip'
    website_mapping['MAKEMY TRIP MOBILE APP'] = 'makemytrip'
    website_mapping['SERVICE NOT AVAILABLE'] = 'YET TO UPDATE'
    website_mapping['make my trip.com'] = 'makemytrip'
    website_mapping['MAKE MY TRIP'] = 'makemytrip'
    website_mapping['FLIGHT NOT AVAILABLE'] = 'YET TO UPDATE'
    website_mapping['Not available'] = 'YET TO UPDATE'
    website_mapping['Make my Trip'] = 'makemytrip'
    website_mapping['www.Skyscanner.com'] = 'YET TO UPDATE'
    website_mapping['www.allianceair.com'] = 'allianceair'
    website_mapping['AIR INDIA'] = 'airindia'
    return website_list, website_mapping

def load_airfare_price_data(file_path):
    revised_airfare_col_names = {
        'state_code': 'nss_state_code', 'statename': 'nss_state_name', 'districtcode': 'nss_district_code',  
        'districtname': 'nss_district_name', 'town_code': 'nss_town_code', 'townname': 'nss_town_name',  
        'quotation': 'nss_market_code', 'week_no': 'price_collection_week_no', 'route_code': 'old_pitem_code',    
        'route_details': 'route_details', 'shopname': 'shop_name', 'priceyear': 'price_year',  
        'pricemonth': 'price_month',  'total_fare': 'item_price',  'remarks': 'price_remarks',
        'sector_code': 'nss_sector_code', 'sector_name': 'nss_sector_name', 'specialcode': 'spcl_code'
    }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            cols = ['state_code', 'Districtcode', 'town_code', 'quotation', 'week_no', 
                    'route_code', 'SpecialCode', 'PriceYear', 'PriceMonth', 'total_fare', 'remarks']
                
            airfare_prices = pd.read_parquet(file_path, columns=cols)
            airfare_prices = airfare_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            
            if airfare_prices.shape[0] == 0:
                print("File with zero records")
                return -1
            
            uploaded_rcount = airfare_prices.shape[0]
            airfare_prices.drop_duplicates(inplace=True)
            
            airfare_prices.columns = airfare_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            airfare_prices.rename(columns=revised_airfare_col_names, inplace=True)

            # Comply the varibales with PSD variable length rules
            # fill the values by zero to a length 2 in statecode in dataframe
            airfare_prices['nss_state_code'] = airfare_prices['nss_state_code'].apply(lambda x: str(x).zfill(state_code_len))
            airfare_prices['nss_district_code'] = airfare_prices['nss_district_code'].apply(lambda x: str(x).zfill(district_code_len))

            sector_df = get_market_master()[['sector_id', 'nss_sector_code', 'nss_sector_name']].drop_duplicates()

            ########################################################################
            airfare_prices['spcl_code'] = airfare_prices['spcl_code'].str.replace(r'[^0-9]', '', regex=True)

            airfare_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_code.values[0]
            airfare_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_name.values[0]

            airfare_prices['nss_town_code'] = airfare_prices['nss_town_code'].apply(lambda x: str(x).zfill(town_code_len))
            airfare_prices['nss_market_code'] = airfare_prices['nss_market_code'].apply(lambda x: str(x).zfill(market_code_len))
            # If any of these variables are na then remove the row
            col_names = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code',  'price_year', 'price_month', 
                            'old_pitem_code', 'spcl_code']
            airfare_prices = airfare_prices.dropna(subset=col_names)

            # Map the market id
            airfare_prices = airfare_prices.merge(get_market_master(sector=urban_sector_id)[['nss_state_code', 'nss_district_code', 
                                                                                            'nss_town_code', 'nss_market_code', 
                                                                                            'state_id', 'sector_id', 'market_id']],
                                        on = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code'],
                                        how='left')
            
            airfare_prices = airfare_prices.merge(airfare_spcl_code_master[['spcl_id', 'spcl_code']],
                                                on='spcl_code',
                                                how='left')
            
            airfare_prices['route_code'] = airfare_prices['old_pitem_code']
            airfare_prices['old_pitem_code'] = airfare_old_item_code

            airfare_prices = airfare_prices.merge(get_pitem_master(),
                                    on ='old_pitem_code',
                                    how='left')
            airfare_prices.drop(columns=['old_pitem_code'], inplace=True)
            airfare_prices = airfare_prices[airfare_prices.pitem_id.notnull()]

            cols_required = ['price_year', 'price_month', 'nss_sector_code', 'nss_state_code', 'nss_district_code', 'nss_town_code', 
                                'nss_market_code', 'pitem_code', 'route_code', 'spcl_code', 'item_price', 'price_remarks',
                                'market_id', 'state_id', 'sector_id', 'spcl_id', 'pitem_id']
            #print(airfare_prices.columns)
            airfare_prices = airfare_prices[cols_required]               
            
            if (airfare_prices.isna().sum()['pitem_id'] > 0):
                print("There is mismatch between transaction data and price item master")
                return -1
            
            if (airfare_prices.isna().sum()['market_id'] > 0):
                print("There is mismatch between transaction data and market master")
                return -1

            # Only filter out the items for which weights are available
            airfare_prices = airfare_prices.merge(get_final_pitem_list(),
                                                on = ['state_id', 'sector_id', 'pitem_id'],
                                                how = "inner")
            
            # remove all characters except digits and dot from the price column in both urban_item_prices and rural_item_prices
            airfare_prices['item_price'] = airfare_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            airfare_prices['item_price'] = airfare_prices['item_price'].replace('', 0.0)
            # convert the price in both urban_item_prices and rural_item_prices to float
            airfare_prices['item_price'] = airfare_prices['item_price'].astype(float).round(2)
            # Add a price column for saving imputed item prices
            airfare_prices['revised_item_price'] = airfare_prices['item_price']

            airfare_prices['price_imputed'] = 0
            
            airfare_prices.loc[:, 'price_month_year'] = pd.to_datetime(airfare_prices['price_year'].astype(str) + '-' + 
                                                    airfare_prices['price_month'].astype(str), format='%Y-%m')
            
            # convert price_month and price_year to integer32
            airfare_prices['price_year'] = airfare_prices['price_year'].astype('int32')
            airfare_prices['price_month'] = airfare_prices['price_month'].astype('int32')

            # Add information related to uploader and private status i.e. provisional / final
            airfare_prices['price_data_status'] = price_data_status
            airfare_prices['iteration_id'] = iteration_id

            final_rcount = airfare_prices.shape[0]

            return airfare_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e
    else:
        raise FileNotFoundError(f"The file {file_path} does not exist or is not an Excel file.")
    

def load_hr_price_data(file_path, sector_code):

    revised_hr_col_names = {  
    'state_code': 'nss_state_code', 'state_name': 'nss_state_name', 'districtcode': 'nss_district_code',  
    'district_name': 'nss_district_name', 'town_code': 'nss_town_code', 'town_name': 'nss_town_name',
    'village_code': 'nss_village_code', 'village_name': 'nss_village_name', 'quotation': 'nss_market_code',
    'dwellingcode': 'dwelling_code', 'dwelling_unit_serial_number' : 'dwelling_sr_no', 
    'dwelling_status': 'dwelling_status', 'year': 'price_year',  'total_rent': 'total_rent_payable',
    'total_rent_six_month_ago': 'total_rent_six_month_ago', 'remarks': 'price_remarks', 'category_name': 'house_category', 
    'sector_code': 'sector_code', 'sector_name': 'sector_name', 'priceyear': 'price_year', 'pricemonth': 'price_month', 
    'month': 'price_month', 'year': 'price_year'
    }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet')

    # Check if the file exists and is a parquet file
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:

            hr_prices = pd.read_parquet(file_path)
            hr_prices = hr_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            
            if hr_prices.shape[0] == 0:
                print("File with zero records")
                return -1
            
            uploaded_rcount = hr_prices.shape[0]
            hr_prices.drop_duplicates(inplace=True)
            
            hr_prices.columns = hr_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            hr_prices.rename(columns=revised_hr_col_names, inplace=True)

            # Comply the varibales with PSD variable length rules
            # fill the values by zero to a length 2 in statecode in dataframe
            hr_prices['nss_state_code'] = hr_prices['nss_state_code'].apply(lambda x: str(x).zfill(state_code_len))
            hr_prices['nss_district_code'] = hr_prices['nss_district_code'].apply(lambda x: str(x).zfill(district_code_len))
            # If dwelling status is NULL then impute with Original
            hr_prices['dwelling_status'] = hr_prices['dwelling_status'].fillna('Original')
            hr_prices['dwelling_status_code'] = hr_prices['dwelling_status'].map(dwelling_code_mapping)
            hr_prices['old_pitem_code'] = hr_old_item_code

            sector_df = get_market_master()[['sector_id', 'nss_sector_code', 'nss_sector_name']].drop_duplicates()

            if sector_code == sector_df[sector_df.nss_sector_name == rural_sector_name].sector_id.values[0]:
                hr_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
                hr_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_name.values[0]
                hr_prices['nss_village_code'] = hr_prices['nss_village_code'].apply(lambda x: str(x).zfill(village_code_len))
                # If any of these variables are na then remove the row
                col_names = ['nss_state_code', 'nss_district_code', 'nss_village_code', 'dwelling_code', 'dwelling_status_code', 
                             'house_category', 'price_year', 'price_month']
                hr_prices = hr_prices.dropna(subset=col_names)

                # Map the market id
                market_info = get_market_master(sector=rural_sector_id)[['nss_village_code', 'state_id', 'market_id']].drop_duplicates()
                hr_prices = hr_prices.merge(market_info,
                                            on = ['nss_village_code'],
                                            how='left')
                
                # Temporarily drop all columns
                #hr_prices.drop(columns=['nss_state_name', 'ro_code', 'ro_name', 'sro_code', 'sro_name', 'nss_village_code', 'nss_district_name', 'nss_sector_name', 
                #                        'no_living_room', 'dwelling_status'], inplace=True)
                cols_required = ['price_month', 'price_year', 'nss_sector_code', 'nss_state_code', 'nss_district_code', 'nss_village_code', 'dwelling_code', 
                                 'dwelling_status_code', 'dwelling_sr_no', 'house_category', 'total_rent_payable', 'total_rent_six_month_ago', 
                                 'price_remarks', 'old_pitem_code', 'market_id', 'state_id']
                hr_prices = hr_prices[cols_required]
                
            elif sector_code == sector_df[sector_df.nss_sector_name == urban_sector_name].sector_id.values[0]:
                hr_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_code.values[0]
                hr_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_name.values[0]
                hr_prices['nss_town_code'] = hr_prices['nss_town_code'].apply(lambda x: str(x).zfill(town_code_len))
                hr_prices['nss_market_code'] = hr_prices['nss_market_code'].apply(lambda x: str(x).zfill(market_code_len))
                # If any of these variables are na then remove the row
                col_names = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code', 'dwelling_code', 
                             'dwelling_status_code', 'house_category', 'price_year', 'price_month']
                hr_prices = hr_prices.dropna(subset=col_names)
                market_info = get_market_master(sector=urban_sector_id)[['nss_state_code', 'nss_district_code', 'nss_town_code', 
                                                                         'nss_market_code', 'state_id', 'market_id']].drop_duplicates()
                hr_prices = hr_prices.merge(market_info,
                                        on = ['nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code'],
                                        how='left')
                cols_required = ['price_month', 'price_year', 'nss_sector_code', 'nss_state_code', 'nss_district_code', 'nss_town_code', 'nss_market_code', 
                                 'dwelling_code', 'dwelling_status_code', 'dwelling_sr_no', 'house_category', 'total_rent_payable', 
                                 'total_rent_six_month_ago', 'price_remarks', 'old_pitem_code', 'market_id', 'state_id']
                hr_prices = hr_prices[cols_required]               

            hr_prices = hr_prices.merge(get_pitem_master(),
                                        on ='old_pitem_code',
                                        how='left')
            hr_prices.drop(columns=['old_pitem_code'], inplace=True)

            if (hr_prices.isna().sum()['pitem_id'] > 0):
                print("There is mismatch between transaction data and price item master")
                return -1
            
            if (hr_prices.isna().sum()['market_id'] > 0):
                print("There is mismatch between transaction data and market master")
                return hr_prices, 0, 0
                return -1

            # remove all characters except digits and dot from the price column in both urban_item_prices and rural_item_prices
            hr_prices['total_rent_payable'] = hr_prices['total_rent_payable'].str.replace(r'[^0-9.]', '', regex=True)
            hr_prices['total_rent_six_month_ago'] = hr_prices['total_rent_six_month_ago'].str.replace(r'[^0-9.]', '', regex=True)
            hr_prices.loc[((hr_prices.total_rent_payable == "") | hr_prices.total_rent_payable.isna()), 'total_rent_payable'] = '0'
            hr_prices.loc[((hr_prices.total_rent_six_month_ago == "") | hr_prices.total_rent_six_month_ago.isna()), 'total_rent_six_month_ago'] = '0'

            # convert the price in both urban_item_prices and rural_item_prices to float
            hr_prices['total_rent_payable'] = hr_prices['total_rent_payable'].astype(float).round(2)
            hr_prices['total_rent_six_month_ago'] = hr_prices['total_rent_six_month_ago'].astype(float).round(2)
            
            hr_prices['revised_total_rent_payable'] = hr_prices['total_rent_payable']
            hr_prices['price_imputed'] = 0
            
            hr_prices.loc[:, 'price_month_year'] = pd.to_datetime(hr_prices['price_year'].astype(str) + '-' + 
                                                    hr_prices['price_month'].astype(str), format='%Y-%m')
            # convert the price_month and price_year to integer
            hr_prices['price_month'] = hr_prices['price_month'].astype('int32')
            hr_prices['price_year'] = hr_prices['price_year'].astype('int32')
            
            # Consider the dwellings for which index created in the base year.
            hr_prices = hr_prices.merge(get_hr_category_list(),
                                       on = ['nss_sector_code', 'nss_state_code', 'house_category'],
                                        how = "inner")
            
            # Add information related to uploader and private status i.e. provisional / final
            hr_prices['price_data_status'] = price_data_status
            hr_prices['iteration_id'] = iteration_id

            final_rcount = hr_prices.shape[0]

            return hr_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e
    else:
        raise FileNotFoundError(f"The file {file_path} does not exist or is not an Excel file.")
    
# Carry forwarding the prices which are not collected this month
def get_all_hr_prices(curr_price_df, prev_price_df):

    # Remove any dwelling which is new in current month prices as compared to last month prices
    #curr_price_df = curr_price_df[curr_price_df.dwelling_code.isin(prev_price_df['dwelling_code'].unique())]

    print(curr_price_df.shape)

    prev_price_cflag = curr_price_df[['market_id', 'state_id', 'dwelling_code', 'total_rent_payable']].copy()
    prev_price_df = prev_price_df.copy()

    # Add a carry forward of price flag which is 0 if prices are collected in current month
    # If all prices across all state is zero, then carry forward all prices from previous month
    if (prev_price_cflag['total_rent_payable'] == 0).sum() == prev_price_cflag.shape[0]:
        prev_price_cflag['cflag'] = 1
    else:        
        prev_price_cflag['cflag'] = 0
        # check if all total_rent_payable is zero for all dwellings in a state
        prev_price_cflag['cflag'] = prev_price_cflag.groupby('state_id')['total_rent_payable'].transform(
            lambda x: 1 if (x == 0).all() else 0)
    
    # remove the total_rent_payable column from prev_price_cflag
    prev_price_cflag.drop(columns=['total_rent_payable', 'state_id'], inplace=True)

    cfwd_price = prev_price_df.merge(prev_price_cflag,
                                     on = ['market_id', 'dwelling_code'],
                                     how='left')

    # fill the cflag na values with 1
    cfwd_price['cflag'] = cfwd_price['cflag'].fillna(1)

    cfwd_price = cfwd_price[cfwd_price.cflag == 1]
    cfwd_price.drop(columns=['cflag'], inplace=True)

    # remove any dwelling which is new in current month but with total_rent_payable zero
    prev_price_df['flag'] = 1
    curr_price_df = curr_price_df.merge(prev_price_df[['market_id', 'dwelling_code', 'flag']].drop_duplicates(),
                                        on = ['market_id', 'dwelling_code'],
                                        how='left')
    mask = (curr_price_df['flag'].isna()) & (curr_price_df['total_rent_payable'] == 0.0)
    curr_price_df = curr_price_df[~mask].copy()
    curr_price_df.drop(columns=['flag'], inplace=True)
    prev_price_df.drop(columns=['flag'], inplace=True)
    # end of removal of new dwellings with zero prices

    if cfwd_price.shape[0] > 0:
        # Assign dwelling status code as 1 for all carry forwarded prices
        #cfwd_price.loc[(cfwd_price.dwelling_status_code != 2), 'dwelling_status_code'] = 1
        #cfwd_price.loc[(cfwd_price.dwelling_status_code != 2), 'price_imputed'] = 0
        cfwd_price.loc[:, 'dwelling_status_code'] = 1
        cfwd_price.loc[:, 'price_imputed'] = 0

        print(cfwd_price.shape)

        cfwd_price['price_month_year'] = curr_price_df.price_month_year.values[0]
        cfwd_price['price_month'] = curr_price_df.price_month_year.dt.month.values[0]
        cfwd_price['price_year'] = curr_price_df.price_month_year.dt.year.values[0]
        # convert the price_month and price_year to integer 32
        cfwd_price['price_month'] = cfwd_price['price_month'].astype('int32')
        cfwd_price['price_year'] = cfwd_price['price_year'].astype('int32')

        cfwd_price['price_data_status'] = curr_price_df.price_data_status.values[0]
        cfwd_price['iteration_id'] = curr_price_df.iteration_id.values[0]
        
        # append the previous month prices to current month prices
        if cfwd_price.shape[0] == 0:
            print("Received new prices for all markets and dwellings")
        else:
            curr_price_df = pd.concat([curr_price_df, cfwd_price], ignore_index=True)
            curr_price_df.drop_duplicates(inplace=True)
    else:
        print("No prices required to be carry forward from previous month")
    
    return curr_price_df

def intercategory_imputation_factor(comb_df):
    if comb_df.shape[0] == 0:
        print("Empty DataFrame")
        return comb_df
    # if house_category is Group 4 then impute the prices from lower groups which is having non-zero imputation factor
    
    mask = (comb_df['house_category'] == 'Group 4')
    comb_df.loc[mask, 'imputation_factor'] = np.where(
        comb_df[mask]['Group 4'] != 0, comb_df[mask]['Group 4'],
        np.where(
            comb_df[mask]['Group 3'] != 0, comb_df[mask]['Group 3'],
            np.where(
                comb_df[mask]['Group 2'] != 0, comb_df[mask]['Group 2'],
                comb_df[mask]['Group 1']

            )
        )
    )
    mask = (comb_df['house_category'] == 'Group 3')
    comb_df.loc[mask, 'imputation_factor'] = np.where(
        comb_df[mask]['Group 3'] != 0, comb_df[mask]['Group 3'],
        np.where(
            comb_df[mask]['Group 2'] != 0, comb_df[mask]['Group 2'],
            np.where(
                comb_df[mask]['Group 4'] != 0, comb_df[mask]['Group 4'],
                comb_df[mask]['Group 1']
            )
        )
    )

    mask = (comb_df['house_category'] == 'Group 2')
    comb_df.loc[mask, 'imputation_factor'] = np.where(
        comb_df[mask]['Group 2'] != 0, comb_df[mask]['Group 2'],
        np.where(
            comb_df[mask]['Group 1'] != 0, comb_df[mask]['Group 1'],
            np.where(
                comb_df[mask]['Group 3'] != 0, comb_df[mask]['Group 3'],
                comb_df[mask]['Group 4']
            )
        )
    )

    mask = (comb_df['house_category'] == 'Group 1')
    comb_df.loc[mask, 'imputation_factor'] = np.where(
        comb_df[mask]['Group 1'] != 0, comb_df[mask]['Group 1'],
        np.where(
            comb_df[mask]['Group 2'] != 0, comb_df[mask]['Group 2'],
            np.where(
                comb_df[mask]['Group 3'] != 0, comb_df[mask]['Group 3'],
                comb_df[mask]['Group 4']
            )
        )
    )
    return comb_df


def load_elect_price_data(file_path, sector_code):
    revised_elect_col_names = { 
    'state_code': 'nss_state_code', 'state_name': 'nss_state_name', 'districtcode': 'nss_district_code',  
    'district_name': 'nss_district_name', 'towncode': 'nss_town_code', 'townname': 'nss_town_name',
    'village_code': 'nss_village_code', 'villag_ename': 'nss_village_name', 'discom_code': 'nss_discom_code',
    'discomname': 'nss_discom_name', 'week': 'price_collection_week_no', 'item_code': 'old_pitem_code',
    'item_name': 'old_pitem_name', 'unit': 'unit', 'specialcode': 'spcl_code', 'priceyear': 'price_year',  
    'pricemonth': 'price_month', 'price': 'item_price', 'remarks': 'price_remarks',
    'sector_code': 'nss_sector_code', 'sector_name': 'nss_sector_name', 'date_of_price_collection': 'price_date'
    }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            print("Reading Started...")
            if sector_code == 1:
                cols = ['state_code', 'discom_code', 'discom_name', 'item_code', 'item_name', 
                        'PriceYear', 'PriceMonth', 'price', 'SpecialCode', 'remarks']
            elif sector_code == 2:
                cols = ['state_code', 'discom_code', 'discom_name', 'item_code', 'item_name', 
                        'PriceYear', 'PriceMonth', 'price', 'SpecialCode', 'remarks']
                
            elect_prices = pd.read_parquet(file_path, columns=cols)
            elect_prices = elect_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

            if elect_prices.shape[0] == 0:
                print("File with zero records")
                return -1
            
            uploaded_rcount = elect_prices.shape[0]
            elect_prices.drop_duplicates(inplace=True)

            #print(elect_prices.shape)
            
            elect_prices.columns = elect_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            elect_prices.rename(columns=revised_elect_col_names, inplace=True)

            if 'spcl_code' not in elect_prices.columns:
                elect_prices['spcl_code'] = '0'
            else:
                elect_prices['spcl_code'] = elect_prices['spcl_code'].str.replace(r'[^0-9]', '', regex=True)

            # convert spcl_code to integer and assign to spcl_id
            elect_prices['spcl_id'] = elect_prices['spcl_code'].astype(int)

            if 'price_collection_week_no' not in elect_prices.columns:
                elect_prices['price_collection_week_no'] = 3
            else:
                elect_prices['price_collection_week_no'] = elect_prices['price_collection_week_no'].astype(int)

            if 'unit' not in elect_prices.columns:
                elect_prices['unit'] = 'KWh'

            col_names = ['nss_state_code', 'nss_discom_code', 'old_pitem_code', 'spcl_code', 'price_year', 'price_month']
            elect_prices = elect_prices.dropna(subset=col_names)

            # Comply the varibales with PSD variable length rules
            # fill the values by zero to a length 2 in statecode in dataframe
            elect_prices['nss_state_code'] = elect_prices['nss_state_code'].apply(lambda x: str(x).zfill(state_code_len))
            elect_prices['nss_discom_code'] = elect_prices['nss_discom_code'].apply(lambda x: str(x).zfill(discom_code_len))

            units_mapping = {
                "5.1.01.1.1.01.1" : 100,
                "5.1.01.1.1.01.2" : 200,
                "5.1.01.1.1.01.3" : 300,
                "5.1.01.1.1.01.4" : 400
            }

            # assign total_units_price from units_mapping using old_pitem_code and units_mapping
            elect_prices['total_units_price'] = elect_prices['old_pitem_code'].map(units_mapping)

            # Consider only third week price for monthly compilation process
            # remove all characters except digits and dot from the price column in both urban_item_prices and rural_item_prices
            elect_prices['item_price'] = elect_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            elect_prices.loc[((elect_prices.item_price == "") | elect_prices.item_price.isna()), 'item_price'] = '0'
            # convert the price in both urban_item_prices and rural_item_prices to float
            elect_prices['item_price'] = elect_prices['item_price'].astype(float).round(2)
            elect_prices['revised_item_price'] = elect_prices['item_price']
            elect_prices['price_imputed'] = 0

            elect_prices = elect_prices.merge(get_pitem_master(),
                                        on ='old_pitem_code',
                                        how='left')
            
            elect_prices.drop(columns=['old_pitem_code'], inplace=True)
            
            sector_df = get_market_master()[['sector_id', 'nss_sector_code', 'nss_sector_name']].drop_duplicates()

            #print(elect_prices.shape)
            if sector_code == sector_df[sector_df.nss_sector_name == rural_sector_name].sector_id.values[0]:
                elect_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
                elect_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_name.values[0]
                
            elif sector_code == sector_df[sector_df.nss_sector_name == urban_sector_name].sector_id.values[0]:
                elect_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_code.values[0]
                elect_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_name.values[0]
                
            state_sector_df = get_market_master()[['nss_state_code', 'nss_sector_code', 'state_id', 'sector_id']].drop_duplicates()
            elect_prices = elect_prices.merge(state_sector_df,
                                        on = ['nss_state_code', 'nss_sector_code'],
                                        how='left')
            
            elect_prices['units_slab'] = pd.cut(elect_prices['total_units_price'],
                                                bins=[0, 100, 200, 300, np.inf],
                                                labels=['0-100', '0-200', '0-300', '0-300+'])
            
            cols_required = ['price_month', 'price_year', 'nss_sector_code', 'nss_state_code', 'nss_discom_code', 'total_units_price', 
                             'units_slab', 'item_price', 'revised_item_price', 'price_imputed', 'pitem_code', 'state_id', 
                             'sector_id', 'pitem_id', 'price_collection_week_no', 'spcl_code', 'spcl_id', 'price_remarks']
            elect_prices = elect_prices[cols_required]              

            if (elect_prices.isna().sum()['pitem_id'] > 0):
                print("There is mismatch between transaction data and price item master")
                return -1
            
            if (elect_prices.isna().sum()['state_id'] > 0):
                print("There is mismatch between transaction data and market master")
                return -1
            #print(elect_prices.shape)            
            
            elect_prices.loc[:, 'price_month_year'] = pd.to_datetime(elect_prices['price_year'].astype(str) + '-' + 
                                                    elect_prices['price_month'].astype(str), format='%Y-%m')
            
            elect_prices['price_month'] = elect_prices['price_month'].astype('int32')
            elect_prices['price_year'] = elect_prices['price_year'].astype('int32')

            # Add information related to uploader and private status i.e. provisional / final
            elect_prices['price_data_status'] = price_data_status
            elect_prices['iteration_id'] = iteration_id

            final_rcount = elect_prices.shape[0]

            return elect_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e
    else:
        raise FileNotFoundError(f"The file {file_path} does not exist or is not an Excel file.")


def load_pds_price_data(file_path, sector_code=2):
    revised_pds_col_names = { 
    # 'zoneid': 'zone_id',
    'state_no': 'nss_state_code', 'state_name': 'nss_state_name', 'districtcode': 'nss_district_code',  
    'district_name': 'nss_district_name', 'villagecode': 'nss_village_code', 'villagename': 'nss_village_name', 
    'town_code': 'nss_town_code', 'town_name': 'nss_town_name', 'quotationcode': 'nss_market_code', 
    'week': 'price_collection_week_no', 'item_code': 'old_pitem_code', 'item_name': 'old_pitem_name',
    'unit': 'unit', 'quantity': 'quantity', 'whether_distributed_current_month': 'distribution_status',  'priceyear': 'price_year',  
    'pricemonth': 'price_month', 'itemprice': 'item_price', 'pricereamrk': 'price_remarks', 'sector_code': 'nss_sector_code', 
    'sector_name': 'nss_sector_name'
    }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            print("Reading Started...")
            pds_prices = pd.read_parquet(file_path)
            pds_prices = pds_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

            if pds_prices.shape[0] == 0:
                print("File with zero records")
                return -1
            
            uploaded_rcount = pds_prices.shape[0]
            pds_prices.drop_duplicates(inplace=True)
            
            # --- Clean and standardize column names ---
            pds_prices.columns = (
                pds_prices.columns
                .str.strip()         # Remove leading/trailing spaces
                .str.lower()         # Convert to lowercase
                .str.replace(r'\s+', '_', regex=True)  # Replace spaces with underscores
            )

            # --- Rename columns using the revised mapping dictionary ---
            pds_prices.rename(columns=revised_pds_col_names, inplace=True)

            # --- Comply with PDS variable length rules ---
            # Pad codes with leading zeros to fixed lengths
            pds_prices['nss_state_code'] = pds_prices['nss_state_code'].apply(lambda x: str(x).zfill(state_code_len))
            required_cols = ['nss_state_code', 'old_pitem_code', 'price_year', 'price_month', 'distribution_status']
            pds_prices = pds_prices.dropna(subset=required_cols)

            # convert distribution_status from Yes/No to 1/2
            distribution_status_mapping = {
                'Yes': 1,
                'No': 2
            }

            pds_prices['distribution_status'] = pds_prices['distribution_status'].map(distribution_status_mapping)
            # fill na values in distribution_status with 2 (considering not distributed if the information is not available)
            pds_prices['distribution_status'] = pds_prices['distribution_status'].fillna(2)

            pds_prices['price_remarks'] = ""

            sector_df = get_market_master()[['sector_id', 'nss_sector_code', 'nss_sector_name']].drop_duplicates()

            # --- Urban Sector fixed setup ---
            pds_prices['nss_sector_code'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_code.values[0]
            pds_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == urban_sector_name].nss_sector_name.values[0]

            # replicate the same prices to rural sector as well
            rural_prices = pds_prices.copy()
            rural_prices["nss_sector_code"] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
            pds_prices['nss_sector_name'] = sector_df[sector_df.nss_sector_name == rural_sector_name].nss_sector_code.values[0]
            
            pds_prices = pd.concat([pds_prices, rural_prices], ignore_index=True)
            del rural_prices

            # --- Merge market_id from market master for urban sector ---
            market_master = get_market_master()[['nss_state_code', 'nss_sector_code', 
                                                 'sector_id', 'state_id']].drop_duplicates()

            pds_prices = pds_prices.merge(
                market_master,
                on=['nss_state_code', 'nss_sector_code'],
                how='left'
            )        

            pds_prices = pds_prices.merge(get_pitem_master(),
                                        on ='old_pitem_code',
                                        how='left')
            
            pds_prices = pds_prices.merge(get_pitem_type(),
                                        on ='pitem_id',
                                        how='left') 

            # Filter out the free items from PDS price data. Only Non-free items are considered for price compilation
            pds_prices = pds_prices[pds_prices['item_type_id'] == 3]

            required_cols = ['price_month', 'price_year', 'nss_sector_code', 'nss_state_code', 'pitem_code', 'item_price', 
                             'distribution_status', 'item_type_id', 'price_remarks', 'state_id', 'sector_id', 'pitem_id']
            pds_prices = pds_prices[required_cols]

            pds_prices.loc[:, 'price_month_year'] = pd.to_datetime(pds_prices['price_year'].astype(str) + '-' + 
                                                             pds_prices['price_month'].astype(str), format='%Y-%m')
            
            # Only take the items for which weights are available
            pds_prices = pds_prices.merge(get_final_pitem_list(),
                                          on = ['state_id', 'sector_id', 'pitem_id'],
                                          how = "inner")
            
            # convert the price_month and price_year to integer
            pds_prices['price_month'] = pds_prices['price_month'].astype('int32')
            pds_prices['price_year'] = pds_prices['price_year'].astype('int32')
            pds_prices['state_id'] = pds_prices['state_id'].astype('int32')
            pds_prices['sector_id'] = pds_prices['sector_id'].astype('int32')
            
            # remove all characters except digits and dot from the price column in both urban_item_prices and rural_item_prices
            pds_prices['item_price'] = pds_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            pds_prices.loc[((pds_prices.item_price == "") | pds_prices.item_price.isna()), 'item_price'] = '0'

            # convert the price in both urban_item_prices and rural_item_prices to float
            pds_prices['item_price'] = pds_prices['item_price'].astype(float)
            pds_prices['revised_item_price'] = pds_prices['item_price']
            pds_prices['price_imputed'] = 0

            # Add information related to uploader and private status i.e. provisional / final
            pds_prices['price_data_status'] = price_data_status
            pds_prices['iteration_id'] = iteration_id

            final_rcount = pds_prices.shape[0]

            return pds_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e
    else:
        raise FileNotFoundError(f"The file {file_path} does not exist or is not an Excel file.")
    
fuel_type = {
    1 : 437, # Petrol pitem_id
    2 : 436, # Diesel pitem_id
    3 : 283, # LPG pitem_id
    4 : 438, # CNG pitem_id
    5 : 284 # PNG
}

def load_fuel_price_data(file_path, fuel_type_id):

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if file_path.endswith('.parquet') and os.path.exists(file_path) and fuel_type_id in fuel_type.keys():
        try:
            print("Reading Started...")
            fuel_prices = pd.read_parquet(file_path)
            fuel_prices = fuel_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            if fuel_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = fuel_prices.shape[0]
            #fuel_prices.drop_duplicates(inplace=True)

            fuel_prices.columns = fuel_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            #fuel_prices.rename(columns=revised_fuel_col_names, inplace=True)

            # add the nss_state_code and nss_sector_id columns and pitem_id and pitem_code
            # convert state_id and nss_state_code into dict
            state_df = get_market_master()[["state_id", "nss_state_code"]].drop_duplicates()

            pitem_df = get_coicop_names_codes()[["pitem_id", "pitem_code", "pitem_name", "item_type_id"]].drop_duplicates()

            pitem_df = pitem_df[pitem_df['item_type_id'] == 11]  # fuel items only

            # convert fuel_prices state_id to int
            fuel_prices['state_id'] = fuel_prices['state_id'].astype(int)

            if 'nss_state_code' not in fuel_prices.columns:
                fuel_prices = fuel_prices.merge(state_df,
                                            on ='state_id',
                                            how='left')
            fuel_prices['pitem_id'] = fuel_type[fuel_type_id]
            fuel_prices['pitem_code'] = pitem_df.pitem_code[pitem_df.pitem_id == fuel_type[fuel_type_id]].values[0]
            fuel_prices['pitem_name'] = pitem_df.pitem_name[pitem_df.pitem_id == fuel_type[fuel_type_id]].values[0]

            # rename columns petrol_price_per_ltr, diesel_price_per_ltr, lpg_price_per_cyl, cng_price_per_kg, png_price_per_kg
            # and png_price_per_scm to item_price
            fuel_prices.rename(columns={
                'petrol_price_per_ltr': 'item_price',
                'diesel_price_per_ltr': 'item_price',
                'lpg_price_per_cyl': 'item_price',
                'cng_price_per_kg': 'item_price',
                'png_price_per_scm': 'item_price'
            }, inplace=True)

            # if any blank or na in item_price column, replace with 0
            fuel_prices['item_price'] = fuel_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            fuel_prices.loc[((fuel_prices.item_price == "") | fuel_prices.item_price.isna()), 'item_price'] = '0'

            # convert item_price to float, state_id, sector_id, pitem_id to int
            fuel_prices['item_price'] = fuel_prices['item_price'].astype(float)
            fuel_prices['state_id'] = fuel_prices['state_id'].astype(int)
            fuel_prices['pitem_id'] = fuel_prices['pitem_id'].astype(int)
            if 'district_id' in fuel_prices.columns:
                fuel_prices['district_id'] = fuel_prices['district_id'].astype(int)
            if 'sector_id' in fuel_prices.columns:
                fuel_prices['sector_id'] = fuel_prices['sector_id'].astype(int)
            # convert price_month_year to datetime
            fuel_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + fuel_prices['price_month'].astype(str).str.zfill(2) + 
                                                                    '-' + fuel_prices['price_year'].astype(str), format='%d-%m-%Y')
            
            fuel_prices['revised_item_price'] = fuel_prices['item_price']
            fuel_prices['price_imputed'] = 0

            #print(fuel_prices.columns)
            if fuel_type_id == 1 or fuel_type_id == 2:
                # convert omc_name to lower case
                fuel_prices['omc_name'] = fuel_prices['omc_name'].str.lower()
                fuel_prices['nss_dealer_code'] = fuel_prices['omc_name'] + fuel_prices['ppac_dealer_code'].str.zfill(8)
                required_cols = ['price_month', 'price_year', 'nss_state_code', 'nss_dealer_code', 'pitem_id', 'pitem_code',
                                 'pitem_name', 'item_price', 'revised_item_price', 'price_imputed', 'state_id', 'sector_id', 
                                 'ppac_dealer_code', 'ppac_dealer_name', 'price_month_year']
            elif fuel_type_id == 3:
                fuel_prices['omc_name'] = fuel_prices['omc_name'].str.lower()
                fuel_prices['nss_distributor_code'] = fuel_prices['omc_name']  + fuel_prices['ppac_distributor_code'].str.zfill(10)
                required_cols = ['price_month', 'price_year', 'nss_state_code', 'nss_distributor_code', 'pitem_id', 'pitem_code',
                                 'pitem_name', 'item_price', 'revised_item_price', 'price_imputed', 'state_id', 'sector_id', 
                                 'ppac_distributor_code', 'ppac_distributor_name', 'price_month_year']
            elif fuel_type_id == 4 or fuel_type_id == 5:
                # convert district_id to int
                fuel_prices['nss_ga_id'] = fuel_prices['state_id'].astype(str) + fuel_prices['ppac_ga_id'].str.zfill(6) \
                    + fuel_prices['district_id'].astype(str).str.zfill(3)
                fuel_prices['nss_ga_id'] = fuel_prices['state_id'].astype(str) + fuel_prices['ppac_ga_id'].str.zfill(6) \
                    + fuel_prices['district_id'].astype(str).str.zfill(3)
                required_cols = ['price_month', 'price_year', 'nss_state_code', 'nss_ga_id', 'pitem_id', 'pitem_code',
                                 'pitem_name', 'item_price', 'revised_item_price', 'price_imputed', 'state_id', 
                                 'district_id', 'ppac_ga_id', 'ppac_cgd_entity', 'price_month_year']
                
            # check if the fuel weight is not available, then exclude those records from that state
            item_to_include = get_pitem_exp_share()[['state_id', 'sector_id', 'pitem_id']]
            if 'sector_id' not in fuel_prices.columns:
                fuel_prices = fuel_prices.merge(item_to_include[['state_id', 'pitem_id']].drop_duplicates(),
                                              on = ['state_id', 'pitem_id'],
                                              how = "inner")
            else:
                fuel_prices = fuel_prices.merge(item_to_include,
                                              on = ['state_id', 'sector_id', 'pitem_id'],
                                              how = "inner")
                
            fuel_prices = fuel_prices[required_cols]
            # convert price_month, price_year to int32
            fuel_prices['price_month'] = fuel_prices['price_month'].astype('int32')
            fuel_prices['price_year'] = fuel_prices['price_year'].astype('int32')
            fuel_prices['pitem_id'] = fuel_prices['pitem_id'].astype('int32')
            fuel_prices['state_id'] = fuel_prices['state_id'].astype('int32')
            if 'sector_id' in fuel_prices.columns:
                fuel_prices['sector_id'] = fuel_prices['sector_id'].astype('int32')
            if 'district_id' in fuel_prices.columns:
                fuel_prices['district_id'] = fuel_prices['district_id'].astype('int32')

            # Add information related to uploader and private status i.e. provisional / final
            fuel_prices['price_data_status'] = price_data_status
            fuel_prices['iteration_id'] = iteration_id
            final_rcount = fuel_prices.shape[0]
            return fuel_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")
            raise e


def load_telecom_price_data(file_path):
    col_rename = {
        'state_code': 'nss_state_code',
        'state code': 'nss_state_code',
        'operator': 'operator_name',
        'item_code': 'pitem_code',
        'item code': 'pitem_code',
        'validity': 'validity_days',
        'plan details': 'plan_details',
        'price': 'item_price',
        'plan id': 'plan_id',
        'priceyear': 'price_year',
        'pricemonth': 'price_month'
    }

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    # Check if the file exists and is a excel file
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            #print("Reading Started...")
            cols_req = ["State Code", "Plan ID", "State Name",	"Operator", "Plan", "Item Code", "Validity", 
                        "Plan Details", "Price", "Per day rate", "price_month", "price_year"]
            telecom_prices = pd.read_parquet(file_path, columns=cols_req)
            telecom_prices = telecom_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            if telecom_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = telecom_prices.shape[0]
            telecom_prices.drop_duplicates(inplace=True)

            # replace anything except whitespace and alphanumeric characters in column names with ''
            telecom_prices.columns = telecom_prices.columns.str.replace(r'[^\w\s]', '', regex=True)
            telecom_prices.columns = telecom_prices.columns.str.replace(r'\s+', '_').str.strip().str.lower()
            telecom_prices.rename(columns=col_rename, inplace=True)

            cols_req = ['nss_state_code', 'operator_name', 'pitem_code', 'plan_id', 'validity_days', 'plan_details', 
                        'item_price', 'price_month', 'price_year']
            telecom_prices = telecom_prices[cols_req]

            # if remarks is not present, then create a remarks column with blank values
            if 'remarks' in telecom_prices.columns:
                telecom_prices.loc['remarks'] = ""

            # remove all except number from plan id and convert it into int
            telecom_prices['plan_id'] = telecom_prices['plan_id'].str.replace(r'[^0-9.]', '', regex=True)
            # remove any plans with no plan id
            telecom_prices = telecom_prices[telecom_prices['plan_id'].notna() & (telecom_prices['plan_id'] != "")]
            telecom_prices['plan_id'] = telecom_prices['plan_id'].astype(int)

            state_ids = get_market_master()[["nss_state_code", "state_id"]].drop_duplicates()

            # merge state_id from market master
            telecom_prices = telecom_prices.merge(state_ids,
                                        on ='nss_state_code',
                                        how='left')
            
            pitem_ids = get_coicop_names_codes()[["pitem_id", "pitem_code"]].drop_duplicates()

            # merge pitem_id from pitem master
            telecom_prices = telecom_prices.merge(pitem_ids,
                                        on ='pitem_code',
                                        how='left')
            # filter only those records which have na in state_id or pitem_id or validity_days or operator_name
            telecom_prices = telecom_prices[telecom_prices['state_id'].notna() &
                                            telecom_prices['pitem_id'].notna() &
                                            telecom_prices['validity_days'].notna() &
                                            telecom_prices['operator_name'].notna()]
            
            # convert operator_name to lower case
            telecom_prices['operator_name'] = telecom_prices['operator_name'].str.lower().str.strip()
            # rename vodafone to vi
            telecom_prices['operator_name'] = telecom_prices['operator_name'].replace({'vodafone': 'vi'})
            
            telecom_prices['validity_days'] = telecom_prices['validity_days'].str.replace(r'[^0-9.]', '', regex=True)
            telecom_prices.loc[((telecom_prices.validity_days == "") | telecom_prices.validity_days.isna()), 'validity_days'] = '0'
            telecom_prices['validity_days'] = telecom_prices['validity_days'].astype(int)
            # convert item_price to float
            telecom_prices['item_price'] = telecom_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            telecom_prices.loc[((telecom_prices.item_price == "") | telecom_prices.item_price.isna()), 'item_price'] = '0'
            telecom_prices['item_price'] = telecom_prices['item_price'].astype(float).round(2)

            # filter out the records where validity_days is less than or equal to zero
            telecom_prices = telecom_prices[telecom_prices['validity_days'] > 0]

            # item_price_per_day calculation
            telecom_prices['item_price_per_day'] = (telecom_prices['item_price'] / telecom_prices['validity_days'])

            # add revised_item_price_per_day column
            telecom_prices['revised_item_price_per_day'] = telecom_prices['item_price_per_day']
            telecom_prices['price_imputed'] = 0

            # convert price_month_year to datetime
            telecom_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + telecom_prices['price_month'].astype(str).str.zfill(2) + 
                                                                    '-' + telecom_prices['price_year'].astype(str), format='%d-%m-%Y')

            # conly select the prices for which weights are available
            telecom_wts_df = get_telecom_operator_wts()[['state_id', 'pitem_id', 'operator_name']]
            telecom_prices = telecom_prices.merge(telecom_wts_df,
                                        on = ['state_id', 'pitem_id', 'operator_name'],
                                        how='inner')
            
            # convert the price_month and price_year to integer
            telecom_prices['price_month'] = telecom_prices['price_month'].astype('int32')
            telecom_prices['price_year'] = telecom_prices['price_year'].astype('int32')
            telecom_prices['state_id'] = telecom_prices['state_id'].astype('int32')

            cols_req = ['price_month', 'price_year', 'nss_state_code', 'pitem_code', 'operator_name', 'plan_id', 'plan_details',
                        'validity_days', 'item_price_per_day', 'revised_item_price_per_day', 'price_imputed', 'item_price', 
                        'state_id', 'pitem_id', 'price_month_year']
            telecom_prices = telecom_prices[cols_req]

            # Add information related to uploader and private status i.e. provisional / final
            telecom_prices['price_data_status'] = price_data_status
            telecom_prices['iteration_id'] = iteration_id
            final_rcount = telecom_prices.shape[0]
            return telecom_prices, uploaded_rcount, final_rcount
        
        except Exception as e:
            print(f"Error : {e}")


def load_railfare_price_data(file_path):

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            print("Reading Started...")
            railfare_prices = pd.read_parquet(file_path)
            railfare_prices = railfare_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            if railfare_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = railfare_prices.shape[0]
            #railfare_prices.drop_duplicates(inplace=True)

            # replace anything except whitespace and alphanumeric characters in column names with ''
            railfare_prices.columns = railfare_prices.columns.str.replace(r'[^\w\s]', '', regex=True)
            railfare_prices.columns = railfare_prices.columns.str.replace(r'\s+', '_').str.strip().str.lower()
            
            # convert item_price to float
            railfare_prices['item_price'] = railfare_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            railfare_prices.loc[((railfare_prices.item_price == "") | railfare_prices.item_price.isna()), 'item_price'] = '0'
            railfare_prices['item_price'] = railfare_prices['item_price'].astype(float)
            # revised_item_price is same as item_price for railfare prices as of now, as there is no revision logic defined for railfare prices yet. This column is added to maintain consistency with other price data and to accommodate any future revision logic if needed.
            railfare_prices['revised_item_price'] = railfare_prices['item_price']
            railfare_prices['price_imputed'] = 0

            # price_month_year column by combining price_month and price_year columns and converting it to datetime format
            railfare_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + railfare_prices['price_month'].astype(str).str.zfill(2) + 
                                                                    '-' + railfare_prices['price_year'].astype(str), format='%d-%m-%Y')
            
            # convert price_month and price_year to int32
            railfare_prices['price_month'] = railfare_prices['price_month'].astype('int32')
            railfare_prices['price_year'] = railfare_prices['price_year'].astype('int32')
            railfare_prices['slab_fare_id'] = railfare_prices['slab_fare_id'].astype('int32')
            railfare_prices['rep_dist_kms'] = railfare_prices['rep_dist_kms'].astype('int32')

            # convert spcl_code to int
            railfare_prices['spcl_code'] = railfare_prices['spcl_code'].str.replace(r'[^0-9.]', '', regex=True)
            railfare_prices.loc[((railfare_prices.spcl_code == "") | railfare_prices.spcl_code.isna()), 'spcl_code'] = '0'
            railfare_prices['spcl_code'] = railfare_prices['spcl_code'].astype('int')
            railfare_prices['price_data_status'] = price_data_status
            railfare_prices['iteration_id'] = iteration_id
            
            required_cols = ['slab_fare_id', 'train_type', 'class_coach', 'dist_slab', 'rep_dist_kms', 'item_price', 
                             'revised_item_price', 'price_imputed', 'spcl_code', 'price_month', 'price_year', 'price_month_year',
                             'price_data_status', 'iteration_id']
            railfare_prices = railfare_prices[required_cols]

            final_rcount = railfare_prices.shape[0]

            return railfare_prices, uploaded_rcount, final_rcount
        except Exception as e:
            print(f"Error : {e}")
            raise e

def load_metro_fare_price_data(file_path):

    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            print("Reading Started...")
            metro_fare_prices = pd.read_parquet(file_path)
            metro_fare_prices = metro_fare_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
            if metro_fare_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = metro_fare_prices.shape[0]
            #metro_fare_prices.drop_duplicates(inplace=True)

            # convert the slab_fare_id, state_id, pitem_id to int32
            metro_fare_prices['slab_fare_id'] = metro_fare_prices['slab_fare_id'].astype('int32')
            metro_fare_prices['spcl_code'] = metro_fare_prices['spcl_code'].str.replace(r'[^0-9.]', '', regex=True)
            metro_fare_prices.loc[((metro_fare_prices.spcl_code == "") | metro_fare_prices.spcl_code.isna()), 'spcl_code'] = '0'
            metro_fare_prices['spcl_code'] = metro_fare_prices['spcl_code'].astype('int')

            # zfill nss_state_code to 2 digits
            metro_fare_prices['nss_state_code'] = metro_fare_prices['nss_state_code'].astype(str).str.zfill(2)

            state_df = get_market_master()[['nss_state_code', 'state_id']].drop_duplicates()
            metro_fare_prices = metro_fare_prices.merge(state_df,
                                        on = 'nss_state_code',
                                        how = 'left')
            
            pitem_df = get_coicop_names_codes()[['pitem_id', 'pitem_code']].drop_duplicates()
            metro_fare_prices = metro_fare_prices.merge(pitem_df,
                                        on = 'pitem_code',
                                        how = 'left')

            # convert time_mins and item_price to float
            metro_fare_prices['time_mins'] = metro_fare_prices['time_mins'].str.replace(r'[^0-9.]', '', regex=True)
            metro_fare_prices.loc[((metro_fare_prices.time_mins == "") | metro_fare_prices.time_mins.isna()), 'time_mins'] = '0'
            metro_fare_prices['time_mins'] = metro_fare_prices['time_mins'].astype(float)
            metro_fare_prices['item_price'] = metro_fare_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            metro_fare_prices.loc[((metro_fare_prices.item_price == "") | metro_fare_prices.item_price.isna()), 'item_price'] = '0'
            metro_fare_prices['item_price'] = metro_fare_prices['item_price'].astype(float)
            metro_fare_prices['revised_item_price'] = metro_fare_prices['item_price']
            metro_fare_prices['price_imputed'] = 0

            # price_month_year column by combining price_month and price_year columns and converting it to datetime format
            metro_fare_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + metro_fare_prices['price_month'].astype(str).str.zfill(2) +
                                                                    '-' + metro_fare_prices['price_year'].astype(str), format='%d-%m-%Y')
            
            metro_fare_prices['price_data_status'] = price_data_status
            metro_fare_prices['iteration_id'] = iteration_id

            cols_required = ['slab_fare_id', 'nss_state_code', 'state_id', 'pitem_code', 'pitem_id',
                             'distance_kms', 'time_mins', 'spcl_code', 'item_price', 'revised_item_price', 
                             'price_imputed', 'price_month_year', 'price_data_status', 'iteration_id']
            
            metro_fare_prices = metro_fare_prices[cols_required]
            final_rcount = metro_fare_prices.shape[0]

            return metro_fare_prices, uploaded_rcount, final_rcount
        except Exception as e:
            print(f"Error : {e}")
            raise e
        
def load_ott_price_data(file_path):
    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')
    
    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            ott_prices = pd.read_parquet(file_path)
            ott_prices = ott_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

            if ott_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = ott_prices.shape[0]

            ott_prices.columns = ott_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            
            # convert plan_id to int32
            ott_prices['plan_id'] = ott_prices['plan_id'].astype('int32')
            # convert item_price to float
            ott_prices['item_price'] = ott_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            ott_prices.loc[((ott_prices.item_price == "") | ott_prices.item_price.isna()), 'item_price'] = '0'
            ott_prices['item_price'] = ott_prices['item_price'].astype(float)
            ott_prices['revised_item_price'] = ott_prices['item_price']
            # convert spcl_code to int
            ott_prices['spcl_code'] = ott_prices['spcl_code'].str.replace(r'[^0-9.]', '', regex=True)
            ott_prices.loc[((ott_prices.spcl_code == "") | ott_prices.spcl_code.isna()), 'spcl_code'] = '0'
            ott_prices['spcl_code'] = ott_prices['spcl_code'].astype(int)

            pitem_df = get_coicop_names_codes()[['pitem_id', 'pitem_code']].drop_duplicates()
            ott_prices = ott_prices.merge(pitem_df,
                                        on = 'pitem_code',
                                        how = 'left')

            # create price_month_year column by combining price_month and price_year columns and converting it to datetime format
            ott_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + ott_prices['price_month'].astype(str).str.zfill(2) + 
                                                                    '-' + ott_prices['price_year'].astype(str), format='%d-%m-%Y')
            ott_prices['price_imputed'] = 0
            ott_prices['price_data_status'] = price_data_status
            ott_prices['iteration_id'] = iteration_id

            cols_required = ['plan_id', 'pitem_code', 'pitem_id', 'ott_provider_name', 'spcl_code',
                             'item_price', 'revised_item_price', 'price_imputed', 'price_month_year',
                             'price_data_status', 'iteration_id']
            
            ott_prices = ott_prices[cols_required]
            final_rcount = ott_prices.shape[0]
            return ott_prices, uploaded_rcount, final_rcount
        except Exception as e:
            print(f"Error : {e}")
            raise e
        

def load_postal_price_data(file_path):
    if not CLOUD_ENV:
        # replace the .xlsx with .parquet in the file path (only in local version, cloud version should use .parquet in the file path directly)
        if file_path.endswith('.xlsx') or file_path.endswith('.csv'):
            file_path = file_path.replace('.xlsx', '.parquet').replace('.csv', '.parquet')

    if file_path.endswith('.parquet') and os.path.exists(file_path):
        try:
            postal_prices = pd.read_parquet(file_path)
            postal_prices = postal_prices.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

            if postal_prices.shape[0] == 0:
                print("File with zero records")
                return -1, 0, 0
            
            uploaded_rcount = postal_prices.shape[0]
            postal_prices.columns = postal_prices.columns.str.strip().str.lower().str.replace(r'\s+', '_')
            # convert plan_id to int32
            postal_prices['plan_id'] = postal_prices['plan_id'].astype('int32')
            
            pitem_df = get_coicop_names_codes()[['pitem_id', 'pitem_code']].drop_duplicates()
            postal_prices = postal_prices.merge(pitem_df,
                                        on = 'pitem_code',
                                        how = 'left')

            # convert item_price to float
            postal_prices['item_price'] = postal_prices['item_price'].str.replace(r'[^0-9.]', '', regex=True)
            postal_prices.loc[((postal_prices.item_price == "") | postal_prices.item_price.isna()), 'item_price'] = '0'
            postal_prices['item_price'] = postal_prices['item_price'].astype(float)
            postal_prices['revised_item_price'] = postal_prices['item_price']
            # convert spcl_code to int
            postal_prices['spcl_code'] = postal_prices['spcl_code'].str.replace(r'[^0-9.]', '', regex=True)
            postal_prices.loc[((postal_prices.spcl_code == "") | postal_prices.spcl_code.isna()), 'spcl_code'] = '0'
            postal_prices['spcl_code'] = postal_prices['spcl_code'].astype(int)
            postal_prices['price_imputed'] = 0
            # create price_month_year column by combining price_month and price_year columns and converting it to datetime format
            postal_prices.loc[:, 'price_month_year'] = pd.to_datetime( '01' + '-' + postal_prices['price_month'].astype(str).str.zfill(2) + 
                                                                    '-' + postal_prices['price_year'].astype(str), format='%d-%m-%Y')
            postal_prices['price_data_status'] = price_data_status
            postal_prices['iteration_id'] = iteration_id

            cols_required = ['plan_id', 'pitem_code', 'pitem_id', 'destination_sector',
                             'weight_slab_gms', 'weight_gms_price_collected', 'distance_dst_name',
                             'service_type', 'spcl_code', 'item_price', 'revised_item_price',
                             'price_imputed', 'price_month_year', 'price_data_status',
                             'iteration_id']
            postal_prices = postal_prices[cols_required]
            final_rcount = postal_prices.shape[0]
            return postal_prices, uploaded_rcount, final_rcount
        except Exception as e:
            print(f"Error : {e}")
            raise e