import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SendRequestModel from "../model/send_request_model";

export default function TableView({ 
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
  const navigate = useNavigate();
    const [sendRequestModalOpen, setSendRequestModalOpen] = useState(false);
   

    type Item = {
    type: string;
    details: string;
    status: string;
    last_update: string;
  };
  const itemArray: Item[] = [
    { type: "Provisional", details: "April_2025-iter1", status: "Done", last_update: new Date(Date.now() - 86400000).toLocaleDateString() },
    { type: "Final", details: "April_2025-iter1", status: "Done", last_update: new Date(Date.now() - 172800000).toLocaleDateString() },
    { type: "Provisional", details: "April_2025-iter1", status: "Done", last_update: new Date(Date.now() - 86400000).toLocaleDateString() },
    { type: "Final", details: "April_2025-iter1", status: "Done", last_update: new Date(Date.now() - 172800000).toLocaleDateString() }
  ];

  const handleSendRequestSubmit = (comment: any) => {
      console.log('Approved with comment:', comment);
      // Add your approval logic here
    };
  
 

  
  return (
   <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 w-full">
  {isLoading ? (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600">Loading data...</span>
    </div>
  ) : (
    <div className="overflow-x-auto w-full">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Compile Type
            </th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Details
            </th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Status
            </th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Last Updated
            </th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {itemArray.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.type === "Final" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.last_update}
                  </td>
                 
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
              <button className="text-blue-600 hover:text-blue-900" onClick={() => navigate(`/compile/viewReport?q=${item.details}`)}>
                View
              </button>
              <button className="text-blue-600 hover:text-red-600"   onClick={() => setSendRequestModalOpen(true)}>
                Request to approve
              </button>
            </td>
                 
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )}
  <SendRequestModel
    isOpen={sendRequestModalOpen}
    onClose={() => setSendRequestModalOpen(false)}
    onSubmit={handleSendRequestSubmit}
  />
</div>
  );
}