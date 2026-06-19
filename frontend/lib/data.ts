import fs from 'fs';
import path from 'path';
import { Dataset } from '../types';

export function getDataset(): Dataset {
  const filePath = path.join(process.cwd(), '../data/sunrise_care.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents) as Dataset;
}
