// src/components/GeoMap.tsx
import React, { useEffect, useState } from "react";

// ------------------ Types ------------------
interface GeoJsonPolygon {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

interface District {
  district: string;
  geoJson?: GeoJsonPolygon;
}

interface StateData {
  state: string;
  districts: District[];
}

interface GeoData {
  states: StateData[];
}

// ------------------ Dummy Data ------------------
const dummyGeoData: GeoData = {
  states: [
    {
      state: "Andhra Pradesh",
      districts: [
        {
          district: "Guntur",
          geoJson: {
            type: "Polygon",
            coordinates: [
              [
                [80.25, 16.30],
                [80.30, 16.40],
                [80.40, 16.35],
                [80.35, 16.25],
                [80.25, 16.30], // close polygon
              ],
            ],
          },
        },
        {
          district: "Krishna",
          geoJson: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [81.00, 16.20],
                  [81.10, 16.30],
                  [81.20, 16.25],
                  [81.15, 16.15],
                  [81.00, 16.20],
                ],
              ],
              [
                [
                  [81.30, 16.40],
                  [81.40, 16.45],
                  [81.50, 16.35],
                  [81.30, 16.40],
                ],
              ],
            ],
          },
        },
      ],
    },
    {
      state: "Telangana",
      districts: [
        {
          district: "Hyderabad",
          geoJson: {
            type: "Polygon",
            coordinates: [
              [
                [78.45, 17.35],
                [78.55, 17.40],
                [78.60, 17.30],
                [78.50, 17.25],
                [78.45, 17.35],
              ],
            ],
          },
        },
      ],
    },
  ],
};

// ------------------ Component ------------------
const GeoMap: React.FC = () => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [bounds, setBounds] = useState<number[][] | null>(null);

  // Load dummy data
  useEffect(() => {
    setGeoData(dummyGeoData);
  }, []);

  // Calculate bounds
  useEffect(() => {
    if (geoData) {
      calculateBoundsFromDistricts(geoData);
    }
  }, [geoData]);

  const calculateBoundsFromDistricts = (geoData: GeoData) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    geoData.states.forEach((state) => {
      state.districts.forEach((district) => {
        if (!district.geoJson) return;

        const { type, coordinates } = district.geoJson;

        const polygons =
          type === "Polygon"
            ? [coordinates as number[][][]]
            : (coordinates as number[][][][]);

        polygons.forEach((polygon) => {
          polygon.forEach((ring) => {
            ring.forEach(([x, y]) => {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            });
          });
        });
      });
    });

    if (minX === Infinity || minY === Infinity) return;

    setBounds([
      [minX, minY],
      [maxX, maxY],
    ]);
  };

  const project = (x: number, y: number) => {
    if (!bounds) return [0, 0];
    const [[minX, minY], [maxX, maxY]] = bounds;

    const width = 800;
    const height = 600;

    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);

    return [(x - minX) * scaleX, height - (y - minY) * scaleY];
  };

  const renderPolygon = (
    coordinates: number[][][],
    state: string,
    district: string
  ) => {
    const pathData = coordinates
      .map((ring) =>
        ring
          .map(([x, y], i) => {
            const [px, py] = project(x, y);
            return `${i === 0 ? "M" : "L"} ${px} ${py}`;
          })
          .join(" ") + " Z"
      )
      .join(" ");

    return (
      <path
        key={`${state}-${district}`}
        d={pathData}
        className="fill-blue-400 stroke-white hover:fill-blue-600 cursor-pointer transition"
      >
        <title>{`${district}, ${state}`}</title>
      </path>
    );
  };

  const renderMap = () => {
    if (!geoData || !bounds) return null;

    return geoData.states.map((state) =>
      state.districts.map((district) => {
        if (!district.geoJson) return null;

        const { type, coordinates } = district.geoJson;

        if (type === "Polygon") {
          return renderPolygon(coordinates as number[][][], state.state, district.district);
        } else if (type === "MultiPolygon") {
          return (coordinates as number[][][][]).map((polygon, i) =>
            renderPolygon(polygon, state.state, `${district.district}-${i}`)
          );
        }
        return null;
      })
    );
  };

  return (
    <div className="w-full flex justify-center items-center bg-gray-50 p-4 rounded-lg shadow">
      {bounds ? (
        <svg viewBox={`0 0 800 600`} className="w-full max-w-4xl h-auto">
          {renderMap()}
        </svg>
      ) : (
        <p className="text-gray-600">Loading map...</p>
      )}
    </div>
  );
};

export default GeoMap;
