/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, DragEvent, useEffect } from 'react';
import { Plus, GripVertical, Film, Tv, CheckCircle2, X, Popcorn, Filter, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

type Column = 'To Watch' | 'Currently Watching' | 'Completed';
type MediaType = 'movie' | 'tv';
type FilterType = 'all' | 'movie' | 'tv';

interface MediaItem {
  id: string;
  title: string;
  column: Column;
  type: MediaType;
  season?: string;
  platform?: string;
  summary?: string;
}

const COLUMNS: { id: Column; icon: React.ReactNode; color: string }[] = [
  { id: 'To Watch', icon: <Film size={18} />, color: 'text-blue-400' },
  { id: 'Currently Watching', icon: <Tv size={18} />, color: 'text-amber-400' },
  { id: 'Completed', icon: <CheckCircle2 size={18} />, color: 'text-emerald-400' },
];

export default function App() {
  const [items, setItems] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('media-tracker-items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      { id: '1', title: 'Severance', column: 'Currently Watching', type: 'tv', season: '1', platform: 'Apple TV+', summary: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.' },
      { id: '2', title: 'Dune: Part Two', column: 'To Watch', type: 'movie', platform: 'Max', summary: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge.' },
      { id: '3', title: 'The Bear', column: 'Completed', type: 'tv', season: '2', platform: 'Hulu', summary: 'A young chef from the fine dining world returns to Chicago to run his family sandwich shop.' },
    ];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<MediaType>('movie');
  const [inputSeason, setInputSeason] = useState('');
  const [inputPlatform, setInputPlatform] = useState('');
  const [inputSummary, setInputSummary] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<Column, FilterType>>({
    'To Watch': 'all',
    'Currently Watching': 'all',
    'Completed': 'all'
  });
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Column | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('media-tracker-items', JSON.stringify(items));
  }, [items]);

  const fetchSummary = async (force = false) => {
    if (!inputValue.trim()) return;
    if (inputSummary.trim() && !force) return;
    
    setIsFetchingSummary(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a brief, one-sentence logline/summary for the ${inputType} '${inputValue.trim()}'. Do not include the title in the summary. Keep it under 120 characters. Return ONLY the summary text, without quotes. If you don't know the movie or show, return exactly an empty string.`,
      });
      const text = response.text?.trim() || '';
      if (text) setInputSummary(text);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setIsFetchingSummary(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      title: inputValue.trim(),
      column: 'To Watch',
      type: inputType,
      season: inputType === 'tv' ? inputSeason.trim() : undefined,
      platform: inputPlatform.trim() || undefined,
      summary: inputSummary.trim() || undefined,
    };

    setItems([...items, newItem]);
    setInputValue('');
    setInputSeason('');
    setInputPlatform('');
    setInputSummary('');
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    setTimeout(() => {
      const element = document.getElementById(`item-${id}`);
      if (element) element.classList.add('opacity-40', 'scale-95');
    }, 0);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedItemId(null);
    setDragOverColumn(null);
    setDragOverItemId(null);
    const element = document.getElementById(`item-${id}`);
    if (element) element.classList.remove('opacity-40', 'scale-95');
  };

  const handleDragOverColumn = (e: DragEvent<HTMLDivElement>, column: Column) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const handleDragOverItem = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent column drag over
    e.dataTransfer.dropEffect = 'move';
    if (dragOverItemId !== id) {
      setDragOverItemId(id);
      setDragOverColumn(null);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Handled by drop and dragend
  };

  const handleDropOnColumn = (e: DragEvent<HTMLDivElement>, targetColumn: Column) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverItemId(null);
    if (!draggedItemId) return;

    setItems((prevItems) => {
      const draggedItem = prevItems.find(i => i.id === draggedItemId);
      if (!draggedItem) return prevItems;

      // Remove item from old position
      const newItems = prevItems.filter(i => i.id !== draggedItemId);
      // Append to the end of the target column
      newItems.push({ ...draggedItem, column: targetColumn });
      return newItems;
    });
    setDraggedItemId(null);
  };

  const handleDropOnItem = (e: DragEvent<HTMLDivElement>, targetItemId: string, targetColumn: Column) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent column drop
    setDragOverColumn(null);
    setDragOverItemId(null);
    
    if (!draggedItemId || draggedItemId === targetItemId) return;

    setItems((prevItems) => {
      const draggedItem = prevItems.find(i => i.id === draggedItemId);
      if (!draggedItem) return prevItems;

      // Remove item from old position
      const newItems = prevItems.filter(i => i.id !== draggedItemId);
      
      // Find index of the target item
      const targetIndex = newItems.findIndex(i => i.id === targetItemId);
      if (targetIndex === -1) return prevItems;

      // Insert before the target item
      newItems.splice(targetIndex, 0, { ...draggedItem, column: targetColumn });
      return newItems;
    });
    setDraggedItemId(null);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const toggleColumnFilter = (column: Column, type: FilterType) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: prev[column] === type ? 'all' : type
    }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center pt-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
            Watcher
          </h1>
          <p className="text-zinc-400 text-lg">Keep an eye on your movies and shows</p>
        </header>

        <form onSubmit={handleAddItem} className="mb-16 max-w-3xl mx-auto bg-zinc-900/40 p-5 md:p-6 rounded-3xl border border-zinc-800/50 shadow-lg">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => fetchSummary(false)}
                placeholder="Add a show or movie title..."
                className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
              />
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value as MediaType)}
                className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-zinc-200 md:w-40 appearance-none cursor-pointer"
              >
                <option value="movie">🎬 Movie</option>
                <option value="tv">📺 TV Show</option>
              </select>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={inputPlatform}
                onChange={(e) => setInputPlatform(e.target.value)}
                placeholder="OTT Platform (e.g., Netflix, Max)"
                className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
              />
              {inputType === 'tv' && (
                <input
                  type="text"
                  value={inputSeason}
                  onChange={(e) => setInputSeason(e.target.value)}
                  placeholder="Season (e.g., 1)"
                  className="md:w-32 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
                />
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputSummary}
                  onChange={(e) => setInputSummary(e.target.value)}
                  placeholder={isFetchingSummary ? "Fetching summary..." : "Brief one-line summary (optional)..."}
                  disabled={isFetchingSummary}
                  className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl pl-4 pr-10 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500 disabled:opacity-50"
                />
                {isFetchingSummary ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin">
                    <Loader2 size={18} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fetchSummary(true)}
                    disabled={!inputValue.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                    title="Auto-fetch summary"
                  >
                    <Sparkles size={18} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isFetchingSummary}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 md:w-auto"
              >
                <Plus size={20} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4 md:pt-8 pb-12">
          {COLUMNS.map((col) => {
            const isMiddle = col.id === 'Currently Watching';
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOverColumn(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnColumn(e, col.id)}
                className={`border rounded-3xl p-5 flex flex-col transition-all duration-300 ${
                  isMiddle 
                    ? 'md:-translate-y-6 md:min-h-[660px] shadow-2xl bg-zinc-800/40 border-zinc-700/60' 
                    : 'md:min-h-[600px] bg-zinc-900/40 border-zinc-800/50'
                } ${
                  dragOverColumn === col.id 
                    ? 'border-indigo-500/50 bg-zinc-800/60 ring-4 ring-indigo-500/10' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-6 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl bg-zinc-800/50 ${col.color}`}>
                      {col.icon}
                    </div>
                    <h2 className="font-semibold text-zinc-200 text-lg">{col.id}</h2>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-auto mr-3">
                    <button 
                      onClick={() => toggleColumnFilter(col.id, 'tv')}
                      className={`p-1.5 rounded-lg transition-all ${columnFilters[col.id] === 'tv' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}
                      title="Filter TV Shows"
                    >
                      <Tv size={16} />
                    </button>
                    <button 
                      onClick={() => toggleColumnFilter(col.id, 'movie')}
                      className={`p-1.5 rounded-lg transition-all ${columnFilters[col.id] === 'movie' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'}`}
                      title="Filter Movies"
                    >
                      <Popcorn size={16} />
                    </button>
                  </div>

                  <span className="bg-zinc-800 text-zinc-400 text-sm py-1 px-3 rounded-full font-mono font-medium">
                    {items.filter((item) => item.column === col.id && (columnFilters[col.id] === 'all' || item.type === columnFilters[col.id])).length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  {items
                    .filter((item) => item.column === col.id && (columnFilters[col.id] === 'all' || item.type === columnFilters[col.id]))
                    .map((item) => (
                      <div
                        key={item.id}
                        id={`item-${item.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={(e) => handleDragEnd(e, item.id)}
                        onDragOver={(e) => handleDragOverItem(e, item.id)}
                        onDrop={(e) => handleDropOnItem(e, item.id, col.id)}
                        className={`group relative bg-zinc-800/90 hover:bg-zinc-700/80 border-y border-r border-l-4 rounded-2xl p-4 cursor-grab active:cursor-grabbing transition-all shadow-sm flex items-start gap-3 ${
                          item.type === 'movie' 
                            ? 'border-l-blue-500 border-y-zinc-700/50 border-r-zinc-700/50' 
                            : 'border-l-purple-500 border-y-zinc-700/50 border-r-zinc-700/50'
                        } ${
                          dragOverItemId === item.id ? 'border-t-2 border-t-indigo-500 -mt-1' : ''
                        }`}
                      >
                        <div className="text-zinc-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-2">
                          <GripVertical size={16} />
                        </div>
                        
                        <div className="shrink-0 mt-0.5">
                          {item.type === 'movie' ? (
                            <Popcorn size={18} className="text-blue-400" />
                          ) : (
                            <Tv size={18} className="text-purple-400" />
                          )}
                        </div>

                        <div className="flex-1 pr-6">
                          <div className="font-medium text-zinc-100 leading-snug">{item.title}</div>
                          
                          {item.summary && (
                            <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                              {item.summary}
                            </div>
                          )}

                          {(item.season || item.platform) && (
                            <div className="text-[11px] font-medium text-zinc-400 mt-2.5 flex items-center gap-2 flex-wrap">
                              {item.type === 'tv' && item.season && (
                                <span className="bg-zinc-900/80 border border-zinc-700/50 px-2 py-0.5 rounded-md text-purple-300">
                                  Season {item.season}
                                </span>
                              )}
                              {item.platform && (
                                <span className="bg-zinc-900/80 border border-zinc-700/50 px-2 py-0.5 rounded-md text-zinc-300">
                                  {item.platform}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="absolute right-3 top-4 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete item"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  
                  {items.filter((item) => item.column === col.id && (columnFilters[col.id] === 'all' || item.type === columnFilters[col.id])).length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-2xl text-zinc-600 text-sm font-medium">
                      Drop items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
