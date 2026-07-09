import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Check, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchAllIndiaLevlIndexItem } from "../../features/output_data/allIndiaLevelSlice";

import dropDownField from "../../components/ui/Form/dropdownField";
import SelectFilter from "../../components/ui/Form/SelectFilter";
import type { ColumnDef } from "@tanstack/react-table";
import { DynamicDataTable } from "../../components/data_table/dynamic_datatable";
import ExportButton from "../../components/Form/ExportButton";
import { ApprovalModal } from "../../components/model/approvalModel";

/* ---------------- Tabs ---------------- */
const tabs = [
  {
    label: "All India",
    value: "all_india",
    subtabs: [
      { label: "General", value: "all" },
      { label: "Division", value: "division" },
      { label: "Group", value: "group" },
      { label: "Class", value: "class" },
      { label: "SubClass", value: "subclass" },
      { label: "WIndex", value: "witem" },
    ],
  },
  {
    label: "State Wise",
    value: "state_wise",
    subtabs: [
      { label: "General", value: "all" },
      { label: "Division", value: "division" },
      { label: "Group", value: "group" },
      { label: "Class", value: "class" },
      { label: "SubClass", value: "subclass" },
      { label: "WIndex", value: "witem" },
    ],
  },
];

/* ---------------- Utils ---------------- */
const normalizeStatus = (status?: string) => {
  if (!status) return "PENDING_APPROVAL";
  if (status.toUpperCase() === "PENDING") return "PENDING_APPROVAL";
  return status.toUpperCase();
};

/* ---------------- Component ---------------- */
const Approve_Compile_Index: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.allIndiaLevelIndex
  );
  const { user } = useAppSelector((state) => state.auth);

  console.log(user, "user===============");

  const isApprover = Array.isArray(user?.role)
    ? user.role.some((r: string) => r.toLowerCase().includes("approver"))
    : typeof user?.role === "string"
      ? user.role.toLowerCase().includes("approver")
      : false;

  console.log(isApprover, "isApprover--=");

  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [subTab, setSubTab] = useState(tabs[0].subtabs[0].value);

  const now = new Date();
  now.setMonth(now.getMonth() - 1);

  const [dataType, setDataType] = useState({
    month: now.toLocaleString("en-US", { month: "short" }),
    year: now.getFullYear(),
    compile_type: "Provisional",
  });

  /* ---------- Fetch Data ---------- */
  useEffect(() => {
    dispatch(fetchAllIndiaLevlIndexItem({ tab: activeTab, subTab, dataType, page: 1, pageSize: 15 }));
  }, [activeTab, subTab, dataType, dispatch]);

  /* ---------- Local Table State ---------- */
  const [localTableData, setLocalTableData] = useState<any[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  useEffect(() => {
    if (!baseData) return;

    const data = Array.isArray(baseData)
      ? (baseData?.[0]?.data?.data ?? [])
      : ((baseData as any)?.data?.data ?? []);

    setLocalTableData(
      data.map((r: any, idx: number) => ({
        ...r,
        id: r.id ?? r._id ?? idx,
        status: normalizeStatus(r.status),
        approver_comment: r.approver_comment || "",
        approval_history: r.approval_history || [],
      }))
    );

    setSelectedRowIds([]);
  }, [baseData]);

  const toggleRowSelection = (id: number) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedRowIds([]);

  /* ---------- Approval Modal ---------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<"APPROVE" | "REJECT">(
    "APPROVE"
  );

  const confirmApproval = (comment: string) => {
    if (selectedAction === "REJECT" && !comment.trim()) {
      alert("Comment is mandatory while rejecting.");
      return;
    }

    const idsToProcess =
      selectedRowIds.length > 0
        ? selectedRowIds
        : selectedId
          ? [selectedId]
          : [];

    setLocalTableData((prev) =>
      prev.map((row) =>
        idsToProcess.includes(row.id)
          ? {
              ...row,
              status: selectedAction === "APPROVE" ? "APPROVED" : "REJECTED",
              approver_comment: comment,
              approval_history: [
                ...(row.approval_history || []),
                {
                  action:
                    selectedAction === "APPROVE" ? "APPROVED" : "REJECTED",
                  comment,
                  action_by: user?.username || "approver",
                  action_at: new Date().toISOString(),
                },
              ],
            }
          : row
      )
    );

    setModalOpen(false);
    setSelectedId(null);
    clearSelection();
  };

  /* ---------- History ---------- */
  const [historyRow, setHistoryRow] = useState<any | null>(null);

  /* ---------- Columns ---------- */
  const dynamicColumns = useMemo<ColumnDef<any>[]>(() => {
    if (!localTableData.length) return [];

    const titleCase = (s: string) =>
      s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const cols: ColumnDef<any>[] = [];

    /* Selection */
    if (isApprover) {
      cols.push({
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={
              selectedRowIds.length > 0 &&
              selectedRowIds.length ===
                localTableData.filter((r) => r.status === "PENDING_APPROVAL")
                  .length
            }
            onChange={(e) =>
              e.target.checked
                ? setSelectedRowIds(
                    localTableData
                      .filter((r) => r.status === "PENDING_APPROVAL")
                      .map((r) => r.id)
                  )
                : clearSelection()
            }
          />
        ),
        cell: ({ row }) =>
          row.original.status === "PENDING_APPROVAL" ? (
            <input
              type="checkbox"
              checked={selectedRowIds.includes(row.original.id)}
              onChange={() => toggleRowSelection(row.original.id)}
            />
          ) : null,
      });
    }

    Object.keys(localTableData[0])
      .filter(
        (c) => !["status", "approver_comment", "approval_history"].includes(c)
      )
      .forEach((c) =>
        cols.push({
          accessorKey: c,
          header: titleCase(c),
        })
      );

    cols.push({
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              s === "APPROVED"
                ? "bg-green-100 text-green-700"
                : s === "REJECTED"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {s}
          </span>
        );
      },
    });

    cols.push({
      accessorKey: "approver_comment",
      header: "Approver Comment",
      cell: ({ row }) =>
        row.original.approver_comment || (
          <span className="text-xs text-gray-400">—</span>
        ),
    });

    cols.push({
      id: "history",
      header: "History",
      cell: ({ row }) =>
        row.original.approval_history.length ? (
          <button
            className="text-blue-600 text-xs underline"
            onClick={() => setHistoryRow(row.original)}
          >
            View
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    });

    if (isApprover) {
      cols.push({
        id: "actions",
        header: "Action",
        cell: ({ row }) =>
          row.original.status !== "PENDING_APPROVAL" ? (
            <span className="text-xs text-gray-400 italic">
              Action completed
            </span>
          ) : (
            <div className="flex gap-2">
              <button
                className="p-1 bg-green-100 text-green-700 rounded"
                onClick={() => {
                  setSelectedId(row.original.id);
                  setSelectedAction("APPROVE");
                  setModalOpen(true);
                }}
              >
                <Check size={16} />
              </button>
              <button
                className="p-1 bg-red-100 text-red-700 rounded"
                onClick={() => {
                  setSelectedId(row.original.id);
                  setSelectedAction("REJECT");
                  setModalOpen(true);
                }}
              >
                <X size={16} />
              </button>
            </div>
          ),
      });
    }

    return cols;
  }, [localTableData, isApprover, selectedRowIds]);

  /* ---------- Render ---------- */
  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-3">
        Released Index Outputs – Approval
      </h1>

      <SelectFilter fields={dropDownField} onFilter={setDataType} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <Tabs value={subTab} onValueChange={setSubTab}>
              <div className="flex justify-between mb-3">
                <TabsList>
                  {t.subtabs.map((st) => (
                    <TabsTrigger key={st.value} value={st.value}>
                      {st.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ExportButton label="Export All" onClick={() => {}} />
              </div>

              {isApprover && selectedRowIds.length > 0 && (
                <div className="flex gap-3 mb-3">
                  <button
                    className="px-4 py-1 bg-green-600 text-white rounded text-sm"
                    onClick={() => {
                      setSelectedAction("APPROVE");
                      setModalOpen(true);
                    }}
                  >
                    Bulk Approve ({selectedRowIds.length})
                  </button>
                  <button
                    className="px-4 py-1 bg-red-600 text-white rounded text-sm"
                    onClick={() => {
                      setSelectedAction("REJECT");
                      setModalOpen(true);
                    }}
                  >
                    Bulk Reject ({selectedRowIds.length})
                  </button>
                </div>
              )}

              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <DynamicDataTable
                  data={localTableData}
                  columns={dynamicColumns}
                  title={`${t.label} - ${subTab}`}
                  action={{ edit: false, delete: false }}
                />
              )}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>

      <ApprovalModal
        open={modalOpen}
        action={selectedAction}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmApproval}
      />

      {historyRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg w-[520px]">
            <h3 className="text-lg font-semibold mb-3">Approval History</h3>
            {historyRow.approval_history.map((h: any, i: number) => (
              <div key={i} className="border-l-4 pl-3 mb-3">
                <p className="font-semibold">{h.action}</p>
                <p className="text-xs italic">{h.comment}</p>
                <p className="text-[11px] text-gray-500">
                  {h.action_by} · {new Date(h.action_at).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="text-right">
              <button
                className="px-4 py-1 bg-gray-200 rounded"
                onClick={() => setHistoryRow(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approve_Compile_Index;
