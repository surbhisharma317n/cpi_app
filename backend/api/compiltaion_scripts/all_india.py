

# Load the libraries
import numpy as np
import pandas as pd
import re
import os
# import matplotlib as plt

# display all row and column data
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.options.mode.copy_on_write = True


from api.upload_input_data.master_func import *
from api.upload_input_data.master_data_paths import *

from numpy import int32

def all_index_script():
    try:

        def generate_all_indexes(curr_month_widx, all_levels_exp_df):
            exp_cols_req = ['state_id', 'sector_id', 'witem_id', 'witem_exp', 'subclass_id', 'class_id', 'group_id', 
                            'division_id', 'subclass_exp', 'class_exp', 'group_exp', 'division_exp', 'all_exp']
            widx_cols_req = ['state_id', 'sector_id', 'witem_id', 'witem_index', 'imputed']

            if curr_month_widx.shape[0] == 0 or all_levels_exp_df.shape[0] == 0:
                print("One of the input dataframes is empty. Cannot compute indexes.")
                return pd.DataFrame()  # Return an empty DataFrame
            if not set(exp_cols_req).issubset(all_levels_exp_df.columns):
                print("all_levels_exp_df is missing required columns.")
                return pd.DataFrame()  # Return an empty DataFrame
            if not set(widx_cols_req).issubset(curr_month_widx.columns):
                print("curr_month_widx is missing required columns.")
                return pd.DataFrame()  # Return an empty DataFrame
            
            # create an empty dataframe to store the indexes at all levels
            # All states (including All India) and all sector (including Combined)
            # cols : state_id, sector_id, level, index, imputed
            all_states_all_sector_df = pd.DataFrame()

            # define the order of execution
            # witem -> subclass -> class -> group -> division -> state level
            curr_month_idx = curr_month_widx.copy()
            for level in ['subclass', 'class', 'group', 'division', 'all']:
                #print(level)
                if level == 'subclass':
                    exp_cols = ['state_id', 'sector_id', 'witem_id', 'witem_exp', 'subclass_id']
                    agg_cols = ['state_id', 'sector_id', 'subclass_id']
                    combined_all_india_idx_exp = ['state_id', 'sector_id', 'subclass_id', 'subclass_exp']
                    all_india_agg_cols = ['sector_id', 'subclass_id']
                    combined_state_agg_cols = ['state_id', 'subclass_id']
                    level_exp_col = 'witem_exp'
                    level_index_col = 'witem_index'
                elif level == 'class':
                    exp_cols = ['state_id', 'sector_id', 'subclass_id', 'subclass_exp', 'class_id']
                    agg_cols = ['state_id', 'sector_id', 'class_id']
                    combined_all_india_idx_exp = ['state_id', 'sector_id', 'class_id', 'class_exp']
                    all_india_agg_cols = ['sector_id', 'class_id']
                    combined_state_agg_cols = ['state_id', 'class_id']
                    level_exp_col = 'subclass_exp'
                    level_index_col = 'subclass_index'
                elif level == 'group':
                    exp_cols = ['state_id', 'sector_id', 'class_id', 'class_exp', 'group_id']
                    agg_cols = ['state_id', 'sector_id', 'group_id']
                    combined_all_india_idx_exp = ['state_id', 'sector_id', 'group_id', 'group_exp']
                    all_india_agg_cols = ['sector_id', 'group_id']
                    combined_state_agg_cols = ['state_id', 'group_id']
                    level_exp_col = 'class_exp'
                    level_index_col = 'class_index'
                elif level == 'division':
                    exp_cols = ['state_id', 'sector_id', 'group_id', 'group_exp', 'division_id']
                    agg_cols = ['state_id', 'sector_id', 'division_id']
                    combined_all_india_idx_exp = ['state_id', 'sector_id', 'division_id', 'division_exp']
                    all_india_agg_cols = ['sector_id', 'division_id']
                    combined_state_agg_cols = ['state_id', 'division_id']
                    level_exp_col = 'group_exp'
                    level_index_col = 'group_index'
                elif level == 'all':
                    exp_cols = ['state_id', 'sector_id', 'division_id', 'division_exp']
                    agg_cols = ['state_id', 'sector_id']
                    combined_all_india_idx_exp = ['state_id', 'sector_id', 'all_exp']
                    all_india_agg_cols = ['sector_id']
                    combined_state_agg_cols = ['state_id']
                    level_exp_col = 'division_exp'
                    level_index_col = 'division_index'

                # index variable name
                index_var_col = f'{level}_index'
                index_exp_col = f'{level}_exp'

                if 0:
                    print(exp_cols)
                    print(agg_cols)
                    print(level_exp_col)
                    print(level_index_col)
                    print(index_var_col)

                exp_df = all_levels_exp_df[exp_cols].drop_duplicates()
                # Merge the expenditure data with the weighted index data
                merged_df = curr_month_idx.merge(exp_df,
                                                    on=exp_cols[0:3],
                                                    how='left')
                
                #print(merged_df.columns)
                if level == 'witem':
                    pass
                else:
                    merged_df['index_product'] = merged_df[level_index_col] * merged_df[level_exp_col]
                    level_index_df = (
                        merged_df
                        .groupby(agg_cols, as_index=False)
                        .agg(weighted_sum=('index_product', 'sum'), weight_sum=(level_exp_col, 'sum'),
                            imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
                            )
                    
                    # Add the imputation flag in HR index
                    level_index_df['imputed'] = 0
                    level_index_df.loc[(level_index_df.imputed_sum/level_index_df.imputed_count) == 1.0, 'imputed'] = 1

                    # Calculate the index
                    level_index_df[index_var_col] = level_index_df['weighted_sum'].div(level_index_df['weight_sum'])

                    # Remove the columns not required in the index table
                    level_index_df.drop(columns=['weighted_sum', 'weight_sum', 'imputed_count', 'imputed_sum'], inplace=True)

                    curr_month_idx = level_index_df.copy()

                    # First compute the all india level index
                    level_index_exp_df = level_index_df.merge(
                        all_levels_exp_df[combined_all_india_idx_exp].drop_duplicates(),
                        on=combined_all_india_idx_exp[0:len(combined_all_india_idx_exp)-1],
                        how='left'
                    )

                #print(level_index_exp_df.columns)
                level_index_exp_df['index_product'] = level_index_exp_df[index_var_col] * level_index_exp_df[index_exp_col]
                all_india_idx_df = (
                    level_index_exp_df
                    .groupby(all_india_agg_cols, as_index=False)
                    .agg(weighted_sum=('index_product', 'sum'), weight_sum=(index_exp_col, 'sum'),
                        imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
                        )
                
                
                all_india_idx_df['imputed'] = 0
                all_india_idx_df.loc[(all_india_idx_df.imputed_sum/all_india_idx_df.imputed_count) == 1.0, 'imputed'] = 1

                # Calculate the index
                all_india_idx_df[index_var_col] = all_india_idx_df['weighted_sum'].div(all_india_idx_df['weight_sum'])

                # Remove the columns not required in the index table
                all_india_idx_df.drop(columns=['weighted_sum', 'weight_sum', 'imputed_count', 'imputed_sum'], inplace=True)

                # insert state_id = 0 for all india level at the start of all_india_idx_df
                all_india_idx_df.insert(0, 'state_id', 0)

                all_india_exp = all_levels_exp_df[combined_all_india_idx_exp].drop_duplicates()
                all_india_exp = (
                    all_india_exp
                    .groupby(combined_all_india_idx_exp[1:-1], as_index=False)
                    .agg(exp = (combined_all_india_idx_exp[-1:][0], 'sum'))
                )
                # rename the last column to combined_all_india_idx_exp[-1:][0]
                all_india_exp.rename(columns={'exp': combined_all_india_idx_exp[-1:][0]}, inplace=True)
                all_india_exp.insert(0, 'state_id', 0)

                
                all_india_idx_exp_df = all_india_idx_df.merge(
                    all_india_exp,
                    on=combined_all_india_idx_exp[0:len(combined_all_india_idx_exp)-1],
                    how='left'
                )

                # Append the all india exp with all india index
                level_index_exp_df.drop(columns=['index_product'], inplace=True)
                level_index_exp_df = pd.concat([level_index_exp_df, all_india_idx_exp_df], ignore_index=True)

                ##############################
                # Compute the combined state level index
                level_index_exp_df['index_product'] = level_index_exp_df[index_var_col] * level_index_exp_df[index_exp_col]
                level_combined_idx_df = (
                    level_index_exp_df
                    .groupby(combined_state_agg_cols, as_index=False)
                    .agg(weighted_sum=('index_product', 'sum'), weight_sum=(index_exp_col, 'sum'),
                        imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
                )

                level_combined_idx_df['imputed'] = 0
                level_combined_idx_df.loc[(level_combined_idx_df.imputed_sum/level_combined_idx_df.imputed_count) == 1.0, 'imputed'] = 1

                # Calculate the index
                level_combined_idx_df[index_var_col] = level_combined_idx_df['weighted_sum'].div(level_combined_idx_df['weight_sum'])

                # Remove the columns not required in the index table
                level_combined_idx_df.drop(columns=['weighted_sum', 'weight_sum', 'imputed_count', 'imputed_sum'], inplace=True)

                level_combined_idx_df.insert(1, 'sector_id', 3)
                
                level_index_exp_df.drop(columns=['index_product'], inplace=True)
                level_index_df = pd.concat([level_index_exp_df.iloc[:, :-1], level_combined_idx_df], ignore_index=True)

                long_df = level_index_df[['state_id', 'sector_id', 'imputed']]
                long_df.insert(3, 'level', level)
                if level == 'all':
                    long_df.insert(4, 'level_id', 0)
                else:
                    long_df.insert(4, 'level_id', level_index_df[level + '_id'])
                long_df.insert(5, 'index', level_index_df[index_var_col])
                

                # convert into a dataframe with cols state_id, sector_id, level, level_id, index, imputed
                if all_states_all_sector_df.shape[0] == 0:
                    all_states_all_sector_df = long_df.copy()
                else:
                    # append the long_df
                    all_states_all_sector_df = pd.concat([all_states_all_sector_df, long_df], ignore_index=False)

            return all_states_all_sector_df

        # pidx_df is the dataframe with state, sector, pitem_id, price_index
        def generate_widx(pidx_df):

            curr_pidx_df = pidx_df.copy()
            curr_pidx_df['pidx_prod'] = curr_pidx_df['price_index'] * curr_pidx_df['exp_share']
            widx_df = (
            curr_pidx_df
            .groupby(['state_id', 'sector_id', 'witem_id'], as_index=False)
            .agg(idx_sum=('pidx_prod', 'sum'),
                exp_sum=('exp_share', 'sum'),
                imputed_count=('imputed', 'count'), 
                imputed_sum=('imputed', 'sum'))
                )

            widx_df['witem_index'] = widx_df['idx_sum'].div(widx_df['exp_sum'])
            # Add the imputation flag 
            widx_df['imputed'] = 0
            widx_df.loc[(widx_df.imputed_sum/widx_df.imputed_count) == 1.0, 'imputed'] = 1

            # Drop the imputed count and sum columns
            widx_df.drop(columns=['imputed_count', 'imputed_sum', 'idx_sum', 'exp_sum'], inplace=True)

            return widx_df


        def get_all_level_exp(witem_exp_share):
            coicop_heirarchy_df = get_coicop_heirarchy()
            coicop_heirarchy_df.drop(columns=['pitem_id'], inplace=True)
            coicop_heirarchy_df.drop_duplicates(inplace=True)
            
            all_levels_exp_df = witem_exp_share.merge(coicop_heirarchy_df,
                                                    on='witem_id',
                                                    how='left')
            
            # Get the subclass_exp which is sum of witem_exp at state_id, sector_id and subclass_id
            all_levels_exp_df['subclass_exp'] = all_levels_exp_df.groupby(['state_id', 'sector_id', 'subclass_id'])['witem_exp'].transform('sum')
            # Similarly class_exp, group_exp, and division_exp
            all_levels_exp_df['class_exp'] = all_levels_exp_df.groupby(['state_id', 'sector_id', 'class_id'])['witem_exp'].transform('sum')
            all_levels_exp_df['group_exp'] = all_levels_exp_df.groupby(['state_id', 'sector_id', 'group_id'])['witem_exp'].transform('sum')
            all_levels_exp_df['division_exp'] = all_levels_exp_df.groupby(['state_id', 'sector_id', 'division_id'])['witem_exp'].transform('sum')
            all_levels_exp_df['all_exp'] = all_levels_exp_df.groupby(['state_id', 'sector_id'])['witem_exp'].transform('sum')

            return all_levels_exp_df

        # Get the current month price index data
        curr_month_pidx = get_curr_pidx(price_data_month_year)

        # if the records in curr_month_pidx is not equal to records in get_pitem_exp_share(), then print the difference in pitem_id and raise error
        if curr_month_pidx.shape[0] != get_pitem_exp_share().shape[0]:
            pidx_pitems = curr_month_pidx.shape[0]
            exp_pitems = get_pitem_exp_share().shape[0]
            print("Difference in pitem_id between curr_month_pidx and get_pitem_exp_share():")
            print("In get_pitem_exp_share() but not in curr_month_pidx:", exp_pitems - pidx_pitems)
            raise ValueError("The number of records in curr_month_pidx is not equal to the number of records in get_pitem_exp_share()")

        pitem_witem_mapping = get_coicop_heirarchy()[['pitem_id', 'witem_id']].drop_duplicates()
        pitem_exp = get_pitem_exp_share()

        curr_month_pidx = curr_month_pidx.merge(pitem_witem_mapping,
                                                on = 'pitem_id',
                                                how='left')

        curr_month_pidx = curr_month_pidx.merge(pitem_exp,
                                                on = ['state_id', 'sector_id', 'pitem_id'],
                                                how='left')

        curr_month_pidx.head(2)

        # Compute the state and sector wise weighted item index
        curr_month_widx = generate_widx(curr_month_pidx)
        # count the states in each sector for which weighted item index is calculated
        # count the sector wise states in the itm_pidx_df
        print(curr_month_widx.groupby(['sector_id'])['state_id'].nunique())
        curr_month_widx.head(2)

        # Laod the weighted item expenditure data and calculate expenditure at all levels
        weighted_exp_excl_pds_df = get_weighted_expenditure()
        weighted_exp_excl_pds_df.rename(columns={'exp_share':'witem_exp'}, inplace=True)

        all_levels_exp_excl_pds_df = get_all_level_exp(weighted_exp_excl_pds_df)

        # Compute the all india level witem expenditure share for each sector
        all_india_lvl_witem_wts = all_levels_exp_excl_pds_df.groupby(['sector_id', 'witem_id'], as_index=False).agg(
            witem_exp=('witem_exp', 'sum')
        )
        all_india_lvl_witem_wts['state_id'] = 0  # state_id 0 for all india
        # arrange the state id column to first position
        all_india_lvl_witem_wts = all_india_lvl_witem_wts[['state_id', 'sector_id', 'witem_id', 'witem_exp']]
        all_india_lvl_witem_wts.head(2)

        # compute the combined witem index at all levels
        # 1. Get the witem expenditure share for each state_id, sector_id and witem_id
        from numpy import int32


        cols_req = ['state_id', 'sector_id', 'witem_id', 'witem_exp']
        curr_month_widx_wts = curr_month_widx.merge(all_levels_exp_excl_pds_df[cols_req],
                                                        on=['state_id', 'sector_id', 'witem_id'],
                                                        how='left')

        # Take the weighted average of witem_index using witem_exp as weights at sector_id and witem_id. This is all india witem
        # index
        curr_month_widx_wts['witem_idx_exp'] = curr_month_widx_wts['witem_index'] * curr_month_widx_wts['witem_exp']
        all_india_widx = (
            curr_month_widx_wts
            .groupby(['sector_id', 'witem_id'], as_index=False)
            .agg(index_sum=('witem_idx_exp', 'sum'), wt_sum=('witem_exp', 'sum'),
                imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
        )
        all_india_widx['witem_index'] = all_india_widx['index_sum'].div(all_india_widx['wt_sum'])
        all_india_widx['imputed'] = 0
        all_india_widx.loc[(all_india_widx.imputed_sum/all_india_widx.imputed_count) == 1.0, 'imputed'] = 1
        # Drop the imputed count and sum columns
        all_india_widx.drop(columns=['imputed_count', 'imputed_sum', 'index_sum', 'wt_sum'], inplace=True)
        all_india_widx['state_id'] = int32(0)  # state_id 0 for all india
        all_india_widx = all_india_widx[curr_month_widx.columns]  # arrange columns in same order

        # Now compute the combined index using weighted average at state_id, sector_id level
        # 1. Get the witem expenditure share for all india level at sector_id and witem_id
        all_india_witem_wts = all_india_widx.merge(all_india_lvl_witem_wts,
                                                            on=['state_id', 'sector_id', 'witem_id'],
                                                            how='left')

        curr_month_widx_wts.drop(columns=['witem_idx_exp'], inplace=True)
        curr_month_widx_wts = pd.concat([curr_month_widx_wts, all_india_witem_wts], axis=0, ignore_index=True)

        curr_month_widx_wts['witem_idx_exp'] = curr_month_widx_wts['witem_index'] * curr_month_widx_wts['witem_exp']

        combined_witem_index = (
            curr_month_widx_wts
            .groupby(['state_id', 'witem_id'], as_index=False)
            .agg(index_sum=('witem_idx_exp', 'sum'), wt_sum=('witem_exp', 'sum'),
                imputed_count=('imputed', 'count'), imputed_sum=('imputed', 'sum'))
        )

        # combined index 
        combined_witem_index['witem_index'] = combined_witem_index['index_sum'].div(combined_witem_index['wt_sum'])
        combined_witem_index['imputed'] = 0
        combined_witem_index.loc[(combined_witem_index.imputed_sum/combined_witem_index.imputed_count) == 1.0, 'imputed'] = 1
        # Drop the imputed count and sum columns
        combined_witem_index.drop(columns=['imputed_count', 'imputed_sum', 'index_sum', 'wt_sum'], inplace=True)
        combined_witem_index['sector_id'] = int32(3)   # sector_id 3 for all sectors

        all_lvls_widx_df = pd.concat([curr_month_widx, all_india_widx, combined_witem_index], axis=0, ignore_index=True)
        all_lvls_widx_df.head(1)

        long_format_index = generate_all_indexes(curr_month_widx, all_levels_exp_excl_pds_df)
        # convert state_id, sector_id, level_id to int32
        long_format_index['state_id'] = long_format_index['state_id'].astype(int32)
        long_format_index['sector_id'] = long_format_index['sector_id'].astype(int32)
        long_format_index['level_id'] = long_format_index['level_id'].astype(int32)
        long_format_index.head(2)

        # convert all india_witem_wts to long format with cols state_id, sector_id, imputed, level, level_id, index
        all_lvls_widx_df_long = all_lvls_widx_df.copy()
        all_lvls_widx_df_long.rename(columns={'witem_index':'index', 'witem_id': 'level_id'}, inplace=True)
        all_lvls_widx_df_long.insert(3, 'level', 'witem')
        all_lvls_widx_df_long = all_lvls_widx_df_long[long_format_index.columns]
        all_lvls_widx_df_long.head(2)

        long_format_index = pd.concat([long_format_index, all_lvls_widx_df_long], ignore_index=True)
        long_format_index['price_data_status'] = price_data_status
        long_format_index['iteration_id'] = iteration_id
        long_format_index['price_month_year'] = price_data_month_year

        # Save the Index Data into all index table

        long_format_index.to_parquet(all_idx_db, index=False)
        
    except Exception as e:
        print("Error in generating all indexes:", str(e))
        
# all_index_script()