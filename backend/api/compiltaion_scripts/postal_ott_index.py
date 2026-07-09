import pandas as pd
import os
import numpy as np
# show all rows and columns in pandas
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *

def postal_ott_index_script():
    try:
        # load the current month and previous month ott and postal price data from the validated data path
        ott_curr_month_prices = lpdb.get_curr_month_prices(18)
        postal_curr_month_prices = lpdb.get_curr_month_prices(19)

        ott_prev_month_prices = lpdb.get_prev_month_prices(18)
        # rename revised_item_price column to prev_item_price and select only plan_id and prev_item_price columns
        ott_prev_month_prices = ott_prev_month_prices.rename(columns={"revised_item_price": "prev_item_price"})
        ott_prev_month_prices = ott_prev_month_prices[["plan_id", "prev_item_price"]]

        postal_prev_month_prices = lpdb.get_prev_month_prices(19)
        # rename revised_item_price column to prev_item_price and select only plan_id and prev_item_price columns
        postal_prev_month_prices = postal_prev_month_prices.rename(columns={"revised_item_price": "prev_item_price"})
        postal_prev_month_prices = postal_prev_month_prices[["plan_id", "prev_item_price"]]

        ott_prices = ott_curr_month_prices[["plan_id", "pitem_id", "revised_item_price", "price_imputed", "spcl_code"]]
        # merge with previous month prices to get prev_item_price column
        ott_prices = ott_prices.merge(ott_prev_month_prices, on="plan_id", how="left")

        postal_prices = postal_curr_month_prices[["plan_id", "pitem_id", "revised_item_price", "price_imputed", "spcl_code"]]
        # merge with previous month prices to get prev_item_price column
        postal_prices = postal_prices.merge(postal_prev_month_prices, on="plan_id", how="left")

        # merge the ott and postal prices dataframes to create a combined dataframe for the index calculation
        ott_postal_prices = pd.concat([ott_prices, postal_prices], ignore_index=True)

        mask = (ott_postal_prices['spcl_code'] > 0) | (ott_postal_prices['revised_item_price'].isnull()) | (ott_postal_prices['revised_item_price'] == 0)
        # if entire records within a pitem_id are satisfying the above condition, then revised_item_price = prev_item_price for those records and price_imputed as 1 for that pitem_id, else if only some records within a pitem_id are satisfying the above condition, then revised_item_price = revised_item_price and price_imputed as 0 for those records
        total_count = ott_postal_prices.groupby('pitem_id').agg({'plan_id': 'count'}).rename(columns={'plan_id': 'total_count'}).reset_index()
        req_imp_count = ott_postal_prices[mask].groupby('pitem_id').agg({'plan_id': 'count'}).rename(columns={'plan_id': 'req_imp_count'}).reset_index()
        imp_counts = total_count.merge(req_imp_count, on='pitem_id', how='left').fillna(0)
        pitem_req_imp = imp_counts[imp_counts['total_count'] == imp_counts['req_imp_count']]['pitem_id'].tolist()

        # if list is not empty, then revised_item_prices = prev_item_price for those pitem_id and price_imputed as 1, else revised_item_price and price_imputed remains unchanged
        if len(pitem_req_imp) > 0:
            ott_postal_prices.loc[ott_postal_prices['pitem_id'].isin(pitem_req_imp), 'revised_item_price'] = ott_postal_prices.loc[ott_postal_prices['pitem_id'].isin(pitem_req_imp), 'prev_item_price']
            ott_postal_prices.loc[ott_postal_prices['pitem_id'].isin(pitem_req_imp), 'price_imputed'] = 1

        # if spcl_code > 0 or revised_item_price is null or zero, the compute the imputation factor of pitem_id as gm of (revised_item_price/prev_item_price) and impute the revised_item_price as (prev_item_price/imputation_factor)
        mask = ((ott_postal_prices['spcl_code'] > 0) | (ott_postal_prices['revised_item_price'].isnull()) | (ott_postal_prices['revised_item_price'] == 0))
        if mask.sum() > 0:
            imputation_factors = ott_postal_prices[~mask].groupby('pitem_id').apply(lambda x: np.exp(np.log(x['revised_item_price']/x['prev_item_price']).mean())).reset_index().rename(columns={0: 'imputation_factor'})
            ott_postal_prices = ott_postal_prices.merge(imputation_factors, on='pitem_id', how='left')
            ott_postal_prices.loc[mask, 'revised_item_price'] = ott_postal_prices.loc[mask, 'prev_item_price'] * ott_postal_prices.loc[mask, 'imputation_factor']
            ott_postal_prices.loc[mask, 'price_imputed'] = 1
            # drop imputation_factor column
            ott_postal_prices = ott_postal_prices.drop(columns=['imputation_factor'])
            
        prev_month_idx = mfunc.get_finalized_pidx(prev_month, pitem_id=ott_postal_prices['pitem_id'].unique().tolist())[["pitem_id", "price_index"]].drop_duplicates()
        prev_month_idx

        # if spcl_code > 0 or revised_item_price is null or zero
        ott_postal_prices['pr'] = ott_postal_prices['revised_item_price']/ott_postal_prices['prev_item_price']
        # take geometric mean of pr for each pitem_id to get gm_pr
        ott_postal_idx = ott_postal_prices.groupby('pitem_id').agg({'pr': lambda x: np.exp(np.log(x).mean()), 
                                                                    'price_imputed': 'min'}).rename(columns={'pr': 'gm_pr', 'price_imputed': 'imputed'}).reset_index()
        ott_postal_idx = ott_postal_idx.merge(prev_month_idx, on='pitem_id', how='left')
        # compute current month price index as (gm_pr * prev_month_price_index)
        ott_postal_idx['price_index'] = ott_postal_idx['gm_pr'] * ott_postal_idx['price_index']
        # remove gm_pr column
        ott_postal_idx = ott_postal_idx.drop(columns=['gm_pr'])
        ott_postal_idx

        # Save the price and Index to the valdiated parquets

        updated_prices = ott_postal_prices[['plan_id', 'pitem_id', 'revised_item_price', 'price_imputed']]
        # rename revised_item_price and price_imputed to updated_item_price and updated_flag
        updated_prices = updated_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_flag'})

        # merge with ott_curr_month_prices to get the original revised_item_price and price_imputed columns
        ott_curr_month_prices = ott_curr_month_prices.merge(updated_prices, on=['plan_id', 'pitem_id'], how='left')
        # only update the revised_item_price if item_price is 0.0
        ott_curr_month_prices.loc[ott_curr_month_prices['item_price'] == 0.0, 'revised_item_price'] = ott_curr_month_prices.loc[ott_curr_month_prices['item_price'] == 0.0, 'updated_item_price']
        # set price_imputed to updated_flag
        ott_curr_month_prices['price_imputed'] = ott_curr_month_prices['updated_flag']

        # same for postal prices
        postal_curr_month_prices = postal_curr_month_prices.merge(updated_prices, on=['plan_id', 'pitem_id'], how='left')
        postal_curr_month_prices.loc[postal_curr_month_prices['item_price'] == 0.0, 'revised_item_price'] = postal_curr_month_prices.loc[postal_curr_month_prices['item_price'] == 0.0, 'updated_item_price']
        postal_curr_month_prices['price_imputed'] = postal_curr_month_prices['updated_flag']

        # remove updated_flag and updated_item_price columns from both dataframes
        ott_curr_month_prices = ott_curr_month_prices.drop(columns=['updated_item_price', 'updated_flag'])
        postal_curr_month_prices = postal_curr_month_prices.drop(columns=['updated_item_price', 'updated_flag'])

        ott_curr_month_prices.to_parquet(postal_prices_validated_data_path, index=False)
        postal_curr_month_prices.to_parquet(postal_prices_validated_data_path, index=False)

        idx_df = mfunc.get_pitem_exp_share()
        state_sector_df = mfunc.get_market_master()[["state_id", "sector_id", "nss_state_code", "nss_sector_code"]].drop_duplicates()
        pitem_code_df = mfunc.get_pitem_master()[['pitem_id', 'pitem_code']].drop_duplicates()

        idx_df = idx_df[idx_df.pitem_id.isin(ott_postal_idx.pitem_id.unique()) & (idx_df.exp_share > 0.0)]
        idx_df = idx_df.merge(state_sector_df, on=['state_id', 'sector_id'], how='left')
        idx_df = idx_df.merge(pitem_code_df, on='pitem_id', how='left')

        adm_idx_df = ott_postal_idx.merge(idx_df, on='pitem_id', how='left')
        adm_idx_df['price_data_status'] = price_data_status
        adm_idx_df['iteration_id'] = iteration_id
        adm_idx_df['price_month_year'] = price_data_month_year
        cols_req = pd.read_parquet(pidx_db_final).columns.tolist()
        adm_idx_df = adm_idx_df[cols_req]
        adm_idx_df.shape


        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, adm_idx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the postal, ott Index. The Index table doesn't exist")
            
    except Exception as e:
        print("Error in postal and ott index compilation script")
        print(str(e))
        
# postal_ott_index_script()