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

const main = async () => {
  const raceNumberArg = process.argv[2];
  if (!raceNumberArg || (raceNumberArg !== '1' && raceNumberArg !== '2')) {
    console.error('Please provide a race number (1 or 2) as a command-line argument.');
    process.exit(1);
  }
  const raceName = `Race ${raceNumberArg}`;

  // --- Fetch Races and Drivers for lookup ---
  console.log('Fetching races and drivers from the database...');
  const { data: races, error: racesError } = await supabase.from('races').select('id, name');
  const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, number');

  if (racesError || driversError) {
    console.error('Error fetching races or drivers:', racesError || driversError);
    return;
  }

  // --- Upload Lap Events ---
  console.log(`Uploading lap events for ${raceName}...`);

  const lapEventFiles = [
    { file: `R${raceNumberArg}_barber_lap_start.csv`, type: 'start' },
    { file: `R${raceNumberArg}_barber_lap_end.csv`, type: 'end' },
    { file: `R${raceNumberArg}_barber_lap_time.csv`, type: 'time' },
  ];

  let allLapEvents: any[] = [];

  for (const { file, type } of lapEventFiles) {
    console.log(`Processing ${file}...`);
    const fileContent = fs.readFileSync(path.join(__dirname, '..', 'barber', file), 'utf8');
    const parsed = Papa.parse(fileContent, { header: true });

    const lapEvents = parsed.data.map((row: any) => {
      if (!row.vehicle_number) return null;

      const race = races.find(r => r.name.includes(raceName));
      const driver = drivers.find(d => d.number === parseInt(row.vehicle_number, 10));

      if (!race || !driver) {
        console.warn(`Could not find race or driver for row in ${file}:`, row);
        return null;
      }

      return {
        race_id: race.id,
        driver_id: driver.id,
        lap_number: parseInt(row.lap, 10),
        event_type: type,
        timestamp: row.timestamp,
      };
    }).filter(Boolean);

    allLapEvents = allLapEvents.concat(lapEvents);
  }

  const { error: lapEventsError } = await supabase
    .from('lap_events')
    .insert(allLapEvents);

  if (lapEventsError) {
    console.error('Error uploading lap events:', lapEventsError);
    return;
  }

  console.log(`Lap events uploaded successfully for ${raceName}.`);
};

main().catch(console.error);
