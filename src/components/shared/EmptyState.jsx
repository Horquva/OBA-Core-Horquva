import EmptyState from './components/shared/EmptyState';

function EmptyTest() {
  return (
    <EmptyState
      title="No search results"
      description="Try a different search term"
      icon="🔍"
      action={{ label: 'Browse all', onClick: () => alert('Clicked!') }}
    />
  );
}

export default EmptyTest;