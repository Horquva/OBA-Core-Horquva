import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
}

export default function Sparkline({ data, color = "#6366f1" }: SparklineProps) {
  const chartData = data.map((val, i) => ({ value: val, index: i }));
  
  // Calculate domain to give some padding
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.1;

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
