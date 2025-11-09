import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key must be provided in the .env file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const parseInterval = (value: string | null): string | null => {
  if (!value || value === '-') return null;
  if (value.toLowerCase().includes('lap')) return null; // Handle lap gaps (singular and plural)
  const parts = value.match(/(\d+)'(\d+\.\d+)/);
  if (parts) {
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return `00:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  return value;
};

const main = async () => {
  const raceNumberArg = process.argv[2];
  if (!raceNumberArg || (raceNumberArg !== '1' && raceNumberArg !== '2')) {
    console.error('Please provide a race number (1 or 2) as a command-line argument.');
    process.exit(1);
  }
  const raceName = `Race ${raceNumberArg}`;
  const resultsFileName = raceNumberArg === '1'
    ? '05_Results by Class GR Cup Race 1 Official_Anonymized.CSV'
    : '03_Results GR Cup Race 2 Official_Anonymized.CSV';

  // --- Fetch Races and Drivers for lookup ---
  console.log('Fetching races and drivers from the database...');
  const { data: races, error: racesError } = await supabase.from('races').select('id, name');
  const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, number');

  if (racesError || driversError) {
    console.error('Error fetching races or drivers:', racesError || driversError);
    return;
  }

  // --- Upload Race Results ---
  console.log(`Uploading race results for ${raceName}...`);
  const resultsFile = fs.readFileSync(path.join(__dirname, '..', 'barber', resultsFileName), 'utf8');
  const parsedResults = Papa.parse(resultsFile, { header: true, delimiter: ';' });

  const raceResults = parsedResults.data.map((row: any) => {
    if (!row.NUMBER) {
      return null; // Skip empty rows
    }

    const race = races.find(r => r.name.includes(raceName));
    const driver = drivers.find(d => d.number === parseInt(row.NUMBER, 10));

    if (!race || !driver) {
      console.warn(`Could not find race or driver for row in ${resultsFileName}:`, row);
      return null;
    }

    let rowData;
    if (raceNumberArg === '1') {
      rowData = {
        class_type: row.CLASS_TYPE,
        position: parseInt(row.POS, 10),
        position_in_class: parseInt(row.PIC, 10),
        vehicle: row.VEHICLE,
        laps: parseInt(row.LAPS, 10),
        elapsed_time: row.ELAPSED || null,
        gap_to_first: parseInterval(row.GAP_FIRST),
        gap_to_previous: parseInterval(row.GAP_PREVIOUS),
        best_lap_number: parseInt(row.BEST_LAP_NUM, 10),
        best_lap_time: row.BEST_LAP_TIME || null,
        best_lap_speed_kph: parseFloat(row.BEST_LAP_KPH),
      };
    } else { // raceNumberArg === '2'
      rowData = {
        class_type: row.CLASS,
        position: parseInt(row.POSITION, 10),
        position_in_class: null, // Not available in Race 2 data
        vehicle: row.VEHICLE,
        laps: parseInt(row.LAPS, 10),
        elapsed_time: row.TOTAL_TIME || null,
        gap_to_first: parseInterval(row.GAP_FIRST),
        gap_to_previous: parseInterval(row.GAP_PREVIOUS),
        best_lap_number: parseInt(row.FL_LAPNUM, 10),
        best_lap_time: row.FL_TIME || null,
        best_lap_speed_kph: parseFloat(row.FL_KPH),
      };
    }

    return {
      race_id: race.id,
      driver_id: driver.id,
      ...rowData,
    };
  }).filter(Boolean); // Filter out any null rows

  const { error: raceResultsError } = await supabase
    .from('race_results')
    .insert(raceResults);

  if (raceResultsError) {
    console.error(`Error uploading race results for ${resultsFileName}:`, raceResultsError);
  }

  console.log(`Race results upload complete for ${raceName}.`);
};

main().catch(console.error);
