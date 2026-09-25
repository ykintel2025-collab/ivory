"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useT } from "@/lib/i18n/client";

const COLORS: Record<string, string> = {
  Hoog: "#8B3A3A",
  Midden: "#B8863A",
  Laag: "#3E6B52",
};

export default function RiskDonutChart({
  hoog,
  midden,
  laag,
}: {
  hoog: number;
  midden: number;
  laag: number;
}) {
  const data = [
    { name: "Hoog", value: hoog },
    { name: "Midden", value: midden },
    { name: "Laag", value: laag },
  ].filter((d) => d.value > 0);

  const total = hoog + midden + laag;
const tr = useT();

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-ink/40">
        {tr("Nog geen risico's geregistreerd.")}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E4DCC8",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {[
          { label: "Hoog", value: hoog, color: COLORS.Hoog },
          { label: "Midden", value: midden, color: COLORS.Midden },
          { label: "Laag", value: laag, color: COLORS.Laag },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-ink/70">{tr(item.label)}</span>
            <span className="font-medium text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
