import type { Tab } from "./types";


const programTabs: Tab[] = [
  { id: 'tab1', label: 'Program1', value: 'rural_price_index' },
  { id: 'tab2', label: 'Program2', value: 'urban_price_index' },
  { id: 'tab3', label: 'Program3', value: 'weighted_PDS_and_HR_index' },
  { id: 'tab4', label: 'Program4', value: 'comprehensive_indices' },
  { id: 'tab5', label: 'Program5', value: 'all_india_indices' },
  { id: 'tab6', label: 'Inflation', value: 'inflation' },
];

export default function ProgramTabs({ 
  activeProgram, 
  setActiveProgram 
}: { 
  activeProgram: string;
  setActiveProgram: (program: string) => void;
}) {
  return (
    <div className="border-b border-gray-200 mb-6">
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    {/* Tabs Section */}
    <div className="w-full overflow-x-auto">
      <div className="flex space-x-2 pb-1 min-w-max">
        {programTabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeProgram === tab.value 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveProgram(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>

    {/* Export Button */}
    <div className="shrink-0">
      <button
        title="Export in Excel"
        id="export_all"
        className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export All
      </button>
    </div>
  </div>
</div>
  );
}