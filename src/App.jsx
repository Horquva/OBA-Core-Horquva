import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import MainNav from './components/navigation/MainNav';
import BreadcrumbNav from './components/navigation/BreadcrumbNav';
import AssetCard from './components/display/AssetCard';
import './App.css';

function App() {
  const [active, setActive] = useState('standards');

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Standards' },
  ];

  const sampleAsset = {
    id: '1',
    title: 'API Design Standard',
    category: 'Standards',
    status: 'approved',
    summary: 'Guidelines for designing RESTful APIs at our organization.',
    owner: 'Platform Team',
    lastUpdated: new Date(),
  };

  return (
    <AppShell appVersion="1.0.0">
      <MainNav active={active} onNavigate={setActive} />
      <div style={{ padding: '20px' }}>
        <BreadcrumbNav items={breadcrumbs} />
        <h1>{active}</h1>
        <AssetCard {...sampleAsset} onClick={(id) => alert(`Clicked ${id}`)} />
      </div>
    </AppShell>
  );
}

export default App;