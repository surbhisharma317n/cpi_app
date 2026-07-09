import React, { useEffect, useMemo, useState, type JSX } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Filter, 
  Search, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  User,
  Clock,
  Hash,
  Type,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchApprovalRequests,
  approveRejectApprovalRequest,
} from "../../features/compilation/approvalRequestSlice";

/* ================= TYPES ================= */

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApprovalTableRow {
  id: number;
  monthYear: string;
  compilationId: number;
  compilerName: string;
  compileType: string;
  iteration: number;
  compiledAt: string;
  status: ApprovalStatus;
}

/* ================= CONSTANTS ================= */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_STYLES: Record<
  ApprovalStatus,
  { bg: string; text: string; border: string; icon: JSX.Element }
> = {
  PENDING: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: <Clock className="w-3 h-3" />
  },
  APPROVED: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: <CheckCircle className="w-3 h-3" />
  },
  REJECTED: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: <XCircle className="w-3 h-3" />
  },
};

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

/* ================= COMPONENT ================= */

export default function ApproveIndex() {
  const dispatch = useAppDispatch();

  /* ---------- FILTER STATE ---------- */
  const [month, setMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [compileType, setCompileType] = useState<string>("");
  const [iteration, setIteration] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(true);

  /* ---------- PAGINATION STATE ---------- */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  /* ---------- ACTION STATE ---------- */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { list, total, status } = useAppSelector(
    (state) => state.fetchApprovalRequests
  );

  /* ---------- STATS ---------- */
  const stats = useMemo(() => {
    const pending = list.filter(item => item.approval_status === "PENDING").length;
    const approved = list.filter(item => item.approval_status === "APPROVED").length;
    const rejected = list.filter(item => item.approval_status === "REJECTED").length;
    const totalCount = list.length;

    return { pending, approved, rejected, total: totalCount };
  }, [list]);

  /* ---------- PAGINATION CALCULATIONS ---------- */
  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const paginatedRows = useMemo<ApprovalTableRow[]>(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return list.slice(startIndex, endIndex).map((item) => ({
      id: item.id,
      monthYear: `${item.month} ${item.year}`,
      compilationId: item.compilation_id,
      compilerName: item.compiler_name,
      compileType: item.compile_type,
      iteration: item.iteration,
      compiledAt: new Date(item.compiled_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: item.approval_status,
    }));
  }, [list, currentPage, pageSize]);

  const pageInfo = useMemo(() => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, total);
    return { startItem, endItem };
  }, [currentPage, pageSize, total]);

  /* ---------- PAGE NUMBER GENERATION ---------- */
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 3) {
        endPage = 4;
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis if needed after first page
      if (startPage > 2) {
        pages.push("...");
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed before last page
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  /* ---------- FETCH LIST ---------- */
  useEffect(() => {
    dispatch(
      fetchApprovalRequests({
        page: currentPage,
        month,
        year,
        compile_type: compileType || undefined,
        iteration,
        search: search || undefined,
        status: "PENDING",
      })
    );
  }, [dispatch, currentPage, month, year, compileType, iteration, search]);

  /* ---------- ACTION HANDLERS ---------- */
  const submitAction = async (id: number, action: "APPROVED" | "REJECTED") => {
    if (action === "REJECTED" && !comment.trim()) {
      alert("Comment is required for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        approveRejectApprovalRequest({
          id,
          action,
          comment: comment.trim() || "Approved without comments",
        })
      ).unwrap();

      // Refresh the list
      await dispatch(
        fetchApprovalRequests({
          page: currentPage,
          month,
          year,
          compile_type: compileType || undefined,
          iteration,
          search: search || undefined,
          status: "PENDING",
        })
      ).unwrap();

      setSelectedId(null);
      setComment("");
    } catch (error) {
      console.error("Action failed:", error);
      alert("Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setMonth(MONTHS[new Date().getMonth()]);
    setYear(new Date().getFullYear());
    setCompileType("");
    setIteration(undefined);
    setSearch("");
    setCurrentPage(1); // Reset to first page
  };

  const handleExport = () => {
    // Export functionality
    console.log("Exporting data...");
  };

  /* ---------- PAGINATION HANDLERS ---------- */
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  /* ================= JSX ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-6">
      
        {/* ================= HEADER WITH STATS ================= */}
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-2xl border px-6 py-5 shadow-sm">

  {/* LEFT SIDE */}
  <div className="flex-1">
    <h1 className="text-3xl font-bold text-gray-800">
      Approval Dashboard
    </h1>
    <p className="text-gray-500 mt-1">
      Review and manage compilation requests
    </p>
  </div>

  {/* RIGHT SIDE STATS */}
 {/* RIGHT SIDE STATS */}
<div className="flex flex-wrap items-center gap-3">

  {/* Pending */}
<div className="group relative overflow-hidden
backdrop-blur-lg bg-gradient-to-br from-amber-50 via-white to-amber-100
border border-amber-200
rounded-2xl p-5
shadow-sm hover:shadow-xl
transition-all duration-300
hover:-translate-y-1 hover:border-amber-400">

  <div className="flex items-center gap-4">

    {/* Icon */}
    <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-xl shadow-md">
      <Clock size={16} />
    </div>

    {/* Text */}
    <div>
      <p className="text-sm font-medium text-amber-500 tracking-wide uppercase transition-all duration-200 group-hover:text-amber-700">
        Pending
      </p>

      <h3 className="text-3xl font-bold text-amber-700 group-hover:text-amber-800 transition-colors">
        {stats.pending}
      </h3>
    </div>

  </div>

  {/* Glow */}
  <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>

</div>

  {/* Approved */}
 <div className="group relative overflow-hidden
backdrop-blur-lg bg-gradient-to-br from-emerald-50 via-white to-emerald-100
border border-emerald-200
rounded-2xl p-5
shadow-sm hover:shadow-xl
transition-all duration-300
hover:-translate-y-1 hover:border-emerald-400">

  <div className="flex items-center gap-4">

    {/* Icon */}
    <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-xl shadow-md">
      <CheckCircle size={16} />
    </div>

    {/* Text */}
    <div>
      <p className="text-sm font-medium text-emerald-500 tracking-wide uppercase transition-all duration-200 group-hover:text-emerald-700">
        Approved
      </p>

      <h3 className="text-3xl font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors">
        {stats.approved}
      </h3>
    </div>

  </div>

  {/* Glow Effect */}
  <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>

</div>

  {/* Rejected */}
  <div className="group relative overflow-hidden
backdrop-blur-lg bg-gradient-to-br from-rose-50 via-white to-rose-100
border border-rose-200
rounded-2xl p-5
shadow-sm hover:shadow-xl
transition-all duration-300
hover:-translate-y-1 hover:border-rose-400
min-w-[180px]">

  <div className="flex items-center gap-4">

    {/* Icon */}
    <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-800 text-white rounded-xl shadow-md">
      <XCircle size={16} />
    </div>

    {/* Text */}
    <div>
      <p className="text-sm font-medium text-rose-500 tracking-wide uppercase transition-all duration-200 group-hover:text-rose-700">
        Rejected
      </p>

      <h3 className="text-3xl font-bold text-rose-700 group-hover:text-rose-800 transition-colors">
        {stats.rejected}
      </h3>
    </div>

  </div>

  {/* Glow Effect */}
  <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>

</div>

</div>

</div>
      {/* ================= HORIZONTAL FILTER BAR ================= */}
     <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

  {/* MODERN FILTER HEADER */}
  {/* <div className="flex items-center justify-between
  bg-gradient-to-r from-white via-[#f8fffd] to-[#e6fffb]
  border-b border-[#2dbfb0]/20
  backdrop-blur-lg
  px-6 py-4
  transition-all duration-300"> */}
    <div className="flex items-center justify-between
  bg-gradient-to-r from-white via-[#F4F9FE] to-[#DDEDFB]
  border-b border-[#F4F9FE]/20
  backdrop-blur-lg
  px-6 py-4
  transition-all duration-200">

    {/* LEFT SIDE */}
    <div className="flex items-center gap-4">

      <div className="flex items-center gap-2 text-gray-700 font-semibold">
        <Filter className="w-5 h-5 text-[#0F4A7E]" />
        <span className="uppercase tracking-wide text-sm">Filters</span>
      </div>

      <span className="text-gray-300">|</span>

      <span className="px-3 py-1 text-sm font-medium
      bg-gradient-to-r from-[#1362A6] to-[#0F4A7E]
      text-white rounded-full shadow-sm">
        {total} requests found
      </span>

    </div>

    {/* RIGHT SIDE */}
   <div className="flex items-center gap-3">

  {/* Hide Filters */}
  <button
    onClick={() => setShowFilters(!showFilters)}
    className="flex items-center gap-2 px-4 py-2 rounded-lg border
    border-gray-300 bg-[#f9a543] hover:bg-[#f79a1b] text-white
    text-sm font-medium transition"
  >
    {showFilters ? (
      <>
        <ChevronUp className="w-4 h-4" />
        Hide Filters
      </>
    ) : (
      <>
        <ChevronDown className="w-4 h-4" />
        Show Filters
      </>
    )}
  </button>

 

  {/* Reset */}
  <button
    onClick={handleResetFilters}
    className="flex items-center gap-2 px-4 py-2 rounded-lg border
    border-gray-300 bg-[#da6c78] hover:bg-[#d03d58] text-white
    text-sm font-medium transition">
    <RefreshCw className="w-4 h-4" />
    Reset
  </button>
   {/* Export */}
  <button
    onClick={handleExport}
    // className="flex items-center gap-2 px-4 py-2 rounded-lg
    // text-gray-700 hover:bg-gray-100 text-sm font-medium transition 
    // bg-gradient-to-r from-indigo-600 to-blue-600"
    className="flex items-center gap-2 px-4 py-2 rounded-lg border
    border-gray-300 bg-blue-600 hover:bg-blue-700 text-white
    text-sm font-medium transition">
    <Download className="w-4 h-4" />
    Export
  </button>

</div>
  </div>

  {/* FILTER FIELDS */}
  {showFilters && (
    <div className="p-6 bg-white">

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* MONTH */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Month
          </label>

          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-[#0F4A7E] focus:border-[#0F4A7E]
              bg-white hover:border-gray-400 transition-colors">
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          </div>
        </div>

        {/* YEAR */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Year
          </label>

          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-[#2dbfb0] focus:border-[#2dbfb0]
              bg-white hover:border-gray-400 transition-colors"
            >
              <option value={year}>{year}</option>
              <option value={year - 1}>{year - 1}</option>
              <option value={year - 2}>{year - 2}</option>
            </select>

            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          </div>
        </div>

        {/* TYPE */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Type className="w-3 h-3" />
            Type
          </label>

          <div className="relative">
            <select
              value={compileType}
              onChange={(e) => setCompileType(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-[#2dbfb0] focus:border-[#2dbfb0]
              bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Types</option>
              <option value="FINAL">Final</option>
              <option value="REVISION">Revision</option>
              <option value="DRAFT">Draft</option>
            </select>

            <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          </div>
        </div>

        {/* ITERATION */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Repeat className="w-3 h-3" />
            Iteration
          </label>

          <div className="relative">
            <input
              type="number"
              value={iteration ?? ""}
              onChange={(e) =>
                setIteration(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-[#2dbfb0] focus:border-[#2dbfb0]
              hover:border-gray-400 transition-colors"
              placeholder="Any"
            />

            <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          </div>
        </div>

        {/* SEARCH */}
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Search className="w-3 h-3" />
            Search
          </label>

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by compiler, ID, or details..."
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-[#2dbfb0] focus:border-[#2dbfb0]
              hover:border-gray-400 transition-colors"
            />

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <XCircle className="w-4 h-4 text-gray-400 hover:text-gray-600"/>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )}
</div>

      {/* ================= TABLE CARD ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* TABLE HEADER */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Approval Requests</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {pageInfo.startItem} to {pageInfo.endItem} of {total} total requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Period
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    Compilation ID
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Compiler
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-3 h-3" />
                    Iteration
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Compiled</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className={`hover:bg-gray-50 ${STATUS_STYLES[row.status].bg}  transition-all duration-150 ${selectedId === row.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{row.monthYear}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-default">
                        <Hash className="w-3 h-3 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">#{row.compilationId}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{row.compilerName}</div>
                          <div className="text-xs text-gray-500">ID: {row.id}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        ${row.compileType === "FINAL" 
                          ? "bg-purple-100 text-purple-800 border border-purple-200" 
                          : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                        {row.compileType === "FINAL" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {row.compileType}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Repeat className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">#{row.iteration}</div>
                          <div className="text-xs text-gray-500">Iteration</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{row.compiledAt}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(row.compiledAt)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border
                        ${STATUS_STYLES[row.status].bg} 
                        ${STATUS_STYLES[row.status].text} 
                        ${STATUS_STYLES[row.status].border}`}>
                        {STATUS_STYLES[row.status].icon}
                        {row.status}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {row.status === "PENDING" ? (
                        <button
                          onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                            ${selectedId === row.id 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"}`}
                        >
                          {selectedId === row.id ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Close Review
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Review
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">
                          {row.status === "APPROVED" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                  
                  {/* EXPANDED ACTION PANEL */}
                  {selectedId === row.id && (
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <td colSpan={8} className="p-0">
                        <div className="p-6 border-t-2 border-blue-200">
                          <div className="flex items-start gap-6">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-white rounded-xl border border-blue-200 shadow-sm flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Review Request #{row.compilationId}</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Submitted by {row.compilerName} • {formatTimeAgo(row.compiledAt)}
                                  </p>
                                </div>
                                <div className="text-sm text-gray-500">
                                  Iteration: <span className="font-bold">{row.iteration}</span>
                                </div>
                              </div>
                              
                              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                  Remarks
                                  <span className="text-gray-500 text-xs ml-2">
                                    {row.status === "REJECTED" ? "(Required for rejection)" : "(Optional for approval)"}
                                  </span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder={
                                    row.status === "REJECTED" 
                                      ? "Please provide a reason for rejection..." 
                                      : "Add your comments or notes for this approval..."
                                  }
                                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                                  disabled={isSubmitting}
                                />
                                <div className="flex justify-between items-center mt-2">
                                  <div className="text-xs text-gray-500">
                                    {comment.length}/500 characters
                                  </div>
                                  {row.status === "REJECTED" && !comment.trim() && (
                                    <div className="text-xs text-rose-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Comment required for rejection
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => {
                                    setSelectedId(null);
                                    setComment("");
                                  }}
                                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </button>
                                
                                <button
                                  onClick={() => submitAction(row.id, "REJECTED")}
                                  disabled={isSubmitting || (row.status === "REJECTED" && !comment.trim())}
                                  className="px-5 py-2.5 bg-white border border-rose-600 text-rose-600 rounded-lg hover:bg-rose-50 font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSubmitting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  Reject Request
                                </button>
                                
                                <button
                                  onClick={() => submitAction(row.id, "APPROVED")}
                                  disabled={isSubmitting}
                                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium text-sm flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                                >
                                  {isSubmitting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  Approve Request
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* LOADING STATE */}
        {status === "LOADING" && (
          <div className="p-12 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="mt-6">
                <div className="text-gray-800 font-semibold">Loading approval requests</div>
                <div className="text-sm text-gray-500 mt-2 max-w-md">
                  Fetching the latest compilation requests from the database...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {paginatedRows.length === 0 && status !== "LOADING" && (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600 mb-6">
                There are no approval requests matching your current filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {paginatedRows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page info */}
              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{pageInfo.startItem}</span> to <span className="font-semibold">{pageInfo.endItem}</span> of{' '}
                <span className="font-semibold">{total}</span> results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* First page button */}
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous page button */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {pageNumbers.map((pageNum, index) => (
                    pageNum === "..." ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                          ${currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>

                {/* Next page button */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg ${currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page button */}
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg ${currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Go to page input */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Go to page:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        goToPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <span className="text-sm text-gray-500">/{totalPages}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FOOTER INFO ================= */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Approval Dashboard v1.0 • {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
    </div>
  );
}