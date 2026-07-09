// Form values type
export interface User {
  id: number;
 
  email: string;
  role?: string; // Optional role property
  // Add other user properties as needed
  // For example:
 
  firstName?: string;
  lastName?: string;
  // profilePictureUrl?: string;
  // isActive?: boolean;
  // createdAt?: string; // ISO date string
  // updatedAt?: string; // ISO date string
  // Add other user properties as needed
}
export type FilterFormValues = {
  month: string;
  year: string;
  area: string;
  compile_type:string;
iteration:string;
};



// Tab type
export type ReportTab = {
  id: string;
  label: string;
  dataTab: string;
};

// API response type


export type InflationReport = {
  id: string;
  month: string;
  year: string;
  lastUpdated: string;
} & ({
  category: string;
  indexValue: number;
  monthlyChange: number;
  yearlyChange: number;
} | {
  state: string;
  indexValue: number;
  monthlyChange: number;
});

export interface TabContentProps {
  activeTab: string;
  isLoading: boolean;
  tableData: InflationReport[] | null;
  error?: string | null;
}

// Add this to your existing types
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

// Props types
export type FilterFormProps = {
  onSubmit: (data: FilterFormValues) => void;
};

export type ReportTabsProps = {
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
