import  { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, ClipboardCheck, XCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchApprovalRequests } from "../../features/compilation/approvalRequestSlice";



/* ================= TYPES ================= */
interface CompileRequest {
  id: number;
  user_id: number;
  compilerName: string;
  month: string;
  year: number;
  compileType: string;
  iteration: number;
  compiledBy: string;
  compiledAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface RawDataRow {
  id: number;
  item: string;
  value: number;
  remarks: string;
}

interface ApprovalHistory {
  id: number;
  action: "APPROVED" | "REJECTED";
  comment: string;
  actionBy: string;
  actionAt: string;
}

/* ================= CONSTANTS ================= */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentMonth = MONTHS[new Date().getMonth()];
const currentYear = new Date().getFullYear();

/* ================= DUMMY DATA ================= */
const dummyRequests: CompileRequest[] = [
  {
    id: 1,
    user_id: 101,
    compilerName: "R. Sharma",
    month: "July",
    year: 2025,
    compileType: "FINAL",
    iteration: 1,
    compiledBy: "System User",
    compiledAt: "2025-07-15 14:30",
    status: "PENDING",
  },
  {
    id: 2,
    user_id: 205,
    compilerName: "A. Verma",
    month: "June",
    year: 2025,
    compileType: "REVISION",
    iteration: 2,
    compiledBy: "Admin",
    compiledAt: "2025-06-20 11:10",
    status: "PENDING",
  },
  {
    id: 3,
    user_id: 111,
    compilerName: "S. Iyer",
    month: "December",
    year: 2025,
    compileType: "FINAL",
    iteration: 2,
    compiledBy: "Analyst",
    compiledAt: "2025-12-18 09:15",
    status: "PENDING",
  },
  {
    id: 4,
    user_id: 111,
    compilerName: "S. Iyer",
    month: "December",
    year: 2025,
    compileType: "FINAL",
    iteration: 2,
    compiledBy: "Analyst",
    compiledAt: "2025-12-20 09:15",
    status: "PENDING",
  },
  {
    id: 5,
    user_id: 111,
    compilerName: "S. Iyer",
    month: "December",
    year: 2025,
    compileType: "FINAL",
    iteration: 2,
    compiledBy: "Analyst",
    compiledAt: "2025-12-21 09:15",
    status: "REJECTED",
  },
  {
    id: 6,
    user_id: 111,
    compilerName: "S. Iyer",
    month: "December",
    year: 2025,
    compileType: "FINAL",
    iteration: 2,
    compiledBy: "Analyst",
    compiledAt: "2025-12-22 09:15",
    status: "APPROVED",
  },
];

const dummyRawData: RawDataRow[] = [
  { id: 1, item: "Rice", value: 112.5, remarks: "Verified" },
  { id: 2, item: "Wheat", value: 98.3, remarks: "Pending Check" },
  { id: 3, item: "Oil", value: 145.9, remarks: "Verified" },
];

const dummyApprovalHistory: ApprovalHistory[] = [
  {
    id: 1,
    action: "APPROVED",
    comment: "Data verified and validated",
    actionBy: "Senior Officer",
    actionAt: "2025-07-20 10:15",
  },
  {
    id: 2,
    action: "REJECTED",
    comment: "Minor discrepancy found",
    actionBy: "Reviewer",
    actionAt: "2025-07-19 17:40",
  },
];
const STATUS_STYLES: Record<
  "PENDING" | "APPROVED" | "REJECTED",
  { bg: string; text: string; border: string }
> = {
  PENDING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  APPROVED: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  REJECTED: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

/* ================= COMPONENT ================= */
export default function ApproveIndex() {
  /* ---------- FILTER STATE ---------- */
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState<number | "">(currentYear);
  const [compileType, setCompileType] = useState("");
  const [iteration, setIteration] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const hasFetched = useRef(false);

  /* ---------- ACTION STATE ---------- */
  const [comment, setComment] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<CompileRequest | null>(null);

  const [rawDataOpen, setRawDataOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { list, total, status } = useAppSelector(
  (state) => state.fetchApprovalRequests
);





useEffect(() => {
  if (hasFetched.current) return;

  hasFetched.current = true;

  dispatch(fetchApprovalRequests({ page: 1, status: "PENDING" }));
}, [dispatch]);

console.log("Approval Requests from Store:", list, total, status);




  /* ---------- FILTER LOGIC ---------- */
  const filteredRequests = useMemo(() => {
    return dummyRequests.filter((r) =>
      (!month || r.month === month) &&
      (!year || r.year === year) &&
      (!compileType || r.compileType === compileType) &&
      (!iteration || r.iteration === iteration) &&
      (!search ||
        r.compilerName.toLowerCase().includes(search.toLowerCase()) ||
        r.compiledBy.toLowerCase().includes(search.toLowerCase()))
    );
  }, [month, year, compileType, iteration, search]);

  



  /* ---------- HANDLERS ---------- */
  const handleApprove = (id: number) => {
    if (!comment.trim()) return alert("Comment required");
    console.log("APPROVED:", id, comment);
    setSelectedId(null);
    setComment("");
  };

  const handleReject = (id: number) => {
    if (!comment.trim()) return alert("Comment required");
    console.log("REJECTED:", id, comment);
    setSelectedId(null);
    setComment("");
  };

  const resetFilters = () => {
    setMonth(currentMonth);
    setYear(currentYear);
    setCompileType("");
    setIteration("");
    setSearch("");
  };

  /* ================= JSX ================= */
  return (
    <div className="p-6 space-y-6">

   

<div className="flex items-center gap-2 mb-6">
  <ClipboardCheck className="text-blue-600" size={22} />

  <h1 className="text-xl font-semibold text-gray-900 leading-none">
    Approval Index Requests
  </h1>
</div>


      {/* ================= FILTER BAR ================= */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="border px-3 py-2 rounded w-40">
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>

        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border px-3 py-2 rounded w-28">
          <option>{currentYear}</option>
          <option>{currentYear - 1}</option>
        </select>

        <select value={compileType}
          onChange={(e) => setCompileType(e.target.value)}
          className="border px-3 py-2 rounded w-36">
          <option value="">Compile Type</option>
          <option value="FINAL">FINAL</option>
          <option value="REVISION">REVISION</option>
        </select>

        <input type="number" placeholder="Iteration"
          value={iteration}
          onChange={(e) => setIteration(e.target.value ? Number(e.target.value) : "")}
          className="border px-3 py-2 rounded w-28" />

        <input type="text" placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-56" />

        <button onClick={resetFilters}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Reset
        </button>
      </div>

      {/* ================= CARDS ================= */}
  <div className="space-y-6">
  {filteredRequests.map((req) => (
    <div
      key={req.id}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start px-5 pt-5 pb-4 border-b">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {req.month} {req.year}
            <span className="text-gray-400 font-normal">
              {" "}
              • {req.compileType}
            </span>
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Compiled on {req.compiledAt}
          </p>
        </div>

       <span
  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
    ${STATUS_STYLES[req.status].bg}
    ${STATUS_STYLES[req.status].text}
    ${STATUS_STYLES[req.status].border}
  `}
>
  {req.status}
</span>

      </div>

      {/* ================= DETAILS ================= */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 text-sm border rounded-lg overflow-hidden">
          {/* Headers */}
          <div className="bg-gray-50 px-3 py-2 font-medium text-gray-600">
            Iteration
          </div>
          <div className="px-3 py-2">{req.iteration}</div>

          <div className="bg-gray-50 px-3 py-2 font-medium text-gray-600">
            User ID
          </div>
          <div className="px-3 py-2">{req.user_id}</div>

          <div className="bg-gray-50 px-3 py-2 font-medium text-gray-600">
            Compiler
          </div>
          <div className="px-3 py-2">{req.compilerName}</div>

          <div className="bg-gray-50 px-3 py-2 font-medium text-gray-600">
            Compiled By
          </div>
          <div className="px-3 py-2">{req.compiledBy}</div>
        </div>

        {/* ================= COMMENT ================= */}
        {selectedId === req.id && (
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter approval / rejection remarks"
            className="mt-4 w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* ================= FOOTER ACTIONS ================= */}
      <div className="flex justify-between items-center px-5 py-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedRequest(req);
              setRawDataOpen(true);
            }}
            className="h-9 px-3 text-sm border rounded-md bg-white hover:bg-gray-100"
          >
            View Raw Data
          </button>

          <button
            onClick={() => {
              setSelectedRequest(req);
              setHistoryOpen(true);
            }}
            className="h-9 px-3 text-sm border rounded-md bg-white hover:bg-gray-100"
          >
            Approval History
          </button>
        </div>

        <div className="flex gap-2">
          {selectedId !== req.id ? (
            <button
              onClick={() => setSelectedId(req.id)}
              className="h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Take Action
            </button>
          ) : (
            <>
              <button
                onClick={() => handleApprove(req.id)}
                className="h-9 px-3 flex items-center gap-1 bg-green-600 text-white text-sm rounded-md"
              >
                <CheckCircle size={16} />
                Approve
              </button>

              <button
                onClick={() => handleReject(req.id)}
                className="h-9 px-3 flex items-center gap-1 bg-red-600 text-white text-sm rounded-md"
              >
                <XCircle size={16} />
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  ))}
</div>



      {/* ================= RAW DATA MODAL ================= */}
      {rawDataOpen && selectedRequest && (
        <Modal title="Raw Data Preview" onClose={() => setRawDataOpen(false)}>
          <Table headers={["Item", "Value", "Remarks"]}>
            {dummyRawData.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.item}</td>
                <td className="px-3 py-2">{r.value}</td>
                <td className="px-3 py-2">{r.remarks}</td>
              </tr>
            ))}
          </Table>
        </Modal>
      )}

      {/* ================= HISTORY MODAL ================= */}
      {historyOpen && selectedRequest && (
        <Modal title="Approval History" onClose={() => setHistoryOpen(false)}>
          <Table headers={["Action", "Comment", "By", "Date"]}>
            {dummyApprovalHistory.map(h => (
              <tr key={h.id}>
                <td className="px-3 py-2">{h.action}</td>
                <td className="px-3 py-2">{h.comment}</td>
                <td className="px-3 py-2">{h.actionBy}</td>
                <td className="px-3 py-2">{h.actionAt}</td>
              </tr>
            ))}
          </Table>
        </Modal>
      )}
    </div>
  );
}

/* ================= REUSABLE MODAL ================= */
function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ================= REUSABLE TABLE ================= */
function Table({ headers, children }: any) {
  return (
    <div className="overflow-auto max-h-80 border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>{headers.map((h: string) => (
            <th key={h} className="px-3 py-2 text-left">{h}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
