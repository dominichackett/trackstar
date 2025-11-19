'use client';

import { useState, useEffect ,Fragment} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './page.module.css';
import 'leaflet/dist/leaflet.css';
import StatusIndicator from '@/components/StatusIndicator';
import { getSupabaseClient } from '@/utils/supabase/client';
import LapDataDisplay from '@/components/LapDataDisplay';
import WeatherSummaryCard from '@/components/WeatherSummaryCard';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

// Environment variables for Gemini API
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro';
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/';

const RaceMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

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

export default function AnalysisPage() {
  const supabase = getSupabaseClient();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1974 + 1 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [racesList, setRacesList] = useState<Race[]>([]);
  const [loadingRaces, setLoadingRaces] = useState<boolean>(true);
  const [errorRaces, setErrorRaces] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedLap, setSelectedLap] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [lapsList, setLapsList] = useState<number[]>([]);
  const [driversList, setDriversList] = useState<{ id: string; name: string; number: number; }[]>([]);
  const [telemetryData, setTelemetryData] = useState({
    speed: [],
    rpm: [],
    throttleBrake: [],
    accelerationSteering: [],
  });
  const [processedTelemetryForTable, setProcessedTelemetryForTable] = useState<any[]>([]);
  const [raceLinesForMap, setRaceLinesForMap] = useState({});
  const [speedRange, setSpeedRange] = useState<{min: number, max: number}>({min: 0, max: 0});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const itemsPerPage = 40;
  const [loadingTelemetry, setLoadingTelemetry] = useState<boolean>(false);
  const [errorTelemetry, setErrorTelemetry] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [errorWeather, setErrorWeather] = useState<string | null>(null);

  // AI Race Engineer states
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Welcome! Ask me anything about this race.' }
  ]);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false); // New state for loading indicator
  const [initialAnalysisDone, setInitialAnalysisDone] = useState<boolean>(false);
  const [lapData, setLapData] = useState<any>(null);
  const [selectedDataPoints, setSelectedDataPoints] = useState<string[]>([]);
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
      console.log('Fetching races for year:', selectedYear);
      setLoadingRaces(true);
      setErrorRaces(null);
      setRacesList([]);

      const { data, error } = await supabase
        .from('races')
        .select('id, name')
        .gte('date', `${selectedYear}-01-01`)
        .lt('date', `${selectedYear + 1}-01-01`)
        .order('date', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error fetching races:', error);
        setErrorRaces(error.message);
      } else {
        const races = data || [];
        console.log('Setting races:', races);
        setRacesList(races);
        if (races.length > 0) {
          console.log('Setting selected race:', races[0].id);
          setSelectedRace(races[0].id);
        } else {
          console.log('No races found, setting selected race to empty string');
          setSelectedRace('');
        }
      }
      setLoadingRaces(false);
    };

    fetchRaces();
  }, [selectedYear, supabase]);

  useEffect(() => {
    const fetchLapsAndDrivers = async () => {
      if (!selectedRace) return;

      const { data: lapsData, error: lapsError } = await supabase
        .from('lap_events')
        .select('lap_number')
        .eq('race_id', selectedRace)
        .order('lap_number', { ascending: true });

      if (lapsError) {
        console.error('Error fetching laps:', lapsError);
      } else {
        const distinctLaps = [...new Set(lapsData.map(l => l.lap_number))];
        setLapsList(distinctLaps);
        if (distinctLaps.length > 0) {
          setSelectedLap(distinctLaps[0].toString());
        }
      }

      const { data: driversData, error: driversError } = await supabase
        .from('race_results')
        .select('drivers(id, name, number)')
        .eq('race_id', selectedRace);

      if (driversError) {
        console.error('Error fetching drivers:', driversError);
      } else {
        const participatingDrivers = driversData.map(d => ({
          id: d.drivers.id,
          name: d.drivers.name,
          number: d.drivers.number,
        }));
        setDriversList(participatingDrivers);
        if (participatingDrivers.length > 0) {
          setSelectedDriver(participatingDrivers[0].id);
        }
      }
    };

    fetchLapsAndDrivers();
  }, [selectedRace]);

  useEffect(() => {
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

    fetchWeatherData();
  }, [selectedRace, supabase]);

  useEffect(() => {
    console.log('fetchTelemetry called');
    console.log('selectedRace:', selectedRace);
    console.log('selectedLap:', selectedLap);
    console.log('selectedDriver:', selectedDriver);
    console.log('driversList:', driversList);

    const fetchTelemetry = async () => {
      if (!selectedRace || !selectedLap || !selectedDriver) {
        setTelemetryData({ speed: [], rpm: [], throttleBrake: [], accelerationSteering: [] });
        setRaceLinesForMap({});
        setProcessedTelemetryForTable([]); // Clear table data
        setLoadingTelemetry(false); // Ensure loading is false if conditions not met
        setErrorTelemetry(null); // Clear errors
        return;
      }

      setLoadingTelemetry(true); // Set loading to true
      setErrorTelemetry(null); // Clear previous errors
      const driverIdToNumberMap = new Map(driversList.map(d => [d.id, d.number]));

      let query = supabase
        .from('telemetry')
        .select('timestamp, name, value, driver_id')
        .eq('race_id', selectedRace)
        .eq('lap_number', parseInt(selectedLap, 10))
        .in('name', ['speed', 'nmot', 'ath', 'aps', 'pbrake_f', 'pbrake_r', 'accx_can', 'accy_can', 'Steering_Angle', 'Laptrigger_lapdist_dls', 'VBOX_Long_Minutes', 'VBOX_Lat_Min']);

      query = query.eq('driver_id', selectedDriver);

      const { data, error } = await query.order('timestamp', { ascending: true });
     
      if (error) {
        console.error('Error fetching telemetry:', error);
        setErrorTelemetry(error.message);
        setProcessedTelemetryForTable([]); // Clear data on error
        setLoadingTelemetry(false); // Set loading to false on error
        return;
      }
     console.log('Data: ',data)
      const telemetryByTime = new Map();
      const driverNumber = driverIdToNumberMap.get(selectedDriver);

      if (driverNumber === undefined || driverNumber === null) {
        console.warn('Selected driver number not found.');
        setTelemetryData({ speed: [], rpm: [], throttleBrake: [], accelerationSteering: [] });
        setRaceLinesForMap({});
        setProcessedTelemetryForTable([]); // Clear table data
        setLoadingTelemetry(false); // Set loading to false
        return;
      }

      // Collect all unique timestamps
      const uniqueTimestamps = [...new Set(data.map(d => d.timestamp))].sort();

      uniqueTimestamps.forEach(timestamp => {
        const timestampKey = new Date(timestamp).toISOString();
        const row: { timestamp: Date; [key: string]: any } = { timestamp: new Date(timestamp) };

        // Initialize all expected keys for the current driver to null
        const expectedTelemetryNames = ['speed', 'nmot', 'ath', 'aps', 'pbrake_f', 'pbrake_r', 'accx_can', 'accy_can', 'Steering_Angle', 'Laptrigger_lapdist_dls', 'VBOX_Lat_Min', 'VBOX_Long_Minutes'];
        expectedTelemetryNames.forEach(name => {
          row[`${driverNumber}_${name}`] = null;
        });

        // Populate with actual data
        data.filter(d => d.timestamp === timestamp && d.driver_id === selectedDriver).forEach(d => {
          row[`${driverNumber}_${d.name}`] = d.value;
        });
        telemetryByTime.set(timestampKey, row);
      });

      const processedData = [...telemetryByTime.values()];
      console.log('Processed telemetry data for charts:', processedData);
      setProcessedTelemetryForTable(processedData);
      setCurrentPage(1); // Reset to first page on new data

      // Prepare data for the map
      const telemetryPath: Array<any> = [];
      processedData.forEach(d => {
        const lat = d[`${driverNumber}_VBOX_Lat_Min`];
        const lon = d[`${driverNumber}_VBOX_Long_Minutes`];
        if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
          telemetryPath.push({
            lat: lat,
            lon: lon,
            timestamp: d.timestamp.toISOString(),
            speed: d[`${driverNumber}_speed`],
            rpm: d[`${driverNumber}_nmot`],
            throttle: d[`${driverNumber}_ath`],
            accelPedal: d[`${driverNumber}_aps`],
            brakeF: d[`${driverNumber}_pbrake_f`],
            brakeR: d[`${driverNumber}_pbrake_r`],
            accelX: d[`${driverNumber}_accx_can`],
            accelY: d[`${driverNumber}_accy_can`],
            steeringAngle: d[`${driverNumber}_Steering_Angle`],
            lapDist: d[`${driverNumber}_Laptrigger_lapdist_dls`],
          });
        }
      });

      const speeds = telemetryPath.map(d => d.speed).filter(s => s !== null && s !== undefined) as number[];
      const minSpeed = Math.min(...speeds);
      const maxSpeed = Math.max(...speeds);
      setSpeedRange({min: minSpeed, max: maxSpeed});

      setRaceLinesForMap({ [selectedDriver]: telemetryPath });

      const speedData = processedData.map(d => ({
        timestamp: d.timestamp,
        [`${driverNumber}_speed`]: d[`${driverNumber}_speed`],
      }));

      const rpmData = processedData.map(d => ({
        timestamp: d.timestamp,
        [`${driverNumber}_nmot`]: d[`${driverNumber}_nmot`],
      }));

      const throttleBrakeData = processedData.map(d => {
        const row = { timestamp: d.timestamp };
        const driverNumber = driverIdToNumberMap.get(selectedDriver);
        if (driverNumber !== undefined && driverNumber !== null) {
          row[`${driverNumber}_ath`] = d[`${driverNumber}_ath`];
          row[`${driverNumber}_aps`] = d[`${driverNumber}_aps`];
          row[`${driverNumber}_pbrake_f`] = d[`${driverNumber}_pbrake_f`];
          row[`${driverNumber}_pbrake_r`] = d[`${driverNumber}_pbrake_r`];
        }
        return row;
      });

      const accelerationSteeringData = processedData.map(d => {
        const row = { timestamp: d.timestamp };
        const driverNumber = driverIdToNumberMap.get(selectedDriver);
        if (driverNumber !== undefined && driverNumber !== null) {
          row[`${driverNumber}_accx_can`] = d[`${driverNumber}_accx_can`];
          row[`${driverNumber}_accy_can`] = d[`${driverNumber}_accy_can`];
          row[`${driverNumber}_Steering_Angle`] = d[`${driverNumber}_Steering_Angle`];
        }
        return row;
      });

      console.log('Processed speedData:', speedData);
      console.log('Processed rpmData:', rpmData);
      setTelemetryData({
        speed: speedData,
        rpm: rpmData,
        throttleBrake: throttleBrakeData,
        accelerationSteering: accelerationSteeringData,
      });
      setLoadingTelemetry(false); // Set loading to false after data is processed
    };

    fetchTelemetry();
  }, [selectedRace, selectedLap, selectedDriver, driversList]);

  useEffect(() => {
    const fetchLapData = async () => {
      if (!selectedRace || !selectedLap || !selectedDriver) {
        setLapData(null);
        return;
      }

      const { data, error } = await supabase
        .from('laps')
        .select('*')
        .eq('race_id', selectedRace)
        .eq('lap_number', parseInt(selectedLap, 10))
        .eq('driver_id', selectedDriver)
        .single(); // We expect only one lap record

      if (error) {
        console.error('Error fetching lap data:', error);
        setLapData(null);
      } else {
        setLapData(data);
      }
    };

    fetchLapData();
  }, [selectedRace, selectedLap, selectedDriver, supabase]);

  useEffect(() => {
    const getInitialAnalysis = async () => {
      if (processedTelemetryForTable.length > 0 && !initialAnalysisDone) {
        setIsSendingMessage(true);
        const driverName = driversList.find(d => d.id === selectedDriver)?.name || 'Unknown Driver';
        const raceName = racesList.find(r => r.id === selectedRace)?.name || 'Unknown Race';

        // Prepare telemetry for the prompt (no truncation as per user request)
        const telemetryToSend = processedTelemetryForTable;

        const prompt = `
          You are a world leading expert AI Race Engineer. Provide an insightful overview of the driver's performance on this lap based on the following data.
          Context:
          - Race: ${raceName}
          - Driver: ${driverName}
          - Lap Number: ${selectedLap}
          - Lap Data: ${JSON.stringify(lapData, null, 2)}
          - Weather Data: ${JSON.stringify(weatherData, null, 2)}
          
          - Telemetry Data: ${JSON.stringify(telemetryToSend, null, 2)}

          What are the key takeaways from this lap?
          Response should be at least 300 words.
        `;

        const aiResponse = await generateGeminiResponse(prompt);
        setConversationHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setIsSendingMessage(false);
        setInitialAnalysisDone(true);
      }
    };

    getInitialAnalysis();
  }, [processedTelemetryForTable, initialAnalysisDone, selectedDriver, selectedLap, selectedRace, driversList, racesList, lapData]);

  useEffect(() => {
    setInitialAnalysisDone(false);
    setConversationHistory([{ role: 'ai', text: 'Welcome! Ask me anything about this race.' }]);
    setSelectedDataPoints([]); // Clear selections when context changes
  }, [selectedRace, selectedLap, selectedDriver]);

  const handleDataPointSelect = (timestamp: string) => {
    setSelectedDataPoints(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(timestamp)) {
        newSelection.delete(timestamp);
      } else {
        newSelection.add(timestamp);
      }
      return Array.from(newSelection);
    });
  };

  const handleDriverChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDriver(event.target.value);
  };

  const getDriverColor = (driverId: string) => {
    const colors = ['#E30613', '#FFFFFF', '#00FF00', '#00FFFF', '#FF00FF', '#FFFF00', '#800000', '#008000', '#000080', '#808000'];
    // Since only one driver is selected, we can just return the first color, or a color based on the driverId if needed.
    // For simplicity, let's just return the first color for the single selected driver.
    return colors[0];
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(event.target.value));
  };

  const handleRaceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRace(event.target.value);
    setSelectedLap('');
    setLapsList([]);
    setSelectedDriver('');
  };

  const handleLapChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLap(event.target.value);
  };

  const totalPages = Math.ceil(processedTelemetryForTable.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = processedTelemetryForTable.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleGoToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(event.target.value);
  };

  const handlePageInputSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber)) {
      handleGoToPage(pageNumber);
      setPageInput('');
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfMaxPages = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, currentPage - halfMaxPages);
    let endPage = Math.min(totalPages, currentPage + halfMaxPages);

    if (currentPage - 1 <= halfMaxPages) {
      endPage = Math.min(totalPages, maxPagesToShow);
    }

    if (totalPages - currentPage <= halfMaxPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(<button key={1} onClick={() => handleGoToPage(1)} className={styles.button}>1</button>);
      if (startPage > 2) {
        pageNumbers.push(<span key="start-ellipsis">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button key={i} onClick={() => handleGoToPage(i)} className={`${styles.button} ${currentPage === i ? styles.activePage : ''}`}>
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(<span key="end-ellipsis">...</span>);
      }
      pageNumbers.push(<button key={totalPages} onClick={() => handleGoToPage(totalPages)} className={styles.button}>{totalPages}</button>);
    }

    return pageNumbers;
  };

  const handleSendMessage = async () => {
    if (isSendingMessage || !userQuestion.trim()) return;

    setIsSendingMessage(true);
    const newConversationHistory = [...conversationHistory, { role: 'user' as const, text: userQuestion }];
    setConversationHistory(newConversationHistory);

    const driverName = driversList.find(d => d.id === selectedDriver)?.name || 'Unknown Driver';
    const raceName = racesList.find(r => r.id === selectedRace)?.name || 'Unknown Race';

            // Prepare telemetry for the prompt (no truncation as per user request)
            const telemetryToSend = processedTelemetryForTable;
    // Constructing a detailed prompt
    const prompt = `
      You are an AI Race Engineer. Analyze the following data and answer the user's question.
      Context:
      - Race: ${raceName}
      - Driver: ${driverName} (ID: ${selectedDriver})
      - Lap Number: ${selectedLap}
      - Lap Data: ${JSON.stringify(lapData, null, 2)}
      - Weather Data: ${JSON.stringify(weatherData, null, 2)}

      - Telemetry Data: ${JSON.stringify(telemetryToSend, null, 2)}

      User Question: ${userQuestion}

      Based on this context and the telemetry data, provide a concise and insightful answer.
    `;

    const aiResponse = await generateGeminiResponse(prompt);
    setConversationHistory([...newConversationHistory, { role: 'ai' as const, text: aiResponse }]);
    setUserQuestion('');
    setIsSendingMessage(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Race Analysis</h1>
      </div>
      <StatusIndicator
        loading={loadingTelemetry}
        error={errorTelemetry}
        data={processedTelemetryForTable}
        loadingMessage="Loading telemetry data..."
        errorMessage={errorTelemetry || "An error occurred."}
        noDataMessage="No telemetry data found for the selected lap and driver."
      />
      <div className={styles.selectors}>
          <div className={styles.selectorGroup}>
            <label htmlFor="year-select">Select Year:</label>
            <select id="year-select" value={selectedYear} onChange={handleYearChange} className={styles.dropdown}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.selectorGroup}>
            <label htmlFor="race-select">Select Race:</label>
                          <select id="race-select" value={selectedRace} onChange={handleRaceChange} className={styles.dropdown}>
                            <option value="">Select a Race</option>
                            {loadingRaces ? (
                              <option>Loading races...</option>
                            ) : (
                              racesList.map((race) => (
                                <option key={race.id} value={race.id}>
                                  {race.name}
                                </option>
                              ))
                            )}
                          </select>          </div>
          <div className={styles.selectorGroup}>
            <label htmlFor="lap-select">Select Lap:</label>
            <select id="lap-select" value={selectedLap} onChange={handleLapChange} className={styles.dropdown}>
              {lapsList.map((lap) => (
                <option key={lap} value={lap}>
                  Lap {lap}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.selectorGroup}>
            <label htmlFor="driver-select">Select Drivers:</label>
            <select
              id="driver-select"
              value={selectedDriver}
              onChange={handleDriverChange}
              className={styles.dropdown}
            >
              {driversList.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.number}
                </option>
              ))}
            </select>
          </div>
        </div>
      <div className={styles.mainGrid}>
        <WeatherSummaryCard weather={weatherData} loading={loadingWeather} error={errorWeather} />
        <div className={styles.mapContainer}>
          <RaceMap 
            raceLines={raceLinesForMap} 
            availableDrivers={driversList} 
            selectedLap={selectedLap} 
            speedRange={speedRange}
            selectedDataPoints={selectedDataPoints}
            telemetryPath={raceLinesForMap[selectedDriver] || []}
          />
        </div>

                                <div className={styles.chartsContainer}>
                
                                  {/* Speed Chart */}
                                  <div className={styles.chart}>
                                                <h3 className={styles.chartTitle}>Speed</h3>
                                                <ResponsiveContainer width="100%" height={200}>
                                                  <LineChart data={telemetryData.speed}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                    <XAxis dataKey="timestamp" stroke="#aaa" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
                                                    <YAxis stroke="#aaa" />                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Legend />
                                        {selectedDriver && (() => {
                                          const driver = driversList.find(d => d.id === selectedDriver);
                                          if (!driver) return null;
                                          return (
                                            <Fragment key={selectedDriver}>
                                                                            <Line
                                                                              key={`${selectedDriver}-speed`}
                                                                              type="monotone"
                                                                              dataKey={`${driver.number}_speed`}
                                                                              name={`Driver ${driver.number} Speed`}
                                                                              stroke={getDriverColor(selectedDriver)}
                                                                              strokeWidth="4"
                                                                              dot={true}
                                                                              connectNulls={true}
                                                                            />                                            </Fragment>
                                          );
                                        })()}
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                
                                  {/* RPM Chart */}
                                  <div className={styles.chart}>
                                    <h3 className={styles.chartTitle}>RPM</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <LineChart data={telemetryData.rpm}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="timestamp" stroke="#aaa" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
                                        <YAxis stroke="#aaa" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Legend />
                                        {selectedDriver && (() => {
                                          const driver = driversList.find(d => d.id === selectedDriver);
                                          if (!driver) return null;
                                          return (
                                            <Fragment key={selectedDriver}>
                                                                            <Line
                                                                              key={`${selectedDriver}-nmot`}
                                                                              type="monotone"
                                                                              dataKey={`${driver.number}_nmot`}
                                                                              name={`Driver ${driver.number} RPM`}
                                                                              stroke={getDriverColor(selectedDriver)}
                                                                              strokeWidth="4"
                                                                              dot={true}
                                                                              connectNulls={true}
                                                                            />                                            </Fragment>
                                          );
                                        })()}
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                
                                  {/* Throttle & Brake Pressure Chart */}
                                  <div className={styles.chart}>
                                    <h3 className={styles.chartTitle}>Throttle & Brake</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <LineChart data={telemetryData.throttleBrake}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="timestamp" stroke="#aaa" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
                                        <YAxis stroke="#aaa" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Legend />
                                        {selectedDriver && (() => {
                                          const driver = driversList.find(d => d.id === selectedDriver);
                                          if (!driver) return null;
                                          return (
                                            <Fragment key={selectedDriver}>
                                              <Line
                                                key={`${selectedDriver}-ath`}
                                                type="monotone"
                                                dataKey={`${driver.number}_ath`}
                                                name={`Driver ${driver.number} Throttle`}
                                                stroke={getDriverColor(selectedDriver)}
                                                strokeWidth="4"
                                                dot={false}
                                              />
                                              <Line
                                                key={`${selectedDriver}-aps`}
                                                type="monotone"
                                                dataKey={`${driver.number}_aps`}
                                                name={`Driver ${driver.number} Accel Pedal`}
                                                stroke={getDriverColor(selectedDriver)}
                                                strokeDasharray="5 5"
                                                strokeWidth="4"
                                                dot={false}
                                              />
                                              <Line
                                                key={`${selectedDriver}-pbrake_f`}
                                                type="monotone"
                                                dataKey={`${driver.number}_pbrake_f`}
                                                name={`Driver ${driver.number} Front Brake`}
                                                stroke={getDriverColor(selectedDriver)}
                                                strokeDasharray="3 3"
                                                strokeWidth="4"
                                                dot={false}
                                              />
                                              <Line
                                                key={`${selectedDriver}-pbrake_r`}
                                                type="monotone"
                                                dataKey={`${driver.number}_pbrake_r`}
                                                name={`Driver ${driver.number} Rear Brake`}
                                                stroke={getDriverColor(selectedDriver)}
                                                strokeDasharray="1 1"
                                                strokeWidth="4"
                                                dot={false}
                                              />
                                            </Fragment>
                                          );
                                        })()}
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                
                                  {/* Acceleration & Steering Chart */}
                                  <div className={styles.chart}>
                                    <h3 className={styles.chartTitle}>Acceleration & Steering</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <LineChart data={telemetryData.accelerationSteering}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="timestamp" stroke="#aaa" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
                                        <YAxis yAxisId="left" stroke="#aaa" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#aaa" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Legend />
                                        {selectedDriver && (() => {
                                          const driver = driversList.find(d => d.id === selectedDriver);
                                          if (!driver) return null;
                                          return (
                                            <Fragment key={selectedDriver}>
                                              <Line
                                                yAxisId="left"
                                                key={`${selectedDriver}-accx_can`}
                                                type="monotone"
                                                dataKey={`${driver.number}_accx_can`}
                                                name={`Driver ${driver.number} Accel X`}
                                                stroke="#E30613"
                                                dot={false}
                                              />
                                              <Line
                                                yAxisId="left"
                                                key={`${selectedDriver}-accy_can`}
                                                type="monotone"
                                                dataKey={`${driver.number}_accy_can`}
                                                name={`Driver ${driver.number} Accel Y`}
                                                stroke="#FFFF00"
                                                strokeDasharray="3 3"
                                                dot={false}
                                              />
                                              <Line
                                                yAxisId="right"
                                                key={`${selectedDriver}-Steering_Angle`}
                                                type="monotone"
                                                dataKey={`${driver.number}_Steering_Angle`}
                                                name={`Driver ${driver.number} Steering Angle`}
                                                stroke="#00FF00"
                                                strokeDasharray="5 5"
                                                dot={false}
                                              />
                                            </Fragment>
                                          );
                                        })()}
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>          <div className={styles.deepDiveLink}>
            <Link
              href={`/analysis/lap-deep-dive?raceId=${selectedRace}&driverId=${selectedDriver}&lapNumber=${selectedLap}`}
              className={styles.button}
            >
              View Single Lap Deep Dive
            </Link>
            <Link
              href={`/analysis/driver-laps-deep-dive?raceId=${selectedRace}&driverId=${selectedDriver}`}
              className={styles.button}
            >
              View Driver Laps Deep Dive
            </Link>
          </div>
        </div>

        <div className={styles.lapResultsTable}>
          <h3 className={styles.chartTitle}>Telemetry Data</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plot</th>
                <th>Timestamp</th>
                <th>Speed</th>
                <th>RPM</th>
                <th>Throttle</th>
                <th>Accel Pedal</th>
                <th>Brake F</th>
                <th>Brake R</th>
                <th>Accel X</th>
                <th>Accel Y</th>
                <th>Steering Angle</th>
                <th>Lap Dist</th>
                <th>Longitude</th>
                <th>Latitude</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((dataPoint, index) => {
                  const driver = driversList.find(d => d.id === selectedDriver);
                  const driverNumber = driver ? driver.number : null;
                  if (!driverNumber) return null;
                  const timestamp = new Date(dataPoint.timestamp).toISOString();

                  return (
                    <tr key={index}>
                      <td>
                        <input 
                          type="checkbox"
                          checked={selectedDataPoints.includes(timestamp)}
                          onChange={() => handleDataPointSelect(timestamp)}
                        />
                      </td>
                      <td>{new Date(dataPoint.timestamp).toLocaleTimeString()}</td>
                      <td>{dataPoint[`${driverNumber}_speed`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_nmot`]?.toFixed(0)}</td>
                      <td>{dataPoint[`${driverNumber}_ath`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_aps`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_pbrake_f`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_pbrake_r`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_accx_can`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_accy_can`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_Steering_Angle`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_Laptrigger_lapdist_dls`]?.toFixed(2)}</td>
                      <td>{dataPoint[`${driverNumber}_VBOX_Long_Minutes`]?.toFixed(6)}</td>
                      <td>{dataPoint[`${driverNumber}_VBOX_Lat_Min`]?.toFixed(6)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <div className={styles.paginationControls}>
            <button onClick={() => handleGoToPage(1)} disabled={currentPage === 1} className={styles.button}>
              First
            </button>
            <button onClick={handlePreviousPage} disabled={currentPage === 1} className={styles.button}>
              Previous
            </button>
            {renderPageNumbers()}
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.button}>
              Next
            </button>
            <button onClick={() => handleGoToPage(totalPages)} disabled={currentPage === totalPages} className={styles.button}>
              Last
            </button>
            <form onSubmit={handlePageInputSubmit}>
              <input type="number" value={pageInput} onChange={handlePageInputChange} className={styles.pageInput} min="1" max={totalPages} />
              <button type="submit" className={styles.button}>Go</button>
            </form>
          </div>
        </div>

        <div className={styles.aiPanel}>
          <h3 className={styles.aiPanelTitle}>AI Race Engineer</h3>
          <div className={styles.aiChatBox}>
            {conversationHistory.map((msg, index) => (
              <div key={index} className={msg.role === 'user' ? styles.userMessage : styles.aiMessage}>
                {msg.role === 'ai' ? <MarkdownRenderer content={msg.text} /> : msg.text}
              </div>
            ))}
            {isSendingMessage && <div className={styles.aiMessage}>AI is thinking...</div>}
          </div>
          <div className={styles.aiInputContainer}>
            <input
              type="text"
              placeholder="Ask a question..."
              className={styles.aiInput}
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isSendingMessage}
            />
            <button onClick={handleSendMessage} className={styles.aiSendButton} disabled={isSendingMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
