// components/DonutChart.tsx
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Chart,
} from 'chart.js';
import { useMemo } from 'react';

// ── 1.  Register core elements
ChartJS.register(ArcElement, Tooltip, Legend);

// ── 2.  Plugin that writes total in the centre
const centerTextPlugin = {
  id: 'centerText',
  afterDraw: (chart: Chart) => {
    const {
      ctx,
      chartArea: { width, height },
    } = chart;
    const dataset = chart.data.datasets[0];
    const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);

    ctx.save();
    ctx.font = '700 1.25rem "Inter", sans-serif';
    ctx.fillStyle = '#111827';               // gray-900
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), width / 2, height / 2);
    ctx.restore();
  },
};

// Register once
ChartJS.register(centerTextPlugin);

const DonutChart = () => {
  // ── 3.  Keep chart data memoised so React re-uses it
  const chartData = useMemo(
    () => ({
      labels: ['Collected', 'Pending', 'Expected'],
      datasets: [
        {
          data: [100, 60, 160],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
          borderWidth: 0,
        },
      ],
    }),
    [],
  );

  // ── 4.  Chart options with “grow” animation
  const options = useMemo(
    () => ({
      cutout: '70%',
      responsive: true,
      animation: {
        // Animate radius & opacity on mount
        animateScale: true,
        animateRotate: true,
        duration: 1200,
        easing: 'easeOutQuart' as const,
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: '#4b5563',
            font: { size: 14 },
          },
        },
      },
    }),
    [],
  );

  return (
    <div className="w-full md:w-1/2 mx-auto ">
      <h2 className="text-xl font-semibold mb-4 text-center">
        Price Distribution
      </h2>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default DonutChart;
