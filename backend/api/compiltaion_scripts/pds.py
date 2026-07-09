import pandas as pd 
import numpy as np
from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *


def pds_item_index_script():
    try:

        def get_imputation_factor(pds_prices_df, pds_pidx_db_final):
            # Deep copy to avoid modifying the original dataframe
            pds_pidx_db_final = pds_pidx_db_final.copy()
            pds_prices_df = pds_prices_df.copy()
            
            # calculate price relative
            pds_prices_df['price_relative'] = pds_prices_df['revised_item_price'] / pds_prices_df['prev_item_price']

            pds_pidx_db_final.rename(columns={'price_index': 'prev_price_index'}, inplace=True)

            pds_prices_df = pds_prices_df.merge(pds_pidx_db_final,
                                                on=['sector_id', 'state_id', 'pitem_id'],
                                                how='left')
            pds_prices_df['price_index'] = pds_prices_df['price_relative'] * pds_prices_df['prev_price_index']

            # Take ratio of weighted average of priced index and prev_price_index as imputation factor at state, sector
            # and witem_code level
            pds_prices_df['weighted_price_index'] = pds_prices_df['price_index'] * pds_prices_df['exp_share']
            pds_prices_df['weighted_prev_price_index'] = pds_prices_df['prev_price_index'] * pds_prices_df['exp_share']
            
            imp_factor_df = (
                pds_prices_df
                .groupby(['sector_id', 'state_id', 'witem_code'], as_index=False)
                .agg(price_idx_sum=('weighted_price_index', 'sum'), 
                    prev_price_idx_sum=('weighted_prev_price_index', 'sum'),
                    exp_sum=('exp_share', 'sum'))
            )
            
            imp_factor_df['imp_factor'] = (imp_factor_df['price_idx_sum'] / imp_factor_df['exp_sum']) / (imp_factor_df['prev_price_idx_sum'] / imp_factor_df['exp_sum'])
            imp_factor_df = imp_factor_df[['state_id', 'sector_id', 'witem_code', 'imp_factor']]

            return imp_factor_df

        # Non Free PDS Index

        def set_curr_month_vars(carry_forward_prices):
            carry_forward_prices.drop(columns=["cflag"], inplace=True)
            carry_forward_prices["price_imputed"] = 0
            carry_forward_prices["item_price"] = 0.0
            carry_forward_prices["revised_item_price"] = 0.0
            if 'spcl_code' in carry_forward_prices.columns: 
                carry_forward_prices["spcl_code"] = '0'
                carry_forward_prices["spcl_id"] = 0
            carry_forward_prices["price_month_year"] = price_data_month_year
            carry_forward_prices["price_month"] = price_data_month_year.month
            carry_forward_prices["price_year"] = price_data_month_year.year
            carry_forward_prices['price_month'] = carry_forward_prices['price_month'].astype('int32')
            carry_forward_prices['price_year'] = carry_forward_prices['price_year'].astype('int32')

            carry_forward_prices['price_data_status'] = price_data_status
            carry_forward_prices['iteration_id'] = iteration_id
            return carry_forward_prices

        # Get the previous month price index
        prev_month_pidx_df = pd.read_parquet(pds_pidx_db_final)
        cols_req = ['sector_id', 'state_id', 'pitem_id', 'price_index']
        prev_month_pidx_df = prev_month_pidx_df[(prev_month_pidx_df.price_month_year == prev_month) & (prev_month_pidx_df.price_data_status == "F")][cols_req]
        # rename price_index to prev_price_index
        prev_month_pidx_df.rename(columns={'price_index': 'prev_price_index'}, inplace=True)
        prev_month_pidx_df.head(1)

        urban_pds_curr_price = lpdb.get_curr_month_prices(data_type=9)
        urban_pds_prev_price = lpdb.get_prev_month_prices(data_type=9)

        # only take the prices for which weights exists
        urban_pds_curr_price = urban_pds_curr_price.merge(
            prev_month_pidx_df[['sector_id', 'state_id', 'pitem_id']].drop_duplicates(),
            on=['sector_id', 'state_id', 'pitem_id'],
            how='inner'
        )

        urban_pds_prev_price = urban_pds_prev_price.merge(
            prev_month_pidx_df[['sector_id', 'state_id', 'pitem_id']].drop_duplicates(),
            on=['sector_id', 'state_id', 'pitem_id'],
            how='inner'
        )

        ############################################
        # Carry forward the prices from previous month if not available in current month
        if urban_pds_curr_price.shape[0] < prev_month_pidx_df.shape[0]:
            print("Carrying forward prices from previous month")
            curr_month_prices = urban_pds_curr_price[['sector_id', 'state_id', 'pitem_id']].drop_duplicates()
            curr_month_prices['cflag'] = 1

            carry_forward_prices = urban_pds_prev_price.merge(
                curr_month_prices,
                on=['sector_id', 'state_id', 'pitem_id'],
                how='left'
            )
            carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

            if not carry_forward_prices.empty:
                print(carry_forward_prices.shape)
                carry_forward_prices = set_curr_month_vars(carry_forward_prices)
                urban_pds_curr_price = pd.concat([urban_pds_curr_price, carry_forward_prices], ignore_index=True)

            print(urban_pds_curr_price[urban_pds_curr_price.revised_item_price == 0.0].shape[0])
            del curr_month_prices, carry_forward_prices
        ############################################

        cols_required = ['sector_id', 'state_id', 'pitem_id', 'price_imputed', 'distribution_status',
                        'revised_item_price']

        # Select only subsidised pds items
        curr_pds_prices_df = urban_pds_curr_price.loc[urban_pds_curr_price.item_type_id == 3, cols_required]

        cols_required = ['sector_id', 'state_id', 'pitem_id', 'revised_item_price']

        prev_pds_prices_df = urban_pds_prev_price[urban_pds_prev_price.item_type_id == 3][cols_required]
                                        
        prev_pds_prices_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        print(curr_pds_prices_df.shape)
        curr_pds_prices_df = curr_pds_prices_df.merge(prev_pds_prices_df,
                                                    on=['sector_id', 'state_id', 'pitem_id'],
                                                    how='left')

        # remove the records with prev_item_price as na
        curr_pds_prices_df = curr_pds_prices_df[(~curr_pds_prices_df.prev_item_price.isna()) |
                                                (curr_pds_prices_df.prev_item_price > 0)]
        print(curr_pds_prices_df.shape)
        curr_pds_prices_df.head(1)

        pds_wts_df = pd.read_parquet(pds_pitem_exp_share_db_final)[['sector_id', 'state_id', 'pitem_id', 'exp_share']]
        curr_pds_prices_df = curr_pds_prices_df.merge(pds_wts_df,
                                                    on=['sector_id', 'state_id', 'pitem_id'],
                                                    how='left')
        curr_pds_prices_df.head(1)

        # Create a variable imputation_required
        curr_pds_prices_df['imp_req'] = 0

        # replace the revised_item_price with prev_item_price where distriction_status is 2
        # carry forward in case of reporting as zero price
        mask = (curr_pds_prices_df.distribution_status == 2) | (curr_pds_prices_df.revised_item_price == 0.0)

        # If the revised_item_price == 0.0 or spcl_id > 0
        curr_pds_prices_df.loc[mask, 'imp_req'] = 1

        witem_mapping = mfunc.get_coicop_names_codes()[['pitem_id', 'witem_code']].drop_duplicates()

        curr_pds_prices_df = curr_pds_prices_df.merge(witem_mapping,
                                            on='pitem_id',
                                            how='left')

        mask = ((curr_pds_prices_df.imp_req == 1) & (curr_pds_prices_df.price_imputed == 0))
        if curr_pds_prices_df[mask].shape[0] > 0:
            print("Prices are zero or not distributed")
            
            # First compute the district or town level imputation factor if number of markets are 2 or more at town or district level
            # For the markets where there are less than 2 markets in a town or district level, compute the imputation factor at state level
            pds_prices_df = curr_pds_prices_df[~mask]

            imp_factor_df = get_imputation_factor(pds_prices_df, prev_month_pidx_df)

            curr_pds_prices_df = curr_pds_prices_df.merge(imp_factor_df,
                                                on=['state_id', 'sector_id', 'witem_code'],
                                                how='left')
            
            #print(urban_mkt_price_df.columns)
            mask = (curr_pds_prices_df.imp_factor.notnull() & ((curr_pds_prices_df.imp_req == 1) & (curr_pds_prices_df.price_imputed == 0)))
            curr_pds_prices_df.loc[mask, 'revised_item_price'] = curr_pds_prices_df.prev_item_price[mask] * curr_pds_prices_df.imp_factor[mask]
            curr_pds_prices_df.loc[mask, 'price_imputed'] = 1

            curr_pds_prices_df.drop(columns=['imp_factor', 'exp_share'], inplace=True)
            
            
        mask = ((curr_pds_prices_df.imp_req == 1) & (curr_pds_prices_df.price_imputed == 0))
        if curr_pds_prices_df[mask].shape[0] > 0:
            print("Some prices could not be imputed even after state level imputation factor")
            curr_pds_prices_df.loc[mask, 'revised_item_price'] = curr_pds_prices_df.prev_item_price[mask]
            curr_pds_prices_df.loc[mask, 'price_imputed'] = 1
            
            
        # compute the price_relative 
        curr_pds_prices_df['price_relative'] = curr_pds_prices_df['revised_item_price'] / curr_pds_prices_df['prev_item_price']

        # merge with previous index
        urban_pds_pidx = curr_pds_prices_df[['sector_id', 'state_id', 'pitem_id', 'witem_code', 'price_relative', 'price_imputed']]

        # rename price_index to prev_price_index
        prev_month_pidx_df.rename(columns={'price_index': 'prev_price_index'}, inplace=True)

        urban_pds_pidx = urban_pds_pidx.merge(prev_month_pidx_df,
                                        on=['sector_id', 'state_id', 'pitem_id'],
                                        how='left')
        # remove the records with prev_price_index as na
        urban_pds_pidx = urban_pds_pidx[~urban_pds_pidx.prev_price_index.isna()]

        # compute the below elementary level index
        urban_pds_pidx['price_index'] = urban_pds_pidx['prev_price_index'] * urban_pds_pidx['price_relative']
        # drop price relative
        urban_pds_pidx.drop(columns=['price_relative'], inplace=True)

        pds_pidx_df = urban_pds_pidx.merge(pds_wts_df,
                                        on=['sector_id', 'state_id', 'pitem_id'],
                                        how='left')

        # take weighted average of price_index by exp_share
        pds_pidx_df['price_index_sum'] = pds_pidx_df['price_index'] * pds_pidx_df['exp_share']
        pds_pidx_df = pds_pidx_df.groupby(['state_id', 'sector_id', 'witem_code'], as_index=False).agg(
            idx_sum=('price_index_sum', 'sum'),
            wt_sum=('exp_share', 'sum'),
            imputed_sum=('price_imputed', 'sum'),
            imputed_count=('price_imputed', 'count')
        )
        pds_pidx_df['price_index'] = pds_pidx_df['idx_sum'] / pds_pidx_df['wt_sum']
        pds_pidx_df.drop(columns=['idx_sum', 'wt_sum'], inplace=True)
        pds_pidx_df['pitem_code'] = pds_pidx_df['witem_code'] + ".81"

        pds_pidx_df['imputed'] = 0
        pds_pidx_df.loc[(pds_pidx_df.imputed_sum / pds_pidx_df.imputed_count) == 1.0, 'imputed'] = 1


        pds_pidx_df = pds_pidx_df.merge(mfunc.get_coicop_names_codes()[["pitem_code", "pitem_id"]].drop_duplicates(),
                                        on="pitem_code",
                                        how="left")
        # remove witem_code. Elementary Index of PDS
        pds_pidx_df.drop(columns=['witem_code', "pitem_code", "imputed_sum", "imputed_count"], inplace=True)
        pds_pidx_df.head(1)

        cols_req = ["state_id", "sector_id", "pitem_id", "revised_item_price", "prev_item_price", "price_imputed"]
        pds_prices = curr_pds_prices_df[cols_req].copy()

        year = str(price_data_month_year.year)
        month = str(price_data_month_year.month).zfill(2)
        pds_prices['price_month_year'] = price_data_month_year
        pds_prices.to_parquet(f'data//scrutiny//pds_{year}_{month}.parquet', index=False)

        # Save the price index and elementary index and the price file

        cols_req_pds_idx_table = pd.read_parquet(pds_pidx_db_final).columns.tolist()
        cols_req_idx_table = pd.read_parquet(pidx_db_final).columns.tolist()
        cols_req_pds_price_table = pd.read_parquet(pds_price_db_final).columns.tolist()

        revised_prices = curr_pds_prices_df[['state_id', 'sector_id', 'pitem_id', 'revised_item_price', 'price_imputed']]
        revised_prices.rename(columns={'revised_item_price': 'updated_item_price', 'price_imputed': 'updated_price_imputed'}, inplace=True)
        urban_pds_curr_price = urban_pds_curr_price.merge(revised_prices,
                                                        on=['state_id', 'sector_id', 'pitem_id'],
                                                        how='left')
        mask = (urban_pds_curr_price.updated_item_price.notnull())
        urban_pds_curr_price.loc[mask, 'revised_item_price'] = urban_pds_curr_price.updated_item_price[mask]
        urban_pds_curr_price.loc[mask, 'price_imputed'] = urban_pds_curr_price.updated_price_imputed[mask]
        # delete the column imputed_price
        urban_pds_curr_price.drop(columns=['updated_item_price', 'updated_price_imputed'], inplace=True)
        urban_pds_curr_price = urban_pds_curr_price[cols_req_pds_price_table]

        # Save the price data to price tables in db
        if os.path.exists(pds_price_validated_data_path):
            # remove the file
            os.remove(pds_price_validated_data_path)

        urban_pds_curr_price.to_parquet(pds_price_validated_data_path, index=False)

        # Elementary Index
        pitem_code = mfunc.get_coicop_names_codes()[['pitem_id', 'pitem_code']].drop_duplicates()
        state_sector_df = mfunc.get_market_master()[['state_id', 'sector_id', 'nss_state_code', 'nss_sector_code']].drop_duplicates()

        # PDS Item Index
        pds_index = urban_pds_pidx.merge(pitem_code,
                                        on='pitem_id',
                                        how='left')
        pds_index = pds_index.merge(state_sector_df,
                                    on=['state_id', 'sector_id'],
                                    how='left')
        pds_index.rename(columns={'price_imputed': 'imputed'}, inplace=True)

        pds_index['price_data_status'] = price_data_status
        pds_index['iteration_id'] = iteration_id
        pds_index['price_month_year'] = price_data_month_year
        pds_index = pds_index[cols_req_pds_idx_table]

        if os.path.exists(pds_pidx_db):
            os.remove(pds_pidx_db)

        pds_index.to_parquet(pds_pidx_db, index=False)

        final_pidx_df = pds_pidx_df.merge(pitem_code,
                                        on='pitem_id',
                                        how='left')
        final_pidx_df = final_pidx_df.merge(state_sector_df,
                                        on=['state_id', 'sector_id'],
                                        how='left')
        final_pidx_df['price_data_status'] = price_data_status
        final_pidx_df['iteration_id'] = iteration_id
        final_pidx_df['price_month_year'] = price_data_month_year
        final_pidx_df = final_pidx_df[cols_req_idx_table]

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, final_pidx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the PDS Index. The Index table don't exists")
            
    except Exception as e:
        print("Error in compiling PDS Index: ", str(e))   
# pds_item_index_script()