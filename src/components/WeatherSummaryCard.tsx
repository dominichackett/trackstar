import React from 'react';
import styles from './WeatherSummaryCard.module.css'; // Assuming a new CSS module for this component

interface WeatherData {
  avgAirTemp: number | null;
  avgTrackTemp: number | null;
  avgHumidity: number | null;
  avgWindSpeed: number | null;
  avgPressure: number | null;
  rainStatus: string;
}

interface WeatherSummaryCardProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
}

const WeatherSummaryCard: React.FC<WeatherSummaryCardProps> = ({ weather, loading, error }) => {
  if (loading) {
    return <div className={styles.card}>Loading weather data...</div>;
  }

  if (error) {
    return <div className={`${styles.card} ${styles.error}`}>Error loading weather: {error}</div>;
  }

  if (!weather) {
    return <div className={styles.card}>No weather data available for this race.</div>;
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Weather Summary</h3>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Air Temp:</span>
          <span className={styles.value}>{weather.avgAirTemp}°C</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Track Temp:</span>
          <span className={styles.value}>{weather.avgTrackTemp}°C</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Humidity:</span>
          <span className={styles.value}>{weather.avgHumidity}%</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Wind Speed:</span>
          <span className={styles.value}>{weather.avgWindSpeed} kph</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Pressure:</span>
          <span className={styles.value}>{weather.avgPressure} hPa</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Rain:</span>
          <span className={styles.value}>{weather.rainStatus}</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherSummaryCard;
