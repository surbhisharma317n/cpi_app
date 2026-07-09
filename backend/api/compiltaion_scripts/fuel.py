import numpy as np
import pandas as pd
import os
import re

# show all rows and columns when printing a DataFrame
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from  api.upload_input_data.master_data_paths import *


def fuel_price_index_script():

    try:
        
        petrol_curr_month_df = lpdb.get_curr_month_prices(data_type=10)
        petrol_prev_month_df = lpdb.get_prev_month_prices(data_type=10)

        diesel_curr_month_df = lpdb.get_curr_month_prices(data_type=11)
        diesel_prev_month_df = lpdb.get_prev_month_prices(data_type=11)

        lpg_curr_month_df = lpdb.get_curr_month_prices(data_type=12)
        lpg_prev_month_df = lpdb.get_prev_month_prices(data_type=12)

        cng_curr_month_df = lpdb.get_curr_month_prices(data_type=13)
        cng_prev_month_df = lpdb.get_prev_month_prices(data_type=13)

        png_curr_month_df = lpdb.get_curr_month_prices(data_type=14)
        png_prev_month_df = lpdb.get_prev_month_prices(data_type=14)

        fuel_pitem_ids = [int(petrol_curr_month_df.pitem_id.values[0]), int(diesel_curr_month_df.pitem_id.values[0]),
                        int(lpg_curr_month_df.pitem_id.values[0]), int(cng_curr_month_df.pitem_id.values[0]),
                        int(png_curr_month_df.pitem_id.values[0])]
        prev_pitem_idx_df = mfunc.get_finalized_pidx(prev_month, pitem_id = fuel_pitem_ids)
        prev_pitem_idx_df = prev_pitem_idx_df[["state_id", "sector_id", "pitem_id", "price_index"]]
        prev_pitem_idx_df.head(1)

        # check the nss_dealer_code which is available in petrol_prev_month_df but missing in petrol_curr_month_df
        # append the data in previous month to current month data with item_price as zero and 
        # price_month_year, price_data_status, data_updation_uid, data_updation_dt, iteration_id as current month values
        missing_nss_codes = set(petrol_prev_month_df['nss_dealer_code']) - set(petrol_curr_month_df['nss_dealer_code'])
        missing_rows = petrol_prev_month_df[petrol_prev_month_df['nss_dealer_code'].isin(missing_nss_codes)].copy()
        missing_rows['item_price'] = 0.0
        missing_rows['revised_item_price'] = 0.0
        missing_rows['price_imputed'] = 0
        missing_rows['price_month_year'] = petrol_curr_month_df.price_month_year.iloc[0]
        missing_rows['price_data_status'] = petrol_curr_month_df.price_data_status.iloc[0]
        missing_rows['iteration_id'] = petrol_curr_month_df.iteration_id.iloc[0]

        petrol_curr_month_df = pd.concat([petrol_curr_month_df, missing_rows], ignore_index=True)

        # only take the nss_dealer_code which are present in previous month data
        petrol_curr_month_df = petrol_curr_month_df[petrol_curr_month_df['nss_dealer_code'].isin(petrol_prev_month_df['nss_dealer_code'])]

        petrol_curr_month_df.shape[0]

        # same for diesel
        missing_nss_codes = set(diesel_prev_month_df['nss_dealer_code']) - set(diesel_curr_month_df['nss_dealer_code'])
        missing_rows = diesel_prev_month_df[diesel_prev_month_df['nss_dealer_code'].isin(missing_nss_codes)].copy()
        missing_rows['item_price'] = 0.0
        missing_rows['revised_item_price'] = 0.0
        missing_rows['price_imputed'] = 0
        missing_rows['price_month_year'] = diesel_curr_month_df.price_month_year.iloc[0]
        missing_rows['price_data_status'] = diesel_curr_month_df.price_data_status.iloc[0]
        missing_rows['iteration_id'] = diesel_curr_month_df.iteration_id.iloc[0]
        diesel_curr_month_df = pd.concat([diesel_curr_month_df, missing_rows], ignore_index=True)

        # only take the nss_dealer_code which are present in previous month data
        diesel_curr_month_df = diesel_curr_month_df[diesel_curr_month_df['nss_dealer_code'].isin(diesel_prev_month_df['nss_dealer_code'])]

        diesel_curr_month_df.shape[0]

        # same for lpg but instead of nss_dealer_code use nss_distributor_code
        missing_nss_codes = set(lpg_prev_month_df['nss_distributor_code']) - set(lpg_curr_month_df['nss_distributor_code'])
        missing_rows = lpg_prev_month_df[lpg_prev_month_df['nss_distributor_code'].isin(missing_nss_codes)].copy()
        missing_rows['item_price'] = 0.0
        missing_rows['revised_item_price'] = 0.0
        missing_rows['price_imputed'] = 0
        missing_rows['price_month_year'] = lpg_curr_month_df.price_month_year.iloc[0]
        missing_rows['price_data_status'] = lpg_curr_month_df.price_data_status.iloc[0]
        missing_rows['iteration_id'] = lpg_curr_month_df.iteration_id.iloc[0]
        lpg_curr_month_df = pd.concat([lpg_curr_month_df, missing_rows], ignore_index=True)

        # only take the nss_distributor_code which are present in previous month data
        lpg_curr_month_df = lpg_curr_month_df[lpg_curr_month_df['nss_distributor_code'].isin(lpg_prev_month_df['nss_distributor_code'])]
        lpg_curr_month_df.shape[0]

        # same for cng but instead of nss_dealer_code use nss_ga_id
        missing_nss_codes = set(cng_prev_month_df['nss_ga_id']) - set(cng_curr_month_df['nss_ga_id'])
        missing_rows = cng_prev_month_df[cng_prev_month_df['nss_ga_id'].isin(missing_nss_codes)].copy()
        missing_rows['item_price'] = 0.0
        missing_rows['revised_item_price'] = 0.0
        missing_rows['price_imputed'] = 0
        missing_rows['price_month_year'] = cng_curr_month_df.price_month_year.iloc[0]
        missing_rows['price_data_status'] = cng_curr_month_df.price_data_status.iloc[0]
        missing_rows['iteration_id'] = cng_curr_month_df.iteration_id.iloc[0]
        cng_curr_month_df = pd.concat([cng_curr_month_df, missing_rows], ignore_index=True)

        # only take the nss_ga_id which are present in previous month data
        cng_curr_month_df = cng_curr_month_df[cng_curr_month_df['nss_ga_id'].isin(cng_prev_month_df['nss_ga_id'])]

        cng_curr_month_df.shape[0]

        # same for png but instead of nss_dealer_code use nss_ga_id
        missing_nss_codes = set(png_prev_month_df['nss_ga_id']) - set(png_curr_month_df['nss_ga_id'])
        missing_rows = png_prev_month_df[png_prev_month_df['nss_ga_id'].isin(missing_nss_codes)].copy()
        missing_rows['item_price'] = 0.0
        missing_rows['revised_item_price'] = 0.0
        missing_rows['price_imputed'] = 0
        missing_rows['price_month_year'] = png_curr_month_df.price_month_year.iloc[0]
        missing_rows['price_data_status'] = png_curr_month_df.price_data_status.iloc[0]
        missing_rows['iteration_id'] = png_curr_month_df.iteration_id.iloc[0]
        png_curr_month_df = pd.concat([png_curr_month_df, missing_rows], ignore_index=True)

        # only take the nss_ga_id which are present in previous month data
        png_curr_month_df = png_curr_month_df[png_curr_month_df['nss_ga_id'].isin(png_prev_month_df['nss_ga_id'])]

        png_curr_month_df.shape[0]

        # Perform imputation of the prices

        # prepare a dataframe with columns state_id, sector_id, petrol_price_curr_month, petrol_price_prev_month
        prev_month_df = petrol_prev_month_df[['nss_dealer_code', 'revised_item_price']].copy()
        # rename prev_month_df column revised_item_price to prev_item_price
        prev_month_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        petrol_price_df = petrol_curr_month_df[['state_id', 'sector_id', 'pitem_id', 'pitem_code', 'nss_dealer_code', 
                                                'revised_item_price']].merge(
            prev_month_df,
            on=['nss_dealer_code'],
            how='left'
        )
        # remove the records if prev_item_price is null
        petrol_price_df = petrol_price_df[petrol_price_df['prev_item_price'].notnull()]

        # check if all prices within state_id and sector_id are zero for current month
        imputation_flag = petrol_price_df.groupby(['state_id', 'sector_id']).apply(
            lambda x: (x['revised_item_price'] == 0).all().astype(int)
        ).reset_index(name='price_imputed')

        # merge with petrol_price_df to get price_imputed column
        petrol_price_df = petrol_price_df.merge(
            imputation_flag,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # set revised_item_price to prev_item_price where price_imputed is 1
        petrol_price_df.loc[petrol_price_df['price_imputed'] == 1, 'revised_item_price'] = petrol_price_df['prev_item_price']

        petrol_price_df.head(1)

        # for the revised_item_price zero, compute the imputation factor at state_id and sector_id level
        # using the formula : imputation_factor = geometric mean of (current_month_price / previous_month_price) which are non-zero
        imputation_factors = petrol_price_df[petrol_price_df['revised_item_price'] > 0].groupby(
            ['state_id', 'sector_id']
        ).apply(
            lambda x: np.exp(np.log(x['revised_item_price'] / x['prev_item_price']).mean())
        ).reset_index(name='imp_factor')

        # Merge with petrol_price_df
        petrol_price_df = petrol_price_df.merge(
            imputation_factors,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # For rows where revised_item_price is zero, set revised_item_price = prev_item_price * imp_factor
        petrol_price_df.loc[petrol_price_df['revised_item_price'] == 0, 'price_imputed'] = 1

        petrol_price_df.loc[petrol_price_df['revised_item_price'] == 0, 'revised_item_price'] = \
            petrol_price_df['prev_item_price'] * petrol_price_df['imp_factor']

        # remove imp_factor column
        petrol_price_df.drop(columns=['imp_factor'], inplace=True)

        petrol_price_df.head(1)

        # Now, calculate the petrol price index
        petrol_price_df['pr'] = (
            petrol_price_df['revised_item_price'] / petrol_price_df['prev_item_price']
        )
        petrol_price_df.head(1)

        # now compute the geometric mean of pr for each state_id and sector_id
        petrol_price_index_df = petrol_price_df.groupby(['state_id', 'sector_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        petrol_price_index_df = petrol_price_index_df.merge(
            prev_pitem_idx_df,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='left'
        )
        # multiply gm_pr with prev_pitem_index to get final petrol_price_index
        petrol_price_index_df['price_index'] = petrol_price_index_df['gm_pr'] * petrol_price_index_df['price_index']

        state_sector_df = mfunc.get_market_master()[['state_id', 'sector_id', 'lgd_state_name', 'nss_sector_name', 
                                                    'nss_sector_code', 'nss_state_code']].drop_duplicates()
        # rename lgd_state_name to state_name and nss_sector_name
        state_sector_df = state_sector_df.rename(columns={
            'lgd_state_name': 'state_name'
        })

        petrol_price_index_df = petrol_price_index_df.merge(
            state_sector_df,
            on=['state_id', 'sector_id'],
            how='left'
        )

        cols_req = ['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index', 
                    'state_id', 'sector_id', 'pitem_id']
        petrol_price_index_df = petrol_price_index_df[cols_req]

        petrol_price_index_df.head(1)

        # if any sector_id (1 and 2) is missing within a state, then fill it with the other sector_id value
        for state in petrol_price_index_df['state_id'].unique():
            if state == 4:
                # Chandigarh has only one sector i.e. Urban
                continue
            state_data = petrol_price_index_df[petrol_price_index_df['state_id'] == state]
            if state_data['sector_id'].nunique() < 2:
                missing_sector_id = 2 if 1 in state_data['sector_id'].values else 1
                existing_data = state_data[state_data['sector_id'] != missing_sector_id]
                filled_data = existing_data.copy()
                filled_data['sector_id'] = missing_sector_id
                print(state, missing_sector_id)
                petrol_price_index_df = pd.concat([petrol_price_index_df, filled_data], ignore_index=True)
                
                
        # prepare a dataframe with columns state_id, sector_id, petrol_price_curr_month, petrol_price_prev_month
        prev_month_df = diesel_prev_month_df[['nss_dealer_code', 'revised_item_price']].copy()
        # rename prev_month_df column revised_item_price to prev_item_price
        prev_month_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        diesel_price_df = diesel_curr_month_df[['state_id', 'sector_id', 'pitem_id', 'pitem_code', 'nss_dealer_code', 
                                                'revised_item_price']].merge(
                                                    prev_month_df,
                                                    on=['nss_dealer_code'],
                                                    how='left'
                                                    )
        diesel_price_df = diesel_price_df[diesel_price_df['prev_item_price'].notnull()]

        # check if all prices within state_id and sector_id are zero for current month
        imputation_flag = diesel_price_df.groupby(['state_id', 'sector_id']).apply(
            lambda x: (x['revised_item_price'] == 0).all().astype(int)
        ).reset_index(name='price_imputed')

        # merge with diesel_price_df to get price_imputed column
        diesel_price_df = diesel_price_df.merge(
            imputation_flag,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # set revised_item_price to prev_item_price where price_imputed is 1
        diesel_price_df.loc[diesel_price_df['price_imputed'] == 1, 'revised_item_price'] = diesel_price_df['prev_item_price']

        diesel_price_df.head(1)

        # for the item_price zero, compute the imputation factor at state_id and sector_id level
        # using the formula : imputation_factor = geometric mean of (current_month_price / previous_month_price) which are non-zero
        imputation_factors = diesel_price_df[diesel_price_df['revised_item_price'] > 0].groupby(
            ['state_id', 'sector_id']
        ).apply(
            lambda x: np.exp(np.log(x['revised_item_price'] / x['prev_item_price']).mean())
        ).reset_index(name='imp_factor')

        # Merge with diesel_price_df
        diesel_price_df = diesel_price_df.merge(
            imputation_factors,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # For rows where revised_item_price is zero, set revised_item_price = prev_item_price * imp_factor
        diesel_price_df.loc[diesel_price_df['revised_item_price'] == 0, 'price_imputed'] = 1

        diesel_price_df.loc[diesel_price_df['revised_item_price'] == 0, 'revised_item_price'] = \
            diesel_price_df['prev_item_price'] * diesel_price_df['imp_factor']

        # remove imp_factor column
        diesel_price_df.drop(columns=['imp_factor'], inplace=True)

        diesel_price_df.head(1)

        # Now, calculate the diesel price index
        diesel_price_df['pr'] = (
            diesel_price_df['revised_item_price'] / diesel_price_df['prev_item_price']
        )
        diesel_price_df.head(1)

        # now compute the geometric mean of pr for each state_id and sector_id
        diesel_price_index_df = diesel_price_df.groupby(['state_id', 'sector_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        diesel_price_index_df = diesel_price_index_df.merge(
            prev_pitem_idx_df,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='left'
        )
        # multiply gm_pr with prev_pitem_index to get final petrol_price_index
        diesel_price_index_df['price_index'] = diesel_price_index_df['gm_pr'] * diesel_price_index_df['price_index']

        state_sector_df = mfunc.get_market_master()[['state_id', 'sector_id', 'lgd_state_name', 'nss_sector_name', 
                                                    'nss_sector_code', 'nss_state_code']].drop_duplicates()
        # rename lgd_state_name to state_name and nss_sector_name
        state_sector_df = state_sector_df.rename(columns={
            'lgd_state_name': 'state_name'
        })

        diesel_price_index_df = diesel_price_index_df.merge(
            state_sector_df,
            on=['state_id', 'sector_id'],
            how='left'
        )

        cols_req = ['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index', 
                    'state_id', 'sector_id', 'pitem_id']
        diesel_price_index_df = diesel_price_index_df[cols_req]

        diesel_price_index_df.head(1)

        # if any sector_id (1 and 2) is missing within a state, then fill it with the other sector_id value
        for state in diesel_price_index_df['state_id'].unique():
            if state == 4:
                # Chandigarh has only one sector i.e. Urban
                continue
            state_data = diesel_price_index_df[diesel_price_index_df['state_id'] == state]
            if state_data['sector_id'].nunique() < 2:
                missing_sector_id = 2 if 1 in state_data['sector_id'].values else 1
                existing_data = state_data[state_data['sector_id'] != missing_sector_id]
                filled_data = existing_data.copy()
                filled_data['sector_id'] = missing_sector_id
                print(state, missing_sector_id)
                diesel_price_index_df = pd.concat([diesel_price_index_df, filled_data], ignore_index=True)
                
        # prepare a dataframe with columns state_id, sector_id, petrol_price_curr_month, petrol_price_prev_month
        prev_month_df = lpg_prev_month_df[['nss_distributor_code', 'revised_item_price']].copy()
        # rename prev_month_df column item_price to prev_item_price
        prev_month_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        lpg_price_df = lpg_curr_month_df[['state_id', 'sector_id', 'pitem_id', 'pitem_code', 'nss_distributor_code', 
                                                'revised_item_price']].merge(
                                                    prev_month_df,
                                                    on=['nss_distributor_code'],
                                                    how='left'
                                                    )

        diesel_price_df = diesel_price_df[diesel_price_df['prev_item_price'].notnull()]

        # check if all prices within state_id and sector_id are zero for current month
        imputation_flag = lpg_price_df.groupby(['state_id', 'sector_id']).apply(
            lambda x: (x['revised_item_price'] == 0).all().astype(int)
        ).reset_index(name='price_imputed')

        # merge with lpg_price_df to get price_imputed column
        lpg_price_df = lpg_price_df.merge(
            imputation_flag,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # set revised_item_price to prev_item_price where price_imputed is 1
        lpg_price_df.loc[lpg_price_df['price_imputed'] == 1, 'revised_item_price'] = lpg_price_df['prev_item_price']

        lpg_price_df.head(1)

        # for the revised_item_price zero, compute the imputation factor at state_id and sector_id level
        # using the formula : imputation_factor = geometric mean of (current_month_price / previous_month_price) which are non-zero
        imputation_factors = lpg_price_df[lpg_price_df['revised_item_price'] > 0].groupby(
            ['state_id', 'sector_id']
        ).apply(
            lambda x: np.exp(np.log(x['revised_item_price'] / x['prev_item_price']).mean())
        ).reset_index(name='imp_factor')

        # Merge with lpg_price_df
        lpg_price_df = lpg_price_df.merge(
            imputation_factors,
            on=['state_id', 'sector_id'],
            how='left'
        )
        # For rows where item_price is zero, set item_price = prev_item_price * imp_factor
        lpg_price_df.loc[lpg_price_df['revised_item_price'] == 0, 'price_imputed'] = 1

        lpg_price_df.loc[lpg_price_df['revised_item_price'] == 0, 'revised_item_price'] = \
            lpg_price_df['prev_item_price'] * lpg_price_df['imp_factor']

        # remove imp_factor column
        lpg_price_df.drop(columns=['imp_factor'], inplace=True)

        lpg_price_df.head(1)

        # Now, calculate the diesel price index
        lpg_price_df['pr'] = (
            lpg_price_df['revised_item_price'] / lpg_price_df['prev_item_price']
        )
        lpg_price_df.head(1)

        # now compute the geometric mean of pr for each state_id and sector_id
        lpg_price_index_df = lpg_price_df.groupby(['state_id', 'sector_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        lpg_price_index_df = lpg_price_index_df.merge(
            prev_pitem_idx_df,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='left'
        )
        # multiply gm_pr with prev_pitem_index to get final petrol_price_index
        lpg_price_index_df['price_index'] = lpg_price_index_df['gm_pr'] * lpg_price_index_df['price_index']

        state_sector_df = mfunc.get_market_master()[['state_id', 'sector_id', 'lgd_state_name', 'nss_sector_name', 
                                                    'nss_sector_code', 'nss_state_code']].drop_duplicates()
        # rename lgd_state_name to state_name and nss_sector_name
        state_sector_df = state_sector_df.rename(columns={
            'lgd_state_name': 'state_name'
        })

        lpg_price_index_df = lpg_price_index_df.merge(
            state_sector_df,
            on=['state_id', 'sector_id'],
            how='left'
        )

        cols_req = ['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index', 
                    'state_id', 'sector_id', 'pitem_id']
        lpg_price_index_df = lpg_price_index_df[cols_req]

        lpg_price_index_df.head(1)

        # if any sector_id (1 and 2) is missing within a state, then fill it with the other sector_id value
        for state in lpg_price_index_df['state_id'].unique():
            if (state == 4):
                # Chandigarh has only one sector i.e. Urban
                continue
            if (state == 31):
                # preparing index from market data for Lakshadweep
                lpg_price_index_df = lpg_price_index_df[lpg_price_index_df['state_id'] != 31]
                continue
            state_data = lpg_price_index_df[lpg_price_index_df['state_id'] == state]
            if state_data['sector_id'].nunique() < 2:
                missing_sector_id = 2 if 1 in state_data['sector_id'].values else 1
                existing_data = state_data[state_data['sector_id'] != missing_sector_id]
                filled_data = existing_data.copy()
                filled_data['sector_id'] = missing_sector_id
                print(state, missing_sector_id)
                lpg_price_index_df = pd.concat([lpg_price_index_df, filled_data], ignore_index=True)
                
        # prepare a dataframe with columns state_id, sector_id, petrol_price_curr_month, petrol_price_prev_month
        prev_month_df = cng_prev_month_df[['nss_ga_id', 'revised_item_price']].copy()
        # rename prev_month_df column revised_item_price to prev_item_price
        prev_month_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        cng_price_df = cng_curr_month_df[['state_id', 'pitem_id', 'pitem_code', 'nss_ga_id', 
                                        'revised_item_price']].merge(
                                            prev_month_df,
                                            on=['nss_ga_id'],
                                            how='left'
                                            )

        # check if all prices within state_id and sector_id are zero for current month
        imputation_flag = cng_price_df.groupby(['state_id']).apply(
            lambda x: (x['revised_item_price'] == 0).all().astype(int)
        ).reset_index(name='price_imputed')

        # merge with cng_price_df to get price_imputed column
        cng_price_df = cng_price_df.merge(
            imputation_flag,
            on=['state_id'],
            how='left'
        )
        # set revised_item_price to prev_item_price where price_imputed is 1
        cng_price_df.loc[cng_price_df['price_imputed'] == 1, 'revised_item_price'] = cng_price_df['prev_item_price']

        cng_price_df.head(1)

        # for the revised_item_price zero, compute the imputation factor at state_id and sector_id level
        # using the formula : imputation_factor = geometric mean of (current_month_price / previous_month_price) which are non-zero
        imputation_factors = cng_price_df[cng_price_df['revised_item_price'] > 0].groupby(
            ['state_id']
        ).apply(
            lambda x: np.exp(np.log(x['revised_item_price'] / x['prev_item_price']).mean())
        ).reset_index(name='imp_factor')

        # Merge with cng_price_df
        cng_price_df = cng_price_df.merge(
            imputation_factors,
            on=['state_id'],
            how='left'
        )
        # For rows where revised_item_price is zero, set revised_item_price = prev_item_price * imp_factor
        cng_price_df.loc[cng_price_df['revised_item_price'] == 0, 'price_imputed'] = 1

        cng_price_df.loc[cng_price_df['revised_item_price'] == 0, 'revised_item_price'] = \
            cng_price_df['prev_item_price'] * cng_price_df['imp_factor']

        # remove imp_factor column
        cng_price_df.drop(columns=['imp_factor'], inplace=True)

        cng_price_df.head(1)

        # Now, calculate the diesel price index
        cng_price_df['pr'] = (
            cng_price_df['revised_item_price'] / cng_price_df['prev_item_price']
        )
        cng_price_df.head(1)

        # now compute the geometric mean of pr for each state_id and sector_id
        cng_price_index_df = cng_price_df.groupby(['state_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        cng_price_index_df = cng_price_index_df.merge(
            prev_pitem_idx_df,
            on=['state_id', 'pitem_id'],
            how='left'
        )

        cng_price_index_df[cng_price_index_df.price_index.isnull()]

        # now compute the geometric mean of pr for each state_id and sector_id
        cng_price_index_df = cng_price_df.groupby(['state_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        cng_price_index_df = cng_price_index_df.merge(
            prev_pitem_idx_df[['state_id', 'pitem_id', 'price_index']].drop_duplicates(),
            on=['state_id', 'pitem_id'],
            how='left'
        )
        # multiply gm_pr with prev_pitem_index to get final petrol_price_index
        cng_price_index_df['price_index'] = cng_price_index_df['gm_pr'] * cng_price_index_df['price_index']

        state_sector_df = mfunc.get_market_master()[['state_id', 'lgd_state_name', 'nss_state_code']].drop_duplicates()
        # rename lgd_state_name to state_name and nss_sector_name
        state_sector_df = state_sector_df.rename(columns={
            'lgd_state_name': 'state_name'
        })

        cng_price_index_df = cng_price_index_df.merge(
            state_sector_df,
            on=['state_id'],
            how='left'
        )

        cng_price_index_df['nss_sector_code'] = '02'
        cng_price_index_df['sector_id'] = 2

        cols_req = ['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index', 
                    'state_id', 'sector_id', 'pitem_id']
        cng_price_index_df = cng_price_index_df[cols_req]

        rural_cng_price_index_df = cng_price_index_df.copy()
        rural_cng_price_index_df['nss_sector_code'] = '01'
        rural_cng_price_index_df['sector_id'] = 1

        cng_price_index_df = pd.concat([cng_price_index_df, rural_cng_price_index_df], ignore_index=True)

        cng_price_index_df.head(1)

        # prepare a dataframe with columns state_id, sector_id, petrol_price_curr_month, petrol_price_prev_month
        prev_month_df = png_prev_month_df[['nss_ga_id', 'revised_item_price']].copy()
        # rename prev_month_df column revised_item_price to prev_item_price
        prev_month_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        png_price_df = png_curr_month_df[['state_id', 'pitem_id', 'pitem_code', 'nss_ga_id', 
                                        'revised_item_price']].merge(
                                            prev_month_df,
                                            on=['nss_ga_id'],
                                            how='left'
                                            )

        # check if all prices within state_id and sector_id are zero for current month
        imputation_flag = png_price_df.groupby(['state_id']).apply(
            lambda x: (x['revised_item_price'] == 0).all().astype(int)
        ).reset_index(name='price_imputed')

        # merge with png_price_df to get price_imputed column
        png_price_df = png_price_df.merge(
            imputation_flag,
            on=['state_id'],
            how='left'
        )
        # set revised_item_price to prev_item_price where price_imputed is 1
        png_price_df.loc[png_price_df['price_imputed'] == 1, 'revised_item_price'] = png_price_df['prev_item_price']

        png_price_df.head(1)

        # for the revised_item_price zero, compute the imputation factor at state_id and sector_id level
        # using the formula : imputation_factor = geometric mean of (current_month_price / previous_month_price) which are non-zero
        imputation_factors = png_price_df[png_price_df['revised_item_price'] > 0].groupby(
            ['state_id']
        ).apply(
            lambda x: np.exp(np.log(x['revised_item_price'] / x['prev_item_price']).mean())
        ).reset_index(name='imp_factor')

        # Merge with png_price_df
        png_price_df = png_price_df.merge(
            imputation_factors,
            on=['state_id'],
            how='left'
        )
        # For rows where revised_item_price is zero, set revised_item_price = prev_item_price * imp_factor
        png_price_df.loc[png_price_df['revised_item_price'] == 0, 'price_imputed'] = 1

        png_price_df.loc[png_price_df['revised_item_price'] == 0, 'revised_item_price'] = \
            png_price_df['prev_item_price'] * png_price_df['imp_factor']

        # remove imp_factor column
        png_price_df.drop(columns=['imp_factor'], inplace=True)

        png_price_df.head(1)

        # Now, calculate the diesel price index
        png_price_df['pr'] = (
            png_price_df['revised_item_price'] / png_price_df['prev_item_price']
        )
        png_price_df.head(1)

        # now compute the geometric mean of pr for each state_id and sector_id
        png_price_index_df = png_price_df.groupby(['state_id', 'pitem_id', 'pitem_code']).agg(
            gm_pr=('pr', lambda x: x.prod()**(1/len(x))),
            # price_imputed as 1 if all price_imputed are 1 else 0
            imputed=('price_imputed', 'min')
        ).reset_index()

        # merge with prev_pitem_idx_df at state_id, sector_id and pitem_id level
        png_price_index_df = png_price_index_df.merge(
            prev_pitem_idx_df[['state_id', 'pitem_id', 'price_index']].drop_duplicates(),
            on=['state_id', 'pitem_id'],
            how='left'
        )
        # multiply gm_pr with prev_pitem_index to get final petrol_price_index
        png_price_index_df['price_index'] = png_price_index_df['gm_pr'] * png_price_index_df['price_index']

        state_sector_df = mfunc.get_market_master()[['state_id', 'lgd_state_name', 'nss_state_code']].drop_duplicates()
        # rename lgd_state_name to state_name and nss_sector_name
        state_sector_df = state_sector_df.rename(columns={
            'lgd_state_name': 'state_name'
        })

        png_price_index_df = png_price_index_df.merge(
            state_sector_df,
            on=['state_id'],
            how='left'
        )

        png_price_index_df['nss_sector_code'] = '02'
        png_price_index_df['sector_id'] = 2

        cols_req = ['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index', 
                    'state_id', 'sector_id', 'pitem_id']
        png_price_index_df = png_price_index_df[cols_req]

        rural_png_price_index_df = png_price_index_df.copy()
        rural_png_price_index_df['nss_sector_code'] = '01'
        rural_png_price_index_df['sector_id'] = 1

        png_price_index_df = pd.concat([png_price_index_df, rural_png_price_index_df], ignore_index=True)

        png_price_index_df.head(1)

        fuel_pidx_df = pd.concat([petrol_price_index_df, diesel_price_index_df, lpg_price_index_df, 
                                cng_price_index_df, png_price_index_df], ignore_index=True)
        # sector_id to int32
        fuel_pidx_df['sector_id'] = fuel_pidx_df['sector_id'].astype('int32')
        fuel_pidx_df.shape

        # Save the price Index and Price Tables

        fuel_pidx_df['price_data_status'] = price_data_status
        fuel_pidx_df['iteration_id'] = iteration_id
        fuel_pidx_df['price_month_year'] = price_data_month_year
        cols_req = pd.read_parquet(pidx_db_final).columns.tolist()
        fuel_pidx_df = fuel_pidx_df[cols_req]

        # only take the state, sector and pitem_id where the expenditure is present
        pitem_exp = mfunc.get_pitem_exp_share()
        pitem_exp = pitem_exp[['state_id', 'sector_id', 'pitem_id']].drop_duplicates()
        fuel_pidx_df = fuel_pidx_df.merge(
            pitem_exp,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='inner'
        )

        # save the petrol, diesel, lpg, cng, png price data into petrol_price_db_fina
        revised_prices = petrol_price_df[['nss_dealer_code', 'revised_item_price', 'price_imputed']].copy()
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_imputed'}, inplace=True)
        petrol_curr_month_df = petrol_curr_month_df.merge(
            revised_prices,
            on=['nss_dealer_code'],
            how='left'
        )
        # update the revised_item_price column with updated_item_price where not null
        petrol_curr_month_df.loc[petrol_curr_month_df['updated_item_price'].notnull(), 'revised_item_price'] = \
            petrol_curr_month_df['updated_item_price'][petrol_curr_month_df['updated_item_price'].notnull()]
        petrol_curr_month_df.loc[petrol_curr_month_df['updated_imputed'].notnull(), 'price_imputed'] = \
            petrol_curr_month_df['updated_imputed'][petrol_curr_month_df['updated_imputed'].notnull()]
        petrol_curr_month_df.drop(columns=['updated_item_price', 'updated_imputed'], inplace=True)

        # same for diesel
        revised_prices = diesel_price_df[['nss_dealer_code', 'revised_item_price', 'price_imputed']].copy()
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_imputed'}, inplace=True)
        diesel_curr_month_df = diesel_curr_month_df.merge(
            revised_prices,
            on=['nss_dealer_code'],
            how='left'
        )
        # update the revised_item_price column with updated_item_price where not null
        diesel_curr_month_df.loc[diesel_curr_month_df['updated_item_price'].notnull(), 'revised_item_price'] = \
            diesel_curr_month_df['updated_item_price'][diesel_curr_month_df['updated_item_price'].notnull()]
        diesel_curr_month_df.loc[diesel_curr_month_df['updated_imputed'].notnull(), 'price_imputed'] = \
            diesel_curr_month_df['updated_imputed'][diesel_curr_month_df['updated_imputed'].notnull()]
        diesel_curr_month_df.drop(columns=['updated_item_price', 'updated_imputed'], inplace=True)

        # same for lpg and instead of nss_dealer_code use nss_distributor_code
        revised_prices = lpg_price_df[['nss_distributor_code', 'revised_item_price', 'price_imputed']].copy()
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_imputed'}, inplace=True)
        lpg_curr_month_df = lpg_curr_month_df.merge(
            revised_prices,
            on=['nss_distributor_code'],
            how='left'
        )
        # update the revised_item_price column with updated_item_price where not null
        lpg_curr_month_df.loc[lpg_curr_month_df['updated_item_price'].notnull(), 'revised_item_price'] = \
            lpg_curr_month_df['updated_item_price'][lpg_curr_month_df['updated_item_price'].notnull()]
        lpg_curr_month_df.loc[lpg_curr_month_df['updated_imputed'].notnull(), 'price_imputed'] = \
            lpg_curr_month_df['updated_imputed'][lpg_curr_month_df['updated_imputed'].notnull()]
        lpg_curr_month_df.drop(columns=['updated_item_price', 'updated_imputed'], inplace=True)

        # same for cng and instead of nss_dealer_code use nss_ga_id
        revised_prices = cng_price_df[['nss_ga_id', 'revised_item_price', 'price_imputed']].copy()
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_imputed'}, inplace=True)
        cng_curr_month_df = cng_curr_month_df.merge(
            revised_prices,
            on=['nss_ga_id'],
            how='left'
        )
        # update the revised_item_price column with updated_item_price where not null
        cng_curr_month_df.loc[cng_curr_month_df['updated_item_price'].notnull(), 'revised_item_price'] = \
            cng_curr_month_df['updated_item_price'][cng_curr_month_df['updated_item_price'].notnull()]
        cng_curr_month_df.loc[cng_curr_month_df['updated_imputed'].notnull(), 'price_imputed'] = \
            cng_curr_month_df['updated_imputed'][cng_curr_month_df['updated_imputed'].notnull()]
        cng_curr_month_df.drop(columns=['updated_item_price', 'updated_imputed'], inplace=True)

        # same for png and instead of nss_dealer_code use nss_ga_id
        revised_prices = png_price_df[['nss_ga_id', 'revised_item_price', 'price_imputed']].copy()
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_imputed'}, inplace=True)
        png_curr_month_df = png_curr_month_df.merge(
            revised_prices,
            on=['nss_ga_id'],
            how='left'
        )
        # update the revised_item_price column with updated_item_price where not null
        png_curr_month_df.loc[png_curr_month_df['updated_item_price'].notnull(), 'revised_item_price'] = \
            png_curr_month_df['updated_item_price'][png_curr_month_df['updated_item_price'].notnull()]
        png_curr_month_df.loc[png_curr_month_df['updated_imputed'].notnull(), 'price_imputed'] = \
            png_curr_month_df['updated_imputed'][png_curr_month_df['updated_imputed'].notnull()]
        png_curr_month_df.drop(columns=['updated_item_price', 'updated_imputed'], inplace=True)

        # save the petrol, diesel, lpg, cng, png price data into petrol_price_db_final, diesel_price_db_final, lpg_price_db_final, cng_price_db_final, png_price_db_final
        # if price_month_year row exists in the existing db, then drop those rows and append the new data
        petrol_curr_month_df.to_parquet(petrol_price_validated_data_path, index=False)
        diesel_curr_month_df.to_parquet(diesel_price_validated_data_path, index=False)
        lpg_curr_month_df.to_parquet(lpg_price_validated_data_path, index=False)
        cng_curr_month_df.to_parquet(cng_price_validated_data_path, index=False)
        png_curr_month_df.to_parquet(png_price_validated_data_path, index=False)

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, fuel_pidx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the Fuel Index. The Index table don't exists")
            
    except Exception as e:
        print("Error in Fuel Price Index Calculation: ", str(e))
# fuel_price_index_script()