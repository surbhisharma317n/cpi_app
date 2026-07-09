from django.conf import settings
import pandas as pd
import os
import logging
import numpy as np
import sys
from rest_framework.decorators import api_view
from api.utils.captcha import formet_month_year

@api_view(["POST"])
def compile_rural_data(month_year):
    query = 'select * from rural_item_price where month_year = %s'
    logging.info(f"Processing rural data for {month_year}")

    try:
        # Step 1: Load data
        data_tuples, colnames = get_sql_data(month_year, 'rural_priced_input_item')
        data = pd.DataFrame(data_tuples, columns=colnames).rename(columns={
            "state_code": "state_code",
            "it_code": "it_code",
            "dist_cd": "Dist_cd",
            "vill_cd": "Vill_cd",
            "prev_month_price": "Prev_Month_Price",
            "it_des": "It_des",
            "base": "Base",
            "price_scr": "PriceScr",
            "spcd": "SPcd",
        })

        # Step 2: Process SPcd values
        data['SPcd'] = pd.to_numeric(data['SPcd'], errors='coerce')
        spcd_mapping = {4: 1, 5: 2, 6: 3, 7: 0}
        data['SPcd'] = data['SPcd'].replace(spcd_mapping)

        # Data validation checks
        if data[(data['SPcd'] != 0) & (data['SPcd'].notna()) & (data['SPcd'] > 3)].shape[0] > 0:
            raise ValueError("SPcd values exceed 3 - data quality issue")
        if data[(data['PriceScr'].isna() | (data['PriceScr'] == 0)) & (data['SPcd'] > 0)].shape[0] > 0:
            raise ValueError("Missing prices for current month where SPcd exists")

        # Step 3: Calculate modified prices
        data['ratio_for_multiplier1'] = data['Prev_Month_Price'] / data['Base']
        multiplier1 = data[data['Prev_Month_Price'] > 0].groupby(['state_code', 'it_code'])['ratio_for_multiplier1'].mean().reset_index()
        multiplier1.rename(columns={'ratio_for_multiplier1': 'multiplier1'}, inplace=True)

        data = pd.merge(data, multiplier1, on=['state_code', 'it_code'], how='left')
        data['imputed_Prev_Price'] = np.where(
            (data['Prev_Month_Price'].isna() | (data['Prev_Month_Price'] == 0)) & (data['SPcd'] > 0),
            data['Base'] * data['multiplier1'],
            np.nan
        ).round(2)

        data['Prevmodified'] = np.where(
            data['Prev_Month_Price'] > 0,
            data['Prev_Month_Price'],
            data['imputed_Prev_Price']
        )

        # Step 4: Handle cases with no price data
        item_counts = data.groupby(['state_code', 'it_code']).size().reset_index(name='total_count')
        missing_counts = data[data['Prevmodified'].isna()].groupby(['state_code', 'it_code']).size().reset_index(name='missing_count')
        
        complete_missing = pd.merge(item_counts, missing_counts, how='left').query('total_count == missing_count')
        data = pd.merge(data, complete_missing[['state_code', 'it_code']], how='left', indicator='has_complete_missing')
        data['Prevmodified'] = np.where(
            data['has_complete_missing'] == 'both',
            data['Base'],
            data['Prevmodified']
        )

        # Step 5: Calculate modified base
        data['Mod_base'] = np.where(
            (data['SPcd'] == 0) | (data['SPcd'].isna()),
            data['Base'],
            np.round((data['Base'] * data['PriceScr']) / data['Prevmodified'], 2)
        )

        # Step 6: Impute current month prices
        data['Ratio2'] = data['PriceScr'] / data['Prevmodified']
        valid_items = ~data['it_code'].str.startswith(('1.1.07.1', '1.1.07.2', '1.1.07.3', '1.1.06.1')) | data['it_code'].isin(['1.1.07.1.1.01.0', '1.1.07.1.1.02.0'])
        
        multiplier2 = data[
            valid_items & (data['PriceScr'] > 0) & 
            ((data['SPcd'] == 0) | (data['SPcd'].isna())) & 
            (data['Prevmodified'] > 0) & (data['Ratio2'] > 0)
        ].groupby(['state_code', 'it_code'])['Ratio2'].mean().reset_index().rename(columns={'Ratio2': 'Multiplier2'}).round(6)

        data = pd.merge(data, multiplier2, on=['state_code', 'it_code'], how='left')
        data['Imputed_Current_Month'] = np.where(
            (data['PriceScr'].isna() | (data['PriceScr'] == 0)),
            (data['Multiplier2'] * data['Prevmodified']).round(2),
            np.nan
        )

        data['Currmodified'] = np.where(
            data['PriceScr'] > 0,
            data['PriceScr'],
            data['Imputed_Current_Month']
        )

        # Step 7: Handle special cases with insufficient data
        special_items = data['it_code'].str.startswith(('1.1.07.1', '1.1.06.1', '1.1.07.2', '1.1.07.3')) & \
                      ~data['it_code'].isin(['1.1.07.1.1.01.0', '1.1.07.1.1.02.0'])
        
        item_stats = data[special_items].groupby('it_code').size().reset_index(name='total_count')
        valid_stats = data[special_items & (data['Currmodified'] > 0)].groupby('it_code').size().reset_index(name='valid_count')
        
        insufficient_data = pd.merge(item_stats, valid_stats, how='left').query('valid_count < total_count * 0.25')
        data = pd.merge(data, insufficient_data[['it_code']], how='left', indicator='has_insufficient_data')
        data['Currmodified'] = np.where(data['has_insufficient_data'] == 'both', 0, data['Currmodified'])

        # Step 8: Final calculations
        log_pr_base_table = data[data['Currmodified'] > 0].copy()
        log_pr_base_table['PRBase'] = (log_pr_base_table['Currmodified'] / log_pr_base_table['Mod_base'] * 100)
        log_pr_base_table['LogPRBase'] = np.log(log_pr_base_table['PRBase'])

        state_rural_priced_item_index = log_pr_base_table.groupby(['state_code', 'it_code']).agg(
            It_des=('It_des', 'first'),
            Index=('LogPRBase', 'mean')
        ).reset_index()
        state_rural_priced_item_index['Index'] = np.exp(state_rural_priced_item_index['Index']).round(7)
        state_rural_priced_item_index['C_Code'] = "1"

        # # Save results
        # save_logprbase_output_data(log_pr_base_table, month_year, 'rural_logprbase')
        # save_output_data(state_rural_priced_item_index, month_year, 'output_rural_priced_item_index', user_id)

        # Save to static files
        # static_path = os.path.join(settings.STATICFILES_DIRS[0], month_year)
        # os.makedirs(static_path, exist_ok=True)
        state_rural_priced_item_index.to_csv("rural_output.csv", index=False)

        return state_rural_priced_item_index.to_dict(orient='records')

    except Exception as e:
        logging.error(f"Error processing rural data: {str(e)}", exc_info=True)
        raise