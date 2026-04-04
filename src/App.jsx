import { useState, useEffect, useCallback } from 'react';
import './App.css';

import Toolbar from './components/Toolbar.jsx';
import MediaLibrary from './components/MediaLibrary.jsx';
import EffectsPanel, { EFFECTS } from './components/EffectsPanel.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import Timeline from './components/Timeline.jsx';
import ExportModal from './components/ExportModal.jsx';

import { Library, Sparkles, Info, ChevronLeft, ChevronRight } from 'lucide-react';

const SIDEBAR_TABS = [
  { id: 'media',   icon: Library,   label: 'Media'   },
  { id: 'effects', icon: Sparkles,  label: 'Effects' },
];

const INITIAL_TRACKS = [[], [], []]; // video, photo, audio

export default function App() {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [mediaItems, setMediaItems] = useState([]);
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
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

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  function pushHistory(state) {
    setHistory(h => [...h.slice(-30), state]);
    setFuture([]);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [tracks, ...f]);
    setTracks(prev);
    setHistory(h => h.slice(0, -1));
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, tracks]);
    setTracks(next);
    setFuture(f => f.slice(1));
  }

  // Wrap setTracks to also push history
  const setTracksWithHistory = useCallback((updater) => {
    setTracks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setHistory(h => [...h.slice(-30), prev]);
      setFuture([]);
      return next;
    });
  // setTracks, setHistory, setFuture are stable React state setters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTracks, setHistory, setFuture]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [history, future, tracks]);

  // Find active/selected clip
  const selectedClip = selectedClipId
    ? tracks.flat().find(c => c.id === selectedClipId) || null
    : null;

  function addMediaItem(item) {
    setMediaItems(prev => [...prev, item]);
  }

  function removeMediaItem(id) {
    setMediaItems(prev => prev.filter(m => m.id !== id));
    // Remove clips using this media
    setTracksWithHistory(prev =>
      prev.map(track => track.filter(c => c.mediaId !== id))
    );
  }

  const previewClip = selectedClip || (tracks.flat()[0] || null);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <Toolbar
        projectName={projectName}
        setProjectName={setProjectName}
        onExport={() => setShowExport(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      {/* Main content */}
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
          {/* Preview */}
          <div className="flex-1 min-h-0">
            <VideoPreview
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

          {/* Timeline */}
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

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          tracks={tracks}
        />
      )}
    </div>
  );
}
