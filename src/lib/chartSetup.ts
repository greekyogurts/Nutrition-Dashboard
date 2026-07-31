import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale,
  LineElement, PointElement, Tooltip,
} from 'chart.js';

/** Side-effect import once per app; Chart.js dedupes repeat registration. */
ChartJS.register(
  BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, Legend, Tooltip,
);
