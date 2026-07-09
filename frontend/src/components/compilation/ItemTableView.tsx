import { useNavigate } from "react-router-dom";
import ApproveModal from "../model/approve_model";
import RejectModal from "../model/reject_model";
import { useState } from "react";

export default function ItemTableView({
  isLoading,
}: {
  isLoading: boolean;
  activeProgram: string;
  activeComprehensiveTab: string;
  activeAllIndiaTab: string;
  activeInflationTab: string;
}) {
  // This would fetch and display data based on the active tabs
  // For now, just showing a placeholder

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const handleApproveSubmit = (comment: any) => {
    console.log("Approved with comment:", comment);
    // Add your approval logic here
  };

  const handleRejectSubmit = (reason: any) => {
    console.log("Rejected with reason:", reason);
    // Add your rejection logic here
  };
  const navigate = useNavigate();
  // const lastupdate = new Date(Date.now() - 86400000).toLocaleDateString();
  type Item = {
    type: string;
    details: string;
    status: string;
    last_update: string;
  };
  const itemArray: Item[] = [
    {
      type: "Provisional",
      details: "April_2025-iter1",
      status: "Completed",
      last_update: new Date(Date.now() - 86400000).toLocaleDateString(),
    },
    {
      type: "Final",
      details: "April_2025-iter1",
      status: "Completed",
      last_update: new Date(Date.now() - 172800000).toLocaleDateString(),
    },
    {
      type: "Provisional",
      details: "April_2025-iter1",
      status: "Completed",
      last_update: new Date(Date.now() - 86400000).toLocaleDateString(),
    },
    {
      type: "Final",
      details: "April_2025-iter1",
      status: "Completed",
      last_update: new Date(Date.now() - 172800000).toLocaleDateString(),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex justify-end mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="py-2 pl-4 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 w-64"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Compile Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Details
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Last Update
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {itemArray.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.type === "Final" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.last_update}
                  </td>
                  <td className="px-6 py-4 flex space-x-4  whitespace-nowrap text-sm font-medium">
                    <button
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:text-blue-900 mr-3"
                      onClick={() =>
                        navigate(`/compile/viewReport?q=${item.details}`)
                      }
                    >
                      view
                    </button>
                    <button
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => setApproveModalOpen(true)}
                    >
                      approve
                    </button>
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Recompile Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Section */}
      <ApproveModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onSubmit={handleApproveSubmit}
      />

      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}
