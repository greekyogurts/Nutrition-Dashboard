import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';

/** Side-effect import once per app; Chart.js dedupes repeat registration. */
ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, Legend, Tooltip);
