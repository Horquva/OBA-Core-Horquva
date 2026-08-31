import Button from './components/shared/Button';

function ButtonTest() {
  return (
    <div style={{ padding: '20px', gap: '10px', display: 'flex', flexWrap: 'wrap' }}>
      <Button variant="primary" size="small">Small Primary</Button>
      <Button variant="primary" size="medium">Medium Primary</Button>
      <Button variant="primary" size="large">Large Primary</Button>
      
      <Button variant="secondary" size="medium">Secondary</Button>
      <Button variant="tertiary" size="medium">Tertiary</Button>
      
      <Button variant="primary" disabled>Disabled</Button>
      <Button variant="primary" loading>Loading</Button>
    </div>
  );
}

export default ButtonTest;