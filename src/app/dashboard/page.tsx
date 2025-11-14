'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { getSupabaseClient } from '@/utils/supabase/client';

interface Race {
  id: string;
  name: string;
  date: string;
  driver_count: number;
}

interface Driver {
  id: string;
  name: string;
  number: number;
  last_race_lap_time: string | null;
  last_race_position: number | null;
  last_race_top_speed: number | null;
  last_race_name: string | null;
}

export default function Dashboard() {
  const [races, setRaces] = useState<Race[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingRaces, setLoadingRaces] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const fetchRaces = async () => {
      setLoadingRaces(true);
      const { data: racesData, error } = await supabase
        .from('races')
        .select('id, name, date')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching races:', error);
      } else if (racesData) {
        const racesWithDriverCounts = await Promise.all(
          racesData.map(async (race) => {
            const { count, error: countError } = await supabase
              .from('race_results')
              .select('driver_id', { count: 'exact', head: true })
              .eq('race_id', race.id);

            if (countError) {
              console.error(`Error fetching driver count for race ${race.id}:`, countError);
            }

            return {
              ...race,
              driver_count: count || 0,
            };
          })
        );
        setRaces(racesWithDriverCounts);
      }
      setLoadingRaces(false);
    };

    const fetchDrivers = async () => {
      setLoadingDrivers(true);

      // 1. Get the most recent race
      const { data: lastRaceData, error: lastRaceError } = await supabase
        .from('races')
        .select('id, name')
        .order('date', { ascending: false })
        .limit(1);

      if (lastRaceError) {
        console.error('Error fetching last race:', lastRaceError);
        setLoadingDrivers(false);
        return;
      }
      const lastRace = lastRaceData ? lastRaceData[0] : null;
      if (!lastRace) {
        console.log('No recent races found.');
        setLoadingDrivers(false);
        return;
      }

      // 2. Get all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, name, number')
        .limit(3);

      if (driversError) {
        console.error('Error fetching drivers:', driversError);
        setLoadingDrivers(false);
        return;
      }

      // 3. For each driver, fetch their data for the most recent race
      const driversWithLastRaceData = await Promise.all(
        (driversData || []).map(async (driver) => {
          // Get position from race_results
          const { data: raceResultData, error: raceResultError } = await supabase
            .from('race_results')
            .select('position')
            .eq('race_id', lastRace.id)
            .eq('driver_id', driver.id);
          const raceResult = raceResultData ? raceResultData[0] : null;
          if (raceResultError) console.error('Race result error:', raceResultError);

          // Get top speed from laps
          const { data: topSpeedDataArray, error: topSpeedError } = await supabase
            .from('laps')
            .select('top_speed')
            .eq('race_id', lastRace.id)
            .eq('driver_id', driver.id)
            .order('top_speed', { ascending: false })
            .limit(1);
          const topSpeedData = topSpeedDataArray ? topSpeedDataArray[0] : null;
          if (topSpeedError) {
            console.error('Top speed error:', topSpeedError);
          }

          // Get last lap time from laps
          const { data: lastLapDataArray, error: lastLapError } = await supabase
            .from('laps')
            .select('lap_time')
            .eq('race_id', lastRace.id)
            .eq('driver_id', driver.id)
            .order('lap_number', { ascending: false })
            .limit(1);
          const lastLapData = lastLapDataArray ? lastLapDataArray[0] : null;
          if (lastLapError) console.error('Last lap error:', lastLapError);

          return {
            ...driver,
            last_race_position: raceResult ? raceResult.position : null,
            last_race_top_speed: topSpeedData ? topSpeedData.top_speed : null,
            last_race_lap_time: lastLapData ? lastLapData.lap_time : null,
            last_race_name: lastRace.name,
          };
        })
      );

      setDrivers(driversWithLastRaceData);
      setLoadingDrivers(false);
    };

    fetchRaces();
    fetchDrivers();
  }, [supabase]);

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <button className={styles.newAnalysisButton}>+ New Analysis</button>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Races</h2>
          {loadingRaces ? (
            <p>Loading races...</p>
          ) : (
            <div className={styles.cardGrid}>
              {races.map((race) => (
                <div key={race.id} className={styles.raceCard}>
                  <h3>{race.name}</h3>
                  <p>Date: {race.date}</p>
                  <p>Drivers: {race.driver_count}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Favorite Drivers</h2>
          {loadingDrivers ? (
            <p>Loading drivers...</p>
          ) : (
            <div className={styles.cardGrid}>
              {drivers.map((driver) => (
                <div key={driver.id} className={styles.driverCard}>
                  <Image src="/driver-avatar.svg" alt="Driver Avatar" width={60} height={60} />
                  <h4>{driver.name}</h4>
                  <p>Number: {driver.number}</p>
                  <p>Last Race: {driver.last_race_name || 'N/A'}</p>
                  <p>Position: {driver.last_race_position || 'N/A'}</p>
                  <p>Top Speed: {driver.last_race_top_speed ? `${driver.last_race_top_speed.toFixed(2)} kph` : 'N/A'}</p>
                  <p>Last Lap: {driver.last_race_lap_time || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}