'use client';

import styles from './LapDataDisplay.module.css';

interface LapData {
  lap_time: string;
  s1: string;
  s2: string;
  s3: string;
  top_speed: number;
  kph: number;
  pit_time: string | null;
  lap_improvement: number;
  s1_improvement: number;
  s2_improvement: number;
  s3_improvement: number;
}

interface LapDataDisplayProps {
  lapData: LapData | null;
}

const formatInterval = (interval: string) => {
  if (!interval) return 'N/A';
  // Assuming interval is in a format like "00:01:30.123"
  const parts = interval.split(':');
  const seconds = parseFloat(parts[2]);
  return `${parseInt(parts[1], 10)}:${seconds.toFixed(3)}`;
};

const improvementIndicator = (improvement: number) => {
  if (improvement > 0) return <span className={styles.slower}>&#9660;</span>;
  if (improvement < 0) return <span className={styles.faster}>&#9650;</span>;
  return null;
};

export default function LapDataDisplay({ lapData }: LapDataDisplayProps) {
  if (!lapData) {
    return <div className={styles.lapDataContainer}>Loading lap data...</div>;
  }

  return (
    <div className={styles.lapDataContainer}>
      <h3 className={styles.title}>Lap Summary</h3>
      <div className={styles.grid}>
        <div className={styles.dataItem}>
          <span className={styles.label}>Lap Time</span>
          <span className={styles.value}>{formatInterval(lapData.lap_time)} {improvementIndicator(lapData.lap_improvement)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.label}>Sector 1</span>
          <span className={styles.value}>{formatInterval(lapData.s1)} {improvementIndicator(lapData.s1_improvement)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.label}>Sector 2</span>
          <span className={styles.value}>{formatInterval(lapData.s2)} {improvementIndicator(lapData.s2_improvement)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.label}>Sector 3</span>
          <span className={styles.value}>{formatInterval(lapData.s3)} {improvementIndicator(lapData.s3_improvement)}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.label}>Top Speed</span>
          <span className={styles.value}>{lapData.top_speed?.toFixed(2)} kph</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.label}>Avg Speed</span>
          <span className={styles.value}>{lapData.kph?.toFixed(2)} kph</span>
        </div>
        {lapData.pit_time && (
          <div className={styles.dataItem}>
            <span className={styles.label}>Pit Time</span>
            <span className={styles.value}>{formatInterval(lapData.pit_time)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
