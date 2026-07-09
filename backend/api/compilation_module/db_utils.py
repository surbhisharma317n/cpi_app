import io
import csv
import logging
import pandas as pd
from django.db import connection, transaction
from django.apps import apps
from django.conf import settings

from .models import AggregatedResult

logger = logging.getLogger(__name__)


class BulkInsertMixin:
    """Mixin for bulk inserting data using PostgreSQL COPY"""
    
    @classmethod
    def bulk_insert_from_dataframe(cls, df, batch_size=10000):
        """
        Bulk insert from pandas DataFrame using COPY
        """
        if df.empty:
            return 0
            
        # Get model table name
        table_name = cls._meta.db_table
        
        # Get column names (excluding id if it's auto-generated)
        columns = [field.column for field in cls._meta.fields 
                  if field.column != 'id' or not field.primary_key]
        
        # Create CSV buffer
        buffer = io.StringIO()
        writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
        
        # Write rows in batches
        total_rows = 0
        for start_idx in range(0, len(df), batch_size):
            batch = df.iloc[start_idx:start_idx + batch_size]
            
            # Clear buffer
            buffer.seek(0)
            buffer.truncate(0)
            
            # Write batch to buffer
            for _, row in batch.iterrows():
                writer.writerow([row.get(col) for col in columns])
            
            # Perform COPY
            buffer.seek(0)
            with connection.cursor() as cursor:
                cursor.copy_expert(
                    f"COPY {table_name} ({','.join(columns)}) FROM STDIN WITH CSV",
                    buffer
                )
            
            total_rows += len(batch)
            logger.info(f"Inserted {total_rows} rows into {table_name}")
        
        return total_rows
    
    @classmethod
    def bulk_insert_from_dicts(cls, dict_list, batch_size=10000):
        """
        Bulk insert from list of dictionaries using COPY
        """
        if not dict_list:
            return 0
            
        # Convert to DataFrame for easier handling
        df = pd.DataFrame(dict_list)
        return cls.bulk_insert_from_dataframe(df, batch_size)
    
    @classmethod
    def bulk_insert_from_csv(cls, csv_file_path, columns=None):
        """
        Bulk insert from CSV file using COPY
        """
        table_name = cls._meta.db_table
        
        if not columns:
            columns = [field.column for field in cls._meta.fields 
                      if field.column != 'id' or not field.primary_key]
        
        with connection.cursor() as cursor:
            with open(csv_file_path, 'r') as f:
                cursor.copy_expert(
                    f"COPY {table_name} ({','.join(columns)}) FROM STDIN WITH CSV HEADER",
                    f
                )
        
        # Get count
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            return cursor.fetchone()[0]


class AggregatedResultManager(models.Manager):
    """Custom manager with bulk insert methods"""
    
    def bulk_insert_from_dataframe(self, df, session, dataset, **kwargs):
        """
        Bulk insert aggregated results from DataFrame
        """
        # Add foreign keys to DataFrame
        df['session_id'] = str(session.id)
        df['dataset_id'] = str(dataset.id)
        
        # Add any additional fields
        for key, value in kwargs.items():
            df[key] = value
        
        # Use the mixin method
        return AggregatedResult.bulk_insert_from_dataframe(df)
    
    def bulk_insert_from_parquet(self, parquet_path, session, dataset, **kwargs):
        """
        Read parquet file and bulk insert
        """
        df = pd.read_parquet(parquet_path)
        return self.bulk_insert_from_dataframe(df, session, dataset, **kwargs)


# Attach manager to model
AggregatedResult.objects = AggregatedResultManager()


def copy_from_dataframe(model, df, exclude_columns=None, batch_size=10000):
    """
    Generic function to COPY from DataFrame to any model
    """
    if df.empty:
        return 0
        
    table_name = model._meta.db_table
    
    # Get columns
    all_columns = [field.column for field in model._meta.fields]
    if exclude_columns:
        columns = [col for col in all_columns if col not in exclude_columns]
    else:
        columns = [col for col in all_columns 
                  if col != 'id' or not model._meta.pk.auto_created]
    
    # Create CSV buffer
    buffer = io.StringIO()
    writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
    
    total_rows = 0
    for start_idx in range(0, len(df), batch_size):
        batch = df.iloc[start_idx:start_idx + batch_size]
        
        buffer.seek(0)
        buffer.truncate(0)
        
        for _, row in batch.iterrows():
            writer.writerow([row.get(col) for col in columns])
        
        buffer.seek(0)
        with connection.cursor() as cursor:
            cursor.copy_expert(
                f"COPY {table_name} ({','.join(columns)}) FROM STDIN WITH CSV",
                buffer
            )
        
        total_rows += len(batch)
    
    return total_rows