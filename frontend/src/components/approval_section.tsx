import { useState } from "react";
import ApproveModal from "./model/approve_model";
import RejectModal from "./model/reject_model";

// Main Approval Section Component
function ApprovalSection() {
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const handleApproveSubmit = (comment: any) => {
    console.log('Approved with comment:', comment);
    // Add your approval logic here
  };

  const handleRejectSubmit = (reason: any) => {
    console.log('Rejected with reason:', reason);
    // Add your rejection logic here
  };

  return (
    <>
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Approval</h3>
          <div className="flex space-x-3">
            <button 
              onClick={() => setApproveModalOpen(true)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Approve
            </button>
            <button 
              onClick={() => setRejectModalOpen(true)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reject
            </button>
          </div>
        </div>
      </div>

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
    </>
  );
}

export default ApprovalSection;