import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { Semaphore } from 'async-mutex';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key must be provided in the .env file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 1000;
const CONCURRENCY = 10;

const semaphore = new Semaphore(CONCURRENCY);

const main = async () => {
  const raceNumberArg = process.argv[2];
  if (!raceNumberArg || (raceNumberArg !== '1' && raceNumberArg !== '2')) {
    console.error('Please provide a race number (1 or 2) as a command-line argument.');
    process.exit(1);
  }
  const raceName = `Race ${raceNumberArg}`;
  const telemetryFileName = `R${raceNumberArg}_barber_telemetry_data.csv`;
  const filePath = path.join(process.cwd(), 'barber', telemetryFileName);

  // --- Fetch Races and Drivers for lookup ---
  console.log('Fetching races and drivers from the database...');
  const { data: races, error: racesError } = await supabase.from('races').select('id, name');
  const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, number');

  if (racesError || driversError) {
    console.error('Error fetching races or drivers:', racesError || driversError);
    return;
  }

  // --- Upload Telemetry Data ---
  console.log(`Uploading telemetry data for ${raceName}...`);

  let batch: any[] = [];
  let rowCount = 0;
  const promises: Promise<any>[] = [];

  const fileStream = fs.createReadStream(filePath, 'utf8');

  const processBatch = async () => {
    if (batch.length > 0) {
      const promise = semaphore.runExclusive(() => supabase.from('telemetry').insert(batch));
      promises.push(promise);
      batch = [];
    }
  };

  Papa.parse(fileStream, {
    header: true,
    step: async (results, parser) => {
      const row: any = results.data;
      rowCount++;

      if (!row.vehicle_number || row.vehicle_number === '0') return; // Skip rows with no vehicle number or vehicle number 0

      const race = races.find(r => r.name.includes(raceName));
      const driver = drivers.find(d => d.number === parseInt(row.vehicle_number, 10));

      if (!race || !driver) {
        console.warn(`Could not find race or driver for row:`, row);
        return;
      }

      batch.push({
        race_id: race.id,
        driver_id: driver.id,
        lap_number: parseInt(row.lap, 10),
        timestamp: row.timestamp,
        name: row.telemetry_name,
        value: parseFloat(row.telemetry_value),
      });

      if (batch.length >= BATCH_SIZE) {
        await processBatch();
      }

      if (rowCount % 10000 === 0) {
        console.log(`Processed ${rowCount} rows...`);
      }
    },
    complete: async () => {
      await processBatch(); // Process the final batch
      await Promise.all(promises);
      console.log('Telemetry data upload complete.');
    },
    error: (error) => {
      console.error('PapaParse error:', error);
    },
  });
};

main().catch(console.error);
