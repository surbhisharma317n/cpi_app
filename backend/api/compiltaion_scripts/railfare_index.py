import pandas as pd
import os
import numpy as np
# show all rows and columns in pandas
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *

def railfare_index_script():
    try:

        railfare_curr_month_prices = lpdb.get_curr_month_prices(16)
        metro_fare_curr_month_prices = lpdb.get_curr_month_prices(17)

        railfare_prev_month_prices = lpdb.get_prev_month_prices(16)
        # rename revised_item_price to price in prev_item_prices
        railfare_prev_month_prices = railfare_prev_month_prices.rename(columns={"revised_item_price": "prev_item_price"})
        metro_fare_prev_month_prices = lpdb.get_prev_month_prices(17)
        metro_fare_prev_month_prices = metro_fare_prev_month_prices.rename(columns={"revised_item_price": "prev_item_price"})

        rail_prices = railfare_curr_month_prices[['slab_fare_id', 'revised_item_price', 'price_imputed']]
        metro_prices = metro_fare_curr_month_prices[['slab_fare_id', 'state_id', 'pitem_id', 'revised_item_price', 'price_imputed']]

        # combined with prev month prices
        rail_prices = rail_prices.merge(railfare_prev_month_prices[['slab_fare_id', 'prev_item_price']], on='slab_fare_id', how='left')
        metro_prices = metro_prices.merge(metro_fare_prev_month_prices[['slab_fare_id', 'prev_item_price']], on='slab_fare_id', how='left')

        prev_month_railfare_idx = pd.read_parquet(railfare_pidx_db_final)
        prev_month_railfare_idx = prev_month_railfare_idx[(prev_month_railfare_idx.price_month_year == prev_month) &
                                                            (prev_month_railfare_idx.price_data_status == "F")]
        prev_month_railfare_idx.head(1)

        prev_month_metro_fare_idx = mfunc.get_finalized_pidx(prev_month, pitem_id=[metro_fare_curr_month_prices.pitem_id.values[0]])
        prev_month_metro_fare_idx

        # load railfare weights
        cols_req = ['slab_fare_id', 'train_class_dist_revenue_inr']
        railfare_weights = pd.read_parquet(railfare_weights_db_final, columns=cols_req)
        railfare_weights.head(1)

        metro_prices['pr'] = metro_prices['revised_item_price'] / metro_prices['prev_item_price']
        # Take geometric mean of pr at state_id and pitem_id level for metro prices
        metro_idx = metro_prices.groupby(['state_id', 'pitem_id']).agg({'pr': 'prod', 'slab_fare_id': 'count', 'price_imputed': 'min'}).reset_index()
        metro_idx['pr'] = metro_idx['pr'] ** (1 / metro_idx['slab_fare_id'])
        metro_idx = metro_idx.rename(columns={'pr': 'gm_pr'})

        # merge the metro_idx with prev_month_metro_fare_idx to get the weights for metro fare
        metro_idx = metro_idx.merge(prev_month_metro_fare_idx, on=['state_id', 'pitem_id'], how='left')

        # multiply gm_pr with price_index
        metro_idx['price_index'] = metro_idx['gm_pr'] * metro_idx['price_index']
        # delete gm_pr column
        metro_idx = metro_idx.drop(columns=['gm_pr', 'imputed'])
        # rename price_imputed to imputed
        metro_idx = metro_idx.rename(columns={'price_imputed': 'imputed'})


        # compute the pr of rail and metro fare
        rail_prices['pr'] = rail_prices['revised_item_price'] / rail_prices['prev_item_price']
        # combine rail_prices using slab_fare_id with prev_month_railfare_idx using slab_fare_id and pitem_id
        railfare_slab_idx = rail_prices.merge(prev_month_railfare_idx[['slab_fare_id', 'rfare_index']], on='slab_fare_id', how='left')
        # compute the price index for rail fare
        railfare_slab_idx['rfare_index'] = railfare_slab_idx['pr'] * railfare_slab_idx['rfare_index']
        # rename price_imputed to imputed
        railfare_slab_idx = railfare_slab_idx.rename(columns={'price_imputed': 'imputed'})
        # remove revised_item_price, prev_item_price and pr columns
        railfare_slab_idx = railfare_slab_idx.drop(columns=['revised_item_price', 'prev_item_price', 'pr'])

        # combine with weights
        railfare_idx = railfare_slab_idx.merge(railfare_weights, on='slab_fare_id', how='left')
        # compute weighted price index for rail fare using train_class_dist_revenue_inr as weights
        railfare_idx['weighted_rfare_index'] = railfare_idx['rfare_index'] * railfare_idx['train_class_dist_revenue_inr']
        rail_fare_imputed = 1 if railfare_idx['imputed'].sum() > 0 else 0
        # compute the final rail fare index by taking sum of weighted price index and dividing by sum of weights
        railfare_idx = np.round(railfare_idx['weighted_rfare_index'].sum() / railfare_idx['train_class_dist_revenue_inr'].sum(), 12)

        # create dataframe with pitem_id, imputed, price_index, price_month_year, price_data_status for rail fare and metro fare
        final_idx = pd.DataFrame({
            'pitem_id': [metro_idx['pitem_id'].values[0], 439],
            'imputed': [metro_idx['imputed'].max(), rail_fare_imputed],
            'price_index': [metro_idx['price_index'].values[0], railfare_idx],
            'price_month_year': [metro_fare_curr_month_prices.price_month_year.values[0], railfare_curr_month_prices.price_month_year.values[0]],
            'price_data_status': [metro_fare_curr_month_prices.price_data_status.values[0], railfare_curr_month_prices.price_data_status.values[0]],
            'iteration_id': [metro_fare_curr_month_prices.iteration_id.values[0], railfare_curr_month_prices.iteration_id.values[0]]
        })

        # convert pitem_id to int32
        final_idx['pitem_id'] = final_idx['pitem_id'].astype('int32')
        final_idx

        # Save the price data and Index data
        railfare_curr_month_prices.to_parquet(railfare_prices_validated_data_path, index=False)
        metro_fare_curr_month_prices.to_parquet(metro_prices_validated_data_path, index=False)

        cols_req = prev_month_railfare_idx.columns.tolist()
        # remove rafre_index and imputed columns from prev_month_railfare_idx and rename price_index to prev_price_index
        prev_month_railfare_idx = prev_month_railfare_idx.drop(columns=['rfare_index', 'imputed'])
        # set price_month, price_year, price_data_status and iteration_id same as current month prices
        prev_month_railfare_idx['price_month_year'] = railfare_curr_month_prices.price_month_year.values[0]
        prev_month_railfare_idx['price_data_status'] = railfare_curr_month_prices.price_data_status.values[0]
        prev_month_railfare_idx['iteration_id'] = railfare_curr_month_prices.iteration_id.values[0]
        prev_month_railfare_idx['price_month'] = railfare_curr_month_prices.price_month.values[0]
        prev_month_railfare_idx['price_year'] = railfare_curr_month_prices.price_year.values[0]

        # merge the prev_month_railfare_idx with railfare_slab_idx on slab_fare_id to get the price_index for each slab_fare_id
        railfare_slab_idx = prev_month_railfare_idx.merge(railfare_slab_idx, on='slab_fare_id', how='left')
        railfare_slab_idx = railfare_slab_idx[cols_req]

        # save to railfare_pidx_db parquet file
        railfare_slab_idx.to_parquet(railfare_pidx_db, index=False)

        idx_df = mfunc.get_pitem_exp_share()
        state_sector_df = mfunc.get_market_master()[["state_id", "sector_id", "nss_state_code", "nss_sector_code"]].drop_duplicates()
        pitem_code_df = mfunc.get_pitem_master()[['pitem_id', 'pitem_code']].drop_duplicates()

        idx_df = idx_df[idx_df.pitem_id.isin(final_idx.pitem_id.unique()) & (idx_df.exp_share > 0.0)]
        idx_df = idx_df.merge(state_sector_df, on=['state_id', 'sector_id'], how='left')
        idx_df = idx_df.merge(pitem_code_df, on='pitem_id', how='left')

        adm_idx_df = final_idx.merge(idx_df, on='pitem_id', how='left')
        cols_req = pd.read_parquet(pidx_db_final).columns.tolist()
        adm_idx_df = adm_idx_df[cols_req]

        adm_idx_df.head(1)

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, adm_idx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the railfare, Metro Index. The Index table doesn't exist")
            
    except Exception as e:
        print("Error in railfare and metro fare index compilation script")
        print(str(e))
        
# railfare_index_script()