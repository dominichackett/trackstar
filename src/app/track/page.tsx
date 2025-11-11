'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import styles from './page.module.css';
import 'leaflet/dist/leaflet.css';
import { trackData, Track } from '@/lib/track-data';

const TrackPageMap = dynamic(() => import('@/components/TrackPageMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function TrackPage() {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(trackData[0].id);

  const handleTrackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTrackId(event.target.value);
  };

  const selectedTrack = trackData.find(track => track.id === selectedTrackId);

  if (!selectedTrack) {
    return <div className={styles.container}>Track not found!</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{selectedTrack.name}</h1>
        <div className={styles.selectorGroup}>
          <label htmlFor="track-select">Select a Track:</label>
          <select id="track-select" value={selectedTrackId} onChange={handleTrackChange} className={styles.dropdown}>
            {trackData.map(track => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.mapImageContainer}>
          <h2 className={styles.sectionTitle}>Track Layout</h2>
          <Image
            src={selectedTrack.image}
            alt={`${selectedTrack.name} Track Layout`}
            width={800}
            height={600}
            className={styles.trackImage}
            priority
          />
        </div>

        <div className={styles.mapContainer}>
          <h2 className={styles.sectionTitle}>Track Location</h2>
          <TrackPageMap 
            position={selectedTrack.finishLineGps} 
            trackName={selectedTrack.name} 
            pitInGps={selectedTrack.pitInGps}
            pitOutGps={selectedTrack.pitOutGps}
          />
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>Circuit Info</h3>
            <ul>
              <li>
                <strong>Circuit Length:</strong>
                <span>{selectedTrack.length}</span>
              </li>
              {selectedTrack.pitLaneTime && (
                <li>
                  <strong>Time through Pit Lane:</strong>
                  <span>{selectedTrack.pitLaneTime}</span>
                </li>
              )}
            </ul>
          </div>

          <div className={styles.infoCard}>
            <h3>GPS Coordinates</h3>
            <ul>
              <li>
                <strong>Finish Line:</strong>
                <span>{selectedTrack.finishLineGps.join(', ')}</span>
              </li>
              {selectedTrack.pitInGps && (
                <li>
                  <strong>Pit In:</strong>
                  <span>{selectedTrack.pitInGps.join(', ')}</span>
                </li>
              )}
              {selectedTrack.pitOutGps && (
                <li>
                  <strong>Pit Out:</strong>
                  <span>{selectedTrack.pitOutGps.join(', ')}</span>
                </li>
              )}
            </ul>
          </div>

          {selectedTrack.sectorData && (
            <div className={styles.infoCard}>
              <h3>Sector Data</h3>
              <ul>
                {Object.entries(selectedTrack.sectorData).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
