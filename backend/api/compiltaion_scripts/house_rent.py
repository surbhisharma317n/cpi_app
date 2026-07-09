
import pandas as pd

from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *
# from . import load_price_data_db as lpdb
# from . import master_func as mfunc
# from .master_data_paths import *

# display all row and column data
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.options.mode.copy_on_write = True


def house_rent_script():

    try:

        hr_old_item_code = "4.1.01.1.2.01.1"
        hr_new_item_code = mfunc.get_coicop_pitem_code(hr_old_item_code)
        hr_new_item_code

        category_wts_df = pd.read_parquet(hr_category_weights_db_final)
        category_wts_df.head(1)

        hr_exp_wts_df = pd.read_parquet(hr_own_rent_exp_share_db_final)
        hr_exp_wts_df.head(1)

        # Read the current month price from the database.
        # use the filters from the table hr_rural_price_db.
        rural_hr_curr_all_price = lpdb.get_curr_month_prices(data_type=8)

        # Get the previous month price from transaction table in the comp_db_final
        rural_hr_prev_price = lpdb.get_prev_month_prices(data_type=8)

        if rural_hr_curr_all_price.shape[0] > 0:
            rural_hr_prev_price_df = rural_hr_prev_price[['state_id', 'market_id', 'dwelling_code', 'revised_total_rent_payable']]
            rural_hr_prev_price_df.rename(columns={'revised_total_rent_payable': 'prev_total_rent_payable'}, inplace=True)

            # Get the variables required for compiling index
            rural_index_vars = ['state_id', 'nss_state_code', 'nss_sector_code', 'market_id', 'dwelling_code', 'dwelling_status_code', 
                                'house_category', 'total_rent_payable', 'total_rent_six_month_ago', 'revised_total_rent_payable', 'price_imputed']
            rural_hr_price_df = rural_hr_curr_all_price[rural_index_vars]
            print(rural_hr_price_df.shape)
            rural_hr_price_df = rural_hr_price_df.merge(rural_hr_prev_price_df,
                                                    on = ['state_id', 'market_id', 'dwelling_code'],
                                                    how='left')
            # If previous month price is not available, then filter out those records
            rural_hr_price_df = rural_hr_price_df[~rural_hr_price_df['prev_total_rent_payable'].isna()]
            
            print(rural_hr_price_df.shape)
            rural_hr_price_df.head(1)
            
        # If the dwelling status is 3 i.e Substituted and total_rent_six_month_ago is not zero, then impute the total_rent_six_month_ago to prev_total_rent_payable
        mask = (rural_hr_price_df['dwelling_status_code'] == 3) & (rural_hr_price_df['total_rent_six_month_ago'] != 0)
        if mask.sum() > 0:
            rural_hr_price_df.loc[mask, 'prev_total_rent_payable'] = rural_hr_price_df.total_rent_six_month_ago[mask]
        rural_hr_price_df.head(1)

        # If the dwelling status is 3 i.e Substituted and total_rent_six_month_ago is zero, then impute the 
        # total_rent_payable as in case like if dwelling status is 1 or 2 and total_rent_payable is zero.
        # Revert the revised_total_rent_payable to total_rent_payable after index calculation, so that the actual 
        # collected rent is saved in the database.
        mask = (rural_hr_price_df['dwelling_status_code'] == 3) & (rural_hr_price_df['total_rent_six_month_ago'] == 0)
        if mask.sum() > 0:
            rural_hr_price_df.loc[mask, 'revised_total_rent_payable'] = 0.0
        rural_hr_price_df.head(1)

        if (rural_hr_price_df['revised_total_rent_payable'] == 0).sum() > 0:
            # Calculate the price relatives
            imputation_mask = (rural_hr_price_df['revised_total_rent_payable'] != 0)
            imputation_df = rural_hr_price_df[imputation_mask].copy()

            # check if the total_rent_payable and prev_total_rent_payable are not zero, the first do within category imputation
            if ((imputation_df['prev_total_rent_payable'] == 0).sum() == 0) & ((imputation_df['revised_total_rent_payable'] == 0).sum() == 0):
                # There are valid records available for within category imputation
                imputation_df['price_relative'] = (imputation_df['revised_total_rent_payable'] / imputation_df['prev_total_rent_payable'])
                # Take the geometric mean of price relatives at state_id and category level
                geo_mean_df = imputation_df.groupby(['state_id', 'house_category'], as_index=False)['price_relative'].apply(
                    lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imputation_factor'})
                
                b_mcount = rural_hr_price_df.shape[0]
                rural_hr_price_df = rural_hr_price_df.merge(geo_mean_df,
                                                on=['state_id', 'house_category'],
                                                how='left')
                a_mcount = rural_hr_price_df.shape[0]
                
                if b_mcount != a_mcount:
                    print("Issue with merging imputation factor")
                else:
                    # Impute the prices where ever required
                    impute_mask = (rural_hr_price_df['revised_total_rent_payable'] == 0) & (rural_hr_price_df.imputation_factor.notnull())
                    if impute_mask.sum() > 0:
                        rural_hr_price_df.loc[impute_mask, 'revised_total_rent_payable'] = (
                            rural_hr_price_df.loc[impute_mask, 'prev_total_rent_payable'] * rural_hr_price_df.loc[impute_mask, 'imputation_factor']
                        )
                        rural_hr_price_df.loc[impute_mask, 'price_imputed'] = 1

                        rural_hr_price_df.drop(columns=['imputation_factor'], inplace=True)
                    print("Within category imputation Successfull")

                    if (rural_hr_price_df['revised_total_rent_payable'] == 0).sum() > 0:
                        print("Test")
                        # all prices are zero within entire category
                        imputation_mask = (rural_hr_price_df['revised_total_rent_payable'] != 0)
                        imputation_df = rural_hr_price_df[imputation_mask].copy()

                        imputation_df['price_relative'] = (imputation_df['revised_total_rent_payable'] / imputation_df['prev_total_rent_payable'])
                        # Take the geometric mean of price relatives at state_id and category level
                        geo_mean_df = imputation_df.groupby(['state_id', 'house_category'], as_index=False)['price_relative'].apply(
                        lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imputation_factor'})
                        geo_mean_df_wide = geo_mean_df.pivot(index='state_id', columns='house_category', values='imputation_factor').reset_index().rename_axis(None, axis=1)
                        geo_mean_df_wide.fillna(0, inplace=True)

                        b_mcount = rural_hr_price_df.shape[0]
                        comb_df = rural_hr_price_df[['state_id', 'house_category']].merge(geo_mean_df_wide,
                                                        on=['state_id'],
                                                        how='left')
                        a_mcount = rural_hr_price_df.shape[0]
                        
                        if b_mcount != a_mcount:
                            print("Issue with merging imputation factor")
                        else:
                            comb_df.drop_duplicates(inplace=True)

                            rural_hr_price_df = rural_hr_price_df.merge(
                                mfunc.intercategory_imputation_factor(comb_df)[['state_id', 'house_category', 'imputation_factor']],
                                on=['state_id', 'house_category'],
                                how='left'
                            )
                            impute_mask = (rural_hr_price_df['revised_total_rent_payable'] == 0)
                            if impute_mask.sum() > 0:
                                rural_hr_price_df.loc[impute_mask, 'revised_total_rent_payable'] = (
                                rural_hr_price_df.loc[impute_mask, 'prev_total_rent_payable'] * rural_hr_price_df.loc[impute_mask, 'imputation_factor']
                                )
                                rural_hr_price_df.loc[impute_mask, 'price_imputed'] = 1
                                rural_hr_price_df.drop(columns=['imputation_factor'], inplace=True)

                            print("Between category imputation Successfull")        
            else:
                print("Current month or previous month prices contain zero values, cannot perform within category imputation")
                
                
        # Read the current month price from the database
        urban_hr_curr_all_price = lpdb.get_curr_month_prices(data_type=7)

        # Get the previous month price from transaction table in the comp_db_final
        urban_hr_prev_price = lpdb.get_prev_month_prices(data_type=7)

        if urban_hr_curr_all_price.shape[0] > 0:
            urban_hr_prev_price_df = urban_hr_prev_price[['state_id', 'market_id', 'dwelling_code', 'revised_total_rent_payable']]
            urban_hr_prev_price_df.rename(columns={'revised_total_rent_payable': 'prev_total_rent_payable'}, inplace=True)

            # Get the variables required for compiling index
            urban_index_vars = ['state_id', 'nss_state_code', 'nss_sector_code', 'market_id', 'dwelling_code', 'dwelling_status_code', 
                                'house_category', 'total_rent_payable', 'total_rent_six_month_ago', 'revised_total_rent_payable', 'price_imputed']
            urban_hr_price_df = urban_hr_curr_all_price[urban_index_vars]
            print(urban_hr_price_df.shape)
            urban_hr_price_df = urban_hr_price_df.merge(urban_hr_prev_price_df,
                                                    on = ['state_id', 'market_id', 'dwelling_code'],
                                                    how='left')

            # If previous month price is not available, then filter out those records
            urban_hr_price_df = urban_hr_price_df[~urban_hr_price_df['prev_total_rent_payable'].isna()]
            #urban_hr_price_df['revised_total_rent_payable'] = urban_hr_price_df['total_rent_payable']
            print(urban_hr_price_df.shape)
            urban_hr_price_df.head(1)
            
        # If the dwelling status is 3 i.e Substituted and total_rent_six_month_ago is not zero, then impute the total_rent_six_month_ago to prev_total_rent_payable
        mask = (urban_hr_price_df['dwelling_status_code'] == 3) & (urban_hr_price_df['total_rent_six_month_ago'] != 0)
        if mask.sum() > 0:
            urban_hr_price_df.loc[mask, 'prev_total_rent_payable'] = urban_hr_price_df.total_rent_six_month_ago[mask]
        urban_hr_price_df.head(1)

        # If the dwelling status is 3 i.e Substituted and total_rent_six_month_ago is zero, then impute the total_rent_payable as in case like if dwelling status is 1 or 2 and 
        # total_rent_payable is zero.
        mask = (urban_hr_price_df['dwelling_status_code'] == 3) & (urban_hr_price_df['total_rent_six_month_ago'] == 0)
        if mask.sum() > 0:
            urban_hr_price_df.loc[mask, 'revised_total_rent_payable'] = 0.0
        urban_hr_price_df.head(1)

        if (urban_hr_price_df['revised_total_rent_payable'] == 0).sum() > 0:
            # Calculate the price relatives
            imputation_mask = (urban_hr_price_df['revised_total_rent_payable'] != 0)
            imputation_df = urban_hr_price_df[imputation_mask].copy()

            # check if the total_rent_payable and prev_total_rent_payable are not zero, the first do within category imputation
            if ((imputation_df['prev_total_rent_payable'] == 0).sum() == 0) & ((imputation_df['revised_total_rent_payable'] == 0).sum() == 0):
                # There are valid records available for within category imputation
                imputation_df['price_relative'] = (imputation_df['revised_total_rent_payable'] / imputation_df['prev_total_rent_payable'])
                # Take the geometric mean of price relatives at state_id and category level
                geo_mean_df = imputation_df.groupby(['state_id', 'house_category'], as_index=False)['price_relative'].apply(
                    lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imputation_factor'})
                
                b_mcount = urban_hr_price_df.shape[0]
                urban_hr_price_df = urban_hr_price_df.merge(geo_mean_df,
                                                on=['state_id', 'house_category'],
                                                how='left')
                a_mcount = urban_hr_price_df.shape[0]
                
                if b_mcount != a_mcount:
                    print("Issue with merging imputation factor")
                else:
                    # Impute the prices where ever required
                    impute_mask = (urban_hr_price_df['revised_total_rent_payable'] == 0) & (urban_hr_price_df.imputation_factor.notnull())
                    if impute_mask.sum() > 0:
                        urban_hr_price_df.loc[impute_mask, 'revised_total_rent_payable'] = (
                            urban_hr_price_df.loc[impute_mask, 'prev_total_rent_payable'] * urban_hr_price_df.loc[impute_mask, 'imputation_factor']
                        )
                        urban_hr_price_df.loc[impute_mask, 'price_imputed'] = 1
                        urban_hr_price_df.drop(columns=['imputation_factor'], inplace=True)
                    print("Within category imputation Successfull")

                    if (urban_hr_price_df['revised_total_rent_payable'] == 0).sum() > 0:
                        print("Test")
                        # all prices are zero within entire category
                        imputation_mask = (urban_hr_price_df['revised_total_rent_payable'] != 0)
                        imputation_df = urban_hr_price_df[imputation_mask].copy()

                        imputation_df['price_relative'] = (imputation_df['revised_total_rent_payable'] / imputation_df['prev_total_rent_payable'])
                        # Take the geometric mean of price relatives at state_id and category level
                        geo_mean_df = imputation_df.groupby(['state_id', 'house_category'], as_index=False)['price_relative'].apply(
                        lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imputation_factor'})
                        geo_mean_df_wide = geo_mean_df.pivot(index='state_id', columns='house_category', values='imputation_factor').reset_index().rename_axis(None, axis=1)
                        geo_mean_df_wide.fillna(0, inplace=True)

                        b_mcount = urban_hr_price_df.shape[0]
                        comb_df = urban_hr_price_df[['state_id', 'house_category']].merge(geo_mean_df_wide,
                                                        on=['state_id'],
                                                        how='left')
                        a_mcount = urban_hr_price_df.shape[0]
                        
                        if b_mcount != a_mcount:
                            print("Issue with merging imputation factor")
                        else:
                            comb_df.drop_duplicates(inplace=True)

                            urban_hr_price_df = urban_hr_price_df.merge(
                                mfunc.intercategory_imputation_factor(comb_df)[['state_id', 'house_category', 'imputation_factor']],
                                on=['state_id', 'house_category'],
                                how='left'
                            )
                            impute_mask = (urban_hr_price_df['revised_total_rent_payable'] == 0)
                            if impute_mask.sum() > 0:
                                urban_hr_price_df.loc[impute_mask, 'revised_total_rent_payable'] = (
                                urban_hr_price_df.loc[impute_mask, 'prev_total_rent_payable'] * urban_hr_price_df.loc[impute_mask, 'imputation_factor']
                                )
                                urban_hr_price_df.loc[impute_mask, 'price_imputed'] = 1
                                urban_hr_price_df.drop(columns=['imputation_factor'], inplace=True)

                            print("Between category imputation Successfull")        
                
            else:
                print("Current month or previous month prices contain zero values, cannot perform within category imputation")
                
        def get_index_imputation_flag(sector_name):
            mkt_info = mfunc.get_market_master()
            if mkt_info[mkt_info.nss_sector_name == rural_sector_name].nss_sector_name.values[0] == sector_name:
                idx_imp_flag = (rural_hr_price_df
                        .groupby(['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'],
                                as_index=False)
                        .agg(price_imputed_sum=('price_imputed', 'sum'),
                            price_imputed_count=('price_imputed', 'count'))
                    )
            if mkt_info[mkt_info.nss_sector_name == urban_sector_name].nss_sector_name.values[0] == sector_name:
                idx_imp_flag = (urban_hr_price_df
                        .groupby(['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'],
                                as_index=False)
                        .agg(price_imputed_sum=('price_imputed', 'sum'),
                            price_imputed_count=('price_imputed', 'count'))
                    )
            
            idx_imp_flag['imputation_ratio'] = idx_imp_flag['price_imputed_sum'] / idx_imp_flag['price_imputed_count']
            mask = idx_imp_flag['imputation_ratio'] == 1.0
            idx_imp_flag['imputed'] = 0
            idx_imp_flag.loc[mask, 'imputed'] = 1
            idx_imp_flag.drop(columns=['price_imputed_sum', 'price_imputed_count', 'imputation_ratio'], inplace=True)

            return idx_imp_flag


        # compute the price relatives after imputation
        rural_hr_price_df['price_relative'] = rural_hr_price_df['revised_total_rent_payable'] / rural_hr_price_df['prev_total_rent_payable']

        # Take geometric mean of price relatives at state and category level
        rural_geo_mean_df = rural_hr_price_df.groupby(['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'cat_gm_pr'})

        imp_flag = get_index_imputation_flag(rural_sector_name)
        if imp_flag.imputed.sum() > 0:
            rural_geo_mean_df = rural_geo_mean_df.merge(imp_flag,
                                                        on = ['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'],
                                                        how = 'left') 
        else:
            rural_geo_mean_df['imputed'] = 0
            
        rural_geo_mean_df.head(2)

        # compute the price relatives after imputation
        urban_hr_price_df['price_relative'] = urban_hr_price_df['revised_total_rent_payable'] / urban_hr_price_df['prev_total_rent_payable']

        # Take geometric mean of price relatives at state and category level
        urban_geo_mean_df = urban_hr_price_df.groupby(['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'cat_gm_pr'})

        imp_flag = get_index_imputation_flag(urban_sector_name)
        if imp_flag.imputed.sum() > 0:
            urban_geo_mean_df = urban_geo_mean_df.merge(imp_flag,
                                                        on = ['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'],
                                                        how = 'left')
        else:
            urban_geo_mean_df['imputed'] = 0

        urban_geo_mean_df.head(2)

        geo_mean_df = pd.concat([rural_geo_mean_df, urban_geo_mean_df], ignore_index=True)

        # REMOVE IN THE CLOUD VERSION
        #mask = ((item_price_df.price_relative < .5) | (item_price_df.price_relative > 2.0)) & (item_price_df.price_imputed == 0.0)
        cols_req = ["state_id", "market_id", "dwelling_code", "dwelling_status_code", "price_imputed", "revised_total_rent_payable", "prev_total_rent_payable"]
        urban_prices = urban_hr_price_df[cols_req].copy()
        rural_prices = rural_hr_price_df[cols_req].copy()
        item_price_df = pd.concat([urban_prices, rural_prices], ignore_index=True)

        year = str(price_data_month_year.year)
        month = str(price_data_month_year.month).zfill(2)
        item_price_df['price_month_year'] = price_data_month_year
        #items_req_attention.to_excel(f'scrutiny//items_req_attention_{year}_{month}.xlsx', index=False)
        item_price_df.to_parquet(f'data//scrutiny//hr_{year}_{month}.parquet', index=False)

        # Load the category wise previous month index
        prev_cat_wise_idx = pd.read_parquet(hr_cat_wise_idx_db_final)

        prev_cat_wise_idx = prev_cat_wise_idx.loc[(prev_cat_wise_idx.price_month_year == prev_month) & 
                                                (prev_cat_wise_idx.price_data_status == "F"),
                                                ['state_id', 'nss_state_code', 'nss_sector_code', 'house_category', 'cat_index']]

        prev_cat_wise_idx.rename(columns={'cat_index': 'prev_cat_index'}, inplace=True)
        prev_cat_wise_idx.head(2)

        # merge the geo_mean_df with prev_cat_wise_idx to get the previous month category index
        cat_index_df = geo_mean_df.merge(prev_cat_wise_idx,
                                        on=['state_id', 'nss_state_code', 'nss_sector_code', 'house_category'],
                                        how='left')
        cat_index_df['cat_index'] = cat_index_df['cat_gm_pr'] * cat_index_df['prev_cat_index']
        # Repeat the same index for Rented and Owned house categories
        cat_index_df['house_ownership'] = 'Rented'
        owned_cat_index_df = cat_index_df.copy()
        owned_cat_index_df['house_ownership'] = 'Owned'
        rented_cat_index_df = cat_index_df.copy()
        rented_cat_index_df['house_ownership'] = 'Rented'

        cat_index_df = pd.concat([owned_cat_index_df, rented_cat_index_df], ignore_index=True)
        cat_index_df.head(2)

        # Merge the category weights with category index dataframe
        cat_index_df = cat_index_df.merge(category_wts_df[['nss_sector_code', 'state_id', 'house_ownership', 'house_category', 'category_weight']],
                                            on=['nss_sector_code', 'state_id', 'house_ownership', 'house_category'],
                                            how='left')
        # Calculate weighted average at state_id, nss_sector_code, house_ownership level
        cat_index_df['weighted_cat_index'] = cat_index_df['cat_index'] * cat_index_df['category_weight']

        ownership_wise_hr_index_df = (
            cat_index_df
            .groupby(['state_id', 'nss_state_code', 'nss_sector_code', 'house_ownership'], as_index=False)
            .agg(weighted_sum=('weighted_cat_index', 'sum'), weight_sum=('category_weight', 'sum'),
                imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
        )

        # Add the flag of imputation
        ownership_wise_hr_index_df['imputed'] = 0
        ownership_wise_hr_index_df.loc[(ownership_wise_hr_index_df.imputed_sum/ownership_wise_hr_index_df.imputed_count) == 1.0, 'imputed'] = 1

        # Calculate the index
        ownership_wise_hr_index_df['ownership_wise_hr_index'] = ownership_wise_hr_index_df['weighted_sum'].div(ownership_wise_hr_index_df['weight_sum']).fillna(0)

        # Remove the columns not required in the index table
        ownership_wise_hr_index_df.drop(columns=['weighted_sum', 'weight_sum', 'imputed_count', 'imputed_sum'], inplace=True)

        ownership_wise_hr_index_df.head(2)

        # Merge the hr_exp_wts_df with ownership_wise_hr_index_df
        ownership_wise_hr_index_df = ownership_wise_hr_index_df.merge(hr_exp_wts_df,
                                                    on=['state_id', 'nss_state_code', 'nss_sector_code', 'house_ownership'],
                                                        how='left')
        ownership_wise_hr_index_df['weighted_hr_idx'] = ownership_wise_hr_index_df['ownership_wise_hr_index'] * ownership_wise_hr_index_df['exp_weight']

        hr_index_df = (
            ownership_wise_hr_index_df
            .groupby(['state_id', 'nss_state_code', 'nss_sector_code'], as_index=False)
            .agg(weighted_sum=('weighted_hr_idx', 'sum'), weight_sum=('exp_weight', 'sum'),
                imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
        )

        # Add the imputation flag in HR index
        hr_index_df['imputed'] = 0
        hr_index_df.loc[(hr_index_df.imputed_sum/hr_index_df.imputed_count) == 1.0, 'imputed'] = 1

        # Calculate the index
        hr_index_df['price_index'] = hr_index_df['weighted_sum'].div(hr_index_df['weight_sum'])

        # Remove the columns not required in the index table
        hr_index_df.drop(columns=['weighted_sum', 'weight_sum', 'imputed_count', 'imputed_sum'], inplace=True)

        # add the item code in the house rent index table
        item_master_df = mfunc.get_pitem_master()

        hr_index_df['pitem_code'] = item_master_df[item_master_df.old_pitem_code == hr_old_item_code].pitem_code.values[0]
        hr_index_df['pitem_id'] = item_master_df[item_master_df.old_pitem_code == hr_old_item_code].pitem_id.values[0]
        # if nss_sector_code is 01 then sector_id elif nss_sector_code is 02 then sector_id is 2
        hr_index_df['sector_id'] = 1
        hr_index_df.loc[hr_index_df.nss_sector_code == '01', 'sector_id'] = 1
        hr_index_df.loc[hr_index_df.nss_sector_code == '02', 'sector_id'] = 2
        # convert sector_id to int32
        hr_index_df['sector_id'] = hr_index_df['sector_id'].astype('int32')

        # arrange in required order first codes and then imputed then index and then ids
        hr_index_df = hr_index_df[['nss_state_code', 'nss_sector_code', 'pitem_code', 'imputed', 'price_index',
                                'sector_id', 'pitem_id','state_id']]
        hr_index_df.head(2)

        # raise error if here is NA or zero in price_index
        if (hr_index_df['price_index'].isna().sum() > 0) | ((hr_index_df['price_index'] == 0).sum() > 0):
            raise ValueError("There are NA or zero values in price_index, please check the data")

        # count the numbers of states covered in each sector
        state_counts = hr_index_df.groupby('nss_sector_code')['state_id'].nunique().reset_index()
        state_counts.rename(columns={'state_id': 'state_count'}, inplace=True)
        state_counts

        # Save the indexes and revised prices in the database

        cols_req_pidx_table = pd.read_parquet(pidx_db_final).columns.tolist()
        cols_req_cat_wise_idx_table = pd.read_parquet(hr_cat_wise_idx_db_final).columns.tolist()
        cols_req_urban_price_table = pd.read_parquet(hr_urban_price_db_final).columns.tolist()
        cols_req_rural_price_table = pd.read_parquet(hr_rural_price_db_final).columns.tolist()

        # 0: Original, 2: Casaulty, 3: Substituted
        mask = (rural_hr_price_df['dwelling_status_code'] == 3) & (rural_hr_price_df['total_rent_six_month_ago'] == 0)
        if mask.sum() > 0:
            rural_hr_price_df.loc[mask, 'revised_total_rent_payable'] = rural_hr_price_df.total_rent_payable[mask]

        mask = (urban_hr_price_df['dwelling_status_code'] == 3) & (urban_hr_price_df['total_rent_six_month_ago'] == 0)
        if mask.sum() > 0:
            urban_hr_price_df.loc[mask, 'revised_total_rent_payable'] = urban_hr_price_df.total_rent_payable[mask]
            
        rural_updated_prices = rural_hr_price_df[['market_id', 'dwelling_code', 'revised_total_rent_payable', 'price_imputed']]
        rural_updated_prices.rename(columns={'revised_total_rent_payable': 'updated_revised_rent', 'price_imputed': 'updated_price_imputed'}, inplace=True)

        rural_hr_curr_all_price = rural_hr_curr_all_price.merge(rural_updated_prices,
                                                    on = ['market_id', 'dwelling_code'],
                                                    how='left')
        # only update for the records where updated_revised_rent is not null
        mask = rural_hr_curr_all_price['updated_revised_rent'].notnull()
        rural_hr_curr_all_price.loc[mask, 'revised_total_rent_payable'] = rural_hr_curr_all_price.updated_revised_rent[mask]
        rural_hr_curr_all_price.loc[mask, 'price_imputed'] = rural_hr_curr_all_price.updated_price_imputed[mask]

        rural_hr_curr_all_price.drop(columns=['updated_revised_rent', 'updated_price_imputed'], inplace=True)
        rural_hr_curr_all_price = rural_hr_curr_all_price[cols_req_rural_price_table]

        urban_updated_prices = urban_hr_price_df[['market_id', 'dwelling_code', 'revised_total_rent_payable', 'price_imputed']]
        urban_updated_prices.rename(columns={'revised_total_rent_payable': 'updated_revised_rent', 'price_imputed': 'updated_price_imputed'}, inplace=True)

        urban_hr_curr_all_price = urban_hr_curr_all_price.merge(urban_updated_prices,
                                                    on = ['market_id', 'dwelling_code'],
                                                    how='left')

        # only update for the records where updated_revised_rent is not null
        mask = urban_hr_curr_all_price['updated_revised_rent'].notnull()
        urban_hr_curr_all_price.loc[mask, 'revised_total_rent_payable'] = urban_hr_curr_all_price.updated_revised_rent[mask]
        urban_hr_curr_all_price.loc[mask, 'price_imputed'] = urban_hr_curr_all_price.updated_price_imputed[mask]

        urban_hr_curr_all_price.drop(columns=['updated_revised_rent', 'updated_price_imputed'], inplace=True)
        urban_hr_curr_all_price = urban_hr_curr_all_price[cols_req_urban_price_table]

        # 1. Save Price Data in comp_db

        # Save the price data to price tables in db
        if os.path.exists(hr_rural_price_validated_data_path):
            # remove the file
            os.remove(hr_rural_price_validated_data_path)

        rural_hr_curr_all_price.to_parquet(hr_rural_price_validated_data_path, index=False)

        # Save the price data to price tables in db
        if os.path.exists(hr_urban_price_validated_data_path):
            # remove the file
            os.remove(hr_urban_price_validated_data_path)

        urban_hr_curr_all_price.to_parquet(hr_urban_price_validated_data_path, index=False)

        hr_index_df['price_data_status'] = price_data_status
        hr_index_df['iteration_id'] = iteration_id
        hr_index_df['price_month_year'] = price_data_month_year
        hr_index_df = hr_index_df[cols_req_pidx_table]
        hr_index_df.head(1)

        if os.path.exists(pidx_db):
            os.remove(pidx_db)

        hr_index_df.to_parquet(pidx_db, index=False)

        cat_index_df['price_data_status'] = price_data_status
        cat_index_df['iteration_id'] = iteration_id
        cat_index_df['price_month_year'] = price_data_month_year
        cat_index_df = cat_index_df[cols_req_cat_wise_idx_table]
        cat_index_df.head(1)

        ownership_wise_hr_index_df['price_data_status'] = price_data_status
        ownership_wise_hr_index_df['iteration_id'] = iteration_id
        ownership_wise_hr_index_df['price_month_year'] = price_data_month_year
        ownership_wise_hr_index_df.drop(columns=['exp_weight', 'nss_state_name', 'nss_sector_name', 'weighted_hr_idx'], inplace=True)
        # align as state_id, sector_id, nss_state_code, nss_sector_code, house_ownership, ownership_wise_hr_index, imputed, price_data_status, iteration_id, price_month_year
        ownership_wise_hr_index_df = ownership_wise_hr_index_df[['state_id', 'nss_state_code', 'nss_sector_code', 'house_ownership', 'ownership_wise_hr_index', 
                                                                'imputed', 'price_data_status', 'iteration_id', 'price_month_year']]
        ownership_wise_hr_index_df.head(1)

        if os.path.exists(hr_cat_wise_idx_db):
            os.remove(hr_cat_wise_idx_db)

        cat_index_df.to_parquet(hr_cat_wise_idx_db, index=False)

        if os.path.exists(hr_own_wise_idx_db):
            os.remove(hr_own_wise_idx_db)

        ownership_wise_hr_index_df.to_parquet(hr_own_wise_idx_db, index=False)
        
    except Exception as e:
        print("Error in compiling house rent index: ", str(e))
# house_rent_script()