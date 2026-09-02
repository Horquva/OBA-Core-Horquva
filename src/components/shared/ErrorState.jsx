import ErrorState from './components/shared/ErrorState';

function ErrorTest() {
  return (
    <ErrorState
      title="Failed to load content"
      message="Something went wrong while fetching data."
      icon="❌"
      action={{ label: 'Retry', onClick: () => alert('Retrying...') }}
      details="Error: API timeout after 5s"
    />
  );
}

export default ErrorTest;