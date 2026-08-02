import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Tooltip,
} from 'chart.js';

/**
 * Side-effect import once per app; Chart.js dedupes repeat registration.
 * `Filler` was missing here, which meant every `fill: true` line dataset in
 * the app (weight, micronutrient history, HRV, baseline calibration) was
 * silently drawing no fill at all, regardless of its `backgroundColor`.
 */
ChartJS.register(
  BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, Legend, Tooltip, Filler,
);
