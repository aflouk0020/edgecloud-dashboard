import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function formatChartTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="monitoring-chart-tooltip">
      <span>{formatChartTime(label)}</span>

      <strong>
        {payload[0].value}
        {unit}
      </strong>
    </div>
  );
}

export default function HistoricalLineChart({
  title,
  description,
  data,
  dataKey,
  unit = "",
  lineColour = "#2563eb",
  valueLabel,
  domain
}) {
  return (
    <article className="monitoring-chart-card">
      <div className="monitoring-chart-header">
        <div>
          <p className="monitoring-chart-label">{valueLabel}</p>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>

        <div className="monitoring-chart-live-indicator">
          <span className="monitoring-chart-live-dot"></span>
          Historical
        </div>
      </div>

      <div className="monitoring-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 16,
              right: 18,
              left: -8,
              bottom: 4
            }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="recordedAt"
              tickFormatter={formatChartTime}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{
                fill: "#64748b",
                fontSize: 12
              }}
            />

            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "#64748b",
                fontSize: 12
              }}
              width={48}
            />

            <Tooltip
              content={
                <CustomTooltip unit={unit} />
              }
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColour}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                strokeWidth: 3,
                fill: "#ffffff"
              }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
