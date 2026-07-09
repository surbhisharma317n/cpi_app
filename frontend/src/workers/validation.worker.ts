/// <reference lib="webworker" />
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

declare const self: DedicatedWorkerGlobalScope;

interface ValidationWorkerMessage {
  fileId: string;
  file: File;
}

interface ValidationWorkerResponse {
  fileId: string;
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
  validated: boolean;
}

self.onmessage = async (e: MessageEvent<ValidationWorkerMessage>) => {
  const { fileId, file } = e.data;
  
  try {
    let isValid = true;
    let errors: string[] = [];
    let rowCount = 0;
    let headers: string[] = [];

    if (file.name.toLowerCase().endsWith('.csv')) {
      const result = await validateCSV(file);
      isValid = result.isValid;
      errors = result.errors;
      rowCount = result.rowCount;
      headers = result.headers;
    } else {
      const result = await validateExcel(file);
      isValid = result.isValid;
      errors = result.errors;
      rowCount = result.rowCount;
      headers = result.headers;
    }

    const response: ValidationWorkerResponse = {
      fileId,
      isValid,
      errors,
      rowCount,
      headers,
      validated: true
    };

    self.postMessage(response);

  } catch (error) {
    const response: ValidationWorkerResponse = {
      fileId,
      isValid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rowCount: 0,
      headers: [],
      validated: true
    };
    self.postMessage(response);
  }
};

const validateCSV = (file: File): Promise<{
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
}> => {
  return new Promise((resolve) => {
    let rowCount = 0;
    let headers: string[] = [];
    let errors: string[] = [];
    let hasHeaders = false;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 1000,
      step: (results: Papa.ParseStepResult<unknown>, parser: Papa.Parser) => {
        rowCount++;
        
        if (!hasHeaders && results.meta.fields) {
          headers = results.meta.fields;
          hasHeaders = true;
          
          const requiredColumns = ['id', 'name', 'value', 'timestamp'];
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
            parser.abort();
            resolve({
              isValid: false,
              errors,
              rowCount,
              headers
            });
          }
        }

        if (headers.length > 0) {
          const data = results.data as Record<string, any>;
          const requiredColumns = ['id', 'name', 'value'];
          
          requiredColumns.forEach(col => {
            if (!data[col] || data[col].toString().trim() === '') {
              errors.push(`Empty value found in column '${col}' at row ${rowCount + 1}`);
            }
          });
        }
      },
      complete: () => {
        resolve({
          isValid: errors.length === 0,
          errors,
          rowCount,
          headers
        });
      },
      error: (error: Error) => {
        resolve({
          isValid: false,
          errors: [`CSV parsing error: ${error.message}`],
          rowCount,
          headers
        });
      }
    });
  });
};

const validateExcel = (file: File): Promise<{
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' 
        }) as any[][];
        
        const headers = (jsonData[0] || []).map(String);
        const rowCount = jsonData.length - 1;
        
        let errors: string[] = [];
        
        const requiredColumns = ['id', 'name', 'value', 'timestamp'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const maxRows = Math.min(jsonData.length, 1001);
        for (let i = 1; i < maxRows; i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            requiredColumns.forEach((col) => {
              const colIndex = headers.indexOf(col);
              if (colIndex !== -1 && (!row[colIndex] || row[colIndex].toString().trim() === '')) {
                errors.push(`Empty value found in column '${col}' at row ${i + 1}`);
              }
            });
          }
        }
        
        resolve({
          isValid: errors.length === 0,
          errors: [...new Set(errors)],
          rowCount,
          headers
        });
      } catch (error) {
        resolve({
          isValid: false,
          errors: [`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          rowCount: 0,
          headers: []
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: ['Failed to read Excel file'],
        rowCount: 0,
        headers: []
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export {};

