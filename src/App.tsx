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

const COLUMNS: { id: Column; title: string; icon: React.ReactNode; color: string; innerBg: string; borderColor: string; textColor: string; columnBg: string }[] = [
  { id: 'To Watch', title: 'to watch', icon: <Film size={18} />, color: 'text-blue-500', innerBg: 'bg-blue-50', borderColor: 'border-blue-300', textColor: 'text-blue-900', columnBg: 'bg-[#60D5E8]' },
  { id: 'Currently Watching', title: 'current', icon: <Tv size={18} />, color: 'text-rose-500', innerBg: 'bg-rose-50', borderColor: 'border-rose-300', textColor: 'text-rose-900', columnBg: 'bg-[#FF9EE0]' },
  { id: 'Completed', title: 'completed', icon: <CheckCircle2 size={18} />, color: 'text-emerald-500', innerBg: 'bg-emerald-50', borderColor: 'border-emerald-300', textColor: 'text-emerald-900', columnBg: 'bg-[#D0F8CE]' },
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
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 pt-8 flex justify-between items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-black">
            Watcher
          </h1>
          <button 
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="bg-[#E5E5E5] text-black font-bold py-2 px-4 w-32 md:w-64 text-right hover:bg-[#D4D4D4] transition-colors"
          >
            +Add
          </button>
        </header>

        {/* Add Component - Collapsible */}
        <div className={`mb-12 max-w-3xl ml-auto ${isFormExpanded ? 'block' : 'hidden'}`}>
          <form 
            onSubmit={handleAddItem} 
            className="flex flex-col gap-4 bg-white p-4 md:p-6 rounded-3xl border border-gray-200 shadow-sm transition-all duration-300 overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => fetchSummary(false)}
                placeholder="Title..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-gray-400 focus:bg-white"
              />
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value as MediaType)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-gray-700 md:w-40 appearance-none cursor-pointer focus:bg-white"
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
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-gray-400 focus:bg-white"
              />
              {inputType === 'tv' && (
                <input
                  type="text"
                  value={inputSeason}
                  onChange={(e) => setInputSeason(e.target.value)}
                  placeholder="Season"
                  className="md:w-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-gray-400 focus:bg-white"
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
        <div className="flex md:hidden bg-white p-1 rounded-2xl mb-6 border border-gray-200 shadow-sm sticky top-4 z-30 backdrop-blur-md">
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all ${
                activeTab === col.id 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
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
                className={`flex flex-col transition-all duration-300 ${
                  isVisible ? 'flex' : 'hidden md:flex'
                }`}
              >
                <h2 className="text-center font-extrabold text-2xl tracking-tighter text-black mb-4">{col.title}</h2>
                
                <div
                  onDragOver={(e) => handleDragOverColumn(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnColumn(e, col.id)}
                  className={`flex-1 flex flex-col p-4 md:p-5 rounded-[2rem] transition-all duration-300 ${col.columnBg} ${
                    dragOverColumn === col.id 
                      ? 'ring-4 ring-black/10' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleColumnFilter(col.id, 'tv')}
                        className={`p-1.5 rounded-lg transition-all ${columnFilters[col.id] === 'tv' ? 'bg-black/20 text-black' : 'text-black/40 hover:text-black hover:bg-black/10'}`}
                        title="Filter TV Shows"
                      >
                        <Tv size={16} />
                      </button>
                      <button 
                        onClick={() => toggleColumnFilter(col.id, 'movie')}
                        className={`p-1.5 rounded-lg transition-all ${columnFilters[col.id] === 'movie' ? 'bg-black/20 text-black' : 'text-black/40 hover:text-black hover:bg-black/10'}`}
                        title="Filter Movies"
                      >
                        <Popcorn size={16} />
                      </button>
                    </div>

                    <span className="bg-black/10 text-black text-xs py-1 px-2.5 rounded-full font-bold">
                      {items.filter((item) => item.column === col.id && (columnFilters[col.id] === 'all' || item.type === columnFilters[col.id])).length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
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
                        className={`group relative bg-white border-2 border-dashed border-gray-200 rounded-3xl p-2.5 cursor-grab active:cursor-grabbing transition-all shadow-sm ${
                          dragOverItemId === item.id ? 'border-t-indigo-500 -mt-1' : 'hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {/* Top row: Platform and Type */}
                        <div className="flex justify-between items-center px-2 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          <span className="truncate pr-2">{item.platform || 'No Platform'}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.type === 'tv' && item.season && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">S{item.season}</span>}
                            {item.type === 'movie' ? <Film size={12} /> : <Tv size={12} />}
                          </div>
                        </div>
                        
                        {/* Colored inner block */}
                        <div className={`${col.innerBg} border-l-4 ${col.borderColor} rounded-2xl p-3.5 flex items-start gap-3`}>
                          <div className="flex-1 pr-4">
                            <div className={`font-semibold ${col.textColor} leading-snug text-[15px]`}>{item.title}</div>
                            
                            {item.summary && (
                              <div className={`text-xs ${col.textColor} opacity-75 mt-1.5 leading-relaxed line-clamp-2`}>
                                {item.summary}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions (Hover) */}
                        <div className="absolute right-4 top-12 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-gray-100">
                          <button 
                            onClick={() => startEditing(item)}
                            className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                            aria-label="Edit item"
                          >
                            <Pencil size={14} />
                          </button>
                          
                          {/* Mobile Quick Move Button */}
                          <div className="md:hidden relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveMenu(showMoveMenu === item.id ? null : item.id);
                              }}
                              className="text-gray-400 hover:text-amber-500 transition-colors p-1"
                              aria-label="Move item"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                            
                            {showMoveMenu === item.id && (
                              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-40 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                                {COLUMNS.filter(c => c.id !== item.column).map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => moveItem(item.id, c.id)}
                                    className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
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
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            aria-label="Delete item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  
                  {items.filter((item) => item.column === col.id && (columnFilters[col.id] === 'all' || item.type === columnFilters[col.id])).length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 text-sm font-medium min-h-[120px]">
                      Drop items here
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingItemId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit Details</h3>
              <button 
                onClick={() => setEditingItemId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Title</label>
                <input 
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Platform</label>
                  <input 
                    type="text"
                    value={editForm.platform || ''}
                    onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                    placeholder="e.g. Netflix"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all focus:bg-white"
                  />
                </div>
                {editForm.type === 'tv' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Season</label>
                    <input 
                      type="text"
                      value={editForm.season || ''}
                      onChange={(e) => setEditForm({ ...editForm, season: e.target.value })}
                      placeholder="e.g. 1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all focus:bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Summary</label>
                <textarea 
                  rows={3}
                  value={editForm.summary || ''}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none focus:bg-white"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setEditingItemId(null)}
                className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
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
