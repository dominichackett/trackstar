'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import styles from './page.module.css';

const lapData = {
  driver: 'Driver A',
  lapNumber: 5,
  lapTime: '1:23.456',
  minSpeed: 80,
  maxSpeed: 250,
  avgSpeed: 180,
  corneringForces: [
    { distance: 0, gForce: 0.5 },
    { distance: 50, gForce: 1.2 },
    { distance: 100, gForce: 2.5 },
    { distance: 150, gForce: 1.8 },
    { distance: 200, gForce: 0.7 },
  ],
  segmentTimes: [
    { segment: 1, time: '25.123' },
    { segment: 2, time: '30.456' },
    { segment: 3, time: '27.877' },
  ],
};

export default function LapDeepDivePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Single Lap Deep Dive: {lapData.driver} - Lap {lapData.lapNumber}</h1>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <h3>Lap Time</h3>
          <p>{lapData.lapTime}</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>Min Speed</h3>
          <p>{lapData.minSpeed} km/h</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>Max Speed</h3>
          <p>{lapData.maxSpeed} km/h</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>Avg Speed</h3>
          <p>{lapData.avgSpeed} km/h</p>
        </div>
      </div>

      <div className={styles.chartsContainer}>
        <div className={styles.chart}>
          <h3 className={styles.chartTitle}>Cornering G-Forces</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lapData.corneringForces}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="distance" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Legend />
              <Line type="monotone" dataKey="gForce" stroke="#E30613" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.segmentTimes}>
          <h3 className={styles.chartTitle}>Segment Times</h3>
          <ul>
            {lapData.segmentTimes.map((segment) => (
              <li key={segment.segment}>
                Segment {segment.segment}: <span>{segment.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.turnByTurnLink}>
        <Link href="/analysis/turn-by-turn" className={styles.button}>
          View Turn-by-Turn Analysis
        </Link>
      </div>
    </div>
  );
}
