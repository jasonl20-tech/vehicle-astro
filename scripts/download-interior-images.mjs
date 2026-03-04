/**
 * Lädt die 3 Interior-Bilder (Cockpit, Front Row, Rear Row) von vehicleimagery.com
 * Direkt von der Hauptseite – kein API-Key erforderlich.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'public', 'images');

const IMAGES = [
  { url: 'https://vehicleimagery.com/cupra_homepage/interior-1.jpeg', file: 'cupra_cockpit.jpeg' },
  { url: 'https://vehicleimagery.com/cupra_homepage/interior-2.jpeg', file: 'cupra_front_row.jpeg' },
  { url: 'https://vehicleimagery.com/cupra_homepage/interior-3.jpeg', file: 'cupra_rear_row.jpeg' }
];

async function main() {
  await mkdir(imagesDir, { recursive: true });

  for (const { url, file } of IMAGES) {
    console.log(`Lade ${file}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`  Fehler ${res.status}: ${url}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const outPath = join(imagesDir, file);
      await writeFile(outPath, buffer);
      console.log(`  -> ${file}`);
    } catch (e) {
      console.error(`  Fehler:`, e.message);
    }
  }
  console.log('Fertig.');
}

main();
