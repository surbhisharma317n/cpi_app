import pandas as pd 
import numpy as np
import os

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *
from api.upload_input_data.master_func import get_market_master, get_coicop_names_codes, get_finalized_pidx


def electricity_index_script():
    try:

        def set_curr_month_vars(carry_forward_prices):
            carry_forward_prices.drop(columns=["cflag"], inplace=True)
            carry_forward_prices["price_imputed"] = 0
            carry_forward_prices["item_price"] = 0.0
            carry_forward_prices["revised_item_price"] = 0.0
            if 'spcl_code' in carry_forward_prices.columns: 
                carry_forward_prices["spcl_code"] = '0'
            if 'spcl_id' in carry_forward_prices.columns:
                carry_forward_prices["spcl_id"] = 0
            carry_forward_prices["price_month_year"] = price_data_month_year
            carry_forward_prices["price_month"] = price_data_month_year.month
            carry_forward_prices["price_year"] = price_data_month_year.year
            carry_forward_prices['price_month'] = carry_forward_prices['price_month'].astype('int32')
            carry_forward_prices['price_year'] = carry_forward_prices['price_year'].astype('int32')
            
            carry_forward_prices['price_data_status'] = price_data_status
            carry_forward_prices['iteration_id'] = iteration_id
            return carry_forward_prices

        # Load the discom wise index
        prev_dslab_price_idx = pd.read_parquet(elect_dslab_pidx_db_final)
        prev_dslab_price_idx = prev_dslab_price_idx[(prev_dslab_price_idx.price_month_year == prev_month) & (prev_dslab_price_idx.price_data_status == 'F')].copy()
        prev_dslab_price_idx = prev_dslab_price_idx[['state_id', 'sector_id', 'nss_discom_code', 'units_slab','dslab_price_index']].drop_duplicates()

        # rename the discom_price_index column to prev_discom_price_index
        prev_dslab_price_idx.rename(columns={'dslab_price_index': 'prev_dslab_price_index'}, inplace=True)
        prev_dslab_price_idx.head(1)

        discom_slab_weights_df = pd.read_parquet(elect_weights_db_final)[['state_id', 'sector_id', 'nss_discom_code', 'units_slab', 'hh_count']]
        discom_slab_weights_df.head(1)

        urban_prev_elect_price = lpdb.get_prev_month_prices(data_type=5)
        urban_prev_elect_price = urban_prev_elect_price[urban_prev_elect_price.revised_item_price > 0.0]
        rural_prev_elect_price = lpdb.get_prev_month_prices(data_type=6)
        rural_prev_elect_price = rural_prev_elect_price[rural_prev_elect_price.revised_item_price > 0.0]

        urban_elect_curr_price = lpdb.get_curr_month_prices(data_type=5)
        # Only keep the discom slabs for which base prices are available
        urban_elect_curr_price = urban_elect_curr_price.merge(prev_dslab_price_idx,
                                                            on = ['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                                            how = "inner")
        urban_elect_curr_price.drop(columns=['prev_dslab_price_index'], inplace=True)

        # remove the records where previous month price is not available and current month price is zero
        urban_prev_mnth_flag = urban_prev_elect_price[['sector_id', 'state_id', 'nss_discom_code', 'pitem_id']].drop_duplicates()
        urban_prev_mnth_flag['flag'] = 1
        urban_elect_curr_price = urban_elect_curr_price.merge(urban_prev_mnth_flag,
                                                            on=['sector_id', 'state_id', 'nss_discom_code', 'pitem_id'],
                                                            how='left')
        mask = (urban_elect_curr_price['flag'].isna()) & (urban_elect_curr_price['item_price'] == 0.0)
        urban_elect_curr_price = urban_elect_curr_price[~mask]
        urban_elect_curr_price.drop(columns=['flag'], inplace=True)


        rural_elect_curr_price = lpdb.get_curr_month_prices(data_type=6)
        # Only keep the discom slabs for which base prices are available
        rural_elect_curr_price = rural_elect_curr_price.merge(prev_dslab_price_idx,
                                                            on = ['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                                            how = "inner")
        rural_elect_curr_price.drop(columns=['prev_dslab_price_index'], inplace=True)
        # remove the records where previous month price is not available and current month price is zero

        rural_prev_mnth_flag = rural_prev_elect_price[['sector_id', 'state_id', 'nss_discom_code', 'pitem_id']].drop_duplicates()
        rural_prev_mnth_flag['flag'] = 1
        rural_elect_curr_price = rural_elect_curr_price.merge(rural_prev_mnth_flag,
                                                            on=['sector_id', 'state_id', 'nss_discom_code', 'pitem_id'],
                                                            how='left')
        mask = (rural_elect_curr_price['flag'].isna()) & (rural_elect_curr_price['item_price'] == 0.0)
        rural_elect_curr_price = rural_elect_curr_price[~mask]
        rural_elect_curr_price.drop(columns=['flag'], inplace=True)


        ############################################
        # Carry forward the prices from previous month if not available in current month
        curr_month_prices = urban_elect_curr_price[['sector_id', 'state_id', 'nss_discom_code', 'pitem_id']].drop_duplicates()
        curr_month_prices['cflag'] = 1

        carry_forward_prices = urban_prev_elect_price.merge(
            curr_month_prices,
            on=['sector_id', 'state_id', 'nss_discom_code', 'pitem_id'],
            how='left'
        )
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

        if not carry_forward_prices.empty:
            print(carry_forward_prices.shape)
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            urban_elect_curr_price = pd.concat([urban_elect_curr_price, carry_forward_prices], ignore_index=True)

        # Rural
        curr_month_prices = rural_elect_curr_price[['sector_id', 'state_id', 'nss_discom_code', 'pitem_id']].drop_duplicates()
        curr_month_prices['cflag'] = 1
        carry_forward_prices = rural_prev_elect_price.merge(
            curr_month_prices,
            on=['sector_id', 'state_id', 'nss_discom_code', 'pitem_id'],
            how='left'
        )
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]
        if not carry_forward_prices.empty:
            print(carry_forward_prices.shape)
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            rural_elect_curr_price = pd.concat([rural_elect_curr_price, carry_forward_prices], ignore_index=True)

        del curr_month_prices, carry_forward_prices
        ############################################


        cols_required = ['sector_id', 'state_id', 'nss_discom_code', 'pitem_id', 'total_units_price',
                        'units_slab', 'revised_item_price', 'price_imputed', 'spcl_id']
        curr_elect_prices_df = pd.concat([rural_elect_curr_price[cols_required],
                                        urban_elect_curr_price[cols_required]], ignore_index=True).drop_duplicates()

        prev_elect_prices_df = pd.concat([rural_prev_elect_price[cols_required],
                                        urban_prev_elect_price[cols_required]], ignore_index=True)
        prev_elect_prices_df.drop(columns=['price_imputed', 'spcl_id', 'units_slab'], inplace=True)
        prev_elect_prices_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

        print(curr_elect_prices_df.shape)
        curr_elect_prices_df = curr_elect_prices_df.merge(prev_elect_prices_df,
                                                        on=['sector_id', 'state_id', 'nss_discom_code', 'pitem_id', 'total_units_price'],
                                                        how='left')

        # Remove any records where previous month price is not available
        curr_elect_prices_df = curr_elect_prices_df[~curr_elect_prices_df['prev_item_price'].isna()]

        ############################################
        print(curr_elect_prices_df.shape)
        curr_elect_prices_df.head(1)

        # if entire state and sector have zero current month price or special code greater than 0, then replace the revised item price with previous month price
        # select the records where revised item price is zero and spcl_id is greater than 0
        zero_price_spcl_df = curr_elect_prices_df[(curr_elect_prices_df.revised_item_price == 0.0) | (curr_elect_prices_df.spcl_id > 0)]

        # check the state_id and sector_id combinations for teh filtered records if the count of records are same as that in the original dataframe, if yes then it means that for those state_id and sector_id combinations all the records have zero current month price or special code greater than 0
        zero_price_spcl_count = zero_price_spcl_df.groupby(['state_id', 'sector_id']).size().reset_index(name='zero_spcl_count')
        total_count = curr_elect_prices_df.groupby(['state_id', 'sector_id']).size().reset_index(name='total_count')
        zero_price_spcl_count = zero_price_spcl_count.merge(total_count, on=['state_id', 'sector_id'], how='left')
        zero_price_spcl_count['all_zero_spcl'] = zero_price_spcl_count['zero_spcl_count'] == zero_price_spcl_count['total_count']
        # select the records where all_zero_spcl is True
        all_zero_spcl_df = zero_price_spcl_count[zero_price_spcl_count.all_zero_spcl == True]

        if all_zero_spcl_df.shape[0] > 0:
            for idx, row in all_zero_spcl_df.iterrows():
                print(f"Carry Forwarding previous month prices for state_id: {row['state_id']} and sector_id: {row['sector_id']}")
                state_id = row['state_id']
                sector_id = row['sector_id']
                mask = (curr_elect_prices_df['state_id'] == state_id) & (curr_elect_prices_df['sector_id'] == sector_id)
                curr_elect_prices_df.loc[mask, 'revised_item_price'] = curr_elect_prices_df.prev_item_price[mask]
                curr_elect_prices_df.loc[mask, 'price_imputed'] = 1
                
        # If a few slabs within state and sector have zero current month price,
        mask = ((curr_elect_prices_df['revised_item_price'] == 0.0) | (curr_elect_prices_df['spcl_id'] > 0)) & (curr_elect_prices_df['price_imputed'] == 0)
        if curr_elect_prices_df[mask].shape[0] > 0:
            print("Imputing prices for records with zero current month price or special code > 0...")
            non_zero_prices = curr_elect_prices_df[(curr_elect_prices_df.revised_item_price > 0.0) & (curr_elect_prices_df.spcl_id == 0)]
            
            non_zero_prices['pr'] = non_zero_prices['revised_item_price'] / non_zero_prices['prev_item_price']

            non_zero_prices = non_zero_prices.merge(discom_slab_weights_df,
                                                on=['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                                how='left')
            non_zero_prices = non_zero_prices.merge(prev_dslab_price_idx,
                                                on=['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                                how='left')
            non_zero_prices['dslab_price_index'] = non_zero_prices['pr'] * non_zero_prices['prev_dslab_price_index']

            # Now take weighted average of dslab_price_index and prev_dslab_price_index within state_id, sector_id
            imp_factor_df = non_zero_prices.groupby(['state_id', 'sector_id']).apply(
                lambda x: pd.Series({
                    'weighted_dslab_price_index': np.average(x['dslab_price_index'], weights=x['hh_count']),
                    'weighted_prev_dslab_price_index': np.average(x['prev_dslab_price_index'], weights=x['hh_count'])
                    })
                    ).reset_index()

            imp_factor_df['imputation_factor'] = imp_factor_df['weighted_dslab_price_index'] / imp_factor_df['weighted_prev_dslab_price_index']
            # drop weighted columns
            imp_factor_df.drop(columns=['weighted_dslab_price_index', 'weighted_prev_dslab_price_index'], inplace=True)

            curr_elect_prices_df = curr_elect_prices_df.merge(imp_factor_df,
                                                        on=['state_id', 'sector_id'],
                                                        how='left')

            mask = ((curr_elect_prices_df['revised_item_price'] == 0.0) | (curr_elect_prices_df['spcl_id'] > 0)) & (curr_elect_prices_df['price_imputed'] == 0)
            curr_elect_prices_df.loc[mask, 'revised_item_price'] = curr_elect_prices_df.prev_item_price[mask] * curr_elect_prices_df.imputation_factor[mask]
            curr_elect_prices_df.loc[mask, 'price_imputed'] = 1
            curr_elect_prices_df.drop(columns=['imputation_factor'], inplace=True)

        curr_elect_prices_df[curr_elect_prices_df.price_imputed == 1].shape[0]

        dslab_pidx_df = curr_elect_prices_df.copy()
        dslab_pidx_df['pr'] = dslab_pidx_df['revised_item_price'] / dslab_pidx_df['prev_item_price']
        dslab_pidx_df = dslab_pidx_df.merge(prev_dslab_price_idx,
                                            on=['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                            how='left')
        dslab_pidx_df['dslab_price_index'] = dslab_pidx_df['pr'] * dslab_pidx_df['prev_dslab_price_index']
        # rename price_imputed to imputed
        dslab_pidx_df.rename(columns={'price_imputed': 'imputed'}, inplace=True)

        dslab_pidx_df.head(1)

        elect_pidx_df = dslab_pidx_df.merge(discom_slab_weights_df,
                                            on=['state_id', 'sector_id', 'nss_discom_code', 'units_slab'],
                                            how='left')

        # Now take weighted average of dslab_price_index and prev_dslab_price_index within state_id, sector_id
        elect_pidx_df = elect_pidx_df.groupby(['state_id', 'sector_id']).apply(
            lambda x: pd.Series({
                'price_index': np.average(x['dslab_price_index'], weights=x['hh_count']),
                'imputed': int(np.min(x['imputed']))
                })
                ).reset_index()

        # convert imputed to int
        elect_pidx_df['imputed'] = elect_pidx_df['imputed'].astype(int)

        pitem_code = mfunc.get_coicop_names_codes()[mfunc.get_coicop_names_codes().pitem_name == "Electricity charges"].pitem_code.values[0]
        pitem_id = mfunc.get_coicop_names_codes()[mfunc.get_coicop_names_codes().pitem_name == "Electricity charges"].pitem_id.values[0]
        elect_pidx_df['pitem_code'] = pitem_code
        elect_pidx_df['pitem_id'] = pitem_id

        nss_state_sector_ids = get_market_master()[['nss_state_code', 'nss_sector_code', 'state_id', 'sector_id']].drop_duplicates()
        elect_pidx_df = elect_pidx_df.merge(nss_state_sector_ids,
                                            on=['state_id', 'sector_id'],
                                            how='left')
        elect_pidx_df['price_month_year'] = price_data_month_year
        elect_pidx_df = elect_pidx_df[['state_id', 'sector_id', 'nss_state_code', 'nss_sector_code', 
                                    'pitem_code', 'price_index', 'imputed', 'pitem_id']]
        elect_pidx_df.head()

        # raise error if here is NA or zero in price_index
        if (elect_pidx_df['price_index'].isna().sum() > 0) | ((elect_pidx_df['price_index'] == 0).sum() > 0):
            print(elect_pidx_df[elect_pidx_df['price_index'].isna() | (elect_pidx_df['price_index'] == 0)])
            raise ValueError("There are NA or zero values in price_index, please check the data")

        # count the states covered in each sector
        state_counts = elect_pidx_df.groupby('nss_sector_code')['state_id'].nunique().reset_index()
        state_counts.rename(columns={'state_id': 'state_count'}, inplace=True)
        state_counts

        # get the states which are missing from the elect_pidx_df
        state_names = mfunc.get_market_master()[['state_id', 'lgd_state_name']].drop_duplicates()
        # check which states are missing in sector_id 1 and 2
        for sector_id in [1, 2]:
            missing_states = state_names[~state_names['state_id'].isin(
                elect_pidx_df[elect_pidx_df['sector_id'] == sector_id]['state_id']
            )]
            print(f"Missing states for sector_id {sector_id}:")
            print(missing_states)
            

        # Save the discom wise index and electricity elementary index
        cols_req_idx_table = pd.read_parquet(pidx_db_final).columns.tolist()
        cols_req_discom_idx_table = pd.read_parquet(elect_dslab_pidx_db_final).columns.tolist()
        cols_req_urban_price_table = pd.read_parquet(elect_urban_price_db_final).columns.tolist()
        cols_req_rural_price_table = pd.read_parquet(elect_rural_price_db_final).columns.tolist()

        elec_updated_prices = curr_elect_prices_df[['state_id', 'sector_id', 'nss_discom_code', 'pitem_id', 'revised_item_price', 'price_imputed']]
        elec_updated_prices.rename(columns={'revised_item_price': 'updated_revised_price', 'price_imputed': 'updated_price_imputed'}, inplace=True)

        rural_elect_curr_price = rural_elect_curr_price.merge(elec_updated_prices,
                                                    on = ['state_id', 'sector_id', 'nss_discom_code', 'pitem_id'],
                                                    how='left')
        mask = rural_elect_curr_price['updated_revised_price'].notna()
        rural_elect_curr_price.loc[mask, 'revised_item_price'] = rural_elect_curr_price.updated_revised_price[mask]
        rural_elect_curr_price.loc[mask, 'price_imputed'] = rural_elect_curr_price.updated_price_imputed[mask]
        rural_elect_curr_price.drop(columns=['updated_revised_price', 'updated_price_imputed'], inplace=True)
        # if spcl_code > 0 and item_price > 0, then update the revised_item_price and price_imputed
        mask = (rural_elect_curr_price['spcl_id'] > 0) & (rural_elect_curr_price['item_price'] > 0)
        if mask.shape[0] > 0:
            rural_elect_curr_price.loc[mask, 'revised_item_price'] = rural_elect_curr_price.item_price[mask]
        rural_elect_curr_price = rural_elect_curr_price[cols_req_rural_price_table]

        urban_elect_curr_price = urban_elect_curr_price.merge(elec_updated_prices,
                                                    on = ['state_id', 'sector_id', 'nss_discom_code', 'pitem_id'],
                                                    how='left')
        mask = urban_elect_curr_price['updated_revised_price'].notna()
        urban_elect_curr_price.loc[mask, 'revised_item_price'] = urban_elect_curr_price.updated_revised_price[mask]
        urban_elect_curr_price.loc[mask, 'price_imputed'] = urban_elect_curr_price.updated_price_imputed[mask]
        urban_elect_curr_price.drop(columns=['updated_revised_price', 'updated_price_imputed'], inplace=True)

        # if spcl_code > 0 and item_price > 0, then update the revised_item_price and price_imputed
        mask = (urban_elect_curr_price['spcl_id'] > 0) & (urban_elect_curr_price['item_price'] > 0)
        if mask.shape[0] > 0:
            urban_elect_curr_price.loc[mask, 'revised_item_price'] = urban_elect_curr_price.item_price[mask]
        urban_elect_curr_price = urban_elect_curr_price[cols_req_urban_price_table]

        dslab_pidx_df['price_data_status'] = price_data_status
        dslab_pidx_df['iteration_id'] = iteration_id
        dslab_pidx_df['price_month_year'] = price_data_month_year
        dslab_pidx_df = dslab_pidx_df.merge(nss_state_sector_ids,
                                                        on=['state_id', 'sector_id'],
                                                        how='left')
        dslab_pidx_df = dslab_pidx_df[cols_req_discom_idx_table]

        elect_pidx_df['price_data_status'] = price_data_status
        elect_pidx_df['iteration_id'] = iteration_id
        elect_pidx_df['price_month_year'] = price_data_month_year
        elect_pidx_df = elect_pidx_df[cols_req_idx_table]

        # Save the price data to price tables in db
        if os.path.exists(elect_rural_price_validated_data_path):
            # remove the file
            os.remove(elect_rural_price_validated_data_path)

        rural_elect_curr_price.to_parquet(elect_rural_price_validated_data_path, index=False)

        # Save the price data to price tables in db
        if os.path.exists(elect_urban_price_validated_data_path):
            # remove the file
            os.remove(elect_urban_price_validated_data_path)

        urban_elect_curr_price.to_parquet(elect_urban_price_validated_data_path, index=False)

        # Save the updated index in database

        if os.path.exists(elect_dslab_pidx_db):
            os.remove(elect_dslab_pidx_db)

        dslab_pidx_df.to_parquet(elect_dslab_pidx_db, index=False)

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, elect_pidx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the Electricity Index. The Index table don't exists")
            
    except Exception as e:
        print("Error in Electricity Index Calculation: ", str(e))
# electricity_index_script()