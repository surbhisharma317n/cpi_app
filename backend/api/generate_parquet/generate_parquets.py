# generate_sample_parquet_files.py
import pandas as pd
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import zipfile
import os
from datetime import datetime
import uuid

def create_sample_data(file_type: str, num_records: int = 1000):
    """Create sample data for different file types"""
    
    if file_type == "rural_market_data":
        data = {
            "Item_Code": [f"ITEM_{i:04d}" for i in range(1, num_records + 1)],
            "Item_Name": [f"Item {chr(65 + i % 26)}{i}" for i in range(num_records)],
            "Price": np.random.uniform(10, 5000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Region": ["Rural"] * num_records,
            "Unit": np.random.choice(["KG", "LTR", "Packet"], num_records),
            "Market": np.random.choice(["Market_A", "Market_B", "Market_C"], num_records),
        }
        
    elif file_type == "urban_market_data":
        data = {
            "Item_Code": [f"UITEM_{i:04d}" for i in range(1, num_records + 1)],
            "Item_Name": [f"Urban Item {chr(65 + i % 26)}{i}" for i in range(num_records)],
            "Price": np.random.uniform(15, 6000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Region": ["Urban"] * num_records,
            "Unit": np.random.choice(["KG", "LTR", "Packet", "Piece"], num_records),
            "Market": np.random.choice(["Mall_X", "Supermarket_Y", "Local_Z"], num_records),
        }
        
    elif file_type == "rural_housing_rent_data":
        data = {
            "City": np.random.choice(["Village_A", "Village_B", "Village_C"], num_records),
            "House_ID": [f"RHH_{i:06d}" for i in range(1, num_records + 1)],
            "Rent_Amount": np.random.uniform(1000, 15000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "House_Type": np.random.choice(["1BHK", "2BHK", "3BHK"], num_records),
            "Area_sqft": np.random.randint(300, 1500, num_records),
        }
        
    elif file_type == "urban_housing_rent_data":
        data = {
            "City": np.random.choice(["Metro_X", "City_Y", "Town_Z"], num_records),
            "House_ID": [f"UHH_{i:06d}" for i in range(1, num_records + 1)],
            "Rent_Amount": np.random.uniform(5000, 50000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "House_Type": np.random.choice(["Studio", "1BHK", "2BHK", "3BHK", "Penthouse"], num_records),
            "Area_sqft": np.random.randint(400, 3000, num_records),
            "Furnished": np.random.choice(["Yes", "No"], num_records),
        }
        
    elif file_type == "rural_elect_data":
        data = {
            "Meter_No": [f"RM_{i:08d}" for i in range(1, num_records + 1)],
            "Units": np.random.uniform(50, 500, num_records).round(2),
            "Rate": np.random.uniform(4.5, 7.5, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Consumer_Name": [f"Rural_Consumer_{i}" for i in range(num_records)],
            "Address": [f"Address_{i}, Rural Area" for i in range(num_records)],
            "Bill_Amount": np.random.uniform(250, 3750, num_records).round(2),
        }
        
    elif file_type == "urban_elect_data":
        data = {
            "Meter_No": [f"UM_{i:08d}" for i in range(1, num_records + 1)],
            "Units": np.random.uniform(100, 800, num_records).round(2),
            "Rate": np.random.uniform(5.5, 9.5, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Consumer_Name": [f"Urban_Consumer_{i}" for i in range(num_records)],
            "Address": [f"Address_{i}, Urban Area" for i in range(num_records)],
            "Bill_Amount": np.random.uniform(500, 7500, num_records).round(2),
            "Tariff_Type": np.random.choice(["Residential", "Commercial", "Industrial"], num_records),
        }
        
    elif file_type == "online_market_data":
        data = {
            "Item_Code": [f"ON_{i:05d}" for i in range(1, num_records + 1)],
            "Platform": np.random.choice(["Amazon", "Flipkart", "Myntra", "Nykaa", "BigBasket"], num_records),
            "Price": np.random.uniform(100, 10000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Category": np.random.choice(["Electronics", "Fashion", "Grocery", "Home", "Beauty"], num_records),
            "Brand": np.random.choice(["Brand_A", "Brand_B", "Brand_C", "Brand_D"], num_records),
            "Discount": np.random.uniform(0, 60, num_records).round(2),
        }
        
    elif file_type == "airfare_data":
        data = {
            "Flight_No": [f"AI{i:04d}" for i in range(1, num_records + 1)],
            "From": np.random.choice(["DEL", "BOM", "BLR", "MAA", "HYD"], num_records),
            "To": np.random.choice(["DEL", "BOM", "BLR", "MAA", "HYD", "GOI", "CCU"], num_records),
            "Fare": np.random.uniform(2000, 25000, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Airline": np.random.choice(["IndiGo", "Air India", "SpiceJet", "Vistara", "GoAir"], num_records),
            "Departure_Time": np.random.choice(["Morning", "Afternoon", "Evening", "Night"], num_records),
            "Duration_hours": np.random.uniform(1, 6, num_records).round(1),
        }
        
    elif file_type == "urban_pds_data":
        data = {
            "Commodity": np.random.choice(["Rice", "Wheat", "Sugar", "Kerosene", "Pulses"], num_records),
            "Region": np.random.choice(["North", "South", "East", "West", "Central"], num_records),
            "Price": np.random.uniform(10, 100, num_records).round(2),
            "Month": ["JAN"] * num_records,
            "Year": [2025] * num_records,
            "Subsidy": np.random.uniform(0, 50, num_records).round(2),
            "Quantity": np.random.uniform(1, 10, num_records).round(2),
            "Unit": np.random.choice(["KG", "LTR", "Packet"], num_records),
        }
        
    return pd.DataFrame(data)

def generate_sample_parquet_files():
    """Generate all sample parquet files"""
    
    # Expected files
    files = [
        "rural_market_data.parquet",
        "urban_market_data.parquet",
        "rural_housing_rent_data.parquet",
        "urban_housing_rent_data.parquet",
        "rural_elect_data.parquet",
        "urban_elect_data.parquet",
        "online_market_data.parquet",
        "airfare_data.parquet",
        "urban_pds_data.parquet"
    ]
    
    output_dir = "sample_parquet_files"
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating sample Parquet files...")
    
    for i, file_name in enumerate(files, 1):
        file_type = file_name.replace('.parquet', '')
        print(f"[{i}/{len(files)}] Generating {file_name}...")
        
        # Create sample data
        df = create_sample_data(file_type, num_records=500)
        
        # Save as Parquet
        output_path = os.path.join(output_dir, file_name)
        df.to_parquet(output_path, index=False, engine='pyarrow')
        
        # Show file info
        print(f"  ✓ Created: {output_path}")
        print(f"    Records: {len(df):,}, Size: {os.path.getsize(output_path)/1024:.1f} KB")
        print(f"    Columns: {', '.join(df.columns.tolist())}")
        print()
    
    return output_dir

def create_zip_file(source_dir, zip_name="sample_parquet_files.zip"):
    """Create ZIP file from directory"""
    
    zip_path = zip_name
    
    print(f"\nCreating ZIP file: {zip_path}")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
                print(f"  ✓ Added: {file}")
    
    print(f"\n✅ ZIP file created successfully!")
    print(f"📁 Total files: 9")
    print(f"📦 ZIP size: {os.path.getsize(zip_path)/1024/1024:.2f} MB")
    print(f"📍 Location: {os.path.abspath(zip_path)}")
    
    return zip_path

def generate_invalid_files_for_testing():
    """Generate invalid files for testing validation"""
    
    invalid_dir = "invalid_sample_files"
    os.makedirs(invalid_dir, exist_ok=True)
    
    print("\nGenerating invalid files for testing...")
    
    # 1. File with wrong columns
    df_wrong_columns = pd.DataFrame({
        "Wrong_Column_1": [1, 2, 3],
        "Wrong_Column_2": ["A", "B", "C"],
        "Wrong_Column_3": [100.5, 200.3, 300.7]
    })
    wrong_path = os.path.join(invalid_dir, "wrong_columns.parquet")
    df_wrong_columns.to_parquet(wrong_path, index=False)
    print("✓ Created: wrong_columns.parquet (missing required columns)")
    
    # 2. File with wrong data types
    df_wrong_types = pd.DataFrame({
        "Item_Code": [1, 2, 3],  # Should be string
        "Item_Name": ["Item 1", "Item 2", "Item 3"],
        "Price": ["100.5", "200.3", "300.7"],  # Should be numeric
        "Month": ["JAN", "JAN", "JAN"],
        "Year": ["2025", "2025", "2025"]  # Should be numeric
    })
    wrong_types_path = os.path.join(invalid_dir, "wrong_types.parquet")
    df_wrong_types.to_parquet(wrong_types_path, index=False)
    print("✓ Created: wrong_types.parquet (incorrect data types)")
    
    # 3. Empty file
    df_empty = pd.DataFrame(columns=["Item_Code", "Item_Name", "Price", "Month", "Year"])
    empty_path = os.path.join(invalid_dir, "empty_file.parquet")
    df_empty.to_parquet(empty_path, index=False)
    print("✓ Created: empty_file.parquet (zero records)")
    
    # 4. File with too many records (for testing limits)
    df_large = create_sample_data("rural_market_data", num_records=100000)
    large_path = os.path.join(invalid_dir, "too_large.parquet")
    df_large.to_parquet(large_path, index=False)
    print("✓ Created: too_large.parquet (100,000 records)")
    
    return invalid_dir

def main():
    """Main function"""
    print("=" * 60)
    print("SAMPLE PARQUET FILE GENERATOR")
    print("=" * 60)
    
    # Generate valid sample files
    sample_dir = generate_sample_parquet_files()
    
    # Create ZIP file
    zip_file = create_zip_file(sample_dir)
    
    # Generate invalid files for testing
    generate_invalid_files_for_testing()
    
    print("\n" + "=" * 60)
    print("📋 USAGE INSTRUCTIONS:")
    print("=" * 60)
    print("1. Use the ZIP file for normal upload testing:")
    print(f"   📁 {zip_file}")
    print()
    print("2. Individual Parquet files are in:")
    print(f"   📂 {sample_dir}/")
    print()
    print("3. Invalid files for testing validation are in:")
    print("   📂 invalid_sample_files/")
    print()
    print("4. Expected file formats:")
    for file in [
        "rural_market_data.parquet",
        "urban_market_data.parquet",
        "rural_housing_rent_data.parquet",
        "urban_housing_rent_data.parquet",
        "rural_elect_data.parquet",
        "urban_elect_data.parquet",
        "online_market_data.parquet",
        "airfare_data.parquet",
        "urban_pds_data.parquet"
    ]:
        print(f"   • {file}")
    print()
    print("✅ Generation complete!")

if __name__ == "__main__":
    main()