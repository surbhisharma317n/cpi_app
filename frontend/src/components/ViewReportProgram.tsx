import { useState } from "react";

import ProgramTabs from "./compilation/ProgramTabs";
import OutputTableView from "./compilation/outputTableView";
import ApprovalSection from "./approval_section";

export default function ViewReportProgram() {
  const [activeProgram, setActiveProgram] = useState("rural_price_index");
  const [activeComprehensiveTab] = useState("state_section_ru_indices");
  const [activeAllIndiaTab] = useState("all_india_section_index");
  const [activeInflationTab] = useState("item_inflation_data");
  const [isLoading] = useState(false);

  return (
    <div className="max-w-full mx-auto">
      <div className="bg-white rounded-lg shadow-lg">

        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-xl font-semibold text-gray-800">
            Compilation Reports
          </h4> 
        </div>

        {/* Content */}
        <div className="p-1 space-y-3">

          {/* Program Tabs */}
          <ProgramTabs
            activeProgram={activeProgram}
            setActiveProgram={setActiveProgram}
          />

          {/* Output Table */}
          <OutputTableView
            isLoading={isLoading}
            activeProgram={activeProgram}
            activeComprehensiveTab={activeComprehensiveTab}
            activeAllIndiaTab={activeAllIndiaTab}
            activeInflationTab={activeInflationTab}
          />

          {/* Pagination */}
          <PaginationSection />

          {/* Approval Section */}
          <ApprovalSection />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Sub Components                                */
/* -------------------------------------------------------------------------- */

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function PaginationSection() {
  return (
    <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200">

      {/* Mobile */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button className="page-btn">Previous</button>
        <button className="page-btn ml-3">Next</button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">10</span> of{" "}
          <span className="font-medium">20</span> results
        </p>

        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <PageNavButton direction="prev" />
          <PageNumber number={1} active />
          <PageNumber number={2} />
          <PageNumber number={3} />
          <PageNavButton direction="next" />
        </nav>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Helper Components                              */
/* -------------------------------------------------------------------------- */

function PageNumber({ number, active }: { number: number; active?: boolean }) {
  return (
    <button
      className={
        active
          ? "z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
      }
    >
      {number}
    </button>
  );
}

function PageNavButton({ direction }: { direction: "prev" | "next" }) {
  const isPrev = direction === "prev";

  return (
    <button
      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
        isPrev ? "rounded-l-md" : "rounded-r-md"
      }`}
    >
      <span className="sr-only">{isPrev ? "Previous" : "Next"}</span>

      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d={
            isPrev
              ? "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              : "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          }
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
