
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { from as copyFrom } from 'pg-copy-streams';

dotenv.config();

const main = async () => {
  const raceNumberArg = process.argv[2];
  if (!raceNumberArg || (raceNumberArg !== '1' && raceNumberArg !== '2')) {
    console.error('Please provide a race number (1 or 2) as a command-line argument.');
    process.exit(1);
  }
  const raceName = `Race ${raceNumberArg}`;
  const telemetryFileName = `R${raceNumberArg}_barber_telemetry_data.csv`;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    console.log('Fetching races and drivers from the database...');
    const racesResult = await client.query('SELECT id, name FROM races');
    const driversResult = await client.query('SELECT id, number FROM drivers');
    const races = racesResult.rows;
    const drivers = driversResult.rows;

    console.log(`Uploading telemetry data for ${raceName}...`);

    const fileStream = fs.createReadStream(path.join(__dirname, '..', 'barber', telemetryFileName), 'utf8');
    const copyStream = client.query(copyFrom('COPY telemetry (race_id, driver_id, lap_number, "timestamp", name, value) FROM STDIN WITH (FORMAT CSV, HEADER FALSE)'));

    const papaStream = Papa.parse(Papa.NODE_STREAM_INPUT, { header: true });

    fileStream.pipe(papaStream);

    let rowCount = 0;

    papaStream.on('data', (row: any) => {
      if (!row.vehicle_number || row.vehicle_number === '0') return;

      const race = races.find(r => r.name.includes(raceName));
      const driver = drivers.find(d => d.number === parseInt(row.vehicle_number, 10));

      if (!race || !driver) {
        console.warn(`Could not find race or driver for row:`, row);
        return;
      }

      const csvRow = [
        race.id,
        driver.id,
        parseInt(row.lap, 10),
        row.timestamp,
        row.telemetry_name,
        parseFloat(row.telemetry_value),
      ].join(',');

      copyStream.write(csvRow + '\n');
      rowCount++;
      if (rowCount % 10000 === 0) {
        console.log(`Processed ${rowCount} rows...`);
      }
    });

    papaStream.on('end', () => {
      copyStream.end();
    });

    copyStream.on('end', () => {
      console.log('Telemetry data upload complete.');
      client.release();
      pool.end();
    });

    copyStream.on('error', (error: any) => {
      console.error('Error during COPY:', error);
      client.release();
      pool.end();
    });

  } catch (error) {
    console.error('An error occurred:', error);
    client.release();
    pool.end();
  }
};

main().catch(console.error);
