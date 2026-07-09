from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings as setting
from pathlib import Path
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder


from api.utils import convert_json
from datetime import datetime
import pandas as pd

from api.schema.input_price_db import fetchInptPriceItem  # import only the datetime class

def find_master_matching_file(base_key: str, month_year: str, module_name: str,tab_name:str='',sub_name:str=''):
    """
    Returns full parquet file path if exists, else None
    """
    print(tab_name,"gvhdjfsghjfdghfdhs== tabname ")
    # -------------------------------
    # Module-wise base directories
    # -------------------------------
    MODULE_BASE_DIRS = {
        # "get_market_data": Path(setting.SECOND_MEDIA_ROOT) / "comp_db" / "capi_item_prices",
        "get_coicop_data": Path(setting.SECOND_MEDIA_ROOT) / "comp_db_final" ,
        "get_market_data": Path(setting.SECOND_MEDIA_ROOT) / "comp_db_final" ,
        "get_weights_data": Path(setting.SECOND_MEDIA_ROOT) / "comp_db_final" / "weights",
        
        # add future modules here
    }

    base_dir = MODULE_BASE_DIRS.get(module_name)
    if not base_dir:
        return None

    # --------------------------------
    # Module-wise tab mappings
    # --------------------------------
    MODULE_TAB_MAPPING = {
        "get_weights_data": {
            "weights_master": Path(f"{sub_name}"),
            
        },

        "get_coicop_data": {
            "coicop_master": Path("mapping/coicop_mapping"),
            # extend later if needed  
        },
        "get_market_data": {
            "market_master": Path("mapping/vw_market_master"),
            # extend later if needed
        }
    }

    tab_mapping = MODULE_TAB_MAPPING.get(module_name, {})
    relative_path = tab_mapping.get(base_key)

    if not relative_path:
        return None

    # --------------------------------
    # Build filename
    # --------------------------------
    suffix = f"_{month_year}" if month_year else ""
    filename = f"{relative_path.name}{suffix}.parquet"

    # --------------------------------
    # Final file path
    # --------------------------------
    full_path = base_dir / relative_path.parent / filename

    print("CHECKING PATH =>", full_path)

    return str(full_path) if full_path.is_file() else None


def master_process_file(filepath, module_name):
    print('process_file filepath====', filepath)

    ext = filepath.split(".")[-1].lower()

    if ext == "csv":
        df = pd.read_csv(filepath)
    else:
        df = pd.read_parquet(filepath)
        df = df.head(100)  # limit for performance

    # 🔥 Exclude columns containing 'id' or 'code'
    exclude_keywords = ["id",]

    filtered_columns = [
        col for col in df.columns
        if not any(keyword in col.lower() for keyword in exclude_keywords)
    ]

    df = df[filtered_columns]

    res = {
        "data": df.to_dict(orient="records"),
        "total_records": len(df),
        "columns": list(df.columns)
    }

    return res