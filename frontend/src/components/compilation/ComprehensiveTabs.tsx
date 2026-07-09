import type { Tab } from "./types";


const comprehensiveTabs: Tab[] = [
  { id: 'tab1', label: 'SSRU', value: 'state_section_ru_indices' },
  { id: 'tab2', label: 'S.Sub.RU', value: 'state_subgroup_ru_indices' },
  // Add all other comprehensive tabs here
];

export default function ComprehensiveTabs({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="mt-0">
      <div className="nav-tabs-container mt-2">
        <ul className="nav nav-pills flex-wrap overflow-auto gap-1 pb-2">
          {comprehensiveTabs.map(tab => (
            <li key={tab.id} className="nav-item">
              <button
                className={`nav-link childTabs px-3 py-1 rounded-md ${activeTab === tab.value ? 'bg-blue-800 text-white' : 'bg-gray-200'}`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}