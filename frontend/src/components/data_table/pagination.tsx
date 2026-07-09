import { ChevronLeft, ChevronRight } from "lucide-react";


type PaginationProps = {
  currentPage: number;      // Current page (1-indexed)
  totalPages: number;       // Total pages from backend
  pageSize: number;         // Current page size
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};



export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const maxButtons = 5; // Max page buttons to show

  const generatePages = () => {
    const pages = [];
    const half = Math.floor(maxButtons / 2);

    let start = Math.max(currentPage - half, 1);
    let end = Math.min(start + maxButtons - 1, totalPages);

    if (end - start < maxButtons - 1) start = Math.max(end - maxButtons + 1, 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push(-1); // -1 for "..."
    }

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(-1); // "..."
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = generatePages();

  return (
    <div className="mt-4 flex flex-wrap justify-between items-center text-sm gap-4">
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="pageSize">Show</label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border rounded px-2 py-1 ml-2"
        >
          {[10, 20, 30, 50, 100].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
        <span>entries</span>
      </div>

      {/* Page info */}
      <span>
        Page <strong>{currentPage} of {totalPages}</strong>
      </span>

      {/* Pagination buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`dots-${i}`} className="px-2 text-gray-500">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-sm rounded-md border transition ${
                p === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:bg-blue-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}