import { useState, useRef, useEffect } from "react";
import ChartView from "./chart_view";

import LeafletMap from "./googlMap";

// ------------------- TOPOJSON URLs -------------------
const INDIA_TOPOJSON =
  "https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/refs/heads/master/states-and-districts.json";

const DISTRICT_MAPS: Record<string, string> = {
  Maharashtra:
    "https://cdn.jsdelivr.net/npm/india-states-and-districts@1.0.0/maharashtra-districts.json",
  Karnataka:
    "https://cdn.jsdelivr.net/npm/india-states-and-districts@1.0.0/karnataka-districts.json",
};

// ------------------- Example Hierarchical Data -------------------
export type DataNode = {
  name: string;
  code: string;
  index: number;
  weight: number;
  children?: DataNode[];
};

const data: DataNode[] = [
  {
    name: "Maharashtra",
    code: "MH",
    index: 120,
    weight: 80,
    children: [
      {
        name: "Mumbai",
        code: "MUM",
        index: 130,
        weight: 40,
        children: [
          {
            name: "Town A",
            code: "TA",
            index: 140,
            weight: 20,
            children: [
              {
                name: "Village X",
                code: "VX",
                index: 160,
                weight: 12,
                children: [
                  { name: "Item Rice", code: "R", index: 170, weight: 6 },
                  { name: "Item Wheat", code: "W", index: 180, weight: 6 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Karnataka",
    code: "KA",
    index: 110,
    weight: 70,
    children: [
      {
        name: "Bengaluru",
        code: "BLR",
        index: 115,
        weight: 50,
      },
    ],
  },
];

// Custom FadeIn component to replace motion.div
const FadeIn = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-400 ease-in-out ${className} ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      {children}
    </div>
  );
};

export default function GeoDrillExplorer() {
  const [currentData, setCurrentData] = useState<DataNode[]>(data);
  console.log("Current Data:", currentData);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(["India"]);
  const [, setGeoUrl] = useState(INDIA_TOPOJSON);
  const [isLoading, setIsLoading] = useState(false);

  const handleClickNode = (node: DataNode) => {
    if (node.children) {
      setIsLoading(true);
      setCurrentData(node.children);
      setBreadcrumbs((prev) => [...prev, node.name]);

      if (DISTRICT_MAPS[node.name]) {
        setGeoUrl(DISTRICT_MAPS[node.name]);
      }

      // Simulate loading completion
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handleBack = (index: number) => {
    if (breadcrumbs.length > 1 && index > 0 && index < breadcrumbs.length) {
      const newTrail = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newTrail);

      let newData: DataNode[] = data;
      for (let i = 1; i < newTrail.length; i++) {
        newData = newData.find((d) => d.name === newTrail[i])?.children || [];
      }
      setCurrentData(newData);

      if (newTrail.length === 1) {
        setGeoUrl(INDIA_TOPOJSON);
      } else {
        const lastCrumb = newTrail[newTrail.length - 1];
        if (DISTRICT_MAPS[lastCrumb]) {
          setGeoUrl(DISTRICT_MAPS[lastCrumb]);
        }
      }
    }
  };

  const handleReset = () => {
    setIsLoading(true);
    setCurrentData(data);
    setBreadcrumbs(["India"]);
    setGeoUrl(INDIA_TOPOJSON);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Geographical Data Explorer
        </h1>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reset to India
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm">
        <span className="font-medium">Navigation:</span>
        {breadcrumbs.map((crumb, idx) => (
          <button
            key={idx}
            onClick={() => handleBack(idx)}
            className={`px-2 py-1 rounded ${idx === breadcrumbs.length - 1 ? "bg-blue-100 text-blue-800 font-medium" : "hover:bg-gray-100"}`}
          >
            {crumb}
            {idx < breadcrumbs.length - 1 && " → "}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      )}

      {/* Main content */}
      {!isLoading && (
        <FadeIn className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Map View</h2>
            {/* <GeoMap geoUrl={geoUrl} data={currentData} onClick={handleClickNode} /> */}
            {/* <GeoMap  />
             */}
            <LeafletMap />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Data Visualization</h2>
            <ChartView data={currentData} onClick={handleClickNode} />
          </div>
        </FadeIn>
      )}

      {/* Data summary */}
      {!isLoading && (
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Current Level Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Regions</p>
              <p className="text-xl font-bold">{currentData.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Avg. Index</p>
              <p className="text-xl font-bold">
                {Math.round(
                  currentData.reduce((sum, node) => sum + node.index, 0) /
                    currentData.length
                )}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Weight</p>
              <p className="text-xl font-bold">
                {currentData.reduce((sum, node) => sum + node.weight, 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Depth</p>
              <p className="text-xl font-bold">{breadcrumbs.length - 1}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
