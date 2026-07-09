import type { InflationReport } from "../types";



// Type for API request parameters
export type InflationReportParams = {
  month: string;
  year: string;
  area?: string;
  reportType: string;
};

// Generate dummy data based on parameters
const generateDummyData = (params: InflationReportParams): InflationReport[] => {
  const { month, year, reportType } = params;
  const baseData = {
    month,
    year,
    lastUpdated: new Date().toISOString(),
  };

  // Data for different report types
  const reportData: Record<string, InflationReport[]> = {
    weighted_PDS_and_HR_index: [
      {
        id: '1',
        ...baseData,
        category: 'Food',
        indexValue: 145.2,
        monthlyChange: 0.8,
        yearlyChange: 5.2,
      },
      {
        id: '2',
        ...baseData,
        category: 'Fuel',
        indexValue: 178.6,
        monthlyChange: 1.2,
        yearlyChange: 12.5,
      },
    ],
    urban_price_index: [
      {
        id: '1',
        ...baseData,
        state: 'Maharashtra',
        indexValue: 142.3,
        monthlyChange: 0.7,
      },
      {
        id: '2',
        ...baseData,
        state: 'Tamil Nadu',
        indexValue: 138.9,
        monthlyChange: 0.5,
      },
    ],
    // Add data for other report types...
  };

  return reportData[reportType] || [
    {
      id: '1',
      ...baseData,
      category: 'General',
      indexValue: 140.0,
      monthlyChange: 0.6,
      yearlyChange: 6.0,
    },
  ];
};

// Mock API call
export const fetchInflationReports = async (
  params: InflationReportParams
): Promise<InflationReport[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return generateDummyData(params);
};