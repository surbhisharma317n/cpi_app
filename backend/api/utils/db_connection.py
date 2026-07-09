from sqlalchemy import create_engine
import os

def get_engine(db_name):
    db_configs = {
        "master_db2": "postgresql+psycopg2://postgres:amit@localhost:5432/master_db2",
        "item_prices_db": "postgresql+psycopg2://postgres:amit@localhost:5432/item_prices_db",
    }
    conn_str = db_configs.get(db_name)
    if not conn_str:
        raise ValueError(f"Database '{db_name}' not found in configuration.")
    return create_engine(conn_str)
