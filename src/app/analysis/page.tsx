'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './page.module.css';
import 'leaflet/dist/leaflet.css';

const Map = dynamic(() => import('../../components/Map'), { ssr: false });

const availableDrivers = [
  { id: 'driver1', name: 'Driver A', color: '#E30613' },
  { id: 'driver2', name: 'Driver B', color: '#FFFFFF' },
  { id: 'driver3', name: 'Driver C', color: '#00FF00' },
  { id: 'driver4', name: 'Driver D', color: '#00FFFF' },
  { id: 'driver5', name: 'Driver E', color: '#FF00FF' },
  { id: 'driver6', name: 'Driver F', color: '#FFFF00' },
  { id: 'driver7', name: 'Driver G', color: '#800000' },
  { id: 'driver8', name: 'Driver H', color: '#008000' },
  { id: 'driver9', name: 'Driver I', color: '#000080' },
  { id: 'driver10', name: 'Driver J', color: '#808000' },
];

const allRaceData = {
  race1: {
    lap1: {
      drivers: {
        driver1: {
          speed: [
            { distance: 0, value: 100 }, { distance: 100, value: 110 }, { distance: 200, value: 120 },
            { distance: 300, value: 125 }, { distance: 400, value: 130 },
          ],
          throttle: [
            { distance: 0, value: 80 }, { distance: 100, value: 85 }, { distance: 200, value: 90 },
            { distance: 300, value: 92 }, { distance: 400, value: 95 },
          ],
          brake: [
            { distance: 0, value: 0 }, { distance: 100, value: 0 }, { distance: 200, value: 10 },
            { distance: 300, value: 5 }, { distance: 400, value: 2 },
          ],
          raceLines: [
            [33.589, -86.795], [33.590, -86.796], [33.591, -86.797],
            [33.592, -86.798], [33.593, -86.799],
          ],
        },
        driver2: {
          speed: [
            { distance: 0, value: 102 }, { distance: 100, value: 112 }, { distance: 200, value: 122 },
            { distance: 300, value: 128 }, { distance: 400, value: 132 },
          ],
          throttle: [
            { distance: 0, value: 82 }, { distance: 100, value: 87 }, { distance: 200, value: 92 },
            { distance: 300, value: 94 }, { distance: 400, value: 97 },
          ],
          brake: [
            { distance: 0, value: 0 }, { distance: 100, value: 0 }, { distance: 200, value: 12 },
            { distance: 300, value: 7 }, { distance: 400, value: 3 },
          ],
          raceLines: [
            [33.5895, -86.7955], [33.5905, -86.7965], [33.5915, -86.7975],
            [33.5925, -86.7985], [33.5935, -86.7995],
          ],
        },
        driver3: {
          speed: [
            { distance: 0, value: 95 }, { distance: 100, value: 105 }, { distance: 200, value: 115 },
            { distance: 300, value: 120 }, { distance: 400, value: 125 },
          ],
          throttle: [
            { distance: 0, value: 75 }, { distance: 100, value: 80 }, { distance: 200, value: 85 },
            { distance: 300, value: 88 }, { distance: 400, value: 90 },
          ],
          brake: [
            { distance: 0, value: 8 }, { distance: 100, value: 10 }, { distance: 200, value: 18 },
            { distance: 300, value: 12 }, { distance: 400, value: 6 },
          ],
          raceLines: [
            [33.589, -86.794], [33.590, -86.795], [33.591, -86.796],
            [33.592, -86.797], [33.593, -86.798],
          ],
        },
      },
    },
    lap2: {
      drivers: {
        driver1: {
          speed: [
            { distance: 0, value: 98 }, { distance: 100, value: 108 }, { distance: 200, value: 118 },
            { distance: 300, value: 125 }, { distance: 400, value: 130 },
          ],
          throttle: [
            { distance: 0, value: 78 }, { distance: 100, value: 83 }, { distance: 200, value: 88 },
            { distance: 300, value: 92 }, { distance: 400, value: 95 },
          ],
          brake: [
            { distance: 0, value: 5 }, { distance: 100, value: 8 }, { distance: 200, value: 15 },
            { distance: 300, value: 7 }, { distance: 400, value: 2 },
          ],
          raceLines: [
            [33.588, -86.794], [33.589, -86.795], [33.590, -86.796],
            [33.591, -86.797], [33.592, -86.798],
          ],
        },
        driver2: {
          speed: [
            { distance: 0, value: 100 }, { distance: 100, value: 110 }, { distance: 200, value: 120 },
            { distance: 300, value: 128 }, { distance: 400, value: 132 },
          ],
          throttle: [
            { distance: 0, value: 80 }, { distance: 100, value: 85 }, { distance: 200, value: 90 },
            { distance: 300, value: 94 }, { distance: 400, value: 97 },
          ],
          brake: [
            { distance: 0, value: 3 }, { distance: 100, value: 6 }, { distance: 200, value: 13 },
            { distance: 300, value: 5 }, { distance: 400, value: 1 },
          ],
          raceLines: [
            [33.5885, -86.7945], [33.5895, -86.7955], [33.5905, -86.7965],
            [33.5915, -86.7975], [33.5925, -86.7985],
          ],
        },
      },
    },
  },
  race2: {
    lap1: {
      drivers: {
        driver1: {
          speed: [
            { distance: 0, value: 105 }, { distance: 100, value: 115 }, { distance: 200, value: 125 },
            { distance: 300, value: 130 }, { distance: 400, value: 135 },
          ],
          throttle: [
            { distance: 0, value: 85 }, { distance: 100, value: 90 }, { distance: 200, value: 95 },
            { distance: 300, value: 98 }, { distance: 400, value: 100 },
          ],
          brake: [
            { distance: 0, value: 2 }, { distance: 100, value: 5 }, { distance: 200, value: 12 },
            { distance: 300, value: 8 }, { distance: 400, value: 3 },
          ],
          raceLines: [
            [33.590, -86.796], [33.591, -86.797], [33.592, -86.798],
            [33.593, -86.799], [33.594, -86.800],
          ],
        },
        driver2: {
          speed: [
            { distance: 0, value: 103 }, { distance: 100, value: 113 }, { distance: 200, value: 123 },
            { distance: 300, value: 127 }, { distance: 400, value: 130 },
          ],
          throttle: [
            { distance: 0, value: 83 }, { distance: 100, value: 88 }, { distance: 200, value: 93 },
            { distance: 300, value: 96 }, { distance: 400, value: 98 },
          ],
          brake: [
            { distance: 0, value: 4 }, { distance: 100, value: 7 }, { distance: 200, value: 14 },
            { distance: 300, value: 10 }, { distance: 400, value: 5 },
          ],
          raceLines: [
            [33.5905, -86.7965], [33.5915, -86.7975], [33.5925, -86.7985],
            [33.5935, -86.7995], [33.5945, -86.8005],
          ],
        },
      },
    },
  },
};

export default function AnalysisPage() {
  const [selectedRace, setSelectedRace] = useState('race1');
  const [selectedLap, setSelectedLap] = useState('lap1');
  const [selectedDrivers, setSelectedDrivers] = useState(['driver1', 'driver2']);

  const currentRaceData = allRaceData[selectedRace];
  const currentLapData = currentRaceData[selectedLap];

  const handleDriverChange = (event) => {
    const { options } = event.target;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setSelectedDrivers(value);
  };

  const getDriverColor = (driverId) => {
    return availableDrivers.find((d) => d.id === driverId)?.color || '#CCCCCC';
  };

  // Prepare telemetry data for charts
  const telemetryData = {
    speed: currentLapData.drivers[selectedDrivers[0]]?.speed.map((data, index) => {
      const row = { distance: data.distance };
      selectedDrivers.forEach((driverId) => {
        row[driverId] = currentLapData.drivers[driverId]?.speed[index]?.value;
      });
      return row;
    }) || [],
    throttle: currentLapData.drivers[selectedDrivers[0]]?.throttle.map((data, index) => {
      const row = { distance: data.distance };
      selectedDrivers.forEach((driverId) => {
        row[driverId] = currentLapData.drivers[driverId]?.throttle[index]?.value;
      });
      return row;
    }) || [],
    brake: currentLapData.drivers[selectedDrivers[0]]?.brake.map((data, index) => {
      const row = { distance: data.distance };
      selectedDrivers.forEach((driverId) => {
        row[driverId] = currentLapData.drivers[driverId]?.brake[index]?.value;
      });
      return row;
    }) || [],
  };

  // Prepare race lines for map
  const raceLinesForMap = selectedDrivers.reduce((acc, driverId) => {
    acc[driverId] = currentLapData.drivers[driverId]?.raceLines || [];
    return acc;
  }, {});

  const handleRaceChange = (event) => {
    setSelectedRace(event.target.value);
    setSelectedLap('lap1'); // Reset lap selection when race changes
    setSelectedDrivers(['driver1', 'driver2']); // Reset driver selection
  };

  const handleLapChange = (event) => {
    setSelectedLap(event.target.value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Race Analysis</h1>
        <div className={styles.selectors}>
          <div className={styles.selectorGroup}>
            <label htmlFor="race-select">Select Race:</label>
            <select id="race-select" value={selectedRace} onChange={handleRaceChange} className={styles.dropdown}>
              {Object.keys(allRaceData).map((raceKey) => (
                <option key={raceKey} value={raceKey}>
                  {raceKey.replace('race', 'Race ')}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.selectorGroup}>
            <label htmlFor="lap-select">Select Lap:</label>
            <select id="lap-select" value={selectedLap} onChange={handleLapChange} className={styles.dropdown}>
              {Object.keys(currentRaceData).map((lapKey) => (
                <option key={lapKey} value={lapKey}>
                  {lapKey.replace('lap', 'Lap ')}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.selectorGroup}>
            <label htmlFor="driver-select">Select Drivers:</label>
            <select
              id="driver-select"
              multiple
              value={selectedDrivers}
              onChange={handleDriverChange}
              className={styles.dropdown}
              size={Math.min(availableDrivers.length, 5)} // Show max 5 options at once
            >
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className={styles.mainGrid}>
        <div className={styles.mapContainer}>
          <Map raceLines={raceLinesForMap} availableDrivers={availableDrivers} />
        </div>

        <div className={styles.chartsContainer}>
          <div className={styles.chart}>
            <h3 className={styles.chartTitle}>Speed</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={telemetryData.speed}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="distance" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Legend />
                {selectedDrivers.map((driverId) => (
                  <Line
                    key={driverId}
                    type="monotone"
                    dataKey={driverId}
                    stroke={getDriverColor(driverId)}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chart}>
            <h3 className={styles.chartTitle}>Throttle</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={telemetryData.throttle}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="distance" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Legend />
                {selectedDrivers.map((driverId) => (
                  <Line
                    key={driverId}
                    type="monotone"
                    dataKey={driverId}
                    stroke={getDriverColor(driverId)}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chart}>
            <h3 className={styles.chartTitle}>Brake</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={telemetryData.brake}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="distance" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Legend />
                {selectedDrivers.map((driverId) => (
                  <Line
                    key={driverId}
                    type="monotone"
                    dataKey={driverId}
                    stroke={getDriverColor(driverId)}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.deepDiveLink}>
            <Link href="/analysis/lap-deep-dive" className={styles.button}>
              View Single Lap Deep Dive
            </Link>
          </div>
        </div>
        <div className={styles.aiPanel}>
          <h3 className={styles.aiPanelTitle}>AI Race Engineer</h3>
          <div className={styles.aiChatBox}>
            <div className={styles.aiMessage}>Welcome! Ask me anything about this race.</div>
            <div className={styles.userMessage}>Where is Driver A losing time?</div>
          </div>
          <div className={styles.aiInputContainer}>
            <input type="text" placeholder="Ask a question..." className={styles.aiInput} />
            <button className={styles.aiSendButton}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
