import { cpSync, rmSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = join(__dirname, 'client', 'dist');
const destination = join(__dirname, 'dist');
const assetsDir = join(destination, 'assets');

console.log('Copying from:', source);
console.log('Copying to:', destination);

// old assets 완전 삭제 후 재생성 (no_vapid_k0 방지)
console.log('Cleaning dist/assets ...');
rmSync(assetsDir, { recursive: true, force: true });
mkdirSync(assetsDir, { recursive: true });

cpSync(source, destination, { recursive: true });

console.log('Copy completed!');
