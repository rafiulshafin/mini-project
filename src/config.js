import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || 'localhost',
  DATA_DIR: path.resolve(__dirname, '../data'),
  DATA_FILE: path.resolve(__dirname, '../data/tasks.json'),
  ENV: process.env.NODE_ENV || 'development'
};
