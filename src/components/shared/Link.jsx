import { Link } from 'react-router-dom';

function LinkTest() {
  return (
    <div style={{ padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="https://example.com" target="_blank">External Link</Link>
    </div>
  );
}

export default LinkTest;