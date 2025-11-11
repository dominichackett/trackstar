'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import StatusIndicator from '@/components/StatusIndicator';

interface LapData {
  id: string;
  race_id: string;
  driver_id: string;
  lap_number: number;
  lap_time: string;
  lap_improvement: number;
  crossing_finish_line_in_pit: boolean;
  s1: string;
  s1_improvement: number;
  s2: string;
  s2_improvement: number;
  s3: string;
  s3_improvement: number;
  kph: number;
  elapsed: string;
  hour: string;
  s1_large: string;
  s2_large: string;
  s3_large: string;
  top_speed: number;
  pit_time: string;
  class: string;
  group: string;
  manufacturer: string;
  flag_at_fl: string;
  s1_seconds: number;
  s2_seconds: number;
  s3_seconds: number;
  im1a_time: string;
  im1a_elapsed: string;
  im1_time: string;
  im1_elapsed: string;
  im2a_time: string;
  im2a_elapsed: string;
  im2_time: string;
  im2_elapsed: string;
  im3a_time: string;
  im3a_elapsed: string;
  fl_time: string;
  fl_elapsed: string;
  created_at: string;
}

interface DisplayLapData extends LapData {
  s1_delta: number | null;
  s2_delta: number | null;
  s3_delta: number | null;
  lap_time_delta: number | null;
  top_speed_delta: number | null;
  kph_delta: number | null;
}

interface Driver {
  id: string;
  name: string;
  number: number;
}

interface Race {
  id: string;
  name: string;
}

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
  drivers: {
    name: string;
    number: number;
  };
}

interface BestSector {
  time: number;
  driverNumber: number;
}

const intervalToSeconds = (intervalString: string): number => {
  const parts = intervalString.split(':');
  let seconds = 0;
  if (parts.length === 3) { // HH:MM:SS.ms
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) { // MM:SS.ms
    seconds += parseInt(parts[0], 10) * 60;
    seconds += parseFloat(parts[1]);
  } else { // Just seconds.ms
    seconds += parseFloat(intervalString);
  }
  return seconds;
};

export default function LapDeepDivePage() {
  const supabase = getSupabaseClient();
  const searchParams = useSearchParams();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);
  const [inputLapNumber, setInputLapNumber] = useState<string>('');
  const [availableLapNumbers, setAvailableLapNumbers] = useState<number[]>([]);

  const initialRaceId = searchParams.get('raceId');
  const initialLapNumber = searchParams.get('lapNumber');

  const [allLapsData, setAllLapsData] = useState<DisplayLapData[] | null>(null);
  const [raceWinnerInfo, setRaceWinnerInfo] = useState<RaceResult | null>(null);
  const [bestSectorsInfo, setBestSectorsInfo] = useState<{ s1: BestSector | null, s2: BestSector | null, s3: BestSector | null }>({ s1: null, s2: null, s3: null });
  const [bestOverallLapInfo, setBestOverallLapInfo] = useState<{ bestLapTime: BestSector | null, bestKPH: BestSector | null, bestTopSpeed: BestSector | null }>({ bestLapTime: null, bestKPH: null, bestTopSpeed: null });
  const [slowestOverallLapInfo, setSlowestOverallLapInfo] = useState<{ slowestLapTime: BestSector | null, lowestKPH: BestSector | null, lowestTopSpeed: BestSector | null }>({ slowestLapTime: null, lowestKPH: null, lowestTopSpeed: null });
  const [raceInfo, setRaceInfo] = useState<Race | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInitialData() {
      // Fetch all available years
      const { data: yearsData, error: yearsError } = await supabase
        .from('races')
        .select('date')
        .order('date', { ascending: false });

      if (yearsError) {
        console.error('Error fetching years:', yearsError);
        return;
      }

      const years = Array.from(new Set(yearsData.map(race => new Date(race.date).getFullYear().toString())));
      setAvailableYears(years);

      // Set initial values from URL or defaults
      if (initialRaceId) {
        setSelectedRaceId(initialRaceId);
      }
      if (initialLapNumber) {
        setInputLapNumber(initialLapNumber);
      }

      // If a raceId is provided in the URL, try to determine its year
      if (initialRaceId && years.length > 0) {
        const { data: initialRace, error: initialRaceError } = await supabase
          .from('races')
          .select('date')
          .eq('id', initialRaceId)
          .single();

        if (initialRaceError) {
          console.error('Error fetching initial race:', initialRaceError);
        } else if (initialRace) {
          const yearOfInitialRace = new Date(initialRace.date).getFullYear().toString();
          setSelectedYear(yearOfInitialRace);
        }
      } else if (years.length > 0) {
        setSelectedYear(years[0]); // Default to the latest year
      }
    }

    fetchInitialData();
  }, [supabase, initialRaceId, initialLapNumber]);

  useEffect(() => {
    async function fetchRacesForSelectedYear() {
      if (selectedYear) {
        const { data: racesData, error: racesError } = await supabase
          .from('races')
          .select('id, name, date')
          .gte('date', `${selectedYear}-01-01`)
          .lte('date', `${selectedYear}-12-31`)
          .order('date', { ascending: false });

        if (racesError) {
          console.error('Error fetching races for year:', racesError);
          setAvailableRaces([]);
          return;
        }
        setAvailableRaces(racesData);

        let currentSelectedRaceId = '';
        // If initialRaceId is set and belongs to the selected year, keep it.
        // Otherwise, default to the first race in the list.
        if (initialRaceId && racesData.some(race => race.id === initialRaceId)) {
          currentSelectedRaceId = initialRaceId;
          setSelectedRaceId(initialRaceId);
        } else if (racesData.length > 0) {
          currentSelectedRaceId = racesData[0].id;
          setSelectedRaceId(racesData[0].id);
        } else {
          setSelectedRaceId('');
        }

        // Fetch available lap numbers for the selected race
        if (currentSelectedRaceId) {
          const { data: lapsData, error: lapsError } = await supabase
            .from('laps')
            .select('lap_number')
            .eq('race_id', currentSelectedRaceId)
            .order('lap_number', { ascending: true });

          if (lapsError) {
            console.error('Error fetching lap numbers:', lapsError);
            setAvailableLapNumbers([]);
            return;
          }

          const lapNumbers = Array.from(new Set(lapsData.map(lap => lap.lap_number))).sort((a, b) => a - b);
          setAvailableLapNumbers(lapNumbers);

          // Set inputLapNumber based on initialLapNumber or default
          if (initialLapNumber && lapNumbers.includes(parseInt(initialLapNumber, 10))) {
            setInputLapNumber(initialLapNumber);
          } else if (lapNumbers.length > 0) {
            setInputLapNumber(lapNumbers[0].toString());
          } else {
            setInputLapNumber('');
          }
        } else {
          setAvailableLapNumbers([]);
          setInputLapNumber('');
        }

      } else {
        setAvailableRaces([]);
        setSelectedRaceId('');
        setAvailableLapNumbers([]);
        setInputLapNumber('');
      }
    }

    fetchRacesForSelectedYear();
  }, [supabase, selectedYear, initialRaceId, initialLapNumber]);

  useEffect(() => {
    async function fetchData() {
      if (!selectedRaceId || !inputLapNumber) {
        // Only set error if user has interacted or if it's not initial load
        if (selectedRaceId || inputLapNumber) { // Check if any input is provided
          setError('Please select a race and enter a lap number.');
        }
        setLoading(false);
        setAllLapsData(null);
        setRaceWinnerInfo(null);
        setBestSectorsInfo({ s1: null, s2: null, s3: null });
        setRaceInfo(null);
        setAllDrivers(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch Race Info
        const { data: race, error: raceError } = await supabase
          .from('races')
          .select('id, name')
          .eq('id', selectedRaceId)
          .single();

        if (raceError) throw raceError;
        setRaceInfo(race);

        // Fetch Race Winner Info
        const { data: raceWinner, error: raceWinnerError } = await supabase
          .from('race_results')
          .select('*, drivers(name, number)')
          .eq('race_id', selectedRaceId)
          .eq('position', 1)
          .single();

        if (raceWinnerError) throw raceWinnerError;
        setRaceWinnerInfo(raceWinner);

        // Fetch All Laps for the given lapNumber
        const { data: allLaps, error: allLapsError } = await supabase
          .from('laps')
          .select('*')
          .eq('race_id', selectedRaceId)
          .eq('lap_number', parseInt(inputLapNumber, 10))
          .order('lap_time', { ascending: true });

        if (allLapsError) throw allLapsError;
        setAllLapsData(allLaps);

        // Fetch All Drivers
        const { data: drivers, error: driversError } = await supabase
          .from('drivers')
          .select('id, name, number');

        if (driversError) throw driversError;
        setAllDrivers(drivers);

        // Process Best Sectors and calculate deltas
        if (allLaps && allLaps.length > 0 && drivers) {
          let bestS1: BestSector | null = null;
          let bestS2: BestSector | null = null;
          let bestS3: BestSector | null = null;
          let bestLapTimeSeconds: number | null = null;
          let bestTopSpeed: number | null = null;
          let bestKPH: number | null = null;

          let slowestLapTimeSeconds: number | null = null;
          let lowestKPH: number | null = null;
          let lowestTopSpeed: number | null = null;

          const lapsWithLapTimeSeconds = allLaps.map(lap => ({
            ...lap,
            lap_time_seconds: intervalToSeconds(lap.lap_time),
          }));

          lapsWithLapTimeSeconds.forEach(lap => {
            const driver = drivers.find(d => d.id === lap.driver_id);
            if (!driver) return;

            if (!bestS1 || lap.s1_seconds < bestS1.time) {
              bestS1 = { time: lap.s1_seconds, driverNumber: driver.number };
            }
            if (!bestS2 || lap.s2_seconds < bestS2.time) {
              bestS2 = { time: lap.s2_seconds, driverNumber: driver.number };
            }
            if (!bestS3 || lap.s3_seconds < bestS3.time) {
              bestS3 = { time: lap.s3_seconds, driverNumber: driver.number };
            }
            if (!bestLapTimeSeconds || lap.lap_time_seconds < bestLapTimeSeconds) {
              bestLapTimeSeconds = lap.lap_time_seconds;
            }
            if (lap.top_speed !== null && (!bestTopSpeed || lap.top_speed > bestTopSpeed)) {
              bestTopSpeed = lap.top_speed;
            }
            if (lap.kph !== null && (!bestKPH || lap.kph > bestKPH)) {
              bestKPH = lap.kph;
            }

            // For slowest/lowest
            if (!slowestLapTimeSeconds || lap.lap_time_seconds > slowestLapTimeSeconds) {
              slowestLapTimeSeconds = lap.lap_time_seconds;
            }
            if (lap.kph !== null && (!lowestKPH || lap.kph < lowestKPH)) {
              lowestKPH = lap.kph;
            }
            if (lap.top_speed !== null && (!lowestTopSpeed || lap.top_speed < lowestTopSpeed)) {
              lowestTopSpeed = lap.top_speed;
            }
          });
          setBestSectorsInfo({ s1: bestS1, s2: bestS2, s3: bestS3 });

          let bestLapTimeDriver: BestSector | null = null;
          let bestKPHDriver: BestSector | null = null;
          let bestTopSpeedDriver: BestSector | null = null;

          // Find drivers for overall bests
          if (bestLapTimeSeconds !== null) {
            const bestLap = lapsWithLapTimeSeconds.find(lap => lap.lap_time_seconds === bestLapTimeSeconds);
            if (bestLap) {
              const driver = drivers.find(d => d.id === bestLap.driver_id);
              if (driver) bestLapTimeDriver = { time: bestLapTimeSeconds, driverNumber: driver.number };
            }
          }
          if (bestKPH !== null) {
            const bestKPHLap = lapsWithLapTimeSeconds.find(lap => lap.kph === bestKPH);
            if (bestKPHLap) {
              const driver = drivers.find(d => d.id === bestKPHLap.driver_id);
              if (driver) bestKPHDriver = { time: bestKPH, driverNumber: driver.number };
            }
          }
          if (bestTopSpeed !== null) {
            const bestTopSpeedLap = lapsWithLapTimeSeconds.find(lap => lap.top_speed === bestTopSpeed);
            if (bestTopSpeedLap) {
              const driver = drivers.find(d => d.id === bestTopSpeedLap.driver_id);
              if (driver) bestTopSpeedDriver = { time: bestTopSpeed, driverNumber: driver.number };
            }
          }

          setBestOverallLapInfo({
            bestLapTime: bestLapTimeDriver,
            bestKPH: bestKPHDriver,
            bestTopSpeed: bestTopSpeedDriver,
          });

          let slowestLapTimeDriver: BestSector | null = null;
          let lowestKPHDriver: BestSector | null = null;
          let lowestTopSpeedDriver: BestSector | null = null;

          // Find drivers for overall slowest/lowest
          if (slowestLapTimeSeconds !== null) {
            const slowestLap = lapsWithLapTimeSeconds.find(lap => lap.lap_time_seconds === slowestLapTimeSeconds);
            if (slowestLap) {
              const driver = drivers.find(d => d.id === slowestLap.driver_id);
              if (driver) slowestLapTimeDriver = { time: slowestLapTimeSeconds, driverNumber: driver.number };
            }
          }
          if (lowestKPH !== null) {
            const lowestKPHLap = lapsWithLapTimeSeconds.find(lap => lap.kph === lowestKPH);
            if (lowestKPHLap) {
              const driver = drivers.find(d => d.id === lowestKPHLap.driver_id);
              if (driver) lowestKPHDriver = { time: lowestKPH, driverNumber: driver.number };
            }
          }
          if (lowestTopSpeed !== null) {
            const lowestTopSpeedLap = lapsWithLapTimeSeconds.find(lap => lap.top_speed === lowestTopSpeed);
            if (lowestTopSpeedLap) {
              const driver = drivers.find(d => d.id === lowestTopSpeedLap.driver_id);
              if (driver) lowestTopSpeedDriver = { time: lowestTopSpeed, driverNumber: driver.number };
            }
          }

          setSlowestOverallLapInfo({
            slowestLapTime: slowestLapTimeDriver,
            lowestKPH: lowestKPHDriver,
            lowestTopSpeed: lowestTopSpeedDriver,
          });

          const lapsWithDeltas: DisplayLapData[] = lapsWithLapTimeSeconds.map(lap => ({
            ...lap,
            s1_delta: bestS1 ? lap.s1_seconds - bestS1.time : null,
            s2_delta: bestS2 ? lap.s2_seconds - bestS2.time : null,
            s3_delta: bestS3 ? lap.s3_seconds - bestS3.time : null,
            lap_time_delta: bestLapTimeSeconds ? lap.lap_time_seconds - bestLapTimeSeconds : null,
            top_speed_delta: bestTopSpeed && lap.top_speed !== null ? lap.top_speed - bestTopSpeed : null,
            kph_delta: bestKPH && lap.kph !== null ? lap.kph - bestKPH : null,
          }));
          setAllLapsData(lapsWithDeltas);
        } else {
          setAllLapsData(allLaps);
        }

      } catch (err: any) {
        console.error('Error fetching deep dive data:', err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedRaceId, inputLapNumber, supabase]);

  if (loading) {
    return <StatusIndicator loading={true} loadingMessage="Loading lap deep dive data..." />;
  }

  if (error) {
    return <StatusIndicator error={true} errorMessage={error} />;
  }

  if (!allLapsData || allLapsData.length === 0) {
    return <StatusIndicator noDataMessage="No lap data found for the selected parameters." data={allLapsData || []} />;
  }

  const getDriverName = (driverId: string) => {
    return allDrivers?.find(d => d.id === driverId)?.name || 'Unknown Driver';
  };

  const getDriverNumber = (driverId: string) => {
    return allDrivers?.find(d => d.id === driverId)?.number || 'N/A';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return 'N/A';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}s`;
  };

  const handleGoClick = () => {
    if (selectedRaceId && inputLapNumber) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('raceId', selectedRaceId);
      newSearchParams.set('lapNumber', inputLapNumber);
      window.history.pushState(null, '', `?${newSearchParams.toString()}`);
      // The useEffect for fetchData will re-run due to selectedRaceId and inputLapNumber changing
    } else {
      setError('Please select a race and enter a lap number.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={styles.select}>
          <option value="">Select Year</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select value={selectedRaceId} onChange={(e) => setSelectedRaceId(e.target.value)} className={styles.select}>
          <option value="">Select Race</option>
          {availableRaces.map(race => (
            <option key={race.id} value={race.id}>{race.name} ({new Date(race.date).toLocaleDateString()})</option>
          ))}
        </select>

        <select value={inputLapNumber} onChange={(e) => setInputLapNumber(e.target.value)} className={styles.select}>
          <option value="">Select Lap</option>
          {availableLapNumbers.map(lapNum => (
            <option key={lapNum} value={lapNum}>{lapNum}</option>
          ))}
        </select>

        <button onClick={handleGoClick} className={styles.button}>Go</button>
      </div>

      <h1 className={styles.pageTitle}>Lap Deep Dive</h1>

      <div className={styles.headerInfo}>
        <p><strong>Race:</strong> {raceInfo?.name || selectedRaceId}</p>
        <p><strong>Lap Number:</strong> {inputLapNumber}</p>
      </div>

      {raceWinnerInfo && (
        <div className={styles.summarySection}>
          <h2>Race Winner</h2>
          <p><strong>Driver:</strong> {raceWinnerInfo.drivers.name} ({raceWinnerInfo.drivers.number})</p>
          <p><strong>Best Lap Time:</strong> {raceWinnerInfo.best_lap_time}</p>
          <p><strong>Total Elapsed Time:</strong> {raceWinnerInfo.elapsed_time}</p>
        </div>
      )}

      {bestSectorsInfo.s1 && bestSectorsInfo.s2 && bestSectorsInfo.s3 && (
        <div className={styles.summarySection}>
          <h2>Best Sectors for Lap {inputLapNumber}</h2>
          <p>
            <strong>Sector 1:</strong> {formatTime(bestSectorsInfo.s1.time)} by Driver {bestSectorsInfo.s1.driverNumber}
          </p>
          <p>
            <strong>Sector 2:</strong> {formatTime(bestSectorsInfo.s2.time)} by Driver {bestSectorsInfo.s2.driverNumber}
          </p>
          <p>
            <strong>Sector 3:</strong> {formatTime(bestSectorsInfo.s3.time)} by Driver {bestSectorsInfo.s3.driverNumber}
          </p>
        </div>
      )}

      {bestOverallLapInfo.bestLapTime && bestOverallLapInfo.bestKPH && bestOverallLapInfo.bestTopSpeed && (
        <div className={styles.summarySection}>
          <h2>Overall Best for Lap {inputLapNumber}</h2>
          <p>
            <strong>Best Lap Time:</strong> {formatTime(bestOverallLapInfo.bestLapTime.time)} by Driver {bestOverallLapInfo.bestLapTime.driverNumber}
          </p>
          <p>
            <strong>Top Average KPH:</strong> {bestOverallLapInfo.bestKPH.time.toFixed(2)} by Driver {bestOverallLapInfo.bestKPH.driverNumber}
          </p>
          <p>
            <strong>Top Speed:</strong> {bestOverallLapInfo.bestTopSpeed.time.toFixed(2)} by Driver {bestOverallLapInfo.bestTopSpeed.driverNumber}
          </p>
        </div>
      )}

      {slowestOverallLapInfo.slowestLapTime && slowestOverallLapInfo.lowestKPH && slowestOverallLapInfo.lowestTopSpeed && (
        <div className={styles.summarySection}>
          <h2>Overall Slowest for Lap {inputLapNumber}</h2>
          <p>
            <strong>Slowest Lap Time:</strong> {formatTime(slowestOverallLapInfo.slowestLapTime.time)} by Driver {slowestOverallLapInfo.slowestLapTime.driverNumber}
          </p>
          <p>
            <strong>Lowest Average KPH:</strong> {slowestOverallLapInfo.lowestKPH.time.toFixed(2)} by Driver {slowestOverallLapInfo.lowestKPH.driverNumber}
          </p>
          <p>
            <strong>Lowest Top Speed:</strong> {slowestOverallLapInfo.lowestTopSpeed.time.toFixed(2)} by Driver {slowestOverallLapInfo.lowestTopSpeed.driverNumber}
          </p>
        </div>
      )}

      <div className={styles.tableContainer}>
        <h2>All Drivers' Lap Data for Lap {inputLapNumber}</h2>
        <table className={styles.lapDataTable}>
          <thead>
            <tr>
              <th>Driver #</th>
              <th>Lap Time</th>
              <th>Lap Delta</th>
              <th>S1</th>
              <th>S1 Delta</th>
              <th>S2</th>
              <th>S2 Delta</th>
              <th>S3</th>
              <th>S3 Delta</th>
              <th>KPH</th>
              <th>KPH Delta</th>
              <th>Top Speed</th>
              <th>Top Speed Delta</th>
            </tr>
          </thead>
          <tbody>
            {allLapsData.map(lap => (
              <tr key={lap.id}>
                <td>{getDriverNumber(lap.driver_id)}</td>
                <td>{lap.lap_time}</td>
                <td>{formatDelta(lap.lap_time_delta)}</td>
                <td>{lap.s1}</td>
                <td>{formatDelta(lap.s1_delta)}</td>
                <td>{lap.s2}</td>
                <td>{formatDelta(lap.s2_delta)}</td>
                <td>{lap.s3}</td>
                <td>{formatDelta(lap.s3_delta)}</td>
                <td>{lap.kph?.toFixed(2) || 'N/A'}</td>
                <td>{formatDelta(lap.kph_delta)}</td>
                <td>{lap.top_speed?.toFixed(2) || 'N/A'}</td>
                <td>{formatDelta(lap.top_speed_delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${styles.summarySection} ${styles.columnDefinitionsSection}`}>
        <h2>Table Column Definitions</h2>
        <ul>
          <li><strong>Driver #</strong>: The number of the driver.</li>
          <li><strong>Lap Time</strong>: The total time taken to complete that specific lap.</li>
          <li><strong>Lap Delta</strong>: The difference in time between this driver's lap time and the fastest lap time on this lap number (across all drivers). A positive value means slower.</li>
          <li><strong>S1, S2, S3</strong>: The time recorded for the first, second, and third sectors of that lap, respectively.</li>
          <li><strong>S1 Delta, S2 Delta, S3 Delta</strong>: The difference in time between this driver's sector time and the fastest sector time on this lap number. A positive value means slower.</li>
          <li><strong>KPH</strong>: The average speed in Kilometers Per Hour achieved during that lap.</li>
          <li><strong>KPH Delta</strong>: The difference in KPH between this driver's average KPH and the highest average KPH on this lap number. A positive value means slower (less KPH).</li>
          <li><strong>Top Speed</strong>: The maximum speed in Kilometers Per Hour recorded during that lap.</li>
          <li><strong>Top Speed Delta</strong>: The difference in Top Speed between this driver's top speed and the highest top speed on this lap number. A positive value means slower (less Top Speed).</li>
        </ul>
      </div>
    </div>
  );
}