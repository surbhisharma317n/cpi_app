import React from "react";
import type { ReportTab, ReportTabsProps } from "../../types";

const tabs: ReportTab[] = [
  { id: "tab1", label: "Weighted", dataTab: "weighted_PDS_and_HR_index" },
  { id: "tab2", label: "State", dataTab: "urban_price_index" },
  { id: "tab3", label: "tab3", dataTab: "tab3" },
  { id: "tab4", label: "tab4", dataTab: "tab4" },
  { id: "tab5", label: "tab5", dataTab: "tab5" },
  { id: "tab6", label: "tab6", dataTab: "tab6" },
  // ... other tabs
];

const ReportTabs: React.FC<ReportTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <ul className="flex flex-wrap -mb-px">
      {tabs.map((tab) => (
        <li key={tab.id} className="mr-2">
          <button
            className={`inline-block p-4 border-b-2 rounded-t-lg ${
              activeTab === tab.id
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 hover:text-gray-600 hover:border-gray-300"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ReportTabs;
