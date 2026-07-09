import React from "react";
import { MapContainer, TileLayer, Polygon, Popup } from "react-leaflet";

interface Village {
  name: string;
  coords: [number, number][];
}

interface Town {
  name: string;
  coords?: [number, number][];
  villages?: Village[];
}

interface District {
  name: string;
  coords?: [number, number][];
  towns?: Town[];
}

interface StateData {
  name: string;
  coords?: [number, number][];
  districts: District[];
}

// ---------------- Dummy Data ----------------
const geoData: StateData[] = [
  {
    name: "Andhra Pradesh",
    districts: [
      {
        name: "Guntur",
        coords: [
          [16.30, 80.25],
          [16.40, 80.30],
          [16.35, 80.40],
          [16.25, 80.35],
          [16.30, 80.25],
        ],
        towns: [
          {
            name: "Town A",
            coords: [
              [16.32, 80.27],
              [16.33, 80.28],
              [16.31, 80.29],
              [16.32, 80.27],
            ],
            villages: [
              {
                name: "Village 1",
                coords: [
                  [16.321, 80.271],
                  [16.322, 80.272],
                  [16.321, 80.273],
                  [16.321, 80.271],
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Telangana",
    districts: [
      {
        name: "Hyderabad",
        coords: [
          [17.35, 78.45],
          [17.40, 78.55],
          [17.30, 78.60],
          [17.25, 78.50],
          [17.35, 78.45],
        ],
      },
    ],
  },
];

// ---------------- Leaflet Map Component ----------------
const LeafletMap: React.FC = () => {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow">
      <MapContainer center={[17, 80]} zoom={6} scrollWheelZoom className="w-full h-full">
        {/* Street Map */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Render States / Districts / Towns / Villages */}
        {geoData.map((state) =>
          state.districts.map((district) => (
            <Polygon
              key={district.name}
              positions={district.coords || []}
              pathOptions={{ color: "blue", fillOpacity: 0.2 }}
            >
              <Popup>{district.name}</Popup>
            </Polygon>
          ))
        )}

        {geoData.map((state) =>
          state.districts.map((district) =>
            district.towns?.map((town) =>
              town.coords ? (
                <Polygon
                  key={town.name}
                  positions={town.coords}
                  pathOptions={{ color: "green", fillOpacity: 0.3 }}
                >
                  <Popup>{town.name}</Popup>
                </Polygon>
              ) : null
            )
          )
        )}

        {geoData.map((state) =>
          state.districts.map((district) =>
            district.towns?.map((town) =>
              town.villages?.map((village) => (
                <Polygon
                  key={village.name}
                  positions={village.coords}
                  pathOptions={{ color: "orange", fillOpacity: 0.5 }}
                >
                  <Popup>{village.name}</Popup>
                </Polygon>
              ))
            )
          )
        )}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
