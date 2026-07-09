import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ComponentType,
} from "react";

import {
  TreePine,
  Building2,
  Store,
  Home,
  Zap,
  Plane,
  ShoppingCart,
  Landmark,
  Phone,
  Fuel,
  Train,
  Flame,
} from "lucide-react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";

import { DataTable } from "../../components/data_table/datatable1";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchInputPriceItem } from "../../features/input_data/inputReportSlice";
//import dropDownField from "../../components/ui/Form/dropdownField";
// import SelectFilter from "../../components/ui/Form/SelectFilter";
import SelectFilter from "../../components/ui/Form/SelectFilter - New"
import { capiService } from "../../api/endpoints/capi_data/index";
interface TabItem {
  label: string;
  value: string;
  icon: ComponentType<any>;
}


type Option = {
  label: string;
  value: string | number;
};

type DropDownField = {
  [key: string]: {
    label: string;
    options: Option[];
  };
};
const Input_capi_report: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseData, loading, error } = useAppSelector(
    (state) => state.inputReport
  );

  /* ---------------- STATE ---------------- */

  //const [regionTab, setRegionTab] = useState<"rural" | "urban">("rural");
 const [regionTab, setRegionTab] = useState<"rural" | "urban" | "administrative">("rural");

  // ✅ store tab per region
  const [activeTabsByRegion, setActiveTabsByRegion] = useState({
    rural: "rural_item_price",
    urban: "urban_item_price",
    administrative:"administrative_item_price",
  });

  
  //const [rawFilterData, setRawFilterData] = useState<any[]>([]);
  type FilterItem = {
  year: string;
  month: string;
  month_name: string;
  status: string;
};

const [rawFilterData, setRawFilterData] = useState<FilterItem[]>([]);
  /*New <code>*/
  const [filterFields, setFilterFields] = useState<DropDownField>({
  year: {
    label: "Year",
    
    options: [
      { label: "2024", value: "2024" },
      { label: "2025", value: "2025" },
      { label: "2026", value: "2026" },
    ],
  },

  month: {
    label: "Month",
    options: [],
  },

  compile_type: {
    label: "Compile Type",
    options: [
      { label: "Provisional", value: "P" },
      { label: "Final", value: "F" },
    ],
  },
});
  /*end code*/
// const [filterFields, setFilterFields] = useState<DropDownField>({
//   year: { label: "Year", options: [] },
//   month: { label: "Month", options: [] },
//   compile_type: {
//     label: "Compile Type",
//     options: [
//       { label: "Provisional", value: "P" },
//       { label: "Final", value: "F" },
//     ],
//   },
// });


  const activeTab = activeTabsByRegion[regionTab];

  // const now = new Date();
  // now.setMonth(now.getMonth() - 1);

  // const [dataType, setDataType] = useState({
  //   month: now.toLocaleString("en-US", { month: "short" }),
  //   year: now.getFullYear(),
  //   compile_type: "Provisional",
  // });

  const now = new Date();
now.setMonth(now.getMonth() - 1);
// ✅ Remove the now/setMonth logic — DB decides the default
const [dataType, setDataType] = useState<{
  month: string;
  year: string;
  compile_type: string;
} | null>(null);   // ← null means "not ready yet"

// const [dataType, setDataType] = useState({
//   month: String(now.getMonth() + 1).padStart(2, "0"), // ✅ correct format (01,02)
//   year: String(now.getFullYear()),
//   compile_type: "P",
// });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  /* ---------------- TABS ---------------- */
  const ruralTabs: TabItem[] = [
    { label: "Market Prices", value: "rural_item_price", icon: Store },
    { label: "House Rent", value: "rural_house_rent", icon: Home },
    { label: "Electricity", value: "rural_electricity", icon: Zap },
    //  { label: "LPG Prices", value: "lpg", icon: Flame },
    { label: "PDS Price", value: "rural_pds_price", icon: Landmark },
    //  { label: "Telecom", value: "telecom", icon: Phone },
  ];

  const urbanTabs: TabItem[] = [
    { label: "Market Prices", value: "urban_item_price", icon: Store },
    { label: "House Rent", value: "urban_house_rent", icon: Home },
    { label: "Electricity", value: "urban_electricity", icon: Zap },
    { label: "Online Market", value: "online_shopping", icon: ShoppingCart },
    { label: "Airfare Prices", value: "airfare", icon: Plane },
    // { label: "PDS Price", value: "pds_price", icon: Landmark },
    { label: "PDS Price", value: "urban_pds_price", icon: Landmark },
    // { label: "Petrol", value: "petrol", icon: Fuel },
    // { label: "Diesel", value: "diesel", icon: Fuel },
    // { label: "CNG", value: "cng", icon: Fuel },
    // { label: "PNG", value: "png", icon: Fuel },
    // { label: "Metro", value: "metro", icon: Train },
    // { label: "Rail Fare", value: "railfare", icon: Train },
    // { label: "Telecom", value: "telecom", icon: Phone },
  ];


  const administrativeTabs: TabItem[] = [
  { label: "Petrol", value: "petrol", icon: Fuel },
  { label: "Diesel", value: "diesel", icon: Fuel },
  { label: "CNG", value: "cng", icon: Fuel },
  { label: "PNG", value: "png", icon: Fuel },
  { label: "LPG", value: "lpg", icon: Flame },
  { label: "Metro", value: "metro", icon: Train },
  { label: "Rail Fare", value: "railfare", icon: Train },
  { label: "Telecom", value: "telecom", icon: Phone },
  { label: "Postal", value: "postal", icon: Landmark },
  { label: "OTT", value: "ott", icon: Landmark },
];

  //const currentTabs = regionTab === "rural" ? ruralTabs : urbanTabs;

  const currentTabs =
  regionTab === "rural"
    ? ruralTabs
    : regionTab === "urban"
    ? urbanTabs
    : administrativeTabs;

  /* ---------------- HANDLE TAB CHANGE ---------------- */
  const handleTabChange = (val: string) => {
    setActiveTabsByRegion((prev) => ({
      ...prev,
      [regionTab]: val,
    }));
  };

  /* ---------------- RESET PAGE ---------------- */
  useEffect(() => {
     if (!dataType) return;
    setCurrentPage(1);
  }, [activeTab, dataType]);

 // ✅ ADD THIS USEEFFECT HERE
 useEffect(() => {
  const fetchFilters = async () => {
    try {
      const data: any = await capiService.getFilters();
      
      const years = [...new Set(data.map((d: any) => String(d.year)))]
        .sort((a, b) => Number(b) - Number(a));

      setFilterFields({
        year: {
          label: "Year",
          options: years.map((y) => ({ label: y, value: y }) as Option),
        },
        month: { label: "Month", options: [] },
        compile_type: {
          label: "Compile Type",
          options: [
            { label: "Provisional", value: "P" },
            { label: "Final", value: "F" },
          ] as Option[],
        },
      });

      // ✅ set AFTER filterFields so SelectFilter fires with years ready
      setRawFilterData(data);

    } catch (err) {
      console.error("Filter fetch error:", err);
    }
  };

  fetchFilters();
}, []);
//  useEffect(() => {
//   //fetch("http://localhost:8000/api/filter/")
//   fetch("http://0.0.0.0:8000/api/filter/")
//     .then((res) => {
//       if (!res.ok) throw new Error("API failed");
//       return res.json();
//     })
//     .then((data) => {
//       console.log("Filter API data:", data); // ✅ add this line
//       setRawFilterData(data);

//     //  const years = [...new Set(data.map((d: any) => String(d.year)))] as string[];
//       // const years = ["2024", "2025", "2026"];
//       const years = [...new Set(data.map((d: FilterItem) => String(d.year)))]
//       .sort((a, b) => Number(b) - Number(a));
//       setFilterFields({
//         year: {
//           label: "Year",
//           options: years.map((y) => ({ label: y, value: y })) as Option[],
//         },
//         month: { label: "Month", options: [] },
//         compile_type: {
//           label: "Compile Type",
//           options: [
//             { label: "Provisional", value: "P" },
//             { label: "Final", value: "F" },
//           ] as Option[],
//         },
//       });
//     }) .catch((err) => console.error("Filter API error:", err));
//   }, []);
  //  setFilterFields({
  // year: {
  //   label: "Year",
  //   options: years.map((y: string) => ({
  //     label: y,
  //     value: y,
  //   })),
  // },
  //month: { label: "Month", options: [] },

//   // ✅ ADD THIS
//   compile_type: {
//     label: "Compile Type",
//     options: [
//       { label: "Provisional", value: "P" },
//       { label: "Final", value: "F" },
//     ],
//   },
// });
//   })
//     .catch((err) => console.error("Filter API error:", err));
// }, []);

  /* ---------------- FETCH ---------------- */
  const fetchData = useCallback(() => {
     if (!dataType) return;
    dispatch(
      fetchInputPriceItem({
        tab: activeTab,
        dataType,
        page: currentPage,
        pageSize,
      })
    );
  }, [dispatch, activeTab, dataType, currentPage, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------- NORMALIZE ---------------- */
  const normalizedData = useMemo(() => {
    if (!baseData) return { columns: [], rows: [], totalPages: 1 };

    const bd: any = baseData;
    const block = Array.isArray(bd) ? bd[0]?.data : bd;

    return {
      columns: block?.columns || [],
      rows: block?.data || [],
      totalPages: block?.total_pages || 1,
    };
  }, [baseData]);

  useEffect(() => {
    setTotalPages(normalizedData.totalPages);
  }, [normalizedData.totalPages]);

  /* ---------------- COLUMNS ---------------- */
  const dynamicColumns = useMemo(() => {
    return normalizedData.columns.map((col: string) => ({
      accessorKey: col,
      header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }, [normalizedData.columns]);

  const tableData = useMemo(() => normalizedData.rows, [normalizedData.rows]);

  /* ---------------- FILTER ---------------- */
  const handleFilter = (filters: any) => {
     console.log("FILTER SENT 👉", filters);
    setDataType(filters);
    setCurrentPage(1);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 rounded-xl shadow-lg bg-gray-50">
      <div className="mb-6 flex justify-between bg-white rounded-2xl border px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          Price Input Data
        </h1>
      </div>

      {/* <SelectFilter fields={dropDownField} onFilter={handleFilter} /> */}

      <SelectFilter
      fields={filterFields}
      setFields={setFilterFields}  // ← Pass setFilterFields directly
      rawData={rawFilterData}
      onFilter={handleFilter}
       
      />

      {/* Region Toggle */}
      <div className="flex my-6 gap-4">
        <button
          onClick={() => setRegionTab("rural")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            regionTab === "rural"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <TreePine size={18} />
          Rural
        </button>

        <button
          onClick={() => setRegionTab("urban")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            regionTab === "urban"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Building2 size={18} />
          Urban
        </button>

       <button
       onClick={() => setRegionTab("administrative")}
       className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
       regionTab === "administrative"
       ? "bg-blue-600 text-white shadow-md"
       : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
       >
  <Landmark size={18} />
  Administrative
</button>

      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap gap-2 bg-white p-2 rounded-xl">
          {currentTabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                <Icon size={16} /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {currentTabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <DataTable
                data={tableData}
                columns={dynamicColumns}
                title={t.label}
                action={{ edit: false, delete: false }}
               // file_name={`${t.value}_${dataType.month}_${dataType.year}`}
               file_name={`${activeTab}_${dataType?.month ?? ""}_${dataType?.year ?? ""}`}
                serverPagination={{
                  currentPage,
                  totalPages,
                  pageSize,
                  setCurrentPage,
                  setPageSize,
                  fetchData,
                }}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Input_capi_report;