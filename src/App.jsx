import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import MainNav from './components/navigation/MainNav';
import SearchBar from './components/search/SearchBar';
import FilterPanel from './components/search/FilterPanel';
import Pagination from './components/display/Pagination';
import StatusBadge from './components/display/StatusBadge';
import './App.css';

function App() {
  const [active, setActive] = useState('standards');
  const [currentPage, setCurrentPage] = useState(1);

  const suggestions = [
    'API Design Standard',
    'Database Naming Playbook',
    'Microservices Best Practice',
    'Security Runbook',
  ];

  return (
    <AppShell appVersion="1.0.0">
      <MainNav active={active} onNavigate={setActive} />
      
      <div style={{ padding: '20px' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '20px' }}>
          <SearchBar
            onSearch={(query) => console.log('Search:', query)}
            suggestions={suggestions}
          />
        </div>

        {/* Layout with Filter and Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '20px' }}>
          {/* Sidebar */}
          <FilterPanel onFilterChange={(filters) => console.log(filters)} />

          {/* Main Content */}
          <div>
            <h1>Search Results</h1>
            
            {/* Status Badge Example */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <StatusBadge status="approved" />
              <StatusBadge status="draft" />
              <StatusBadge status="deprecated" />
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={5}
              onPageChange={setCurrentPage}
            />
            
            <p>Page {currentPage} content goes here...</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default App;