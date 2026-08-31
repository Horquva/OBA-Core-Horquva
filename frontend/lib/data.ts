import { Dataset } from '../types';
import dataset from '../data/sunrise_care.json';

export function getDataset(): Dataset {
  return dataset as Dataset;
}
