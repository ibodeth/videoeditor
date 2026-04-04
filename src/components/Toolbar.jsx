import { Film, Undo2, Redo2, Save, Download, MousePointer2, Type, Hand } from 'lucide-react';

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Selection (V)' },
  { id: 'text',   icon: Type,          label: 'Text (T)'      },
  { id: 'hand',   icon: Hand,          label: 'Hand (H)'      },
];

export default function Toolbar({ onExport, onUndo, onRedo, canUndo, canRedo, projectName, setProjectName, activeTool, setActiveTool, fps = 30 }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
      height: 36, flexShrink: 0,
      background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, background: 'linear-gradient(135deg, #4B8BFF, #7B4BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={12} color="#fff" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#ddd', letterSpacing: '0.02em' }}>VideoForge</span>
      </div>

      <Div />

      {/* Project name */}
      <input
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        style={{
          background: '#111', border: '1px solid #333', borderRadius: 3,
          padding: '2px 8px', fontSize: 12, color: '#ccc', width: 160,
          outline: 'none', transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#4B8BFF'}
        onBlur={e => e.target.style.borderColor = '#333'}
      />

      <Div />

      {/* Undo/Redo */}
      <button onClick={onUndo} disabled={!canUndo} style={toolBtn(!canUndo)} title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
      <button onClick={onRedo} disabled={!canRedo} style={toolBtn(!canRedo)} title="Redo (Ctrl+Y)"><Redo2 size={13} /></button>

      <Div />

      {/* Tool selector */}
      {TOOLS.map(t => {
        const Icon = t.icon;
        const active = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
            style={{
              ...toolBtn(false),
              background: active ? '#2a3a5a' : 'none',
              color: active ? '#6aadff' : '#888',
              border: active ? '1px solid #3a5a8a' : '1px solid transparent',
            }}
          >
            <Icon size={13} />
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Comp info */}
      <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>1920×1080 · {fps}fps</span>

      <Div />

      {/* Save */}
      <button style={{ ...actionBtn, background: '#2a2a2a', color: '#aaa' }}>
        <Save size={12} /> Save
      </button>

      {/* Export */}
      <button onClick={onExport} style={{ ...actionBtn, background: '#1a3a6a', color: '#6aadff', border: '1px solid #2a5aaa' }}>
        <Download size={12} /> Export
      </button>
    </header>
  );
}

function Div() {
  return <div style={{ width: 1, height: 18, background: '#2a2a2a', flexShrink: 0 }} />;
}

const toolBtn = (disabled) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 3,
  background: 'none', border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#3a3a3a' : '#888', opacity: disabled ? 0.4 : 1,
  transition: 'all 0.1s', padding: 0,
});

const actionBtn = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
  borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  transition: 'all 0.1s',
};
