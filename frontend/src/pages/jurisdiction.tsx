// import React, { useState } from "react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
// import { DataTable } from "../components/data_table/DataTable";
// import { jurisdictionColumns } from "../utils/columns/jurisdiction";



// const tabsList = [
//  "state",
//     "district",
//     "subdistrict",
//     "market",
//     "town",
//     "village",
// ];





// const items = {
//   country: [
//     { id: 1, name: "India", code: "IN" },
//     { id: 2, name: "USA", code: "US" },
//   ],
//   state: [
//     { id: 1, name: "Karnataka", country: "India", code: "KA" },
//     { id: 2, name: "California", country: "USA", code: "CA" },
//   ],
//   district: [
//     { id: 1, name: "Bangalore", state: "Karnataka", code: "BLR" },
//     { id: 2, name: "San Francisco", state: "California", code: "SF" },
//   ],
//   town: [
//     { id: 1, name: "BTM", district: "Bangalore", code: "BTM" },
//     { id: 2, name: "Mission", district: "San Francisco", code: "MIS" },
//   ],
//   village: [
//     { id: 1, name: "Halli", district: "Bangalore", code: "HAL" },
//     { id: 2, name: "Greenfield", district: "San Francisco", code: "GRF" },
//   ],
// };

// const Jurisdiction: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<keyof typeof items>("country");

//   return (
//     <div className="bg-white p-3 rounded-xl shadow-lg">
//       <h1 className="text-2xl font-semibold mb-4">Jurisdiction Data</h1>

//       <Tabs defaultValue="country" onValueChange={(val) => setActiveTab(val as any)}>
//         <TabsList>
//           {Object.keys(items).map((key) => (
//             <TabsTrigger key={key} value={key}>
//               {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
//             </TabsTrigger>
//           ))}
//         </TabsList>

//         {(Object.keys(items) as Array<keyof typeof items>).map((key) => {
//           const data = items[key];
//           const columns = jurisdictionColumns[key];

//           return (
//             <TabsContent key={key} value={key}>
//               <DataTable data={data} columns={columns} title={key} />
//             </TabsContent>
//           );
//         })}
//       </Tabs>
//     </div>
//   );
// };

// export default Jurisdiction;

import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { DataTable } from "../components/data_table/datatable1";

import AddData from "../components/model/AddData";
import { useAppDispatch, useAppSelector } from "../app/store";
import { fetchJurisdiction  } from "../features/base_item/baseSlice";



const tabsList = [
 "state",
    "district",
    "subdistrict",
    "market",
    "town",
    "village",
];

const Jurisdiction: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabsList[0] as string) ;
  const [dataType] = useState("");


  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector((state) => state.base);

  // console.log("baseData:", baseData);

  // Fetch data when tab changes
 useEffect(() => {
  console.log("Fetching data for tab:", activeTab, "with dataType:", dataType);
  dispatch(fetchJurisdiction ({ tab: activeTab}));


}, [activeTab, dataType, dispatch]);




  const dynamicColumns = useMemo(() => {
    const bd: any = baseData;
    const colsSource = Array.isArray(bd)
      ? bd?.[0]?.data?.columns
      : bd?.data?.columns;
  
    if (!colsSource) return [];
  
    return colsSource.map((col: string) => ({
      accessorKey: col,
      header: col
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [baseData]);

  const tableData = useMemo(() => {
    if (!baseData) return [];
    const bd: any = baseData;
    if (Array.isArray(bd)) return bd[0]?.data?.data ?? [];
    return bd?.data?.data ?? [];
  }, [baseData]);
  const handleAddRow = (newRow: any) => {
    // Logic to add the new row to the table data
    console.log("New row added:", newRow);
  }
  const handleBulkUploadErrors = (errors: any) => {
    // Logic to handle bulk upload errors
    console.log("Bulk upload errors:", errors);
  }

  return (
    <div className="bg-white p-3 rounded-xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Jurisdiction Data</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {tabsList.map((key) => (
              <TabsTrigger key={key} value={key}>
                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </TabsTrigger>
            ))}
          </TabsList>
          <AddData columns={dynamicColumns} onAddRow={handleAddRow}  onBulkUploadErrors={handleBulkUploadErrors} />
        </div>

        {tabsList.map((key) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                    data={tableData || []}
                    columns={dynamicColumns}
                    title={key} action={{
                      edit: true,
                      delete: true
                    }}              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Jurisdiction;
