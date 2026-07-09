import { useState } from "react";
import ItemTableView from "./ItemTableView";

export default function ApprovalProgram() {
  const [activeProgram] = useState("rural_price_index");
  const [activeComprehensiveTab] = useState(
    "state_section_ru_indices"
  );
  const [activeAllIndiaTab] = useState(
    "all_india_section_index"
  );
  const [activeInflationTab] = useState(
    "item_inflation_data"
  );
  const [isLoading] = useState(false);

  return (
    <div className=" max-w-full mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header Section */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-xl font-semibold text-gray-800">
            Compilation Program List
          </h4>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col">
          {/* Form Section */}
          {/* <div className="p-6">
          <CompilationForm setIsLoading={setIsLoading} />
          <div className="text-red-500 mt-2" id="error-message"></div>
        </div> */}

          {/* Program Tabs Section */}
          <div className="p-1">
            <div className="mt-0">
              {/* Table Section */}
              <div className="mt-0">
                <ItemTableView
                  isLoading={isLoading}
                  activeProgram={activeProgram}
                  activeComprehensiveTab={activeComprehensiveTab}
                  activeAllIndiaTab={activeAllIndiaTab}
                  activeInflationTab={activeInflationTab}
                />

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      Previous
                    </button>
                    <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">1</span> to{" "}
                        <span className="font-medium">10</span> of{" "}
                        <span className="font-medium">20</span> results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                          <span className="sr-only">Previous</span>
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          aria-current="page"
                          className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        >
                          1
                        </button>
                        <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                          2
                        </button>
                        <button className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                          3
                        </button>
                        <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                          <span className="sr-only">Next</span>
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="sr-only">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
