import { useState, useEffect, useCallback, useReducer } from 'react';
import './App.css';

import Toolbar from './components/Toolbar.jsx';
import MediaLibrary from './components/MediaLibrary.jsx';
import EffectsPanel from './components/EffectsPanel.jsx';
import { EFFECTS } from './components/effects.js';
import VideoPreview from './components/VideoPreview.jsx';
import Timeline from './components/Timeline.jsx';
import ExportModal from './components/ExportModal.jsx';

import { Library, Sparkles } from 'lucide-react';

const SIDEBAR_TABS = [
  { id: 'media',   icon: Library,   label: 'Media'   },
  { id: 'effects', icon: Sparkles,  label: 'Effects' },
];

// Reducer manages tracks + undo/redo history without stale closure issues
function historyReducer(state, action) {
  switch (action.type) {
    case 'SET_TRACKS': {
      const next = typeof action.payload === 'function'
        ? action.payload(state.tracks)
        : action.payload;
      return {
        ...state,
        tracks: next,
        history: [...state.history.slice(-30), state.tracks],
        future: [],
      };
    }
    case 'UNDO':
      if (state.history.length === 0) return state;
      return {
        ...state,
        tracks: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
        future: [state.tracks, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      return {
        ...state,
        tracks: state.future[0],
        future: state.future.slice(1),
        history: [...state.history, state.tracks],
      };
    default:
      return state;
  }
}

const INITIAL_STATE = { tracks: [[], [], []], history: [], future: [] };

export default function App() {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [mediaItems, setMediaItems] = useState([]);
  const [{ tracks, history, future }, dispatch] = useReducer(historyReducer, INITIAL_STATE);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [activeEffect, setActiveEffect] = useState(EFFECTS[0]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [opacity, setOpacity] = useState(100);
  const [sidebarTab, setSidebarTab] = useState('media');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const setTracksWithHistory = useCallback((updater) => {
    dispatch({ type: 'SET_TRACKS', payload: updater });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  // Keyboard shortcuts — stable undo/redo from useCallback allow this to run only once
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const selectedClip = selectedClipId
    ? tracks.flat().find(c => c.id === selectedClipId) || null
    : null;

  function addMediaItem(item) {
    setMediaItems(prev => [...prev, item]);
  }

  function removeMediaItem(id) {
    setMediaItems(prev => prev.filter(m => m.id !== id));
    setTracksWithHistory(prev =>
      prev.map(track => track.filter(c => c.mediaId !== id))
    );
  }

  const previewClip = selectedClip || (tracks.flat()[0] || null);

  return (
    <div className="flex flex-col w-full h-full">
      <Toolbar
        projectName={projectName}
        setProjectName={setProjectName}
        onExport={() => setShowExport(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar tab strip */}
        <div className="flex flex-col items-center gap-1 py-3 px-1.5 bg-[#0e0e16] border-r border-white/6 shrink-0">
          {SIDEBAR_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (sidebarTab === tab.id && sidebarOpen) setSidebarOpen(false);
                  else { setSidebarTab(tab.id); setSidebarOpen(true); }
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full ${
                  sidebarTab === tab.id && sidebarOpen
                    ? 'bg-violet-600/20 text-violet-300'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                }`}
                title={tab.label}
              >
                <Icon size={17} />
                <span className="text-xs leading-none" style={{fontSize:'9px'}}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar panel */}
        {sidebarOpen && (
          <div className="w-56 bg-[#111118] border-r border-white/6 flex flex-col shrink-0 overflow-hidden">
            {sidebarTab === 'media' && (
              <MediaLibrary
                items={mediaItems}
                onAdd={addMediaItem}
                onRemove={removeMediaItem}
              />
            )}
            {sidebarTab === 'effects' && (
              <EffectsPanel
                activeEffect={activeEffect}
                onEffectSelect={setActiveEffect}
                brightness={brightness} setBrightness={setBrightness}
                contrast={contrast} setContrast={setContrast}
                saturation={saturation} setSaturation={setSaturation}
                opacity={opacity} setOpacity={setOpacity}
              />
            )}
          </div>
        )}

        {/* Center: preview + timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <VideoPreview
              key={previewClip?.id ?? 'empty'}
              clip={previewClip}
              effect={activeEffect}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              opacity={opacity}
              onTimeUpdate={setCurrentTime}
              currentTime={currentTime}
            />
          </div>
          <div className="h-52 shrink-0">
            <Timeline
              tracks={tracks}
              setTracks={setTracksWithHistory}
              mediaItems={mediaItems}
              selectedClipId={selectedClipId}
              setSelectedClipId={setSelectedClipId}
              currentTime={currentTime}
            />
          </div>
        </div>
      </div>

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
