import fs from 'fs';
import path from 'path';
import https from 'https';

const modelDir = path.resolve('../client/public/models');

// Ensure directory exists
if (!fs.existsSync(modelDir)) {
  fs.mkdirSync(modelDir, { recursive: true });
}

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin'
];

const cdnBase = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

const downloadFile = (fileName) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelDir, fileName);
    const file = fs.createWriteStream(dest);
    
    console.log(`Downloading ${fileName}...`);
    https.get(`${cdnBase}${fileName}`, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileName}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved ${fileName} successfully.`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete temp file
      reject(err);
    });
  });
};

const main = async () => {
  try {
    for (const f of files) {
      await downloadFile(f);
    }
    console.log('All face-api models downloaded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error downloading face-api models:', err);
    process.exit(1);
  }
};

main();
