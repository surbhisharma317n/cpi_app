// components/UploadData/UploadForm.tsx
import React from 'react';

interface Props {
  type: string;
  month: string;
  year: string;
}

const FetchTable: React.FC<Props> = ({ type, month, year }) => {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Status</h3>
      <table className="min-w-full border rounded overflow-hidden text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 border">Type</th>
            <th className="px-4 py-2 border">Month</th>
            <th className="px-4 py-2 border">Year</th>
            <th className="px-4 py-2 border">Iteration</th>
            <th className="px-4 py-2 border">View</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td className="border px-4 py-2">{type}</td>
            <td className="border px-4 py-2">{month}</td>
            <td className="border px-4 py-2">{year}</td>
            <td className="border px-4 py-2">1</td>
            <td className="border px-4 py-2">
              <button className="text-blue-600 hover:underline">
                View 👁️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};


export default FetchTable;
