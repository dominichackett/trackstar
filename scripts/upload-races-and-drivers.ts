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
  // --- Upload Races ---
  console.log('Uploading races...');
  const races = [
    { name: 'Barber Motorsports Park - Race 1', date: '2023-05-19' },
    { name: 'Barber Motorsports Park - Race 2', date: '2023-05-20' },
  ];

  const { data: racesData, error: racesError } = await supabase
    .from('races')
    .insert(races)
    .select();

  if (racesError) {
    console.error('Error uploading races:', racesError);
    return;
  }
  console.log('Races uploaded successfully.');

  // --- Upload Drivers ---
  console.log('Uploading drivers...');
  const resultsFile = fs.readFileSync(path.join(__dirname, '..', 'barber', '05_Results by Class GR Cup Race 1 Official_Anonymized.CSV'), 'utf8');

  const parsedResults = Papa.parse(resultsFile, { header: true });

  const uniqueDrivers = [...new Set(parsedResults.data.map((row: any) => row.NUMBER))]
    .filter(Boolean) // Filter out any null/undefined driver numbers
    .map(driverNumber => ({ number: parseInt(driverNumber as string, 10) }));

  const { data: driversData, error: driversError } = await supabase
    .from('drivers')
    .insert(uniqueDrivers)
    .select();

  if (driversError) {
    console.error('Error uploading drivers:', driversError);
    return;
  }

  console.log('Drivers uploaded successfully.');
};

main().catch(console.error);
