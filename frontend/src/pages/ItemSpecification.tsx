import React from "react";

import { specificationColumns } from "../utils/columns/specification";
import { DataTable } from "../components/data_table/datatable1";


// Replace this with your actual specification column definition


// Dummy specification data (replace with actual data)
const dummySpecificationData = [
  { id: 1, name: "Weight", unit: "Kg", category: "Physical" },
  { id: 2, name: "Color", unit: "Hex", category: "Visual" },
];

const Specification: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Specification Table</h1>
      <DataTable data={dummySpecificationData} columns={specificationColumns} title={""} action={{
        edit: false,
        delete: false
      }} />
    </div>
  );
};

export default Specification;
