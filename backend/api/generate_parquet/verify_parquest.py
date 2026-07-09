# verify_parquet_files.py
import pandas as pd
import pyarrow.parquet as pq
import os

def verify_parquet_file(file_path: str):
    """Verify a Parquet file"""
    try:
        print(f"\n🔍 Verifying: {os.path.basename(file_path)}")
        
        # Read file
        df = pd.read_parquet(file_path)
        
        # Basic info
        print(f"   ✓ File exists")
        print(f"   ✓ Records: {len(df):,}")
        print(f"   ✓ Columns: {len(df.columns)}")
        
        # Column names
        print(f"   ✓ Columns: {', '.join(df.columns.tolist())}")
        
        # Data types
        print(f"   ✓ Data types:")
        for col in df.columns:
            dtype = str(df[col].dtype)
            print(f"      - {col}: {dtype}")
        
        # Sample data
        print(f"   ✓ First 3 rows:")
        print(df.head(3).to_string(index=False))
        
        return True
        
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return False

def verify_all_files_in_zip(zip_path: str):
    """Verify all files in a ZIP"""
    import zipfile
    import tempfile
    
    print("=" * 60)
    print("VERIFYING PARQUET FILES IN ZIP")
    print("=" * 60)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # Extract to temp directory
        temp_dir = tempfile.mkdtemp()
        zip_ref.extractall(temp_dir)
        
        # Get all parquet files
        parquet_files = [f for f in os.listdir(temp_dir) if f.endswith('.parquet')]
        
        print(f"Found {len(parquet_files)} Parquet files:")
        
        results = {}
        for file in sorted(parquet_files):
            file_path = os.path.join(temp_dir, file)
            results[file] = verify_parquet_file(file_path)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for file, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {file}")
        
        total = len(results)
        passed = sum(1 for s in results.values() if s)
        print(f"\nTotal: {total}, Passed: {passed}, Failed: {total - passed}")

if __name__ == "__main__":
    # Verify a specific ZIP file
    zip_file = "sample_parquet_files.zip"
    
    if os.path.exists(zip_file):
        verify_all_files_in_zip(zip_file)
    else:
        print(f"ZIP file not found: {zip_file}")
        print("\nTo generate sample files, run:")
        print("python generate_sample_parquet_files.py")