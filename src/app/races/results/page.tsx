'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface RaceResult {
  id: string;
  race_id: string;
  driver_id: string;
  class_type: string;
  position: number;
  position_in_class: number;
  vehicle: string;
  laps: number;
  elapsed_time: string;
  gap_to_first: string;
  gap_to_previous: string;
  best_lap_number: number;
  best_lap_time: string;
  best_lap_speed_kph: number;
  created_at: string;
}

const mockRaceResults: RaceResult[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    race_id: 'race-1-uuid',
    driver_id: 'driver-a-uuid',
    class_type: 'GT3',
    position: 1,
    position_in_class: 1,
    vehicle: 'Porsche 911 GT3 R',
    laps: 25,
    elapsed_time: 'PT1H0M30S',
    gap_to_first: 'PT0S',
    gap_to_previous: 'PT0S',
    best_lap_number: 12,
    best_lap_time: 'PT1M20.123S',
    best_lap_speed_kph: 185.5,
    created_at: '2025-11-06T10:00:00Z',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
    race_id: 'race-1-uuid',
    driver_id: 'driver-b-uuid',
    class_type: 'GT3',
    position: 2,
    position_in_class: 2,
    vehicle: 'Ferrari 488 GT3',
    laps: 25,
    elapsed_time: 'PT1H0M35S',
    gap_to_first: 'PT5S',
    gap_to_previous: 'PT5S',
    best_lap_number: 15,
    best_lap_time: 'PT1M20.500S',
    best_lap_speed_kph: 184.0,
    created_at: '2025-11-06T10:00:00Z',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
    race_id: 'race-1-uuid',
    driver_id: 'driver-c-uuid',
    class_type: 'GT4',
    position: 3,
    position_in_class: 1,
    vehicle: 'BMW M4 GT4',
    laps: 24,
    elapsed_time: 'PT1H1M0S',
    gap_to_first: 'PT1M30S',
    gap_to_previous: 'PT1M25S',
    best_lap_number: 20,
    best_lap_time: 'PT1M25.000S',
    best_lap_speed_kph: 170.2,
    created_at: '2025-11-06T10:00:00Z',
  },
];

export default function RaceResultsPage() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1974 + 1 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedRace, setSelectedRace] = useState<string>('');

  // Mock races for the selected year
  const mockRaces = [
    { id: 'race-1', name: 'Grand Prix Monaco' },
    { id: 'race-2', name: '24 Hours of Le Mans' },
    { id: 'race-3', name: 'Spa-Francorchamps Endurance' },
  ];

  useEffect(() => {
    // In a real application, you would fetch races for the selectedYear here.
    // For now, we'll just reset selectedRace when the year changes.
    setSelectedRace('');
  }, [selectedYear]);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <label htmlFor="year-select">Year:</label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={styles.dropdown}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <label htmlFor="race-select">Race:</label>
        <select
          id="race-select"
          value={selectedRace}
          onChange={(e) => setSelectedRace(e.target.value)}
          className={styles.dropdown}
          disabled={mockRaces.length === 0}
        >
          <option value="">Select a Race</option>
          {mockRaces.map((race) => (
            <option key={race.id} value={race.id}>
              {race.name}
            </option>
          ))}
        </select>
      </div>
      <h1 className={styles.title}>Race Results</h1>
      <div className={styles.resultsTableContainer}>
        <table className={styles.resultsTable}>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Class</th>
              <th>Laps</th>
              <th>Elapsed Time</th>
              <th>Gap to First</th>
              <th>Best Lap</th>
              <th>Best Lap Speed (kph)</th>
            </tr>
          </thead>
          <tbody>
            {mockRaceResults.map((result) => (
              <tr key={result.id}>
                <td>{result.position}</td>
                <td>{result.driver_id.replace('driver-', '').replace('-uuid', '').toUpperCase()}</td>
                <td>{result.vehicle}</td>
                <td>{result.class_type}</td>
                <td>{result.laps}</td>
                <td>{result.elapsed_time.replace('PT', '').toLowerCase()}</td>
                <td>{result.gap_to_first.replace('PT', '').toLowerCase()}</td>
                <td>{result.best_lap_time.replace('PT', '').toLowerCase()}</td>
                <td>{result.best_lap_speed_kph}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
