
import pandas as pd
import numpy as np
import os
from api.upload_input_data import load_price_data_db as lpdb

from api.upload_input_data import master_func as mfunc
from api.upload_input_data.master_data_paths import *


def market_item_index_script():
    try:

        def set_curr_month_vars(carry_forward_prices):
            carry_forward_prices.drop(columns=["cflag"], inplace=True)
            carry_forward_prices["price_imputed"] = 0
            carry_forward_prices["item_price"] = 0.0
            carry_forward_prices["revised_item_price"] = 0.0
            if 'spcl_code' in carry_forward_prices.columns: 
                carry_forward_prices["spcl_code"] = '0'
                carry_forward_prices["spcl_id"] = 0
            carry_forward_prices["price_month_year"] = price_data_month_year
            carry_forward_prices['price_year'] = carry_forward_prices['price_month_year'].dt.year
            carry_forward_prices['price_month'] = carry_forward_prices['price_month_year'].dt.month
            # to int32
            carry_forward_prices['price_year'] = carry_forward_prices['price_year'].astype('int32')
            carry_forward_prices['price_month'] = carry_forward_prices['price_month'].astype('int32')
            
            carry_forward_prices['price_data_status'] = price_data_status
            carry_forward_prices['iteration_id'] = iteration_id
            return carry_forward_prices

        # Read the current month price from the database.
        # use the filters from the table hr_rural_price_db.
        urban_airfare_curr_price = lpdb.get_curr_month_prices(data_type=4)
        #urban_airfare_curr_price = urban_airfare_curr_price[urban_airfare_curr_price.item_price > 0.0]

        print(urban_airfare_curr_price.shape)
        print(urban_airfare_curr_price[urban_airfare_curr_price.item_price == 0.0].shape)
        # Get the previous month price from transaction table in the comp_db_final
        urban_airfare_prev_price = lpdb.get_prev_month_prices(data_type=4)

        # Discard the records which are item_price == 0 and not available in previous month price
        zero_price_records = urban_airfare_curr_price[urban_airfare_curr_price.item_price == 0.0]

        # remove the records which are having item price zero
        urban_airfare_curr_price = urban_airfare_curr_price[urban_airfare_curr_price.item_price > 0.0]

        zero_price_records = zero_price_records.merge(
            urban_airfare_prev_price[['sector_id', 'state_id', 'route_code']],
            on=['sector_id', 'state_id', 'route_code'],
            how='inner'
        )
        # remove these records from current month price
        urban_airfare_curr_price = pd.concat([urban_airfare_curr_price, zero_price_records], ignore_index=True)

        # carry forward the previous month prices if not revised in the current month
        urban_airfare_curr_price["cflag"] = 0
        carry_forward_prices = urban_airfare_prev_price.merge(
            urban_airfare_curr_price[['sector_id', 'state_id', 'route_code', "cflag"]],
            on=['sector_id', 'state_id', 'route_code'],
            how='left'
        )
        urban_airfare_curr_price.drop(columns=["cflag"], inplace=True)
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

        if not carry_forward_prices.empty:
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            urban_airfare_curr_price = pd.concat([urban_airfare_curr_price, carry_forward_prices], ignore_index=True)
        # end
        #################################################################################
        print(urban_airfare_curr_price.shape)

        if urban_airfare_curr_price.shape[0] > 0:
            urban_airfare_prev_price_df = urban_airfare_prev_price[['state_id', 'route_code', 'revised_item_price']]
            urban_airfare_prev_price_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

            # Get the variables required for compiling index
            airfare_index_vars = ['nss_state_code', 'nss_sector_code', 'route_code', 'spcl_code', 'item_price', 'revised_item_price', 'price_imputed',
                                'state_id', 'sector_id', 'spcl_id']
            urban_airfare_price_df = urban_airfare_curr_price[airfare_index_vars]
            
            urban_airfare_price_df = urban_airfare_price_df.merge(urban_airfare_prev_price_df,
                                                    on = ['state_id', 'route_code'],
                                                    how='left')

            # Temporary Filter. Later will be removed
            urban_airfare_price_df = urban_airfare_price_df[urban_airfare_price_df.prev_item_price.notnull() & 
                                                            (urban_airfare_price_df.prev_item_price > 0.0)]

        print(urban_airfare_price_df.shape)
        urban_airfare_price_df.head(1)

        # Create a variable imputation_required
        urban_airfare_price_df['imp_req'] = 0

        # If the revised_item_price == 0.0 or spcl_id > 0
        urban_airfare_price_df.loc[(urban_airfare_price_df.revised_item_price == 0.0 ) | (urban_airfare_price_df.spcl_id > 0), 'imp_req'] = 1

        mask = ((urban_airfare_price_df.imp_req == 1) & (urban_airfare_price_df.price_imputed == 0))
        if urban_airfare_price_df[mask].shape[0] > 0:
            print("Prices are zero or change in specification")
            
            # First compute the district or town level imputation factor if number of markets are 2 or more at town or district level
            # For the markets where there are less than 2 markets in a town or district level, compute the imputation factor at state level
            urban_airfare_imputation_df = urban_airfare_price_df[~mask]
            urban_airfare_imputation_df['price_relative'] = urban_airfare_imputation_df['revised_item_price'] / urban_airfare_imputation_df['prev_item_price']
            
                
            imp_factor_df = urban_airfare_imputation_df.groupby(['state_id', 'sector_id'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imp_factor'})

            urban_airfare_price_df = urban_airfare_price_df.merge(imp_factor_df,
                                                                on=['state_id', 'sector_id'],
                                                                how='left')
            
            #print(urban_airfare_price_df.columns)
            mask = (urban_airfare_price_df.imp_factor.notnull() & ((urban_airfare_price_df.imp_req == 1) & (urban_airfare_price_df.price_imputed == 0)))
            urban_airfare_price_df.loc[mask, 'revised_item_price'] = urban_airfare_price_df.prev_item_price[mask] * urban_airfare_price_df.imp_factor[mask]
            urban_airfare_price_df.loc[mask, 'price_imputed'] = 1

            urban_airfare_price_df.drop(columns=['imp_factor'], inplace=True)
        urban_airfare_price_df.head()

        def compute_airfare_pidx(urban_airfare_price_df):
            # compute the price relative using revised item price and prev item price and then take geometric mean 
            # at state_id and sector_id leve
            urban_airfare_pidx_df = urban_airfare_price_df
            urban_airfare_pidx_df['pr'] = urban_airfare_pidx_df['revised_item_price'] / urban_airfare_pidx_df['prev_item_price']

            # compute the geometric mean of price relative at state_id and sector_id level
            urban_airfare_pidx_df = urban_airfare_pidx_df.groupby(['nss_state_code', 'nss_sector_code', 'state_id', 'sector_id'],
                                                                as_index=False)['pr'].apply(lambda x: 
                                                                                            x.prod()**(1/len(x))).rename(columns={'pr': 'gm_pr'})
            # Check if the pidx is created using imputed prices only
            pidx_imp_flag = urban_airfare_price_df.groupby(['state_id', 'sector_id'], 
                                                        as_index=False)['price_imputed'].apply(lambda x: 1 if (x.sum()/x.count()) == 1 else 0)
            pidx_imp_flag.rename(columns={'price_imputed': 'imputed'}, inplace=True)

            mask = (mfunc.get_pitem_master().old_pitem_code == airfare_old_item_code)
            urban_airfare_pidx_df['pitem_code'] = mfunc.get_pitem_master()[mask]['pitem_code'].values[0]
            urban_airfare_pidx_df['pitem_id'] = mfunc.get_pitem_master()[mask]['pitem_id'].values[0]

            airfare_pitem_code = urban_airfare_pidx_df.pitem_code.values[0]

            # Get the previous month price index of airfare
            urban_airfare_pidx_df = urban_airfare_pidx_df.merge(mfunc.get_finalized_pidx(prev_month, pitem_code=[airfare_pitem_code]),
                                                                on=['state_id', 'sector_id', 'pitem_id', 'pitem_code'],
                                                                how='left')
            # Exclude the records where previous month price index is null
            urban_airfare_pidx_df = urban_airfare_pidx_df[urban_airfare_pidx_df.price_index.notnull()]
            urban_airfare_pidx_df.rename(columns={'price_index': 'prev_price_index'}, inplace=True)

            # Multiply the previous month price index with geometric mean of price relative to get current month price index
            urban_airfare_pidx_df['price_index'] = urban_airfare_pidx_df['prev_price_index'] * urban_airfare_pidx_df['gm_pr']

            urban_airfare_pidx_df.drop(columns=['gm_pr', 'imputed', 'prev_price_index'], inplace=True)

            # Imputation Flag for pidx
            urban_airfare_pidx_df = urban_airfare_pidx_df.merge(pidx_imp_flag,
                                                                on=['state_id', 'sector_id'],
                                                                how='left')
            
            # Repeat the priced index of state_id 31 from sector_id 2 to sector_id 1
            # i.e NCT of Delhi index is used in the Haryana as well for urban airfare
            if urban_airfare_pidx_df[(urban_airfare_pidx_df['state_id'] == 6)].shape[0] == 0:
                haryana_urban = urban_airfare_pidx_df[(urban_airfare_pidx_df['state_id'] == 7)]
                if not haryana_urban.empty:
                    haryana_urban['state_id'] = 6
                    haryana_urban['nss_state_code'] = '06'
                    urban_airfare_pidx_df = pd.concat([urban_airfare_pidx_df, haryana_urban], ignore_index=True)
            
            rural_airfare_pidx_df = urban_airfare_pidx_df.copy()
            # remove the chandigarh from rural airfare pidx df
            rural_airfare_pidx_df = rural_airfare_pidx_df[rural_airfare_pidx_df.state_id != 4]
            rural_airfare_pidx_df['sector_id'] = rural_sector_id
            rural_airfare_pidx_df['nss_sector_code'] = '01'

            airfare_pidx_df = pd.concat([urban_airfare_pidx_df, rural_airfare_pidx_df], ignore_index=True)
            
            return airfare_pidx_df

        # Read the current month price from the database.
        # use the filters from the table hr_rural_price_db.
        urban_online_mkt_curr_price = lpdb.get_curr_month_prices(data_type=3)

        print(urban_online_mkt_curr_price.shape)
        # Get the previous month price from transaction table in the comp_db_final
        urban_online_mkt_prev_price = lpdb.get_prev_month_prices(data_type=3)

        # Discard the records which are item_price == 0 and not available in previous month price
        zero_price_records = urban_online_mkt_curr_price[urban_online_mkt_curr_price.item_price == 0.0]

        # remove the records which are having item price zero
        urban_online_mkt_curr_price = urban_online_mkt_curr_price[urban_online_mkt_curr_price.item_price > 0.0]

        zero_price_records = zero_price_records.merge(
            urban_online_mkt_prev_price[['market_id', 'pitem_id']],
            on=['market_id', 'pitem_id'],
            how='inner'
        )
        urban_online_mkt_curr_price = pd.concat([urban_online_mkt_curr_price, zero_price_records], ignore_index=True)

        # carry forward the previous month prices if not revised in the current month
        urban_online_mkt_curr_price["cflag"] = 0
        carry_forward_prices = urban_online_mkt_prev_price.merge(
            urban_online_mkt_curr_price[['market_id', 'pitem_id', "cflag"]],
            on=['market_id', 'pitem_id'],
            how='left'
        )
        urban_online_mkt_curr_price.drop(columns=["cflag"], inplace=True)
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

        if not carry_forward_prices.empty:
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            urban_online_mkt_curr_price = pd.concat([urban_online_mkt_curr_price, carry_forward_prices], ignore_index=True)
        # end
        #####################################################################################
        print(urban_online_mkt_curr_price.shape)

        if urban_online_mkt_curr_price.shape[0] > 0:
            urban_online_mkt_prev_price_df = urban_online_mkt_prev_price[['state_id', 'market_id', 'pitem_id', 'revised_item_price']]
            urban_online_mkt_prev_price_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

            # Get the variables required for compiling index
            urban_online_mkt_index_vars = ['nss_state_code', 'pitem_id', 'spcl_code', 'pitem_code', 'revised_item_price', 'price_imputed',
                                'state_id', 'sector_id', 'spcl_id', 'market_id']
            urban_online_mkt_price_df = urban_online_mkt_curr_price[urban_online_mkt_index_vars]
            urban_online_mkt_price_df = urban_online_mkt_price_df.merge(urban_online_mkt_prev_price_df,
                                                    on = ['state_id', 'market_id', 'pitem_id'],
                                                    how='left')
            urban_online_mkt_price_df = urban_online_mkt_price_df[urban_online_mkt_price_df.prev_item_price.notnull() &
                                                                (urban_online_mkt_price_df.prev_item_price > 0.0)]

        print(urban_online_mkt_price_df.shape)
        urban_online_mkt_price_df.head(1)

        # Read the current month price from the database.
        # use the filters from the table hr_rural_price_db.
        urban_mkt_curr_price = lpdb.get_curr_month_prices(data_type=1)

        print(urban_mkt_curr_price.shape)

        # Get the previous month price from transaction table in the comp_db_final
        urban_mkt_prev_price = lpdb.get_prev_month_prices(data_type=1)

        # Discard the records which are item_price == 0 and not available in previous month price
        zero_price_records = urban_mkt_curr_price[urban_mkt_curr_price.item_price == 0.0]

        # remove the records which are having item price zero
        urban_mkt_curr_price = urban_mkt_curr_price[urban_mkt_curr_price.item_price > 0.0]

        zero_price_records = zero_price_records.merge(
            urban_mkt_prev_price[['market_id', 'pitem_id']],
            on=['market_id', 'pitem_id'],
            how='inner'
        )
        urban_mkt_curr_price = pd.concat([urban_mkt_curr_price, zero_price_records], ignore_index=True)

        # carry forward the previous month prices if not revised in the current month
        urban_mkt_curr_price["cflag"] = 0
        carry_forward_prices = urban_mkt_prev_price.merge(
            urban_mkt_curr_price[['market_id', 'pitem_id', "cflag"]],
            on=['market_id', 'pitem_id'],
            how='left'
        )
        urban_mkt_curr_price.drop(columns=["cflag"], inplace=True)
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

        if not carry_forward_prices.empty:
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            urban_mkt_curr_price = pd.concat([urban_mkt_curr_price, carry_forward_prices], ignore_index=True)
        # end
        #####################################################################################
        print(urban_mkt_curr_price.shape)

        if urban_mkt_curr_price.shape[0] > 0:
            urban_mkt_prev_price_df = urban_mkt_prev_price[['state_id', 'market_id', 'pitem_id', 'revised_item_price']]
            urban_mkt_prev_price_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

            # Get the variables required for compiling index
            urban_mkt_index_vars = ['nss_state_code', 'pitem_id', 'spcl_code', 'pitem_code', 'revised_item_price', 'price_imputed',
                                'state_id', 'sector_id', 'spcl_id', 'market_id']
            urban_mkt_price_df = urban_mkt_curr_price[urban_mkt_index_vars]
            urban_mkt_price_df = urban_mkt_price_df.merge(urban_mkt_prev_price_df,
                                                    on = ['state_id', 'market_id', 'pitem_id'],
                                                    how='left')
            urban_mkt_price_df = urban_mkt_price_df[urban_mkt_price_df.prev_item_price.notnull() &
                                                    (urban_mkt_price_df.prev_item_price > 0.0)]

        print(urban_mkt_price_df.shape)
        urban_mkt_price_df.head(1)

        urban_mkt_price_df = pd.concat([urban_mkt_price_df, urban_online_mkt_price_df], ignore_index=True)

        # Create a variable imputation_required
        urban_mkt_price_df['imp_req'] = 0

        # If the revised_item_price == 0.0 or spcl_id > 0
        urban_mkt_price_df.loc[(urban_mkt_price_df.revised_item_price == 0.0 ) | (urban_mkt_price_df.spcl_id > 0), 'imp_req'] = 1

        mask = ((urban_mkt_price_df.imp_req == 1) & (urban_mkt_price_df.price_imputed == 0))
        if urban_mkt_price_df[mask].shape[0] > 0:
            print("Prices are zero or change in specification")
            
            # First compute the district or town level imputation factor if number of markets are 2 or more at town or district level
            # For the markets where there are less than 2 markets in a town or district level, compute the imputation factor at state level
            urban_mkt_imputation_df = urban_mkt_price_df[~mask]
            urban_mkt_imputation_df['price_relative'] = urban_mkt_imputation_df['revised_item_price'] / urban_mkt_imputation_df['prev_item_price']
            
                
            imp_factor_df = urban_mkt_imputation_df.groupby(['state_id', 'sector_id', 'pitem_id'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imp_factor'})

            urban_mkt_price_df = urban_mkt_price_df.merge(imp_factor_df,
                                                        on=['state_id', 'sector_id', 'pitem_id'],
                                                        how='left')
            
            #print(urban_mkt_price_df.columns)
            mask = (urban_mkt_price_df.imp_factor.notnull() & ((urban_mkt_price_df.imp_req == 1) & (urban_mkt_price_df.price_imputed == 0)))
            urban_mkt_price_df.loc[mask, 'revised_item_price'] = urban_mkt_price_df.prev_item_price[mask] * urban_mkt_price_df.imp_factor[mask]
            urban_mkt_price_df.loc[mask, 'price_imputed'] = 1

            urban_mkt_price_df.drop(columns=['imp_factor'], inplace=True)
            
        # Read the current month price from the database.
        # use the filters from the table hr_rural_price_db.
        rural_mkt_curr_price = lpdb.get_curr_month_prices(data_type=2)

        print(rural_mkt_curr_price.shape)

        # Get the previous month price from transaction table in the comp_db_final
        rural_mkt_prev_price = lpdb.get_prev_month_prices(data_type=2)

        # Discard the records which are item_price == 0 and not available in previous month price
        zero_price_records = rural_mkt_curr_price[rural_mkt_curr_price.item_price == 0.0]

        # remove the records which are having item price zero
        rural_mkt_curr_price = rural_mkt_curr_price[rural_mkt_curr_price.item_price > 0.0]

        zero_price_records = zero_price_records.merge(
            rural_mkt_prev_price[['market_id', 'pitem_id']],
            on=['market_id', 'pitem_id'],
            how='inner'
        )
        rural_mkt_curr_price = pd.concat([rural_mkt_curr_price, zero_price_records], ignore_index=True)

        # carry forward the previous month prices if not revised in the current month
        rural_mkt_curr_price["cflag"] = 0
        carry_forward_prices = rural_mkt_prev_price.merge(
            rural_mkt_curr_price[['market_id', 'pitem_id', "cflag"]],
            on=['market_id', 'pitem_id'],
            how='left'
        )
        rural_mkt_curr_price.drop(columns=["cflag"], inplace=True)
        carry_forward_prices = carry_forward_prices[carry_forward_prices.cflag.isna()]

        if not carry_forward_prices.empty:
            carry_forward_prices = set_curr_month_vars(carry_forward_prices)
            rural_mkt_curr_price = pd.concat([rural_mkt_curr_price, carry_forward_prices], ignore_index=True)
        # end
        #####################################################################################
        print(rural_mkt_curr_price.shape)

        if rural_mkt_curr_price.shape[0] > 0:
            rural_mkt_prev_price_df = rural_mkt_prev_price[['state_id', 'market_id', 'pitem_id', 'revised_item_price']]
            rural_mkt_prev_price_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)

            # Get the variables required for compiling index
            rural_mkt_index_vars = ['nss_state_code', 'pitem_id', 'spcl_code', 'pitem_code', 'revised_item_price', 'price_imputed',
                                'state_id', 'sector_id', 'spcl_id', 'market_id']
            rural_mkt_price_df = rural_mkt_curr_price[rural_mkt_index_vars]
            rural_mkt_price_df = rural_mkt_price_df.merge(rural_mkt_prev_price_df,
                                                    on = ['state_id', 'market_id', 'pitem_id'],
                                                    how='left')
            rural_mkt_price_df = rural_mkt_price_df[rural_mkt_price_df.prev_item_price.notnull() &
                                                    (rural_mkt_price_df.prev_item_price > 0.0)]

        print(rural_mkt_price_df.shape)
        rural_mkt_price_df.head(1)

        # Create a variable imputation_required
        rural_mkt_price_df['imp_req'] = 0

        # If the revised_item_price == 0.0 or spcl_id > 0
        rural_mkt_price_df.loc[(rural_mkt_price_df.revised_item_price == 0.0 ) | (rural_mkt_price_df.spcl_id > 0), 'imp_req'] = 1

        mask = ((rural_mkt_price_df.imp_req == 1) & (rural_mkt_price_df.price_imputed == 0))
        if rural_mkt_price_df[mask].shape[0] > 0:
            print("Prices are zero or change in specification")
            
            # First compute the district or town level imputation factor if number of markets are 2 or more at town or district level
            # For the markets where there are less than 2 markets in a town or district level, compute the imputation factor at state level
            rural_mkt_imputation_df = rural_mkt_price_df[~mask]
            rural_mkt_imputation_df['price_relative'] = rural_mkt_imputation_df['revised_item_price'] / rural_mkt_imputation_df['prev_item_price']
            
                
            imp_factor_df = rural_mkt_imputation_df.groupby(['state_id', 'sector_id', 'pitem_id'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'imp_factor'})

            rural_mkt_price_df = rural_mkt_price_df.merge(imp_factor_df,
                                                        on=['state_id', 'sector_id', 'pitem_id'],
                                                        how='left')
            
            #print(urban_mkt_price_df.columns)
            mask = (rural_mkt_price_df.imp_factor.notnull() & ((rural_mkt_price_df.imp_req == 1) & (rural_mkt_price_df.price_imputed == 0)))
            rural_mkt_price_df.loc[mask, 'revised_item_price'] = rural_mkt_price_df.prev_item_price[mask] * rural_mkt_price_df.imp_factor[mask]
            rural_mkt_price_df.loc[mask, 'price_imputed'] = 1

            rural_mkt_price_df.drop(columns=['imp_factor'], inplace=True)
            
        mkt_price_imputation_df = pd.concat([rural_mkt_price_df, urban_mkt_price_df], ignore_index=True)

        mkt_price_imputation_df = mkt_price_imputation_df.merge(mfunc.get_coicop_heirarchy(),
                                                                on = 'pitem_id',
                                                                how = 'left'
                                                                )

        urban_airfare_imputation_df = urban_airfare_price_df.copy()
        airfare_codes = mfunc.get_coicop_heirarchy()[mfunc.get_coicop_heirarchy().pitem_id == 452]
        # Temporary hardcoded values for urban airfare. As
        urban_airfare_imputation_df['witem_id'] = airfare_codes.witem_id.values[0]
        urban_airfare_imputation_df['subclass_id'] = airfare_codes.subclass_id.values[0]
        urban_airfare_imputation_df['class_id'] = airfare_codes.class_id.values[0]
        urban_airfare_imputation_df['group_id'] = airfare_codes.group_id.values[0]
        urban_airfare_imputation_df['division_id'] = airfare_codes.division_id.values[0]

        # Get the previous month finalized index 
        cols_req = ['state_id', 'sector_id', 'pitem_id', 'price_index']
        prev_month_pidx_df = mfunc.get_finalized_pidx(prev_month)[cols_req]
        prev_month_pidx_df.rename(columns={'price_index': 'prev_price_index'}, inplace=True)

        # Get price index of other items i.e electricity, House Rent which were compiled in previous steps
        hr_elect_pidx_df = mfunc.get_curr_pidx(price_data_month_year)
        hr_elect_pidx_df.drop(columns=['imputed', 'pitem_code'], inplace=True)

        #airfare_pidx = airfare_pidx_df[['state_id', 'sector_id', 'pitem_id', 'price_index']]

        mask = ((mkt_price_imputation_df.imp_req == 1) & (mkt_price_imputation_df.price_imputed == 0))
        mask2 = ((urban_airfare_imputation_df.imp_req == 1) & (urban_airfare_imputation_df.price_imputed == 0))
        if (mkt_price_imputation_df[mask].shape[0] > 0) | (urban_airfare_imputation_df[mask2].shape[0] > 0):
            # 1: Pitem, 2: witem, 3: subclass, 4: class, 5: group, 6: division
            for i in range(1,7):
                print(f"Computing imputation factor at level {i} for all market prices")
                if (mkt_price_imputation_df[mask].shape[0] > 0) | (urban_airfare_imputation_df[mask2].shape[0] > 0):
                    # Select only the market prices where there is no imputation is required
                    mkt_price_imp_df = mkt_price_imputation_df[~mask].copy()
                    airfare_price_imp_df = urban_airfare_imputation_df[~mask2].copy()

                    # Compute the price index for these prices
                    pitem_id_req = mkt_price_imp_df.pitem_id.unique().tolist()
                    mkt_prev_pidx_df = prev_month_pidx_df[prev_month_pidx_df.pitem_id.isin(pitem_id_req)].copy()

                    # The function takes current market prices and previous index of pitem for
                    # computing the price indexes
                    cols_req = ['state_id', 'sector_id', 'pitem_id', 'revised_item_price', 'prev_item_price']
                    mkt_price_idx_df = mfunc.compute_price_index(mkt_price_imp_df[cols_req].copy(), mkt_prev_pidx_df)

                    airfare_pidx = compute_airfare_pidx(airfare_price_imp_df)[['state_id', 'sector_id', 'pitem_id', 'price_index']]
                    
                    mkt_price_idx_df = pd.concat([hr_elect_pidx_df, mkt_price_idx_df, airfare_pidx], ignore_index=True)
                    mkt_price_idx_df.drop_duplicates(inplace=True)

                    mkt_price_idx_df = mkt_price_idx_df.merge(prev_month_pidx_df,
                                                            on = ['state_id', 'sector_id', 'pitem_id'],
                                                            how = 'left')

                    mkt_price_idx_df = mkt_price_idx_df.merge(mfunc.get_pitem_exp_share(),
                                                        on = ['state_id', 'sector_id', 'pitem_id'],
                                                        how = 'left')

                    mkt_price_idx_df = mkt_price_idx_df.merge(mfunc.get_coicop_heirarchy(),
                                                        on = ['pitem_id'],
                                                        how = 'left')

                    # group by state_id, sector_id, witem_id and take weighted average of 
                    # price_index and prev_price_index using pitem_exp as weights
                    imp_factor_df, group_vars = mfunc.get_imp_factor(mkt_price_idx_df.copy(), level=i)

                    mkt_price_imputation_df = mkt_price_imputation_df.merge(imp_factor_df,
                                                                            on=group_vars,
                                                                            how='left')
                    
                    urban_airfare_imputation_df = urban_airfare_imputation_df.merge(imp_factor_df,
                                                                            on=group_vars,
                                                                            how='left')
                    
                    mask = (mkt_price_imputation_df.imp_factor.notnull()) & \
                        (mkt_price_imputation_df.price_imputed == 0) & (mkt_price_imputation_df.imp_req == 1)
                    mkt_price_imputation_df.loc[mask, 'revised_item_price'] = mkt_price_imputation_df.prev_item_price[mask] * \
                        mkt_price_imputation_df.imp_factor[mask]
                    mkt_price_imputation_df.loc[mask, 'price_imputed'] = 1
                    mkt_price_imputation_df.drop(columns=['imp_factor'], inplace=True)

                    mask2 = (urban_airfare_imputation_df.imp_factor.notnull()) & \
                        (urban_airfare_imputation_df.price_imputed == 0) & (urban_airfare_imputation_df.imp_req == 1)
                    urban_airfare_imputation_df.loc[mask2, 'revised_item_price'] = urban_airfare_imputation_df.prev_item_price[mask2] * \
                        urban_airfare_imputation_df.imp_factor[mask2]
                    urban_airfare_imputation_df.loc[mask2, 'price_imputed'] = 1
                    urban_airfare_imputation_df.drop(columns=['imp_factor'], inplace=True)
                    
                    mask = ((mkt_price_imputation_df.imp_req == 1) & (mkt_price_imputation_df.price_imputed == 0))
                    mask2 = ((urban_airfare_imputation_df.imp_req == 1) & (urban_airfare_imputation_df.price_imputed == 0))
                    print(mkt_price_imputation_df[mkt_price_imputation_df.revised_item_price == 0].shape)
                    print(urban_airfare_imputation_df[urban_airfare_imputation_df.revised_item_price == 0].shape)
                else:
                    print(f"All prices are imputed")
                    break
                
        # Revise the prices as per the imputed prices in rural_mkt_price_df and urban_mkt_price_df
        mkt_price_imputation_df = mkt_price_imputation_df[['state_id', 'sector_id', 'market_id', 'pitem_id', 
                                                        'revised_item_price', 'price_imputed']]
        mkt_price_imputation_df.rename(columns={'revised_item_price': 'imputed_item_price',
                                            'price_imputed': 'imputation_done'}, inplace=True)

        rural_mkt_price_df = rural_mkt_price_df.merge(mkt_price_imputation_df,
                                                    on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                    how='left')
        mask = (rural_mkt_price_df.imputed_item_price.notnull() & (rural_mkt_price_df.imputation_done == 1) &
                rural_mkt_price_df.price_imputed == 0)
        rural_mkt_price_df.loc[mask, 'revised_item_price'] = rural_mkt_price_df.imputed_item_price[mask]
        rural_mkt_price_df.loc[mask, 'price_imputed'] = rural_mkt_price_df.imputation_done[mask]
        # drop the imputed_item_price and imputation_done columns
        rural_mkt_price_df.drop(columns=['imputed_item_price', 'imputation_done'], inplace=True)

        urban_mkt_price_df = urban_mkt_price_df.merge(mkt_price_imputation_df,
                                                    on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                    how='left')
        mask = (urban_mkt_price_df.imputed_item_price.notnull() & (urban_mkt_price_df.imputation_done == 1) &
                urban_mkt_price_df.price_imputed == 0)
        urban_mkt_price_df.loc[mask, 'revised_item_price'] = urban_mkt_price_df.imputed_item_price[mask]
        urban_mkt_price_df.loc[mask, 'price_imputed'] = urban_mkt_price_df.imputation_done[mask]
        # drop the imputed_item_price and imputation_done columns
        urban_mkt_price_df.drop(columns=['imputed_item_price', 'imputation_done'], inplace=True)

        urban_online_mkt_price_df = urban_online_mkt_price_df.merge(mkt_price_imputation_df,
                                                    on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                    how='left')
        mask = (urban_online_mkt_price_df.imputed_item_price.notnull() & (urban_online_mkt_price_df.imputation_done == 1) &
                urban_online_mkt_price_df.price_imputed == 0)
        urban_online_mkt_price_df.loc[mask, 'revised_item_price'] = urban_online_mkt_price_df.imputed_item_price[mask]
        urban_online_mkt_price_df.loc[mask, 'price_imputed'] = urban_online_mkt_price_df.imputation_done[mask]
        # drop the imputed_item_price and imputation_done columns
        urban_online_mkt_price_df.drop(columns=['imputed_item_price', 'imputation_done'], inplace=True)

        urban_airfare_imputation_df = urban_airfare_imputation_df[['state_id', 'sector_id', 'route_code', 
                                                                'revised_item_price', 'price_imputed']]
        urban_airfare_imputation_df.rename(columns={'revised_item_price': 'imputed_item_price',
                                            'price_imputed': 'imputation_done'}, inplace=True)
        urban_airfare_price_df = urban_airfare_price_df.merge(urban_airfare_imputation_df,
                                                    on = ['state_id', 'sector_id', 'route_code'],
                                                    how='left')
        mask = (urban_airfare_price_df.imputed_item_price.notnull() & (urban_airfare_price_df.imputation_done == 1) &
                urban_airfare_price_df.price_imputed == 0)
        urban_airfare_price_df.loc[mask, 'revised_item_price'] = urban_airfare_price_df.imputed_item_price[mask]
        urban_airfare_price_df.loc[mask, 'price_imputed'] = urban_airfare_price_df.imputation_done[mask]
        # drop the imputed_item_price and imputation_done columns
        urban_airfare_price_df.drop(columns=['imputed_item_price', 'imputation_done'], inplace=True)

        rural_cols = rural_mkt_curr_price.columns.tolist()

        updated_vars = rural_mkt_price_df[['state_id', 'sector_id', 'market_id', 'pitem_id', 
                                        'revised_item_price', 'price_imputed']]
        updated_vars.rename(columns={'revised_item_price': 'revised_item_price_updated',
                                    'price_imputed': 'price_imputed_updated'}, inplace=True)
        rural_mkt_curr_price = rural_mkt_curr_price.merge(updated_vars,
                                                        on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                        how='left')
        mask = rural_mkt_curr_price.revised_item_price_updated.notnull()
        rural_mkt_curr_price.loc[mask, 'revised_item_price'] = rural_mkt_curr_price.revised_item_price_updated[mask]
        rural_mkt_curr_price.loc[mask, 'price_imputed'] = rural_mkt_curr_price.price_imputed_updated[mask]

        rural_mkt_curr_price = rural_mkt_curr_price[rural_cols]

        rural_mkt_curr_price.head(1)

        urban_cols = urban_mkt_curr_price.columns.tolist()

        updated_vars = urban_mkt_price_df[['state_id', 'sector_id', 'market_id', 'pitem_id', 
                                        'revised_item_price', 'price_imputed']]
        updated_vars.rename(columns={'revised_item_price': 'revised_item_price_updated',
                                    'price_imputed': 'price_imputed_updated'}, inplace=True)
        urban_mkt_curr_price = urban_mkt_curr_price.merge(updated_vars,
                                                        on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                        how='left')
        mask = urban_mkt_curr_price.revised_item_price_updated.notnull()
        urban_mkt_curr_price.loc[mask, 'revised_item_price'] = urban_mkt_curr_price.revised_item_price_updated[mask]
        urban_mkt_curr_price.loc[mask, 'price_imputed'] = urban_mkt_curr_price.price_imputed_updated[mask]
        urban_mkt_curr_price = urban_mkt_curr_price[urban_cols]

        urban_mkt_curr_price.head(1)

        urban_cols = urban_online_mkt_curr_price.columns.tolist()

        # Take the online market prices from the urban_mkt_priced_df
        updated_vars = urban_online_mkt_price_df[['state_id', 'sector_id', 'market_id', 'pitem_id',
                                                'revised_item_price', 'price_imputed']]
        updated_vars.rename(columns={'revised_item_price': 'revised_item_price_updated',
                                    'price_imputed': 'price_imputed_updated'}, inplace=True)
        urban_online_mkt_curr_price = urban_online_mkt_curr_price.merge(updated_vars,
                                                        on = ['state_id', 'sector_id', 'market_id', 'pitem_id'],
                                                        how='left')
        mask = urban_online_mkt_curr_price.revised_item_price_updated.notnull()
        urban_online_mkt_curr_price.loc[mask, 'revised_item_price'] = urban_online_mkt_curr_price.revised_item_price_updated[mask]
        urban_online_mkt_curr_price.loc[mask, 'price_imputed'] = urban_online_mkt_curr_price.price_imputed_updated[mask]

        urban_online_mkt_curr_price = urban_online_mkt_curr_price[urban_cols]

        urban_online_mkt_curr_price.head(1)

        urban_cols = urban_airfare_curr_price.columns.tolist()

        # Take the online market prices from the urban_mkt_priced_df
        updated_vars = urban_airfare_price_df[['state_id', 'sector_id', 'route_code', 'revised_item_price', 'price_imputed']]
        updated_vars.rename(columns={'revised_item_price': 'revised_item_price_updated',
                                    'price_imputed': 'price_imputed_updated'}, inplace=True)
        urban_airfare_curr_price = urban_airfare_curr_price.merge(updated_vars,
                                                        on = ['state_id', 'sector_id', 'route_code'],
                                                        how='left')
        mask = urban_airfare_curr_price.revised_item_price_updated.notnull()
        urban_airfare_curr_price.loc[mask, 'revised_item_price'] = urban_airfare_curr_price.revised_item_price_updated[mask]
        urban_airfare_curr_price.loc[mask, 'price_imputed'] = urban_airfare_curr_price.price_imputed_updated[mask]

        urban_airfare_curr_price = urban_airfare_curr_price[urban_cols]

        urban_airfare_curr_price.head(1)

        cols_required = ['sector_id', 'state_id', 'market_id', 'pitem_id', 'revised_item_price',
                        'price_imputed']
        item_price_df = pd.concat([rural_mkt_curr_price[cols_required], 
                                urban_mkt_curr_price[cols_required],
                                urban_online_mkt_curr_price[cols_required]], ignore_index=True)
        item_price_df.head(1)

        cols_req = ['sector_id', 'state_id', 'market_id', 'pitem_id', 'revised_item_price'] 
        df1 = lpdb.get_prev_month_prices(data_type=2)[cols_req]
        df2 = lpdb.get_prev_month_prices(data_type=1)[cols_req]
        df3 = lpdb.get_prev_month_prices(data_type=3)[cols_req]

        prev_item_price_df = pd.concat([df1,df2, df3], ignore_index=False)
        prev_item_price_df.rename(columns={'revised_item_price': 'prev_item_price'}, inplace=True)
        prev_item_price_df.head(1)

        item_price_df = item_price_df.merge(prev_item_price_df,
                                            on = ['sector_id', 'state_id', 'market_id', 'pitem_id'],
                                            how = 'inner')

        item_price_df['price_relative'] = item_price_df.revised_item_price / item_price_df.prev_item_price

        #mask = ((item_price_df.price_relative < .5) | (item_price_df.price_relative > 2.0)) & (item_price_df.price_imputed == 0.0)
        items_req_attention = item_price_df.copy()
        market_df = mfunc.get_market_master()[["market_id", "nss_state_code", "nss_sector_code", "nss_district_code", 
                                            "nss_town_code", "nss_village_code", "nss_market_code", "lgd_state_name",
                                            "lgd_district_name", "lgd_town_name", "nss_market_name", "lgd_village_name"]]
        items_req_attention = items_req_attention.merge(market_df,
                                                        on = 'market_id',
                                                        how = 'left')
        pitem_info = mfunc.get_coicop_names_codes()[['pitem_id', 'pitem_code', 'pitem_name']].drop_duplicates()
        items_req_attention = items_req_attention.merge(pitem_info,
                                                        on = 'pitem_id',
                                                        how = 'left')
        year = str(price_data_month_year.year)
        month = str(price_data_month_year.month).zfill(2)
        #items_req_attention.to_excel(f'scrutiny//items_req_attention_{year}_{month}.xlsx', index=False)
        items_req_attention.to_parquet(f'data//scrutiny//items_req_attention_{year}_{month}.parquet', index=False)

        # Take geometric mean of the price relative at state_id and sector id level
        itm_pidx_df = item_price_df.groupby(['state_id', 'sector_id', 'pitem_id'], as_index=False)['price_relative'].apply(
            lambda x: x.prod()**(1/len(x))).rename(columns={'price_relative': 'gm_pr'})

        imp_flag = item_price_df.groupby(['state_id', 'sector_id', 'pitem_id'], as_index=False)['price_imputed'].apply(
            lambda x: 1 if (x.sum()/x.count()) == 1 else 0).rename(columns={'price_imputed': 'imputed'})

        # get the previous price index
        prev_pidx_df = mfunc.get_finalized_pidx(prev_month)[['state_id', 'sector_id', 'pitem_id', 'price_index']]
        prev_pidx_df.rename(columns={'price_index': 'prev_price_index'}, inplace=True)
        itm_pidx_df = itm_pidx_df.merge(prev_pidx_df,
                                        on = ['state_id', 'sector_id', 'pitem_id'],
                                        how = 'left')

        # Remove the records where previous price index is null
        itm_pidx_df = itm_pidx_df[itm_pidx_df.prev_price_index.notnull()]

        # Multiply the gm_pr with prev_price_index to get the current price index
        itm_pidx_df['price_index'] = itm_pidx_df['gm_pr'] * itm_pidx_df['prev_price_index']
        itm_pidx_df.drop(columns=['gm_pr', 'prev_price_index'], inplace=True)

        # Merge with imp_flag
        itm_pidx_df = itm_pidx_df.merge(imp_flag,
                                        on = ['state_id', 'sector_id', 'pitem_id'],
                                        how = 'left')

        itm_pidx_df['pitem_id'] = itm_pidx_df['pitem_id'].astype(int)

        itm_pidx_df.head()

        airfare_pidx_df = compute_airfare_pidx(urban_airfare_price_df.copy())

        mkt_itm_airfare_pidx_df = pd.concat([itm_pidx_df, airfare_pidx_df[itm_pidx_df.columns.tolist()]], ignore_index=True)

        cols_req_pidx_table = pd.read_parquet(pidx_db_final).columns.tolist()
        cols_req_urban_price_table = pd.read_parquet(mkt_urban_price_db_final).columns.tolist()
        cols_req_rural_price_table = pd.read_parquet(mkt_rural_price_db_final).columns.tolist()
        cols_req_airfare_price_table = pd.read_parquet(airfare_urban_price_db_final).columns.tolist()
        cols_req_online_price_table = pd.read_parquet(mkt_online_urban_price_db_final).columns.tolist()

        urban_airfare_curr_price = urban_airfare_curr_price[cols_req_airfare_price_table]
        # same for rural , urban and urban online market price tables
        rural_mkt_curr_price = rural_mkt_curr_price[cols_req_rural_price_table]
        urban_mkt_curr_price = urban_mkt_curr_price[cols_req_urban_price_table]
        urban_online_mkt_curr_price = urban_online_mkt_curr_price[cols_req_online_price_table]

        # Only carry forward the revised_item_price where item_price is zero, otherwise keep the item_price
        mask = (urban_airfare_curr_price.revised_item_price == 0.0) & (urban_airfare_curr_price.price_imputed == 0)
        urban_airfare_curr_price = urban_airfare_curr_price[~mask]
        mask = urban_airfare_curr_price.item_price != 0.0
        urban_airfare_curr_price.loc[mask, 'revised_item_price'] = urban_airfare_curr_price.item_price[mask]

        # Only carry forward the revised_item_price where item_price is zero, otherwise keep the item_price
        mask = (urban_mkt_curr_price.revised_item_price == 0.0) & (urban_mkt_curr_price.price_imputed == 0)
        urban_mkt_curr_price = urban_mkt_curr_price[~mask]
        mask = urban_mkt_curr_price.item_price != 0.0
        urban_mkt_curr_price.loc[mask, 'revised_item_price'] = urban_mkt_curr_price.item_price[mask]

        # Only carry forward the revised_item_price where item_price is zero, otherwise keep the item_price
        mask = (rural_mkt_curr_price.revised_item_price == 0.0) & (rural_mkt_curr_price.price_imputed == 0)
        rural_mkt_curr_price = rural_mkt_curr_price[~mask]
        mask = rural_mkt_curr_price.item_price != 0.0
        rural_mkt_curr_price.loc[mask, 'revised_item_price'] = rural_mkt_curr_price.item_price[mask]

        # Only carry forward the revised_item_price where item_price is zero, otherwise keep the item_price
        mask = (urban_online_mkt_curr_price.revised_item_price == 0.0) & (urban_online_mkt_curr_price.price_imputed == 0)
        urban_online_mkt_curr_price = urban_online_mkt_curr_price[~mask]
        mask = urban_online_mkt_curr_price.item_price != 0.0
        urban_online_mkt_curr_price.loc[mask, 'revised_item_price'] = urban_online_mkt_curr_price.item_price[mask]

        urban_airfare_curr_price.to_parquet(airfare_urban_validated_data_path, index=False)
        urban_online_mkt_curr_price.to_parquet(mkt_online_urban_validated_data_path, index=False)
        urban_mkt_curr_price.to_parquet(mkt_urban_price_validated_data_path, index=False)
        rural_mkt_curr_price.to_parquet(mkt_rural_price_validated_data_path, index=False)

        state_sector_nss_codes = mfunc.get_market_master()[['nss_state_code', 'nss_sector_code', 'state_id', 
                                                    'sector_id']].drop_duplicates()

        mkt_itm_airfare_pidx_df = mkt_itm_airfare_pidx_df.merge(state_sector_nss_codes,
                                        on = ['state_id', 'sector_id'],
                                        how = 'left')
        mkt_itm_airfare_pidx_df = mkt_itm_airfare_pidx_df.merge(mfunc.get_new_pitem_code(),
                                        on = ['pitem_id'],
                                        how = 'left')
        mkt_itm_airfare_pidx_df['price_month_year'] = price_data_month_year
        mkt_itm_airfare_pidx_df['iteration_id'] = iteration_id
        mkt_itm_airfare_pidx_df['price_data_status'] = price_data_status
        mkt_itm_airfare_pidx_df = mkt_itm_airfare_pidx_df[cols_req_pidx_table]

        # convert state_id, sector_id and pitem_id to int32
        mkt_itm_airfare_pidx_df['state_id'] = mkt_itm_airfare_pidx_df['state_id'].astype('int32')
        mkt_itm_airfare_pidx_df['sector_id'] = mkt_itm_airfare_pidx_df['sector_id'].astype('int32')
        mkt_itm_airfare_pidx_df['pitem_id'] = mkt_itm_airfare_pidx_df['pitem_id'].astype('int32')
        # only take the state, sector and pitem_id where the expenditure is present
        pitem_exp = mfunc.get_pitem_exp_share()
        pitem_exp = pitem_exp[['state_id', 'sector_id', 'pitem_id']].drop_duplicates()
        mkt_itm_airfare_pidx_df = mkt_itm_airfare_pidx_df.merge(
            pitem_exp,
            on=['state_id', 'sector_id', 'pitem_id'],
            how='inner'
        )

        mkt_itm_airfare_pidx_df.head(1)

        if os.path.exists(pidx_db):
            pidx_df = pd.read_parquet(pidx_db)
            pidx_df = pd.concat([pidx_df, mkt_itm_airfare_pidx_df], ignore_index=True)
            pidx_df.to_parquet(pidx_db, index=False)
        else:
            print("Error in saving the Mkt Item, Airfare Index. The Index table don't exists")
            
    except Exception as e:
        print("Error in compiling Mkt Item, Airfare Index", str(e))
        
# market_item_index_script()