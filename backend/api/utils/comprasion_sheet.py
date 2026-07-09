from sqlalchemy import create_engine
from django.db import connection
import math
from django.db.utils import ProgrammingError
import numpy as np


# engine = create_engine("postgresql://postgres:admin@localhost:5432/base_revision")

def json_serializable(obj):
    """Convert non-serializable values to strings or None"""
    if obj is None:
        return None
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return str(obj)
    return obj

def add_column_if_not_exists(table_name, column_name, column_type="FLOAT"):
    """Add a column to the table if it doesn't exist with proper quoting"""
    with connection.cursor() as cursor:
        try:
            # Use proper quoting for column names
            cursor.execute(f"""
                ALTER TABLE {table_name} 
                ADD COLUMN IF NOT EXISTS "{column_name}" {column_type}
            """)
        except ProgrammingError as e:
            # Fallback for older PostgreSQL versions
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name='{table_name}' 
                        AND column_name='{column_name.lower()}'
                    ) THEN
                        EXECUTE format('ALTER TABLE %%I ADD COLUMN %%I %%s', 
                                      '{table_name}', '{column_name}', '{column_type}');
                    END IF;
                END
                $$;
            """)
            

def calculate_inflation(current_col, previous_col):
    if current_col > 0 and previous_col > 0:
        return round((current_col / previous_col * 100) - 100, 2)
    else:
        return np.nan  # or 0, or any default value
    
    