import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { Semaphore } from 'async-mutex';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Loaded' : 'Not Loaded');
console.log('Supabase Service Key:', supabaseServiceKey ? 'Loaded' : 'Not Loaded');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service key must be provided in the .env file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 1000;
const CONCURRENCY = 10;

const semaphore = new Semaphore(CONCURRENCY);

interface Driver {
  id: string;
  number: number;
  name: string | null;
}

let drivers: Map<number, Driver> = new Map(); // Change to Map

const main = async () => {
  const arg = process.argv[2];
  let raceId: string | undefined;
  let raceNumberArg: string | undefined;

  // Check if the argument is a UUID (raceId)
  if (arg && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(arg)) {
    raceId = arg;
  } else if (arg && (arg === '1' || arg === '2')) {
    raceNumberArg = arg;
  } else {
    console.error('Please provide either a race ID (UUID) or a race number (1 or 2) as a command-line argument.');
    process.exit(1);
  }

  let raceName: string | undefined;
  let telemetryFileName: string | undefined;
  let selectedRace: { id: string; name: string } | undefined;

  // --- Fetch Races and Drivers for lookup ---
  console.log('Fetching races and drivers from the database...');
  const { data: fetchedDrivers, error: driversError } = await supabase.from('drivers').select('id, number, name');
  drivers = new Map(); // Initialize Map
  fetchedDrivers?.forEach(d => drivers.set(d.number, d)); // Populate Map
  const { data: races, error: racesError } = await supabase.from('races').select('id, name');

  if (racesError) {
    console.error('Error fetching races:', racesError);
    return;
  }

  if (raceId) {
    selectedRace = races.find(r => r.id === raceId);
    if (!selectedRace) {
      console.error(`Race with ID ${raceId} not found.`);
      process.exit(1);
    }
    // Determine telemetry file name based on race name if raceId is provided
    if (selectedRace.name.includes('Race 1')) {
      telemetryFileName = 'R1_barber_telemetry_data.csv';
    } else if (selectedRace.name.includes('Race 2')) {
      telemetryFileName = 'R2_barber_telemetry_data.csv';
    } else {
      console.error(`Could not determine telemetry file name for race: ${selectedRace.name}`);
      process.exit(1);
    }
    raceName = selectedRace.name;
  } else if (raceNumberArg) {
    raceName = `Race ${raceNumberArg}`;
    telemetryFileName = `R${raceNumberArg}_barber_telemetry_data.csv`;
    selectedRace = races.find(r => r.name.includes(raceName));
    if (!selectedRace) {
      console.error(`Race with name ${raceName} not found.`);
      process.exit(1);
    }
  }

  if (!telemetryFileName || !selectedRace) {
    console.error('Failed to identify race or telemetry file.');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), 'barber', telemetryFileName);

  // --- Upload Telemetry Data ---
  console.log(`Uploading telemetry data for ${raceName} (ID: ${selectedRace.id})...`);

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

      const currentVehicleNumber = parseInt(row.vehicle_number, 10); // Added variable for clarity
      console.log(`Processing vehicle number: ${currentVehicleNumber}`); // Added log

      let driver = drivers.get(currentVehicleNumber);
      console.log(`Driver found for ${currentVehicleNumber}:`, driver ? 'Yes' : 'No'); // Added log

      if (!driver) {
        console.warn(`Driver with number ${currentVehicleNumber} not found. Inserting new driver.`);
        const newDriver = {
          number: currentVehicleNumber,
          name: null, // Set name to null as requested
        };
        const { data: insertedDrivers, error: insertError } = await supabase.from('drivers').insert([newDriver]).select();
        if (insertError) {
          console.error('Error inserting new driver:', insertError);
          return;
        }
        const newlyInsertedDriver = insertedDrivers[0];
        console.log('Newly inserted driver from Supabase:', newlyInsertedDriver); // Added log

        // Add the new driver to the local drivers map
        drivers.set(newlyInsertedDriver.number, newlyInsertedDriver);
        console.log('Drivers map after adding new driver:', Array.from(drivers.values()).map((d: Driver) => ({ id: d.id, number: d.number }))); // Adjusted log
        driver = newlyInsertedDriver; // Set the current driver to the newly created one
      }

      batch.push({
        race_id: selectedRace.id,
        driver_id: driver?.id,
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
