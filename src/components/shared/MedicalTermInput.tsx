
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { suggestMedicalTerms } from '@/ai/flows/suggest-medical-terms';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2 } from 'lucide-react';

interface MedicalTermInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void; // Changed from onChange to onValueChange to match shadcn convention
  label: string;
  placeholder?: string;
}

export function MedicalTermInput({ id, value, onValueChange, label, placeholder }: MedicalTermInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearchTerm = useDebounce(inputValue, 500);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term);
    onValueChange(term);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onValueChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length > 2 && showSuggestions) {
      const fetchSuggestions = async () => {
        setIsLoading(true);
        try {
          const result = await suggestMedicalTerms({ partialTerm: debouncedSearchTerm });
          setSuggestions(result.suggestions || []);
        } catch (error) {
          console.error("Error fetching medical term suggestions:", error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchTerm, showSuggestions]);

  return (
    <div className="space-y-1 relative">
      <Label htmlFor={id} className="font-medium">{label}</Label>
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Hide suggestions on blur with a delay
        onFocus={() => setShowSuggestions(true)} // Show suggestions on focus if there's input
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />
      {showSuggestions && (isLoading || suggestions.length > 0) && (
        <div className="absolute z-10 w-full mt-1 border border-border rounded-md bg-card shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="p-2 flex items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                  onMouseDown={() => handleSuggestionClick(suggestion)} // Use onMouseDown to fire before onBlur
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
           {!isLoading && suggestions.length === 0 && inputValue.length > 2 && (
             <p className="p-2 text-sm text-muted-foreground">No suggestions found.</p>
           )}
        </div>
      )}
    </div>
  );
}
