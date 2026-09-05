import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WidgetContainer from '../src/components/widgets/WidgetContainer';
import { MetricWithTrend, LineChart } from '../../visualization/src';
import type { MetricData, ChartSeries } from '../../visualization/src';

const sampleMetric: MetricData = {
  label: 'Sprint Completion Rate',
  value: 94.2,
  unit: '%',
  trend: 8.4,
  status: 'positive',
};

const sampleSeries: ChartSeries[] = [
  {
    id: 'activity',
    label: 'System Activity',
    data: [
      { x: 'Week 1', y: 120 },
      { x: 'Week 2', y: 190 },
    ],
  },
];

describe('Visualization integration', () => {
  it('renders MetricWithTrend inside WidgetContainer', () => {
    render(
      <WidgetContainer id="metric-test" title="Quarterly Velocity">
        <MetricWithTrend data={sampleMetric} accessibleLabel="Sprint completion metric" />
      </WidgetContainer>
    );
    expect(screen.getByText('Quarterly Velocity')).toBeInTheDocument();
    expect(screen.getByText('Sprint Completion Rate')).toBeInTheDocument();
  });

  it('renders LineChart inside WidgetContainer', () => {
    render(
      <WidgetContainer id="chart-test" title="System Activity Trend">
        <LineChart series={sampleSeries} accessibleLabel="System activity chart" />
      </WidgetContainer>
    );
    expect(screen.getByText('System Activity Trend')).toBeInTheDocument();
    expect(screen.getAllByLabelText('System activity chart').length).toBeGreaterThan(0);
  });
});