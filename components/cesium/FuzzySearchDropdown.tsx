'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Globe, Building } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  importance?: number;
}

interface FuzzySearchDropdownProps {
  onPlaceSelect: (place: NominatimResult | string) => void;
  placeholder?: string;
  className?: string;
}

interface CacheEntry {
  results: NominatimResult[];
  timestamp: number;
}

// Simple in-memory cache with 5-minute expiration
const searchCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedResults = (query: string): NominatimResult[] | null => {
  const entry = searchCache.get(query.toLowerCase());
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    searchCache.delete(query.toLowerCase());
    return null;
  }
  
  return entry.results;
};

const setCachedResults = (query: string, results: NominatimResult[]): void => {
  searchCache.set(query.toLowerCase(), {
    results,
    timestamp: Date.now()
  });
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const FuzzySearchDropdown: React.FC<FuzzySearchDropdownProps> = ({
  onPlaceSelect,
  placeholder = "Search places...",
  className = "",
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [justSelectedRef, setJustSelectedRef] = useState(false);
  
  const coordinateMatch = useMemo(() => {
    if (!query.trim()) return null;
    const coordMatch = query.match(/^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return {
          place_id: -1, osm_id: -1, osm_type: 'coordinate',
          display_name: `Coordinates: ${lat}, ${lon}`,
          lat: lat.toString(), lon: lon.toString(),
          type: 'coordinate', class: 'coordinate'
        };
      }
    }
    return null;
  }, [query]);

  useEffect(() => {
    if (justSelectedRef) {
      return;
    }
    
    if (coordinateMatch) {
      setSuggestions([coordinateMatch]);
      setIsOpen(true);
      setLoading(false);
    } else if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
    }
  }, [coordinateMatch, query, justSelectedRef]);

  const debouncedQuery = useDebounce(query, 500);
  
  useEffect(() => {
    // This effect can be removed if not used for other purposes beyond logging
  }, [debouncedQuery]);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (justSelectedRef) {
        setLoading(false);
        return;
      }
      
      if (coordinateMatch) {
        setLoading(false);
        return;
      }
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setLoading(false);
        return;
      }

      // Check cache first
      const cachedResults = getCachedResults(debouncedQuery);
      if (cachedResults) {
        setSuggestions(cachedResults);
        setIsOpen(cachedResults.length > 0);
        setSelectedIndex(-1);
        setLoading(false);
        return;
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(debouncedQuery)}&limit=8&accept-language=en`, {
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Search failed with status: ${response.status}`);
        }
        
        const data: NominatimResult[] = await response.json();

        // Cache the results
        setCachedResults(debouncedQuery, data);

        setSuggestions(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
        setLoading(false);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search failed:', error); // Keep this one for actual errors
          setSuggestions([]);
          setIsOpen(false);
          setLoading(false);
        }
      }
    };
    fetchSuggestions();
  }, [debouncedQuery, coordinateMatch, justSelectedRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJustSelectedRef(true);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      onPlaceSelect(suggestions[selectedIndex]);
    } else if (query.trim()) {
      onPlaceSelect(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: NominatimResult) => {
    setJustSelectedRef(true);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onPlaceSelect(suggestion);
    setQuery(suggestion.name || suggestion.display_name.split(',')[0] || '');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
    }
  };

  const getTypeIcon = (suggestion: NominatimResult) => {
    const type = suggestion.type?.toLowerCase();
    const cls = suggestion.class?.toLowerCase();
    if (cls === 'coordinate') return <Search className="h-3 w-3 text-orange-400" />;
    if (['city', 'town', 'village', 'hamlet', 'municipality'].includes(type || '')) return <Building className="h-3 w-3 text-blue-400" />;
    if (['country', 'state', 'region', 'county', 'administrative'].includes(type || '') || cls === 'boundary') return <Globe className="h-3 w-3 text-green-400" />;
    return <MapPin className="h-3 w-3 text-purple-400" />;
  };

  const formatDisplayName = (displayName: string) => {
    const parts = displayName.split(', ');
    if (parts.length > 3) return `${parts[0]}, ${parts[1]}, ${parts[parts.length - 1]}`;
    return displayName;
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
        <div className="relative flex items-center bg-black/10 backdrop-blur-lg border border-white/40 rounded-2xl shadow-2xl backdrop-saturate-150">
          <Search className={`absolute left-3 h-4 w-4 text-white/80 ${loading ? 'animate-spin' : ''}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setJustSelectedRef(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setJustSelectedRef(false);
              if (query.trim().length >= 2) {
                setIsOpen(suggestions.length > 0);
              }
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 bg-transparent border-0 rounded-2xl text-white placeholder:text-white/60 focus:outline-none"
          />
        </div>
      </form>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-black/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl backdrop-saturate-150 overflow-hidden z-[1001]"
        >
          <div className="max-h-64 overflow-y-auto fuzzy-search-dropdown-scroll">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center gap-3 ${
                  index === selectedIndex ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                {getTypeIcon(suggestion)}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {suggestion.name || suggestion.display_name.split(',')[0]}
                  </div>
                  <div className="text-white/60 text-xs truncate">
                    {formatDisplayName(suggestion.display_name)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 