
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'upload-telemetry-copy.ts');

fs.unlink(filePath, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('File deleted successfully');
});
