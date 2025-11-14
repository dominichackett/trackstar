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
const CONCURRENCY = 5; // Limit concurrent Supabase inserts

const semaphore = new Semaphore(CONCURRENCY);

const main = async () => {
  const filename = process.argv[2];
  const raceId = process.argv[3];

  if (!filename || !raceId) {
    console.error('Usage: ts-node upload-weather.ts <filename.csv> <race_id_uuid>');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), 'barber', filename); // Assuming files are in 'barber' folder

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Uploading weather data from ${filename} for Race ID: ${raceId}...`);

  let batch: any[] = [];
  let rowCount = 0;
  const promises: Promise<any>[] = [];

  const fileStream = fs.createReadStream(filePath, 'utf8');

  const processBatch = async () => {
    console.log('Batch content at start of processBatch:', batch);
    if (batch.length > 0) {
      const currentBatch = [...batch]; // Create a copy of the batch for insertion
      const promise = semaphore.runExclusive(async () => {
        console.log('Batch before insert:', currentBatch); // Log the copied batch
        const { data, error, count } = await supabase.from('weather').insert(currentBatch);
        if (error) {
          console.error('Error inserting batch:', error);
        } else {
          console.log(`Successfully inserted ${count} rows. Data:`, data);
        }
      });
      promises.push(promise);
      batch.length = 0; // Clear the original batch after its contents have been used
    }
  };

  Papa.parse(fileStream, {
    header: false,
    skipEmptyLines: true,
    delimiter: ';',
    step: async (results, parser) => {
      console.log('PapaParse results.data:', results.data); // Added for debugging
      // Assuming the order: TIME_UTC_SECONDS;TIME_UTC_STR;AIR_TEMP;TRACK_TEMP;HUMIDITY;PRESSURE;WIND_SPEED;WIND_DIRECTION;RAIN
      const row: any = results.data;
      // Skip header row if present
      if (rowCount === 0 && row[0] === 'TIME_UTC_SECONDS') {
        rowCount++;
        return;
      }
      rowCount++;

      batch.push({
        race_id: raceId,
        time_utc_seconds: parseInt(row[0], 10),
        time_utc_str: row[1],
        air_temp: parseFloat(row[2]),
        track_temp: parseFloat(row[3]),
        humidity: parseFloat(row[4]),
        pressure: parseFloat(row[5]),
        wind_speed: parseFloat(row[6]),
        wind_direction: parseInt(row[7], 10),
        rain: parseInt(row[8], 10),
      });
      console.log(`Added row to batch. Current batch size: ${batch.length}`); // Added for debugging

      if (batch.length >= BATCH_SIZE) {
        console.log(`Processing batch of size ${batch.length}`); // Added for debugging
        await processBatch();
      }

      if (rowCount % 10000 === 0) {
        console.log(`Processed ${rowCount} rows...`);
      }
    },
    complete: async () => {
      console.log(`Processing final batch of size ${batch.length}`); // Added for debugging
      await processBatch(); // Process the final batch
      await Promise.all(promises);
      console.log('Weather data upload complete.');
    },
    error: (error) => {
      console.error('PapaParse error:', error);
    },
  });
};

main().catch(console.error);
