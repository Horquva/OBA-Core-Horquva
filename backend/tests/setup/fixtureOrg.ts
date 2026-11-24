import { DataService } from '../../src/services/dataService.js';
import { fixtureOrgState } from '../helpers/fixtureOrg.js';

DataService.useInitialStateProvider(fixtureOrgState);
