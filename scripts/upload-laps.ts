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

const BATCH_SIZE = 1000;

interface Driver {
  id: string;
  number: number;
}

interface LapCsvRow {
  NUMBER: string;
  DRIVER_NUMBER: string;
  LAP_NUMBER: string;
  LAP_TIME: string;
  LAP_IMPROVEMENT: string;
  CROSSING_FINISH_LINE_IN_PIT: string;
  S1: string;
  S1_IMPROVEMENT: string;
  S2: string;
  S2_IMPROVEMENT: string;
  S3: string;
  S3_IMPROVEMENT: string;
  KPH: string;
  ELAPSED: string;
  HOUR: string;
  S1_LARGE: string;
  S2_LARGE: string;
  S3_LARGE: string;
  TOP_SPEED: string;
  PIT_TIME: string;
  CLASS: string;
  GROUP: string;
  MANUFACTURER: string;
  FLAG_AT_FL: string;
  S1_SECONDS: string;
  S2_SECONDS: string;
  S3_SECONDS: string;
  IM1a_time: string;
  IM1a_elapsed: string;
  IM1_time: string;
  IM1_elapsed: string;
  IM2a_time: string;
  IM2a_elapsed: string;
  IM2_time: string;
  IM2_elapsed: string;
  IM3a_time: string;
  IM3a_elapsed: string;
  FL_time: string;
  FL_elapsed: string;
}

const main = async () => {
  const filename = process.argv[2];
  const raceId = process.argv[3];

  if (!filename || !raceId) {
    console.error('Usage: ts-node upload-laps.ts <filename> <race_id>');
    process.exit(1);
  }

  // No UUID validation for raceId as per user request.
  // It is assumed to be correct.

  const filePath = path.join(process.cwd(), 'barber', filename);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // --- Fetch Drivers for lookup ---
  console.log('Fetching drivers from the database...');
  const { data: fetchedDrivers, error: driversError } = await supabase.from('drivers').select('id, number');

  if (driversError) {
    console.error('Error fetching drivers:', driversError);
    process.exit(1);
  }

  const driverLookup = new Map<number, string>(); // Map driver_number to driver_id
  fetchedDrivers.forEach((d: Driver) => driverLookup.set(d.number, d.id));

  console.log(`Uploading laps from ${filename} for Race ID: ${raceId}...`);

  let batch: any[] = [];
  let rowCount = 0;
  let uploadedCount = 0;

  const fileContent = fs.readFileSync(filePath, 'utf8');

  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toUpperCase(), // Normalize headers
    complete: async (results) => {
      for (const row of results.data as LapCsvRow[]) { // Cast row to LapCsvRow
        rowCount++;

        const driverNumber = parseInt(row.NUMBER, 10);
        if (isNaN(driverNumber)) {
          console.warn(`Skipping row ${rowCount}: Invalid DRIVER_NUMBER '${row.NUMBER}'`);
          continue;
        }

        const driverId = driverLookup.get(driverNumber);
        if (!driverId) {
          console.warn(`Skipping row ${rowCount}: Driver with number ${driverNumber} not found.`);
          continue;
        }

        const toInterval = (value: string | undefined) => (value === '' || value === undefined) ? null : value;

        const lapData = {
          race_id: raceId,
          driver_id: driverId,
          lap_number: parseInt(row.LAP_NUMBER, 10),
          lap_time: toInterval(row.LAP_TIME),
          lap_improvement: parseInt(row.LAP_IMPROVEMENT, 10),
          crossing_finish_line_in_pit: row.CROSSING_FINISH_LINE_IN_PIT === 'TRUE',
          s1: toInterval(row.S1),
          s1_improvement: parseInt(row.S1_IMPROVEMENT, 10),
          s2: toInterval(row.S2),
          s2_improvement: parseInt(row.S2_IMPROVEMENT, 10),
          s3: toInterval(row.S3),
          s3_improvement: parseInt(row.S3_IMPROVEMENT, 10),
          kph: parseFloat(row.KPH),
          elapsed: toInterval(row.ELAPSED),
          hour: row.HOUR,
          s1_large: toInterval(row.S1_LARGE),
          s2_large: toInterval(row.S2_LARGE),
          s3_large: toInterval(row.S3_LARGE),
          top_speed: parseFloat(row.TOP_SPEED),
          pit_time: toInterval(row.PIT_TIME),
          class: row.CLASS,
          group: row.GROUP, // "group" is a reserved keyword, ensure it's handled correctly by Supabase
          manufacturer: row.MANUFACTURER,
          flag_at_fl: row.FLAG_AT_FL,
          s1_seconds: parseFloat(row.S1_SECONDS),
          s2_seconds: parseFloat(row.S2_SECONDS),
          s3_seconds: parseFloat(row.S3_SECONDS),
          im1a_time: toInterval(row.IM1a_time),
          im1a_elapsed: toInterval(row.IM1a_elapsed),
          im1_time: toInterval(row.IM1_time),
          im1_elapsed: toInterval(row.IM1_elapsed),
          im2a_time: toInterval(row.IM2a_time),
          im2a_elapsed: toInterval(row.IM2a_elapsed),
          im2_time: toInterval(row.IM2_time),
          im2_elapsed: toInterval(row.IM2_elapsed),
          im3a_time: toInterval(row.IM3a_time),
          im3a_elapsed: toInterval(row.IM3a_elapsed),
          fl_time: toInterval(row.FL_time),
          fl_elapsed: toInterval(row.FL_elapsed),
        };

        batch.push(lapData);

        if (batch.length >= BATCH_SIZE) {
          const { error } = await supabase.from('laps').insert(batch);
          if (error) {
            console.error('Error uploading batch:', error);
            // Depending on requirements, you might want to exit or retry
          } else {
            uploadedCount += batch.length;
            console.log(`Uploaded ${uploadedCount} laps...`);
          }
          batch = [];
        }
      }

      // Upload any remaining items in the last batch
      if (batch.length > 0) {
        const { error } = await supabase.from('laps').insert(batch);
        if (error) {
          console.error('Error uploading final batch:', error);
        } else {
          uploadedCount += batch.length;
        }
      }

      console.log(`Finished uploading. Total rows processed: ${rowCount}, Total laps uploaded: ${uploadedCount}.`);
    },
    error: (err: Error) => { // Explicitly type err
      console.error('CSV parsing error:', err.message);
    }
  });
};

main().catch(console.error);
