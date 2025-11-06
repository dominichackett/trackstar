import * as fs from 'fs';
import * as path from 'path';

const telemetryFileName = 'R1_barber_telemetry_data.csv';
const filePath = path.join(process.cwd(), 'barber', telemetryFileName);

console.log(`Attempting to read file at: ${filePath}`);

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully!');
  console.log(`File content length: ${fileContent.length}`);
} catch (error) {
  console.error('Error reading file:', error);
}
