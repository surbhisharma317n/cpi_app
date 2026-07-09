/// <reference lib="webworker" />

import initWasm, { readParquet } from "parquet-wasm";
// import * as unzipper from "unzipper";
import { unzipSync } from "fflate";
import Papa from "papaparse";

declare const self: DedicatedWorkerGlobalScope;

// ================= TYPES =================
interface ValidationMessage {
  fileId: string;
  file: File;
  format: "zip" | "parquet" | "csv";
  checksum?: string;
  options?: {
    validateSchema?: boolean;
    checkDuplicates?: boolean;
    maxRows?: number;
    requiredColumns?: string[];
    dataTypes?: Record<string, string>;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  headers: string[];
  metadata: Record<string, any>;
  quality?: number;
}

// ================= INIT WASM =================
let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await initWasm();
    wasmReady = true;
  }
}

// ================= MAIN =================
self.onmessage = async (e: MessageEvent<ValidationMessage>) => {
  const { fileId, file, format, checksum, options } = e.data;

  try {
    let result: ValidationResult;

    if (format === "zip") {
      result = await validateZipFile(file, options);
    } else if (format === "parquet") {
      result = await validateParquetFile(file, options);
    } else {
      result = await validateCSVFile(file, options);
    }

    // ✅ checksum validation
    if (checksum) {
      const fileChecksum = await calculateChecksum(file);
      if (fileChecksum !== checksum) {
        result.errors.push("Checksum mismatch");
        result.isValid = false;
      }
    }

    result.quality = calculateQualityScore(result);

    self.postMessage({ fileId, ...result });

  } catch (err: any) {
    self.postMessage({
      fileId,
      isValid: false,
      errors: [err.message],
      rowCount: 0,
      headers: [],
      metadata: {},
      quality: 0,
    });
  }
};

// ================= PARQUET =================
async function validateParquetFile(
  file: File,
  options?: ValidationMessage["options"]
): Promise<ValidationResult> {
  const errors: string[] = [];
  let headers: string[] = [];
  let rowCount = 0;

  try {
    await ensureWasm();

    const uint8 = new Uint8Array(await file.arrayBuffer());
    const table: any = readParquet(uint8);

    headers = table.schema.fields.map((f: any) => f.name);
    rowCount = table.numRows;

    // ✅ Required columns
    if (options?.requiredColumns) {
      const missing = options.requiredColumns.filter(
        (col) => !headers.includes(col)
      );
      if (missing.length) {
        errors.push(`Missing columns: ${missing.join(", ")}`);
      }
    }

  } catch (err: any) {
    errors.push(`Invalid parquet: ${err.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    rowCount,
    headers,
    metadata: {
      size: file.size,
      type: "parquet",
    },
  };
}

// ================= ZIP =================


async function validateZipFile(
  file: File,
  options?: ValidationMessage["options"]
): Promise<ValidationResult> {
  const errors: string[] = [];
  let headers: string[] = [];
  let rowCount = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = unzipSync(new Uint8Array(arrayBuffer));

    const parquetFiles = Object.keys(zip).filter((name) =>
      name.endsWith(".parquet")
    );

    if (!parquetFiles.length) {
      errors.push("No parquet files found in ZIP");
    }

    await ensureWasm();

    for (let i = 0; i < Math.min(3, parquetFiles.length); i++) {
      const fileName = parquetFiles[i];

      try {
        const fileData = zip[fileName]; // Uint8Array

        const table: any = readParquet(fileData);

        rowCount += table.numRows;

        if (i === 0) {
          headers = table.schema.fields.map((f: any) => f.name);
        }

      } catch (err: any) {
        errors.push(`Invalid parquet: ${fileName}`);
        console.log(options);
      }
    }

  } catch (err: any) {
    errors.push(`Invalid ZIP: ${err.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    rowCount,
    headers,
    metadata: {
      size: file.size,
      type: "zip",
    },
  };
}
// ================= CSV =================
async function validateCSVFile(
  file: File,
  options?: ValidationMessage["options"]
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const headers: string[] = [];
    let rowCount = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: options?.maxRows || 1000,

      step: (results, parser) => {
        rowCount++;

        if (rowCount === 1 && results.meta.fields) {
          headers.push(...results.meta.fields);
        }

        if (options?.requiredColumns && rowCount === 1) {
          const missing = options.requiredColumns.filter(
            (col) => !headers.includes(col)
          );
          if (missing.length) {
            errors.push(`Missing columns: ${missing.join(", ")}`);
            parser.abort();
          }
        }
      },

      complete: () => {
        resolve({
          isValid: errors.length === 0,
          errors,
          rowCount,
          headers,
          metadata: {
            type: "csv",
            size: file.size,
          },
        });
      },

      error: (err) => {
        resolve({
          isValid: false,
          errors: [err.message],
          rowCount,
          headers,
          metadata: {},
        });
      },
    });
  });
}

// ================= CHECKSUM =================
async function calculateChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ================= QUALITY =================
function calculateQualityScore(result: ValidationResult): number {
  let score = 100;

  score -= result.errors.length * 10;

  if (!result.headers.length) score -= 20;
  if (result.rowCount === 0) score -= 50;
  else if (result.rowCount < 100) score -= 20;

  if (Object.keys(result.metadata).length) score += 5;

  return Math.max(0, Math.min(100, score));
}

export {};