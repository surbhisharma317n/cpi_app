import { useState } from 'react';
import { fetchInflationReports, type InflationReportParams } from '../api/inflationReports';
import type { InflationReport } from '../types';


interface UseInflationReportsReturn {
  fetchReports: (params: InflationReportParams) => Promise<void>;
  isLoading: boolean;
  tableData: InflationReport[] | null;
  error: string | null;
}

const useInflationReports = (): UseInflationReportsReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tableData, setTableData] = useState<InflationReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async (params: InflationReportParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchInflationReports(params);
      setTableData(data);
    } catch (err) {
      setError('Failed to fetch reports. Please try again.');
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchReports,
    isLoading,
    tableData,
    error
  };
};

export default useInflationReports;