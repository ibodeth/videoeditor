import { useState, useEffect, useCallback, useReducer } from 'react';
import './App.css';

import Toolbar from './components/Toolbar.jsx';
import MediaLibrary from './components/MediaLibrary.jsx';
import EffectsPanel from './components/EffectsPanel.jsx';
import CompositionViewer from './components/CompositionViewer.jsx';
import Timeline from './components/Timeline.jsx';
import ExportModal from './components/ExportModal.jsx';
import PropertiesPanel from './components/PropertiesPanel.jsx';

import { Library, Sparkles } from 'lucide-react';

export const COMPOSITION_WIDTH  = 1920;
export const COMPOSITION_HEIGHT = 1080;
export const COMPOSITION_FPS    = 30;

function makeTransform() {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 };
}

function historyReducer(state, action) {
  switch (action.type) {
    case 'SET_LAYERS': {
      const next = typeof action.payload === 'function'
        ? action.payload(state.layers)
        : action.payload;
      return {
        ...state,
        layers: next,
        history: [...state.history.slice(-40), state.layers],
        future: [],
      };
    }
    case 'UNDO':
      if (!state.history.length) return state;
      return {
        ...state,
        layers: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
        future: [state.layers, ...state.future],
      };
    case 'REDO':
      if (!state.future.length) return state;
      return {
        ...state,
        layers: state.future[0],
        future: state.future.slice(1),
        history: [...state.history, state.layers],
      };
    default:
      return state;
  }
}

const INITIAL_STATE = { layers: [], history: [], future: [] };

const SIDEBAR_TABS = [
  { id: 'media',   icon: Library,  label: 'Project' },
  { id: 'effects', icon: Sparkles, label: 'Effects'  },
];

export default function App() {
  const [projectName, setProjectName]   = useState('Untitled Project');
  const [mediaItems,  setMediaItems]    = useState([]);
  const [{ layers, history, future }, dispatch] = useReducer(historyReducer, INITIAL_STATE);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration,    setDuration]      = useState(30);
  const [isPlaying,   setIsPlaying]     = useState(false);
  const [sidebarTab,  setSidebarTab]    = useState('media');
  const [showExport,  setShowExport]    = useState(false);
  const [activeTool,  setActiveTool]    = useState('select');

  const setLayersWithHistory = useCallback(
    updater => dispatch({ type: 'SET_LAYERS', payload: updater }),
    []
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        setLayersWithHistory(prev => prev.filter(l => l.id !== selectedLayerId));
        setSelectedLayerId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedLayerId, setLayersWithHistory]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId) ?? null;

  function addMediaItem(item) { setMediaItems(prev => [...prev, item]); }

  function removeMediaItem(id) {
    setMediaItems(prev => prev.filter(m => m.id !== id));
    setLayersWithHistory(prev => prev.filter(l => l.mediaId !== id));
  }

  function addLayerFromMedia(item) {
    const lastEnd = layers.reduce((acc, l) => Math.max(acc, l.startTime + l.duration), 0);
    const layer = {
      id: crypto.randomUUID(),
      mediaId: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
      trackIndex: layers.length,
      startTime: lastEnd,
      duration: item.duration ?? (item.type === 'photo' ? 5 : 10),
      trimIn: 0,
      transform: makeTransform(),
      effects: [],
      volume: 1,
      muted: false,
      visible: true,
      solo: false,
    };
    setLayersWithHistory(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  }

  function addTextLayer() {
    const layer = {
      id: crypto.randomUUID(),
      mediaId: null,
      name: 'Text Layer',
      type: 'text',
      url: null,
      trackIndex: layers.length,
      startTime: currentTime,
      duration: 5,
      trimIn: 0,
      transform: makeTransform(),
      effects: [],
      volume: 0,
      muted: true,
      visible: true,
      solo: false,
      text: 'Edit Text',
      fontSize: 48,
      fontColor: '#ffffff',
      fontFamily: 'Arial',
    };
    setLayersWithHistory(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  }

  function updateLayer(id, updates) {
    setLayersWithHistory(prev =>
      prev.map(l => l.id === id ? { ...l, ...updates } : l)
    );
  }

  function updateLayerTransform(id, tUpdates) {
    setLayersWithHistory(prev =>
      prev.map(l => l.id === id
        ? { ...l, transform: { ...l.transform, ...tUpdates } }
        : l
      )
    );
  }

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#0f0f0f' }}>
      <Toolbar
        projectName={projectName}
        setProjectName={setProjectName}
        onExport={() => setShowExport(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        fps={COMPOSITION_FPS}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div style={{ width: 200, minWidth: 200, background: '#1a1a1a', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
            {SIDEBAR_TABS.map(tab => {
              const Icon = tab.icon;
              const active = sidebarTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '6px 4px', fontSize: 11, fontWeight: 500,
                    background: active ? '#1f2533' : 'transparent',
                    color: active ? '#fff' : '#666',
                    border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #4B8BFF' : '2px solid transparent',
                  }}
                >
                  <Icon size={11} />{tab.label}
                </button>
              );
            })}
          </div>
          {sidebarTab === 'media' && (
            <MediaLibrary
              items={mediaItems}
              onAdd={addMediaItem}
              onRemove={removeMediaItem}
              onAddToTimeline={addLayerFromMedia}
              onAddTextLayer={addTextLayer}
            />
          )}
          {sidebarTab === 'effects' && (
            <EffectsPanel selectedLayer={selectedLayer} onUpdateLayer={updateLayer} />
          )}
        </div>

        {/* Center: composition viewer */}
        <div style={{ flex: 1, minWidth: 0, background: '#141414', display: 'flex', flexDirection: 'column' }}>
          <CompositionViewer
            layers={layers}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            duration={duration}
            compositionWidth={COMPOSITION_WIDTH}
            compositionHeight={COMPOSITION_HEIGHT}
          />
        </div>

        {/* Right panel: properties */}
        <div style={{ width: 220, minWidth: 220, background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <PropertiesPanel
            layer={selectedLayer}
            onUpdateLayer={updateLayer}
            onUpdateTransform={updateLayerTransform}
          />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ height: 200, flexShrink: 0, borderTop: '1px solid #2a2a2a' }}>
        <Timeline
          layers={layers}
          setLayers={setLayersWithHistory}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          duration={duration}
          setDuration={setDuration}
          mediaItems={mediaItems}
          onAddLayerFromMedia={addLayerFromMedia}
        />
      </div>

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          layers={layers}
          compositionDuration={duration}
          compositionWidth={COMPOSITION_WIDTH}
          compositionHeight={COMPOSITION_HEIGHT}
        />
      )}
    </div>
  );
}
