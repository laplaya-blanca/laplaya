// Copies the folders the owner dashboard edits (content/, uploads/) plus admin/, assets/ and play/ (the table games)
// into dist/, so Netlify serves them next to the built site. Owner saves commit to these folders and trigger a rebuild.
import { cpSync, existsSync } from 'node:fs';

for (const dir of ['admin', 'content', 'uploads', 'assets', 'play']) {
  if (existsSync(dir)) cpSync(dir, 'dist/' + dir, { recursive: true });
}
console.log('copied static folders into dist/');
