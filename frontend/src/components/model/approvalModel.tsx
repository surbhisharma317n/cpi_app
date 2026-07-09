import { useState } from "react";

/* ---------------- Approval Modal ---------------- */
export const ApprovalModal = ({
  open,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: "APPROVE" | "REJECT";
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) => {
  const [remarks, setRemarks] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-3">
          {action === "APPROVE" ? "Approve Index" : "Reject Index"}
        </h2>

        <textarea
          className="w-full border rounded-lg p-2 mb-4"
          rows={4}
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm(remarks);
              setRemarks("");
            }}
            className={`px-4 py-2 rounded text-white ${
              action === "APPROVE" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
