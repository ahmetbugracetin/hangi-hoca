'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: number;
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onResults?: (query: string) => Promise<SearchResult[]>;
  onChange?: (query: string) => void;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Hoca veya ders ara...',
  onSearch,
  onResults,
  onChange,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search callback
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      onSearch?.(query.trim());

      if (onResults) {
        setLoading(true);
        onResults(query.trim())
          .then((res) => {
            setResults(res);
            setShowDropdown(res.length > 0);
          })
          .catch(() => {
            setResults([]);
            setShowDropdown(false);
          })
          .finally(() => setLoading(false));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch, onResults]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && focusIndex >= 0 && results[focusIndex]) {
      window.location.href = results[focusIndex].href;
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.(e.target.value);
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full pl-12 pr-10 py-3.5 rounded-xl',
            'bg-bg-secondary border border-white/10',
            'text-text-primary placeholder:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50',
            'transition-all duration-200'
          )}
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-bg-secondary border border-white/10 shadow-2xl overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-3 text-sm text-text-secondary">Aranıyor...</div>
          ) : (
            results.map((result, idx) => (
              <a
                key={result.id}
                href={result.href}
                className={cn(
                  'block px-4 py-3 text-sm transition-colors',
                  idx === focusIndex
                    ? 'bg-accent-primary/10 text-text-primary'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                )}
              >
                <div className="font-medium text-text-primary">{result.label}</div>
                {result.sublabel && (
                  <div className="text-xs text-text-secondary mt-0.5">{result.sublabel}</div>
                )}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
