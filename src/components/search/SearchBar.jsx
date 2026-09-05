import React, { useState } from 'react';
import './SearchBar.css';

/**
 * SearchBar Component
 * Query input with autocomplete suggestions
 * Supports searching knowledge assets
 * 
 * @component
 * @example
 * <SearchBar 
 *   onSearch={(query) => {}}
 *   suggestions={['API Standard', 'Best Practice']}
 * />
 */
const SearchBar = ({
  placeholder = 'Search knowledge...',
  onSearch = () => {},
  onSuggestionSelect = () => {},
  suggestions = [],
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="search-bar">
      <form className="search-bar__form" onSubmit={handleSearch}>
        <div className="search-bar__input-wrapper">
          <input
            type="search"
            className="search-bar__input"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onFocus={() => query.length > 0 && setShowSuggestions(true)}
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />
          <button
            type="submit"
            className="search-bar__button"
            aria-label="Submit search"
          >
            🔍
          </button>
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="search-bar__suggestions" role="listbox">
            {filteredSuggestions.map((suggestion, index) => (
              <li key={index} role="option">
                <button
                  type="button"
                  className="search-bar__suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
