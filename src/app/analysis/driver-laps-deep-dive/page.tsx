'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/utils/supabase/client';
import styles from './page.module.css'; // Assuming a new CSS module for this page
import StatusIndicator from '@/components/StatusIndicator';
import WeatherSummaryCard from '@/components/WeatherSummaryCard';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface LapData {
  id: string;
  race_id: string;
  driver_id: string;
  lap_number: number;
  lap_time: string;
  lap_improvement: number | null;
  crossing_finish_line_in_pit: boolean;
  s1: string;
  s1_improvement: number | null;
  s2: string;
  s2_improvement: number | null;
  s3: string;
  s3_improvement: number | null;
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

export default function DriverLapsDeepDivePage({
  searchParams,
}: {
  searchParams: { raceId: string; driverId: string };
}) {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  const initialRaceId = searchParams.raceId;
  const initialDriverId = searchParams.driverId;

  const [allLapsData, setAllLapsData] = useState<LapData[] | null>(null);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [raceInfo, setRaceInfo] = useState<Race | null>(null);
  const [driversBestLapInfo, setDriversBestLapInfo] = useState<{ lapTime: number | null, lapNumber: number | null, s1: string | null, s2: string | null, s3: string | null } | null>(null);
  const [driversBestSectorsInfo, setDriversBestSectorsInfo] = useState<{ s1: { time: number | null, lapNumber: number | null }, s2: { time: number | null, lapNumber: number | null }, s3: { time: number | null, lapNumber: number | null } } | null>(null);
  const [driversAverageLapTime, setDriversAverageLapTime] = useState<number | null>(null);
  const [driversLapTimeStandardDeviation, setDriversLapTimeStandardDeviation] = useState<number | null>(null);
  const [driversBestTopSpeedInfo, setDriversBestTopSpeedInfo] = useState<{ speed: number | null, lapNumber: number | null } | null>(null);
  const [driversBestKPHInfo, setDriversBestKPHInfo] = useState<{ kph: number | null, lapNumber: number | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);
  const [telemetryData, setTelemetryData] = useState<any[] | null>(null);

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
      if (initialDriverId) {
        setSelectedDriverId(initialDriverId);
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
  }, [supabase, initialRaceId, initialDriverId]);

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
      } else {
        setAvailableRaces([]);
        setSelectedRaceId('');
      }
    }

    fetchRacesForSelectedYear();
  }, [supabase, selectedYear, initialRaceId]);

  useEffect(() => {
    async function fetchDriversForSelectedRace() {
      if (selectedRaceId) {
        const { data: driversData, error: driversError } = await supabase
          .from('race_results')
          .select('drivers(id, name, number)')
          .eq('race_id', selectedRaceId);

        if (driversError) {
          console.error('Error fetching drivers:', driversError);
          setAvailableDrivers([]);
          setSelectedDriverId(''); // Clear selectedDriverId on error
          return;
        }

        const participatingDrivers = driversData.map(d => ({
          id: d.drivers.id,
          name: d.drivers.name,
          number: d.drivers.number,
        }));
        setAvailableDrivers(participatingDrivers);

        // Check if the currently selected driver is still in the list of participating drivers
        const isCurrentDriverValid = participatingDrivers.some(driver => driver.id === selectedDriverId);

        if (!isCurrentDriverValid && participatingDrivers.length > 0) {
          // If the current selected driver is no longer valid, or no driver was selected,
          // default to the first driver in the new list.
          setSelectedDriverId(participatingDrivers[0].id);
        } else if (participatingDrivers.length === 0) {
          // If no drivers are available for the race, clear selectedDriverId
          setSelectedDriverId('');
        }
        // If isCurrentDriverValid is true, keep the selectedDriverId as is.
        // If selectedDriverId was initially set from URL and is valid, it will remain.
        // If user manually selected, it will remain.

      } else {
        setAvailableDrivers([]);
        setSelectedDriverId('');
      }
    }

    fetchDriversForSelectedRace();
  }, [supabase, selectedRaceId, selectedDriverId]); // Added selectedDriverId to dependencies to ensure re-evaluation when it changes.


  useEffect(() => {
    async function fetchData() {
      console.log('fetchData useEffect triggered. selectedRaceId:', selectedRaceId, 'selectedDriverId:', selectedDriverId);
      if (!selectedRaceId || !selectedDriverId) {
        // Only set error if user has interacted or if it's not initial load
        if (selectedRaceId || selectedDriverId) { // Check if any input is provided
          setError('Please select a race and a driver.');
        }
        setLoading(false);
        setAllLapsData(null);
        setDriverInfo(null);
        setRaceInfo(null);
        return;
      }

      setLoading(true);
      setError(null);
      setAiInsights(null); // Clear AI insights to regenerate on new selection
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

        // Fetch Driver Info
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, name, number')
          .eq('id', selectedDriverId)
          .single();

        if (driverError) throw driverError;
        setDriverInfo(driver);

        // Fetch Telemetry Data for the given driver and race
        const { data: telemetry, error: telemetryError } = await supabase
          .from('telemetry')
          .select('*')
          .eq('race_id', selectedRaceId)
          .eq('driver_id', selectedDriverId)
          .order('timestamp', { ascending: true });

        if (telemetryError) throw telemetryError;
        setTelemetryData(telemetry);

        // Fetch All Laps for the given driver and race
        const { data: allLaps, error: allLapsError } = await supabase
          .from('laps')
          .select('*')
          .eq('race_id', selectedRaceId)
          .eq('driver_id', selectedDriverId)
          .order('lap_number', { ascending: true });

        if (allLapsError) throw allLapsError;
        // setAllLapsData(allLaps); // Temporarily comment out to process improvements

        // Calculate improvements based on previous lap
        const lapsWithImprovements: LapData[] = allLaps.map((currentLap, index) => {
          if (index === 0) {
            return {
              ...currentLap,
              lap_improvement: null,
              s1_improvement: null,
              s2_improvement: null,
              s3_improvement: null,
            };
          }

          const prevLap = allLaps[index - 1];

          const currentLapTimeSeconds = intervalToSeconds(currentLap.lap_time);
          const prevLapTimeSeconds = intervalToSeconds(prevLap.lap_time);
          const lapImprovement = prevLapTimeSeconds - currentLapTimeSeconds; // Positive means faster

          const currentS1Seconds = currentLap.s1_seconds;
          const prevS1Seconds = prevLap.s1_seconds;
          const s1Improvement = prevS1Seconds - currentS1Seconds;

          const currentS2Seconds = currentLap.s2_seconds;
          const prevS2Seconds = prevLap.s2_seconds;
          const s2Improvement = prevS2Seconds - currentS2Seconds;

          const currentS3Seconds = currentLap.s3_seconds;
          const prevS3Seconds = prevLap.s3_seconds;
          const s3Improvement = prevS3Seconds - currentS3Seconds;

          return {
            ...currentLap,
            lap_improvement: lapImprovement,
            s1_improvement: s1Improvement,
            s2_improvement: s2Improvement,
            s3_improvement: s3Improvement,
          };
        });
        setAllLapsData(lapsWithImprovements);

        // Calculate summary data
        if (lapsWithImprovements && lapsWithImprovements.length > 0) {
          let bestLapTime = Infinity;
          let bestLap: LapData | null = null;
          let bestS1Time = Infinity;
          let bestS1LapNumber: number | null = null;
          let bestS2Time = Infinity;
          let bestS2LapNumber: number | null = null;
          let bestS3Time = Infinity;
          let bestS3LapNumber: number | null = null;
          let bestTopSpeed = -Infinity;
          let bestTopSpeedLapNumber: number | null = null;
          let bestKPH = -Infinity;
          let bestKPHLapNumber: number | null = null;

          const lapTimesInSeconds: number[] = [];

          lapsWithImprovements.forEach(lap => {
            const lapTimeSeconds = intervalToSeconds(lap.lap_time);
            lapTimesInSeconds.push(lapTimeSeconds);

            if (lapTimeSeconds < bestLapTime) {
              bestLapTime = lapTimeSeconds;
              bestLap = lap;
            }
            if (lap.s1_seconds < bestS1Time) {
              bestS1Time = lap.s1_seconds;
              bestS1LapNumber = lap.lap_number;
            }
            if (lap.s2_seconds < bestS2Time) {
              bestS2Time = lap.s2_seconds;
              bestS2LapNumber = lap.lap_number;
            }
            if (lap.s3_seconds < bestS3Time) {
              bestS3Time = lap.s3_seconds;
              bestS3LapNumber = lap.lap_number;
            }
            if (lap.top_speed > bestTopSpeed) {
              bestTopSpeed = lap.top_speed;
              bestTopSpeedLapNumber = lap.lap_number;
            }
            if (lap.kph > bestKPH) {
              bestKPH = lap.kph;
              bestKPHLapNumber = lap.lap_number;
            }
          });

          setDriversBestLapInfo({
            lapTime: bestLapTime,
            lapNumber: bestLap?.lap_number || null,
            s1: bestLap?.s1 || null,
            s2: bestLap?.s2 || null,
            s3: bestLap?.s3 || null,
          });

          setDriversBestSectorsInfo({
            s1: { time: bestS1Time === Infinity ? null : bestS1Time, lapNumber: bestS1LapNumber },
            s2: { time: bestS2Time === Infinity ? null : bestS2Time, lapNumber: bestS2LapNumber },
            s3: { time: bestS3Time === Infinity ? null : bestS3Time, lapNumber: bestS3LapNumber },
          });

          // Calculate average lap time
          const totalLapTime = lapTimesInSeconds.reduce((sum, time) => sum + time, 0);
          const averageLapTime = totalLapTime / lapTimesInSeconds.length;
          setDriversAverageLapTime(averageLapTime);

          // Calculate standard deviation
          const mean = averageLapTime;
          const variance = lapTimesInSeconds.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / lapTimesInSeconds.length;
          const standardDeviation = Math.sqrt(variance);
          setDriversLapTimeStandardDeviation(standardDeviation);

          setDriversBestTopSpeedInfo({
            speed: bestTopSpeed === -Infinity ? null : bestTopSpeed,
            lapNumber: bestTopSpeedLapNumber,
          });

          setDriversBestKPHInfo({
            kph: bestKPH === -Infinity ? null : bestKPH,
            lapNumber: bestKPHLapNumber,
          });
        }

        // --- AI Summary Generation (Moved here) ---
        if (lapsWithImprovements && driver && race && !isSendingMessage) {
          setIsSendingMessage(true); // Set loading for AI
          const driverName = driver.name ? `${driver.name} ` : '';
          const prompt = `You are an expert race engineer analyzing driver performance.
          Here is the data for driver ${driverName}(${driver.number}) in race ${race.name}:
          ${JSON.stringify(lapsWithImprovements, null, 2)}

          Provide a concise summary of the driver's performance in this race. Highlight key strengths, weaknesses, and any notable laps or incidents. Focus on lap times, sector times, consistency, and speed. Keep it under 600 words.`;

          console.log('AI Initial Summary Prompt (from fetchData):', prompt);
          const summary = await generateGeminiResponse(prompt);
          setAiInsights(summary);
          setConversationHistory([{ role: 'ai', text: summary }]);
          setIsSendingMessage(false); // Clear loading for AI
        }
        // --- End AI Summary Generation ---

      } catch (err: any) {
        console.error('Error fetching driver laps data:', err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedRaceId, selectedDriverId, supabase]); // Removed isSendingMessage from dependencies

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

  // Removed the separate useEffect for generateInitialSummary
  // useEffect(() => {
  //   const generateInitialSummary = async () => {
  //     console.log('generateInitialSummary useEffect triggered.');
  //     console.log('allLapsData:', allLapsData);
  //     console.log('driverInfo:', driverInfo);
  //     console.log('raceInfo:', raceInfo);

  //     if (allLapsData && driverInfo && raceInfo && !isSendingMessage) {
  //       setIsSendingMessage(true);
  //       const driverName = driverInfo.name ? `${driverInfo.name} ` : '';
  //       const prompt = `You are an expert race engineer analyzing driver performance.
  //       Here is the data for driver ${driverName}(${driverInfo.number}) in race ${raceInfo.name}:
  //       ${JSON.stringify(allLapsData, null, 2)}

  //       Provide a concise summary of the driver's performance in this race. Highlight key strengths, weaknesses, and any notable laps or incidents. Focus on lap times, sector times, consistency, and speed. Keep it under 300 words.`;

  //       console.log('AI Initial Summary Prompt:', prompt);
  //       const summary = await generateGeminiResponse(prompt);
  //       setAiInsights(summary);
  //       setConversationHistory([{ role: 'ai', text: summary }]);
  //       setIsSendingMessage(false);
  //     }
  //   };

  //   generateInitialSummary();
  // }, [allLapsData, driverInfo, raceInfo, selectedDriverId, selectedRaceId, generateGeminiResponse]); // Added selectedDriverId and selectedRaceId // Removed isSendingMessage from dependencies

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  const getDeltaInfo = (delta: number | null) => {
    if (delta === null || isNaN(delta)) return { text: 'N/A', className: '' };

    const text = `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}s`;
    let className = '';

    if (delta > 0.001) { // Positive delta means improvement (faster)
      className = styles['delta-good'];
    } else if (delta < -0.001) { // Negative delta means regression (slower)
      className = styles['delta-bad'];
    } else { // Delta is zero or very close
      className = styles['delta-neutral'];
    }

    return { text, className };
  };

  const getValueStyle = (currentValue: number | null, bestValue: number | null) => {
    if (bestValue === null || currentValue === null || isNaN(currentValue)) return '';
    // Use a small tolerance for float comparison
    if (Math.abs(currentValue - bestValue) < 0.001) {
        return styles['delta-neutral']; // Highlight the best value
    }
    return '';
  };

  const handleGoClick = () => {
    if (selectedRaceId && selectedDriverId) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set('raceId', selectedRaceId);
      newSearchParams.set('driverId', selectedDriverId);
      router.push(`?${newSearchParams.toString()}`);
      // The useEffect for fetchData will re-run due to selectedRaceId and selectedDriverId changing
    } else {
      setError('Please select a race and a driver.');
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
    const prompt = `You are an expert race engineer analyzing driver performance.
    Here is the data for driver ${driverInfo?.name} (${driverInfo?.number}) in race ${raceInfo?.name}:
    Laps Data: ${JSON.stringify(allLapsData, null, 2)}
    Telemetry Data: ${JSON.stringify(telemetryData, null, 2)}
    Weather Summary: ${JSON.stringify(weatherData, null, 2)}

    Based on the provided data and the conversation history, answer the user's question: "${newUserMessage.text}".
    Keep your response concise and directly address the question.`;

    console.log('AI User Message Prompt:', prompt);
    const aiResponse = await generateGeminiResponse(prompt);
    setConversationHistory((prev) => [...prev, { role: 'ai', text: aiResponse }]);
    setIsSendingMessage(false);
  };

  if (loading) {
    return <StatusIndicator loading={true} loadingMessage="Loading driver laps data..." />;
  }

  if (error) {
    return <StatusIndicator error={true} errorMessage={error} />;
  }



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

        <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className={styles.select}>
          <option value="">Select Driver</option>
          {availableDrivers.map(driver => (
            <option key={driver.id} value={driver.id}>{driver.name} ({driver.number})</option>
          ))}
        </select>

        <button onClick={handleGoClick} className={styles.button}>Go</button>
      </div>

      <h1 className={styles.pageTitle}>Driver Laps Deep Dive</h1>

      <div className={styles.headerInfo}>
        <p><strong>Race:</strong> {raceInfo?.name || selectedRaceId}</p>
        <p><strong>Driver:</strong> {driverInfo?.name || `Driver ${driverInfo?.number}` || selectedDriverId}</p>
      </div>

      <WeatherSummaryCard weather={weatherData} loading={loadingWeather} error={errorWeather} />

      <div className={styles.summaryGrid}>
        {driversBestLapInfo && driversBestLapInfo.lapTime !== null && (
          <div className={styles.summarySection}>
            <h2>Driver's Best Lap</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Lap Time</span>
              <span className={styles.summaryValue}>
                {driversBestLapInfo.lapTime !== null ? formatTime(driversBestLapInfo.lapTime) : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestLapInfo.lapNumber || 'N/A'})</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S1</span>
              <span className={styles.summaryValue}>{driversBestLapInfo.s1 || 'N/A'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S2</span>
              <span className={styles.summaryValue}>{driversBestLapInfo.s2 || 'N/A'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S3</span>
              <span className={styles.summaryValue}>{driversBestLapInfo.s3 || 'N/A'}</span>
            </div>
          </div>
        )}

        {driversBestSectorsInfo && (driversBestSectorsInfo.s1.time !== null || driversBestSectorsInfo.s2.time !== null || driversBestSectorsInfo.s3.time !== null) && (
          <div className={styles.summarySection}>
            <h2>Driver's Best Sectors</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S1</span>
              <span className={styles.summaryValue}>
                {driversBestSectorsInfo.s1.time !== null ? formatTime(driversBestSectorsInfo.s1.time) : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestSectorsInfo.s1.lapNumber || 'N/A'})</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S2</span>
              <span className={styles.summaryValue}>
                {driversBestSectorsInfo.s2.time !== null ? formatTime(driversBestSectorsInfo.s2.time) : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestSectorsInfo.s2.lapNumber || 'N/A'})</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>S3</span>
              <span className={styles.summaryValue}>
                {driversBestSectorsInfo.s3.time !== null ? formatTime(driversBestSectorsInfo.s3.time) : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestSectorsInfo.s3.lapNumber || 'N/A'})</span>
              </span>
            </div>
          </div>
        )}

        {(driversAverageLapTime !== null || driversLapTimeStandardDeviation !== null) && (
          <div className={styles.summarySection}>
            <h2>Lap Time Statistics</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Average Lap Time</span>
              <span className={styles.summaryValue}>{driversAverageLapTime !== null ? formatTime(driversAverageLapTime) : 'N/A'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Consistency (Std Dev)</span>
              <span className={styles.summaryValue}>{driversLapTimeStandardDeviation !== null ? driversLapTimeStandardDeviation.toFixed(3) + 's' : 'N/A'}</span>
            </div>
          </div>
        )}

        {(driversBestTopSpeedInfo && driversBestTopSpeedInfo.speed !== null) || (driversBestKPHInfo && driversBestKPHInfo.kph !== null) ? (
          <div className={styles.summarySection}>
            <h2>Speed Statistics</h2>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Best Top Speed</span>
              <span className={styles.summaryValue}>
                {driversBestTopSpeedInfo?.speed !== null ? driversBestTopSpeedInfo?.speed.toFixed(2) + ' KPH' : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestTopSpeedInfo?.lapNumber || 'N/A'})</span>
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Best Average KPH</span>
              <span className={styles.summaryValue}>
                {driversBestKPHInfo?.kph !== null ? driversBestKPHInfo?.kph.toFixed(2) + ' KPH' : 'N/A'}
                <span className={styles.summaryContext}>(Lap {driversBestKPHInfo?.lapNumber || 'N/A'})</span>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.tableContainer}>
        <h2>All Laps for Driver {driverInfo?.number} in {raceInfo?.name}</h2>
        <table className={styles.lapDataTable}>
          <thead>
            <tr>
              <th>Lap #</th>
              <th>Lap Time</th>
              <th>S1</th>
              <th>S2</th>
              <th>S3</th>
              <th>KPH</th>
              <th>Top Speed</th>
              <th>Lap Impr.</th>
              <th>S1 Impr.</th>
              <th>S2 Impr.</th>
              <th>S3 Impr.</th>
              <th>Flag at FL</th>
            </tr>
          </thead>
          <tbody>
            {(allLapsData || []).map(lap => {
              const lapImprovementInfo = getDeltaInfo(lap.lap_improvement);
              const s1ImprovementInfo = getDeltaInfo(lap.s1_improvement);
              const s2ImprovementInfo = getDeltaInfo(lap.s2_improvement);
              const s3ImprovementInfo = getDeltaInfo(lap.s3_improvement);

              return (
                <tr key={lap.id}>
                  <td>{lap.lap_number}</td>
                  <td className={getValueStyle(intervalToSeconds(lap.lap_time), driversBestLapInfo?.lapTime ?? null)}>{lap.lap_time}</td>
                  <td className={getValueStyle(lap.s1_seconds, driversBestSectorsInfo?.s1.time ?? null)}>{lap.s1}</td>
                  <td className={getValueStyle(lap.s2_seconds, driversBestSectorsInfo?.s2.time ?? null)}>{lap.s2}</td>
                  <td className={getValueStyle(lap.s3_seconds, driversBestSectorsInfo?.s3.time ?? null)}>{lap.s3}</td>
                  <td className={getValueStyle(lap.kph, driversBestKPHInfo?.kph ?? null)}>{lap.kph?.toFixed(2) || 'N/A'}</td>
                  <td className={getValueStyle(lap.top_speed, driversBestTopSpeedInfo?.speed ?? null)}>{lap.top_speed?.toFixed(2) || 'N/A'}</td>
                  <td className={lapImprovementInfo.className}>{lapImprovementInfo.text}</td>
                  <td className={s1ImprovementInfo.className}>{s1ImprovementInfo.text}</td>
                  <td className={s2ImprovementInfo.className}>{s2ImprovementInfo.text}</td>
                  <td className={s3ImprovementInfo.className}>{s3ImprovementInfo.text}</td>
                  <td>{lap.flag_at_fl || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`${styles.summarySection} ${styles.columnDefinitionsSection}`}>
        <h2>Table Column Definitions</h2>
        <ul>
          <li><strong>Lap #</strong>: The sequential number of the lap within the race.</li>
          <li><strong>Lap Time</strong>: The total time taken to complete that specific lap.</li>
          <li><strong>S1, S2, S3</strong>: The time recorded for the first, second, and third sectors of that lap, respectively.</li>
          <li><strong>KPH</strong>: The average speed in Kilometers Per Hour achieved during that lap.</li>
          <li><strong>Top Speed</strong>: The maximum speed in Kilometers Per Hour recorded during that lap.</li>
          <li><strong>Lap Impr.</strong>: Improvement in total lap time compared to the previous lap. A positive value means a faster lap.</li>
          <li><strong>S1 Impr., S2 Impr., S3 Impr.</strong>: Improvement in Sector 1, 2, and 3 times compared to the previous respective sector times. A positive value means a faster sector.</li>
          <li><strong>Flag at FL</strong>: Indicates the flag status at the finish line (e.g., 'Green', 'Yellow', 'Chequered').</li>
        </ul>
        <h3>Color Legend:</h3>
        <ul>
          <li style={{ color: '#28a745' }}><strong>Green:</strong> Indicates an improvement (faster time) compared to the previous lap.</li>
          <li style={{ color: '#FF0000' }}><strong>Bright Red:</strong> Indicates a regression (slower time) compared to the previous lap.</li>
          <li style={{ color: '#FFFF00' }}><strong>Bright Yellow:</strong> Highlights the driver's best performance for that specific metric (e.g., fastest lap time, fastest S1, highest KPH) across all laps in the race.</li>
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