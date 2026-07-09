// src/components/ChartView.tsx
import {
  Treemap,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

type DataNode = {
  name: string;
  code: string;
  index: number;
  weight: number;
  children?: DataNode[];
};

interface ChartViewProps {
  data: DataNode[];
  onClick: (node: DataNode) => void;
}

export default function ChartView({ data, onClick }: ChartViewProps) {
  return (
    <div className="h-96 bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Comparison</h2>
      <ResponsiveContainer width="100%" height="90%">
        {data.length > 3 ? (
          <Treemap
            data={data}
            dataKey="weight"
            stroke="#fff"
            fill="#8884d8"
            onClick={(d) => onClick(d as any)}
          >
            <ReTooltip
              content={({ payload }:any) => {
                if (payload && payload[0]) {
                  const node = payload[0].payload as DataNode;
                  return (
                    <div className="bg-white p-2 shadow rounded text-sm">
                      <div>
                        <strong>{node.name}</strong>
                      </div>
                      <div>Index: {node.index}</div>
                      <div>Weight: {node.weight}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </Treemap>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <ReTooltip />
            <Bar dataKey="index" fill="#82ca9d" />
            <Bar dataKey="weight" fill="#8884d8" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
