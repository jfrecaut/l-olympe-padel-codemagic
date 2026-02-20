import { StatsData } from '../../services/statsService';

interface StatsChartProps {
  data: StatsData[];
  type: 'bookings' | 'occupancy' | 'revenue';
  groupBy: 'day' | 'week' | 'month' | 'year';
}

export function StatsChart({ data, type, groupBy }: StatsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Aucune donnée disponible pour cette période
      </div>
    );
  }

  const getValue = (item: StatsData) => {
    switch (type) {
      case 'bookings':
        return item.bookings_count;
      case 'occupancy':
        return item.occupancy_rate;
      case 'revenue':
        return item.revenue;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'bookings':
        return 'Nombre de réservations';
      case 'occupancy':
        return "Taux d'occupation (%)";
      case 'revenue':
        return 'Chiffre d\'affaires (€)';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'bookings':
        return 'rgb(16, 185, 129)';
      case 'occupancy':
        return 'rgb(59, 130, 246)';
      case 'revenue':
        return 'rgb(245, 158, 11)';
    }
  };

  const formatDate = (date: string) => {
    if (groupBy === 'year') return date;
    if (groupBy === 'month') {
      const [year, month] = date.split('-');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    if (groupBy === 'week') {
      return `Sem. ${date}`;
    }
    const d = new Date(date + 'T00:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const formatValue = (value: number) => {
    if (type === 'occupancy') return `${value.toFixed(1)}%`;
    if (type === 'revenue') return `${value.toFixed(0)}€`;
    return value.toString();
  };

  const maxValue = Math.max(...data.map(getValue));
  const chartHeight = 300;
  const chartPadding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = Math.max(800, data.length * 80);
  const barWidth = Math.min(60, (chartWidth - chartPadding.left - chartPadding.right) / data.length - 10);

  const total = data.reduce((sum, item) => sum + getValue(item), 0);
  const average = total / data.length;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{getLabel()}</h3>
        <div className="flex gap-6 mt-2 text-sm">
          {type !== 'occupancy' && (
            <div>
              <span className="text-gray-500">Total: </span>
              <span className="font-semibold">{formatValue(total)}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Moyenne: </span>
            <span className="font-semibold">{formatValue(average)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + chartPadding.bottom}>
          <g transform={`translate(${chartPadding.left}, ${chartPadding.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = chartHeight - tick * chartHeight;
              const value = tick * maxValue;
              return (
                <g key={tick}>
                  <line
                    x1={0}
                    y1={y}
                    x2={chartWidth - chartPadding.left - chartPadding.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={-10}
                    y={y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs fill-gray-600"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}

            {data.map((item, index) => {
              const value = getValue(item);
              const barHeight = (value / maxValue) * chartHeight;
              const x = index * ((chartWidth - chartPadding.left - chartPadding.right) / data.length) +
                       ((chartWidth - chartPadding.left - chartPadding.right) / data.length - barWidth) / 2;
              const y = chartHeight - barHeight;

              return (
                <g key={item.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={getColor()}
                    rx={4}
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 15}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                    transform={data.length > 15 ? `rotate(-45, ${x + barWidth / 2}, ${chartHeight + 15})` : ''}
                  >
                    {formatDate(item.date)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-900 font-semibold"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
