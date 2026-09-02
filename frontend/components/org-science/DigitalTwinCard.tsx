'use client';

import { Waypoints } from 'lucide-react';
import { orgScience, type DigitalTwinPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M49 — a full graph snapshot (every entity and relationship, plus stats). */
export function DigitalTwinCard() {
  return (
    <GraphIntelligenceCard<DigitalTwinPayload>
      title="Digital Twin"
      icon={Waypoints}
      fetcher={orgScience.digitalTwin}
      errorLabel="Failed to load the digital twin"
      toView={(data) => ({
        headline: data.digitalTwin.entities.length,
        headlineLabel: 'Entities Mirrored',
        badge: data.synchronized
          ? { text: 'SYNCED', tone: 'good' }
          : { text: 'OUT OF SYNC', tone: 'bad' },
        rows: [
          { label: 'Relationships Mirrored', value: data.digitalTwin.relationships.length },
          {
            label: 'Simulation Ready',
            value: data.simulationReady ? 'Yes' : 'No',
            tone: data.simulationReady ? 'good' : 'warn',
          },
        ],
      })}
    />
  );
}
