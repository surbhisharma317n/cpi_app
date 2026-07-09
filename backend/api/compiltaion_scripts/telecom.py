import pandas as pd
import os
# show all rows and columns in pandas
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *

def telecom_price_index_script():
    try:

        state_sector_df = mfunc.get_market_master()[["state_id", "sector_id", "nss_state_code", "nss_sector_code"]].drop_duplicates()

        telecom_curr_month_prices = lpdb.get_curr_month_prices(15)
        telecom_prev_month_prices = lpdb.get_prev_month_prices(15)

        cols_req = ['state_id', 'pitem_id', 'operator_name', 'plan_id', 'revised_item_price_per_day']
        telecom_prev_month_prices = telecom_prev_month_prices[cols_req]

        # rename revised_item_price_per_day to prev_revised_item_price_per_day
        telecom_prev_month_prices.rename(columns={'revised_item_price_per_day': 'prev_item_price_per_day'}, inplace=True)

        telecom_prev_month_prices.shape, telecom_curr_month_prices.shape

        # if no prices are reported in current month, then use previous month prices
        if telecom_curr_month_prices.shape[0] == 0:
            telecom_curr_month_prices = lpdb.get_prev_month_prices(15).copy()
            telecom_curr_month_prices['price_month'] = price_data_month_year.month
            telecom_curr_month_prices['price_year'] = price_data_month_year.year
            telecom_curr_month_prices['price_month_year'] = price_data_month_year
            telecom_curr_month_prices['revised_item_price_per_day'] = telecom_curr_month_prices['item_price']/telecom_curr_month_prices['validity_days']
            telecom_curr_month_prices['price_imputed'] = 0
            print("No current month prices found, using previous month prices.")
            
        cols_req = ['state_id', 'pitem_id', 'operator_name', 'plan_id', 'item_price', 'revised_item_price_per_day', 'price_imputed']
        telecom_price_df = telecom_curr_month_prices[cols_req]

        telecom_price_df = telecom_price_df.merge(telecom_prev_month_prices, 
                                                on=['state_id', 'pitem_id', 'operator_name', 'plan_id'], 
                                                how='left')
        # remove any records prev_item_price_per_day is null
        telecom_price_df = telecom_price_df[~telecom_price_df['prev_item_price_per_day'].isnull()]

        # check if the item_price is zero or na
        mask = ((telecom_price_df['revised_item_price_per_day'].isnull()) | (telecom_price_df['revised_item_price_per_day'] == 0))
        if mask.sum() > 0:
            print(f"Warning: There are {mask.sum()} records with item_price as zero or null.")
            imputation_df = telecom_price_df[~mask].copy()

            # compute the price relative as pr
            imputation_df['pr'] = (imputation_df['revised_item_price_per_day'] / imputation_df['prev_item_price_per_day'])

            # compute the geometric mean of pr by state_id, pitem_id, operator_name
            geo_mean_df = imputation_df.groupby(['state_id', 'pitem_id', 'operator_name'])['pr'].agg(lambda x: x.prod()**(1/len(x))).reset_index()
            geo_mean_df.rename(columns={'pr': 'geo_mean_pr'}, inplace=True)

            # merge the geo_mean_df back to telecom_price_df
            telecom_price_df = telecom_price_df.merge(geo_mean_df, on=['state_id', 'pitem_id', 'operator_name'], how='left')

            # impute the revised_item_price_per_day where item_price is zero or na
            telecom_price_df.loc[mask, 'revised_item_price_per_day'] = telecom_price_df.loc[mask, 'prev_item_price_per_day'] * telecom_price_df.loc[mask, 'geo_mean_pr']
            telecom_price_df.loc[mask, 'price_imputed'] = 1
            telecom_price_df.drop(columns=['geo_mean_pr'], inplace=True)
            
        # compute the price relative as pr
        telecom_price_df['pr'] = (telecom_price_df['revised_item_price_per_day'] / telecom_price_df['prev_item_price_per_day'])

        # compute the geometric mean of price relatives at state_id, pitem_id, operator_name
        telecom_gm = telecom_price_df.groupby(['state_id', 'pitem_id', 'operator_name']).agg({'pr': 'prod', 
                                                                                    'price_imputed': 'min'}).reset_index()
        telecom_gm['n'] = telecom_price_df.groupby(['state_id', 'pitem_id', 'operator_name'])['pr'].count().values
        telecom_gm['gm_pr'] = telecom_gm['pr'] ** (1 / telecom_gm['n'])

        # rename price_imputed to imputed
        telecom_gm.rename(columns={'price_imputed': 'imputed'}, inplace=True)
        telecom_gm = telecom_gm[['state_id', 'pitem_id', 'operator_name', 'gm_pr', 'imputed']]
        telecom_gm.head(1)

        # load previous month telecom operator index data
        prev_month_telecom_op_index = pd.read_parquet(telecom_operator_pidx_db_final)
        # filter out for prev_month
        mask = (prev_month_telecom_op_index['price_month_year'] == prev_month) & (prev_month_telecom_op_index['price_data_status'] == 'F')
        prev_month_telecom_op_index = prev_month_telecom_op_index[mask].copy()
        # filter out prev_month and select only state_id, pitem_id, operator_name, op_index
        cols_req = ['state_id', 'pitem_id', 'operator_name', 'operator_index']
        prev_month_telecom_op_index = prev_month_telecom_op_index[cols_req]
        prev_month_telecom_op_index.head(1)

        # merge telecom_gm with prev_month_telecom_op_index on state_id, pitem_id, operator_name
        print(telecom_gm.shape)
        telecom_op_index = telecom_gm.merge(prev_month_telecom_op_index,
                                        on=['state_id', 'pitem_id', 'operator_name'],
                                        how='left')
        print(telecom_op_index.shape)
        # op_index as op_index * gm_pr
        telecom_op_index['operator_index'] = telecom_op_index['operator_index'] * telecom_op_index['gm_pr']
        # drop gm_pr
        telecom_op_index = telecom_op_index.drop(columns=['gm_pr'])
        # map nss_state_code from state_sector
        telecom_op_index = telecom_op_index.merge(state_sector_df[['nss_state_code', 'state_id']].drop_duplicates(),
                                                on = 'state_id',
                                                how="left")

        telecom_op_index['price_month_year'] = price_data_month_year
        telecom_op_index['price_data_status'] = price_data_status
        telecom_op_index['iteration_id'] = iteration_id
        telecom_op_index = telecom_op_index[pd.read_parquet(telecom_operator_pidx_db_final).columns]

        telecom_op_index.head(1)

        # get the telecom weights
        telecom_wts_df = mfunc.get_telecom_operator_wts()
        telecom_wts_df.head(1), telecom_wts_df.shape

        telecom_op_index = telecom_op_index.merge(telecom_wts_df,
                                                on=['state_id', 'pitem_id', 'operator_name'],
                                                how='left')
        telecom_op_index.head(1)

        # Take the weighted average of op_index using operator_wt at state_id, pitem_id level
        telecom_price_idx = telecom_op_index.groupby(['state_id', 'pitem_id']).apply(
            lambda x: pd.Series({
                'price_index': (x['operator_index'] * x['operator_wt']).sum() / x['operator_wt'].sum(),
                'imputed': x['imputed'].min()
            })).reset_index()

        # convert imputed to integer
        telecom_price_idx['imputed'] = telecom_price_idx['imputed'].astype(int)

        telecom_price_idx = telecom_price_idx.merge(state_sector_df,
                                                on=['state_id'],
                                                how='left')
        telecom_price_idx['price_month'] = price_data_month_year.month
        telecom_price_idx['price_year'] = price_data_month_year.year
        telecom_price_idx['price_month_year'] = price_data_month_year

        # map pitem_id to pitem_code using pitem_master_df
        pitem_master_df = mfunc.get_pitem_master()[['pitem_id', 'pitem_code']]
        telecom_price_idx = telecom_price_idx.merge(pitem_master_df,
                                                on='pitem_id',
                                                how='left')

        telecom_price_idx['price_data_status'] = price_data_status
        telecom_price_idx['iteration_id'] = iteration_id

        telecom_price_idx = telecom_price_idx[pd.read_parquet(pidx_db_final).columns]

        telecom_price_idx.head(1)

        # Save the administrative price index to db

        cols_req = ['state_id', 'pitem_id', 'operator_name', 'plan_id', 'revised_item_price_per_day', 'price_imputed']
        telecom_price_df = telecom_price_df[cols_req]
        # rename revised_item_price_per_day to revised_price_updated and price_imputed to imputed_udpated
        telecom_price_df.rename(columns={'revised_item_price_per_day': 'revised_price_updated',
                                        'price_imputed': 'imputed_updated'}, inplace=True)
        # merge with telecom_curr_month_prices
        telecom_curr_month_prices = telecom_curr_month_prices.merge(telecom_price_df,
                                                                    on=['state_id', 'pitem_id', 'operator_name', 'plan_id'],
                                                                    how='left')
        # if revised_price_updated is not null, then update revised_item_price_per_day with revised_price_updated
        mask = ~telecom_curr_month_prices['revised_price_updated'].isnull()
        telecom_curr_month_prices.loc[mask, 'revised_item_price_per_day'] = telecom_curr_month_prices.loc[mask, 'revised_price_updated']
        telecom_curr_month_prices.loc[mask, 'price_imputed'] = telecom_curr_month_prices.loc[mask, 'imputed_updated']
        # drop revised_price_updated and imputed_updated
        telecom_curr_month_prices = telecom_curr_month_prices.drop(columns=['revised_price_updated', 'imputed_updated'])
        telecom_curr_month_prices.head(1)

        from pyparsing import col


        if os.path.exists(telecom_prices_validated_data_path):
            os.remove(telecom_prices_validated_data_path)

        cols_req = pd.read_parquet(telecom_prices_db_final).columns
        telecom_curr_month_prices[cols_req].to_parquet(telecom_prices_validated_data_path, index=False)

        cols_req = pd.read_parquet(telecom_operator_pidx_db_final).columns
        telecom_op_index[cols_req].to_parquet(telecom_operator_pidx_db, index=False)

        # only take the state, sector and pitem_id where the expenditure is present
        pitem_exp = mfunc.get_pitem_exp_share()
        pitem_exp = pitem_exp[['state_id', 'sector_id', 'pitem_id']].drop_duplicates()
        telecom_price_idx = telecom_price_idx.merge(
            pitem_exp,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='inner'
        )

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, telecom_price_idx], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the Telecom Index. The Index table don't exists")
            
    except Exception as e:
        print("Error in compiling Telecom Index", str(e))
# telecom_price_index_script()