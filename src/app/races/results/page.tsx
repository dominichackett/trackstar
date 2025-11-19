'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { getSupabaseClient } from '@/utils/supabase/client';
import WeatherSummaryCard from '@/components/WeatherSummaryCard';

interface Race {
  id: string;
  name: string;
  date: string; // Assuming date comes as a string from Supabase
}

interface RaceResult {
  id: string;
  race_id: string;
  driver_id: string;
  driver_number: number | string; // Added for driver's number
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

interface WeatherData {
  avgAirTemp: number | null;
  avgTrackTemp: number | null;
  avgHumidity: number | null;
  avgWindSpeed: number | null;
  avgPressure: number | null;
  rainStatus: string; // e.g., "No Rain", "Light Rain", "Heavy Rain"
}

export default function RaceResultsPage() {
  const supabase = getSupabaseClient();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1974 + 1 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [racesList, setRacesList] = useState<Race[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingRaces, setLoadingRaces] = useState<boolean>(true);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [errorRaces, setErrorRaces] = useState<string | null>(null);
  const [errorResults, setErrorResults] = useState<string | null>(null);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
      }
    };

    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    const fetchRaces = async () => {
      setLoadingRaces(true);
      setErrorRaces(null);
      setSelectedRace(''); // Reset selected race when year changes
      setRaceResults([]); // Clear results when year changes

      const { data, error } = await supabase
        .from('races')
        .select('id, name, date')
        .gte('date', `${selectedYear}-01-01`)
        .lt('date', `${selectedYear + 1}-01-01`)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching races:', error);
        setErrorRaces(error.message);
        setRacesList([]);
      } else {
        setRacesList(data || []);
      }
      setLoadingRaces(false);
    };

    fetchRaces();
  }, [selectedYear, supabase]);

  useEffect(() => {
    const fetchRaceResults = async () => {
      if (!selectedRace) {
        setRaceResults([]);
        return;
      }

      setLoadingResults(true);
      setErrorResults(null);

      const { data, error } = await supabase
        .from('race_results')
        .select('*, drivers(number)') // Select all from race_results and driver number
        .eq('race_id', selectedRace)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching race results:', error);
        setErrorResults(error.message);
        setRaceResults([]);
      } else {
        // Map the data to include driver_number directly in the RaceResult interface
        const resultsWithDriverNumbers = data?.map((result: any) => ({
          ...result,
          driver_number: result.drivers ? result.drivers.number : 'N/A',
        })) || [];
        setRaceResults(resultsWithDriverNumbers);
      }
      setLoadingResults(false);
    };

    const fetchWeatherData = async () => {
      if (!selectedRace) {
        setWeatherData(null);
        return;
      }

      setLoadingWeather(true);
      setErrorWeather(null);

      const { data, error } = await supabase
        .from('weather')
        .select('air_temp, track_temp, humidity, wind_speed, rain, pressure')
        .eq('race_id', selectedRace)
        .order('time_utc_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching weather data:', error);
        setErrorWeather(error.message);
        setWeatherData(null);
      } else if (data && data.length > 0) {
        const totalAirTemp = data.reduce((sum, row) => sum + row.air_temp, 0);
        const totalTrackTemp = data.reduce((sum, row) => sum + row.track_temp, 0);
        const totalHumidity = data.reduce((sum, row) => sum + row.humidity, 0);
        const totalWindSpeed = data.reduce((sum, row) => sum + row.wind_speed, 0);
        const totalRain = data.reduce((sum, row) => sum + row.rain, 0);
        const totalPressure = data.reduce((sum, row) => sum + row.pressure, 0);

        const avgAirTemp = totalAirTemp / data.length;
        const avgTrackTemp = totalTrackTemp / data.length;
        const avgHumidity = totalHumidity / data.length;
        const avgWindSpeed = totalWindSpeed / data.length;
        const avgPressure = totalPressure / data.length;

        let rainStatus = 'No Rain';
        if (totalRain > 0) {
          rainStatus = totalRain === data.length ? 'Constant Rain' : 'Intermittent Rain';
        }

        setWeatherData({
          avgAirTemp: parseFloat(avgAirTemp.toFixed(1)),
          avgTrackTemp: parseFloat(avgTrackTemp.toFixed(1)),
          avgHumidity: parseFloat(avgHumidity.toFixed(1)),
          avgWindSpeed: parseFloat(avgWindSpeed.toFixed(1)),
          avgPressure: parseFloat(avgPressure.toFixed(1)),
          rainStatus: rainStatus,
        });
      } else {
        setWeatherData(null); // No weather data found
      }
      setLoadingWeather(false);
    };

    fetchRaceResults();
    fetchWeatherData();
  }, [selectedRace, supabase]);

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
          disabled={loadingRaces || racesList.length === 0}
        >
          <option value="">Select a Race</option>
          {loadingRaces ? (
            <option value="" disabled>Loading Races...</option>
          ) : errorRaces ? (
            <option value="" disabled>Error loading races</option>
          ) : (
            racesList.map((race) => (
              <option key={race.id} value={race.id}>
                {race.name}
              </option>
            ))
          )}
        </select>
      </div>
      <h1 className={styles.title}>Race Results</h1>
      <WeatherSummaryCard weather={weatherData} loading={loadingWeather} error={errorWeather} />
      {errorResults && <p className={styles.error}>Error: {errorResults}</p>}
      {loadingResults ? (
        <p>Loading race results...</p>
      ) : raceResults.length === 0 && selectedRace ? (
        <p>No results found for the selected race.</p>
      ) : raceResults.length === 0 && !selectedRace ? (
        <p>Please select a race to view results.</p>
      ) : (
        <div className={styles.resultsTableContainer}>
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Number</th>
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
              {raceResults.map((result) => (
                <tr key={result.id}>
                  <td>{result.position}</td>
                  <td>{result.driver_number}</td>
                  <td>{result.vehicle}</td>
                  <td>{result.class_type}</td>
                  <td>{result.laps}</td>
                  <td>{result.elapsed_time?.replace('PT', '').toLowerCase() || ''}</td>
                  <td>{result.gap_to_first?.replace('PT', '').toLowerCase() || ''}</td>
                  <td>{result.best_lap_time?.replace('PT', '').toLowerCase() || ''}</td>
                  <td>{result.best_lap_speed_kph}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
