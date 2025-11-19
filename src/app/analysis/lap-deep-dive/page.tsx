'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import StatusIndicator from '@/components/StatusIndicator';
import WeatherSummaryCard from '@/components/WeatherSummaryCard';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

interface WeatherData {
  avgAirTemp: number | null;
  avgTrackTemp: number | null;
  avgHumidity: number | null;
  avgWindSpeed: number | null;
  avgPressure: number | null;
  rainStatus: string;
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

// Environment variables for Gemini API
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro';
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/';

// Function to call Gemini API
const generateGeminiResponse = async (prompt: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not set.');
    return 'Error: Gemini API key is not configured.';
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return `Error from AI: ${errorData.error?.message || 'Unknown error'}`;
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (err: any) {
    console.error('Failed to call Gemini API:', err);
    return `Error: Failed to connect to AI (${err.message})`;
  }
};

export default function LapDeepDivePage({
  searchParams,
}: {
  searchParams: { raceId: string; lapNumber: string };
}) {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);
  const [inputLapNumber, setInputLapNumber] = useState<string>('');
  const [availableLapNumbers, setAvailableLapNumbers] = useState<number[]>([]);

  const initialRaceId = searchParams.raceId;
  const initialLapNumber = searchParams.lapNumber;

  const [allLapsData, setAllLapsData] = useState<DisplayLapData[] | null>(null);
  const [raceWinnerInfo, setRaceWinnerInfo] = useState<RaceResult | null>(null);
  const [bestSectorsInfo, setBestSectorsInfo] = useState<{ s1: BestSector | null, s2: BestSector | null, s3: BestSector | null }>({ s1: null, s2: null, s3: null });
  const [bestOverallLapInfo, setBestOverallLapInfo] = useState<{ bestLapTime: BestSector | null, bestKPH: BestSector | null, bestTopSpeed: BestSector | null }>({ bestLapTime: null, bestKPH: null, bestTopSpeed: null });
  const [slowestOverallLapInfo, setSlowestOverallLapInfo] = useState<{ slowestLapTime: BestSector | null, lowestKPH: BestSector | null, lowestTopSpeed: BestSector | null }>({ slowestLapTime: null, lowestKPH: null, lowestTopSpeed: null });
  const [raceInfo, setRaceInfo] = useState<Race | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);

  // AI Race Engineer states
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false); // New state for loading indicator


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
        setAiInsights(null); // Clear AI insights
        setConversationHistory([]); // Clear conversation history
        return;
      }

      setLoading(true);
      setError(null);
      setAiInsights(null); // Clear AI insights
      setConversationHistory([]); // Clear conversation history

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
        // setAllLapsData(allLaps); // Temporarily comment out to process deltas

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

          // --- AI Summary Generation ---
          if (!isSendingMessage) {
            setIsSendingMessage(true);
            const prompt = `You are a world leading expert race engineer analyzing lap performance.\n            Here is the data for lap number ${inputLapNumber} in race ${race.name}:\n            ${JSON.stringify(lapsWithDeltas, null, 2)}\n            ${JSON.stringify(drivers, null, 2)}\n
            Provide a concise summary of the performance of all drivers on this lap. Highlight key strengths, weaknesses, and any notable aspects. Focus on lap times, sector times, consistency, and speed relative to each other. Keep it under 600 words. Don't reference driver ids use the driver number.`;

            const summary = await generateGeminiResponse(prompt);
            setAiInsights(summary);
            setConversationHistory([{ role: 'ai', text: summary }]);
            setIsSendingMessage(false);
          }
          // --- End AI Summary Generation ---

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

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!selectedRaceId) {
        setWeatherData(null);
        return;
      }

      setLoadingWeather(true);
      setErrorWeather(null);

      const { data, error } = await supabase
        .from('weather')
        .select('air_temp, track_temp, humidity, wind_speed, rain, pressure')
        .eq('race_id', selectedRaceId)
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

    fetchWeatherData();
  }, [selectedRaceId, supabase]);

  if (loading) {
    return <StatusIndicator loading={true} loadingMessage="Loading lap deep dive data..." />;
  }

  if (error) {
    return <StatusIndicator error={true} errorMessage={error} />;
  }

  if (!allLapsData || allLapsData.length === 0) {
    return <StatusIndicator noDataMessage="No lap data found for the selected parameters." data={allLapsData || []} />;
  }

  const getDriverNumber = (driverId: string) => {
    return allDrivers?.find(d => d.id === driverId)?.number || 'N/A';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  const getDeltaInfo = (delta: number | null, metricType: 'time' | 'speed') => {
    if (delta === null || isNaN(delta)) return { text: 'N/A', className: '' };
  
    const isTime = metricType === 'time';
    // For speed, the delta is already a raw number, for time it's in seconds.
    const suffix = isTime ? 's' : '';
    const text = `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}${suffix}`;
    let className = '';
  
    // For time, lower is better. A positive delta means you are SLOWER than the best.
    if (isTime) {
      if (delta > 0.001) className = styles['delta-bad']; // Slower
      else if (delta < -0.001) className = styles['delta-good']; // Faster
      else className = styles['delta-neutral']; // Best
    } 
    // For speed, higher is better. The delta is `current - best`, so it's <= 0.
    // A negative delta means you are SLOWER than the best.
    else { // speed
      if (delta < -0.01) className = styles['delta-bad']; // Slower
      else if (delta > 0.01) className = styles['delta-good']; // Faster (not possible with current logic but good practice)
      else className = styles['delta-neutral']; // Best
    }
  
    return { text, className };
  };

  const handleGoClick = () => {
    if (selectedRaceId && inputLapNumber) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('raceId', selectedRaceId);
      newSearchParams.set('lapNumber', inputLapNumber);
      router.push(`?${newSearchParams.toString()}`);
      // The useEffect for fetchData will re-run due to selectedRaceId and inputLapNumber changing
    } else {
      setError('Please select a race and enter a lap number.');
    }
  };

  // Function to handle sending messages to AI
  const handleSendMessage = async () => {
    if (!userQuestion.trim() || isSendingMessage) return;

    const newUserMessage = { role: 'user' as const, text: userQuestion };
    setConversationHistory((prev) => [...prev, newUserMessage]);
    setUserQuestion('');
    setIsSendingMessage(true);

    const context = `Current conversation: ${conversationHistory.map(msg => `${msg.role}: ${msg.text}`).join('\n')}\nUser: ${newUserMessage.text}`;
    const prompt = `You are an expert race engineer analyzing lap performance.
    Here is the data for lap number ${inputLapNumber} in race ${raceInfo?.name}:
    ${JSON.stringify(allLapsData, null, 2)}
    ${JSON.stringify(allDrivers, null, 2)}
    Weather Summary: ${JSON.stringify(weatherData, null, 2)}

    Based on the provided data and the conversation history, answer the user's question: "${newUserMessage.text}".
    Keep your response concise and directly address the question.`;

    const aiResponse = await generateGeminiResponse(prompt);
    setConversationHistory((prev) => [...prev, { role: 'ai', text: aiResponse }]);
    setIsSendingMessage(false);
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

      <WeatherSummaryCard weather={weatherData} loading={loadingWeather} error={errorWeather} />

      <div className={styles.summaryGrid}>
        {raceWinnerInfo && (
          <div className={styles.summarySection}>
            <h2>Race Winner</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Driver</span>
              <span className={styles.summaryValue}>{raceWinnerInfo.drivers.name} ({raceWinnerInfo.drivers.number})</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Best Lap</span>
              <span className={styles.summaryValue}>{raceWinnerInfo.best_lap_time}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Time</span>
              <span className={styles.summaryValue}>{raceWinnerInfo.elapsed_time}</span>
            </div>
          </div>
        )}

        {bestSectorsInfo.s1 && bestSectorsInfo.s2 && bestSectorsInfo.s3 && (
          <div className={styles.summarySection}>
            <h2>Best Sectors for Lap {inputLapNumber}</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Sector 1</span>
              <span className={styles.summaryValue}>
                {formatTime(bestSectorsInfo.s1.time)}
                <span className={styles.summaryContext}>by Driver {bestSectorsInfo.s1.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Sector 2</span>
              <span className={styles.summaryValue}>
                {formatTime(bestSectorsInfo.s2.time)}
                <span className={styles.summaryContext}>by Driver {bestSectorsInfo.s2.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Sector 3</span>
              <span className={styles.summaryValue}>
                {formatTime(bestSectorsInfo.s3.time)}
                <span className={styles.summaryContext}>by Driver {bestSectorsInfo.s3.driverNumber}</span>
              </span>
            </div>
          </div>
        )}

        {bestOverallLapInfo.bestLapTime && bestOverallLapInfo.bestKPH && bestOverallLapInfo.bestTopSpeed && (
          <div className={styles.summarySection}>
            <h2>Overall Best for Lap {inputLapNumber}</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Best Lap Time</span>
              <span className={styles.summaryValue}>
                {formatTime(bestOverallLapInfo.bestLapTime.time)}
                <span className={styles.summaryContext}>by Driver {bestOverallLapInfo.bestLapTime.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Top Average KPH</span>
              <span className={styles.summaryValue}>
                {bestOverallLapInfo.bestKPH.time.toFixed(2)}
                <span className={styles.summaryContext}>by Driver {bestOverallLapInfo.bestKPH.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Top Speed</span>
              <span className={styles.summaryValue}>
                {bestOverallLapInfo.bestTopSpeed.time.toFixed(2)}
                <span className={styles.summaryContext}>by Driver {bestOverallLapInfo.bestTopSpeed.driverNumber}</span>
              </span>
            </div>
          </div>
        )}

        {slowestOverallLapInfo.slowestLapTime && slowestOverallLapInfo.lowestKPH && slowestOverallLapInfo.lowestTopSpeed && (
          <div className={styles.summarySection}>
            <h2>Overall Slowest for Lap {inputLapNumber}</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Slowest Lap Time</span>
              <span className={styles.summaryValue}>
                {formatTime(slowestOverallLapInfo.slowestLapTime.time)}
                <span className={styles.summaryContext}>by Driver {slowestOverallLapInfo.slowestLapTime.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Lowest Average KPH</span>
              <span className={styles.summaryValue}>
                {slowestOverallLapInfo.lowestKPH.time.toFixed(2)}
                <span className={styles.summaryContext}>by Driver {slowestOverallLapInfo.lowestKPH.driverNumber}</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Lowest Top Speed</span>
              <span className={styles.summaryValue}>
                {slowestOverallLapInfo.lowestTopSpeed.time.toFixed(2)}
                <span className={styles.summaryContext}>by Driver {slowestOverallLapInfo.lowestTopSpeed.driverNumber}</span>
              </span>
            </div>
          </div>
        )}
      </div>

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
            {allLapsData.map(lap => {
              const lapTimeDeltaInfo = getDeltaInfo(lap.lap_time_delta, 'time');
              const s1DeltaInfo = getDeltaInfo(lap.s1_delta, 'time');
              const s2DeltaInfo = getDeltaInfo(lap.s2_delta, 'time');
              const s3DeltaInfo = getDeltaInfo(lap.s3_delta, 'time');
              const kphDeltaInfo = getDeltaInfo(lap.kph_delta, 'speed');
              const topSpeedDeltaInfo = getDeltaInfo(lap.top_speed_delta, 'speed');

              return (
                <tr key={lap.id}>
                  <td>{getDriverNumber(lap.driver_id)}</td>
                  <td>{lap.lap_time}</td>
                  <td className={lapTimeDeltaInfo.className}>{lapTimeDeltaInfo.text}</td>
                  <td>{lap.s1}</td>
                  <td className={s1DeltaInfo.className}>{s1DeltaInfo.text}</td>
                  <td>{lap.s2}</td>
                  <td className={s2DeltaInfo.className}>{s2DeltaInfo.text}</td>
                  <td>{lap.s3}</td>
                  <td className={s3DeltaInfo.className}>{s3DeltaInfo.text}</td>
                  <td>{lap.kph?.toFixed(2) || 'N/A'}</td>
                  <td className={kphDeltaInfo.className}>{kphDeltaInfo.text}</td>
                  <td>{lap.top_speed?.toFixed(2) || 'N/A'}</td>
                  <td className={topSpeedDeltaInfo.className}>{topSpeedDeltaInfo.text}</td>
                </tr>
              );
            })}
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
        <h3>Color Legend for Delta Values:</h3>
        <ul>
          <li style={{ color: '#28a745' }}><strong>Green:</strong> Faster than the best (should not occur with current delta calculation, but indicates improvement).</li>
          <li style={{ color: '#FF0000' }}><strong>Bright Red:</strong> Slower than the best.</li>
          <li style={{ color: '#FFFF00' }}><strong>Bright Yellow:</strong> Equal to the best (i.e., the fastest time or highest speed).</li>
        </ul>
      </div>

      {/* AI Race Engineer Section */}
      <div className={styles.aiPanel}>
        <h3 className={styles.aiPanelTitle}>AI Race Engineer</h3>
        <div className={styles.aiChatBox}>
          {aiInsights && <div className={styles.aiMessage}><MarkdownRenderer content={aiInsights} /></div>}
          {conversationHistory.map((msg, index) => (
            <div key={index} className={msg.role === 'ai' ? styles.aiMessage : styles.userMessage}>
              {msg.role === 'ai' ? <MarkdownRenderer content={msg.text} /> : msg.text}
            </div>
          ))}
        </div>
        <div className={styles.aiInputContainer}>
          <input
            type="text"
            placeholder="Ask a question..."
            className={styles.aiInput}
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            disabled={isSendingMessage} // Disable input while sending
          />
          <button className={styles.aiSendButton} onClick={handleSendMessage} disabled={isSendingMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}