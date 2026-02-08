import { cpSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = join(__dirname, 'client', 'dist');
const destination = join(__dirname, 'dist');

console.log('Copying from:', source);
console.log('Copying to:', destination);

cpSync(source, destination, { recursive: true });

console.log('Copy completed!');
