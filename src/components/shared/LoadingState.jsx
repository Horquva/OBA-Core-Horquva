import LoadingState from './components/shared/LoadingState';

function LoadingTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Skeleton Loading</h2>
      <LoadingState type="skeleton" count={2} />
      
      <h2>Spinner Loading</h2>
      <LoadingState type="spinner" message="Loading data..." />
      
      <h2>Pulse Loading</h2>
      <LoadingState type="pulse" />
    </div>
  );
}

export default LoadingTest;