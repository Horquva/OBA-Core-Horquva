import { getDataset } from '../../lib/data';
import { generateRecommendations } from '../../lib/recommendations';
import RecommendationHeader from '../../components/recommendations/RecommendationHeader';
import Top5Urgent from '../../components/recommendations/Top5Urgent';
import RecommendationList from '../../components/recommendations/RecommendationList';
import DemoSummary from '../../components/recommendations/DemoSummary';

export default async function RecommendationsPage() {
  const dataset = await getDataset();
  const output = generateRecommendations(dataset);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Module header + KPI strip */}
      <RecommendationHeader output={output} />

      {/* Top 5 Most Urgent Actions */}
      <Top5Urgent top5={output.top5} />

      {/* Full prioritized list */}
      <RecommendationList recommendations={output.prioritized} />

      {/* Demo summary for stakeholder presentation */}
      <DemoSummary
        output={output}
        company={dataset.company}
        agentCount={dataset.agents.length}
      />
    </div>
  );
}
