/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, DragEvent, useEffect } from 'react';
import { Plus, GripVertical, Film, Tv, CheckCircle2, X, Popcorn, Filter, Loader2, Sparkles, Pencil, Save, ChevronRight, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MediaItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Column>('To Watch');
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    let summary = inputSummary.trim();
    
    // Auto-fetch summary if empty
    if (!summary) {
      setIsFetchingSummary(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Write a brief, one-sentence logline/summary for the ${inputType} '${inputValue.trim()}'. Do not include the title in the summary. Keep it under 120 characters. Return ONLY the summary text, without quotes. If you don't know the movie or show, return exactly an empty string.`,
        });
        summary = response.text?.trim() || '';
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setIsFetchingSummary(false);
      }
    }

    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      title: inputValue.trim(),
      column: 'To Watch',
      type: inputType,
      season: inputType === 'tv' ? inputSeason.trim() : undefined,
      platform: inputPlatform.trim() || undefined,
      summary: summary || undefined,
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

  const handleUpdateItem = (id: string, updates: Partial<MediaItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const startEditing = (item: MediaItem) => {
    setEditingItemId(item.id);
    setEditForm(item);
  };

  const saveEdit = () => {
    if (editingItemId && editForm) {
      handleUpdateItem(editingItemId, editForm);
      setEditingItemId(null);
      setEditForm({});
    }
  };

  const toggleColumnFilter = (column: Column, type: FilterType) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: prev[column] === type ? 'all' : type
    }));
  };

  const moveItem = (id: string, targetColumn: Column) => {
    setItems(items.map(item => item.id === id ? { ...item, column: targetColumn } : item));
    setShowMoveMenu(null);
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

        {/* Add Component - Collapsible on Mobile */}
        <div className="mb-12 max-w-3xl mx-auto">
          <button 
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="w-full md:hidden flex items-center justify-between bg-zinc-900/60 border border-zinc-800/50 p-4 rounded-2xl text-zinc-300 hover:text-zinc-100 transition-all mb-4"
          >
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-indigo-400" />
              <span className="font-medium">Add New Content</span>
            </div>
            {isFormExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <form 
            onSubmit={handleAddItem} 
            className={`${
              isFormExpanded ? 'flex' : 'hidden md:flex'
            } flex-col gap-4 bg-zinc-900/40 p-4 md:p-6 rounded-3xl border border-zinc-800/50 shadow-lg transition-all duration-300 overflow-hidden`}
          >
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => fetchSummary(false)}
                placeholder="Title..."
                className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
              />
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value as MediaType)}
                className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-zinc-200 md:w-40 appearance-none cursor-pointer"
              >
                <option value="movie">🎬 Movie</option>
                <option value="tv">📺 TV Show</option>
              </select>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <input
                type="text"
                value={inputPlatform}
                onChange={(e) => setInputPlatform(e.target.value)}
                placeholder="Platform (e.g. Netflix)"
                className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
              />
              {inputType === 'tv' && (
                <input
                  type="text"
                  value={inputSeason}
                  onChange={(e) => setInputSeason(e.target.value)}
                  placeholder="Season"
                  className="md:w-32 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-zinc-500"
                />
              )}
              <button
                type="submit"
                disabled={!inputValue.trim() || isFetchingSummary}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 md:w-auto text-sm md:text-base"
              >
                {isFetchingSummary ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                <span>{isFetchingSummary ? 'Fetching...' : 'Add'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden bg-zinc-900/60 p-1 rounded-2xl mb-6 border border-zinc-800/50 sticky top-4 z-30 backdrop-blur-md">
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all ${
                activeTab === col.id 
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                  : 'text-zinc-500'
              }`}
            >
              <div className={activeTab === col.id ? col.color : ''}>
                {col.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">{col.id.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4 md:pt-8 pb-12">
          {COLUMNS.map((col) => {
            const isMiddle = col.id === 'Currently Watching';
            const isVisible = activeTab === col.id;
            
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOverColumn(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnColumn(e, col.id)}
                className={`border rounded-3xl p-5 flex flex-col transition-all duration-300 ${
                  isVisible ? 'flex' : 'hidden md:flex'
                } ${
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

                          <div className="text-[11px] font-medium text-zinc-400 mt-2.5 flex items-center gap-2 flex-wrap">
                            {item.type === 'tv' && (
                              <div className="group/field relative">
                                <span className="bg-zinc-900/80 border border-zinc-700/50 px-2 py-0.5 rounded-md text-purple-300 cursor-pointer hover:bg-zinc-800 transition-colors flex items-center gap-1">
                                  S{item.season || '?'}
                                  <Pencil size={8} className="opacity-0 group-hover/field:opacity-100" />
                                </span>
                                <input 
                                  type="text"
                                  defaultValue={item.season || ''}
                                  onBlur={(e) => handleUpdateItem(item.id, { season: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                  className="absolute inset-0 w-full opacity-0 focus:opacity-100 bg-zinc-900 border border-indigo-500 rounded-md px-2 py-0.5 text-purple-300 outline-none z-10"
                                />
                              </div>
                            )}
                            
                            <div className="group/field relative">
                              <span className="bg-zinc-900/80 border border-zinc-700/50 px-2 py-0.5 rounded-md text-zinc-300 cursor-pointer hover:bg-zinc-800 transition-colors flex items-center gap-1">
                                {item.platform || 'Add OTT'}
                                <Pencil size={8} className="opacity-0 group-hover/field:opacity-100" />
                              </span>
                              <input 
                                type="text"
                                defaultValue={item.platform || ''}
                                onBlur={(e) => handleUpdateItem(item.id, { platform: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                className="absolute inset-0 w-full opacity-0 focus:opacity-100 bg-zinc-900 border border-indigo-500 rounded-md px-2 py-0.5 text-zinc-300 outline-none z-10"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute right-3 top-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditing(item)}
                            className="text-zinc-500 hover:text-indigo-400 transition-colors"
                            aria-label="Edit item"
                          >
                            <Pencil size={16} />
                          </button>
                          
                          {/* Mobile Quick Move Button */}
                          <div className="md:hidden relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveMenu(showMoveMenu === item.id ? null : item.id);
                              }}
                              className="text-zinc-500 hover:text-amber-400 transition-colors"
                              aria-label="Move item"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                            
                            {showMoveMenu === item.id && (
                              <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-40 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                                {COLUMNS.filter(c => c.id !== item.column).map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => moveItem(item.id, c.id)}
                                    className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                  >
                                    <span className={c.color}>{c.icon}</span>
                                    <span>Move to {c.id.split(' ')[0]}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors"
                            aria-label="Delete item"
                          >
                            <X size={16} />
                          </button>
                        </div>
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

      {/* Edit Modal */}
      {editingItemId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-zinc-100">Edit Details</h3>
              <button 
                onClick={() => setEditingItemId(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Title</label>
                <input 
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Platform</label>
                  <input 
                    type="text"
                    value={editForm.platform || ''}
                    onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                    placeholder="e.g. Netflix"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                {editForm.type === 'tv' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Season</label>
                    <input 
                      type="text"
                      value={editForm.season || ''}
                      onChange={(e) => setEditForm({ ...editForm, season: e.target.value })}
                      placeholder="e.g. 1"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Summary</label>
                <textarea 
                  rows={3}
                  value={editForm.summary || ''}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
              <button 
                onClick={() => setEditingItemId(null)}
                className="flex-1 px-4 py-3 rounded-xl font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
