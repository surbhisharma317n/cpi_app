import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (data: any[], columns: string[], fileName: string) => {
  const csvContent = [
    columns.join(","),
    ...data.map((row) =>
      columns.map((col) => JSON.stringify(row[col] ?? "")).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${fileName}.csv`);
};

export const exportToExcel = (data: any[], columns: string[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (data: any[], columns: string[], fileName: string) => {
  const doc = new jsPDF();
  const tableData = data.map((row) => columns.map((col) => row[col] ?? ""));
  autoTable(doc, {
    head: [columns],
    body: tableData,
  });
  doc.save(`${fileName}.pdf`);
};
