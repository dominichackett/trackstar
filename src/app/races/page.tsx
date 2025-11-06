'use client';

import { useState } from 'react';
import styles from './page.module.css';

const racesData = [
  { id: 1, name: 'Race 1 - Barber Motorsports', date: '2025-11-05', drivers: 20 },
  { id: 2, name: 'Race 2 - Barber Motorsports', date: '2025-11-06', drivers: 22 },
  { id: 3, name: 'Race 3 - Laguna Seca', date: '2025-10-20', drivers: 18 },
];

const driversData = {
  1: [
    { id: 101, name: 'Driver A', team: 'Team X' },
    { id: 102, name: 'Driver B', team: 'Team Y' },
    { id: 103, name: 'Driver C', team: 'Team Z' },
  ],
  2: [
    { id: 201, name: 'Driver D', team: 'Team P' },
    { id: 202, name: 'Driver E', team: 'Team Q' },
  ],
  3: [
    { id: 301, name: 'Driver F', team: 'Team R' },
  ],
};

export default function RacesPage() {
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedDrivers, setSelectedDrivers] = useState([]);

  const handleRaceSelect = (race) => {
    setSelectedRace(race);
    setSelectedDrivers([]);
  };

  const handleDriverSelect = (driver) => {
    setSelectedDrivers((prev) =>
      prev.some((d) => d.id === driver.id)
        ? prev.filter((d) => d.id !== driver.id)
        : [...prev, driver]
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Select Race & Drivers</h1>

      <div className={styles.selectionContainer}>
        <div className={styles.racesList}>
          <h2 className={styles.listTitle}>Races</h2>
          <ul>
            {racesData.map((race) => (
              <li
                key={race.id}
                className={`${styles.listItem} ${selectedRace?.id === race.id ? styles.selected : ''}`}
                onClick={() => handleRaceSelect(race)}
              >
                <h3>{race.name}</h3>
                <p>{race.date}</p>
              </li>
            ))}
          </ul>
        </div>

        {selectedRace && (
          <div className={styles.driversList}>
            <h2 className={styles.listTitle}>Drivers for {selectedRace.name}</h2>
            <ul>
              {driversData[selectedRace.id].map((driver) => (
                <li
                  key={driver.id}
                  className={`${styles.listItem} ${selectedDrivers.some((d) => d.id === driver.id) ? styles.selected : ''}`}
                  onClick={() => handleDriverSelect(driver)}
                >
                  <h4>{driver.name}</h4>
                  <p>{driver.team}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {selectedDrivers.length > 0 && (
        <div className={styles.analysisButtonContainer}>
          <button className={styles.analysisButton}>
            Start Analysis ({selectedDrivers.length} driver{selectedDrivers.length > 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  );
}
