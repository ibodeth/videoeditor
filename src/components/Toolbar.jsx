import {
  Film, Save, Upload, Download, Undo2, Redo2, Settings, Zap, ChevronDown
} from 'lucide-react';

export default function Toolbar({ onExport, onUndo, onRedo, canUndo, canRedo, projectName, setProjectName }) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-[#13131a] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
          <Film size={16} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-wide">VideoForge</span>
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* Project name */}
      <input
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-sm text-white/80 w-44 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
        placeholder="Untitled Project"
      />

      <div className="w-px h-5 bg-white/10" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo} disabled={!canUndo}
        className="p-1.5 rounded-md hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white/70 hover:text-white"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={onRedo} disabled={!canRedo}
        className="p-1.5 rounded-md hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white/70 hover:text-white"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 size={16} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-all border border-white/8">
          <Save size={13} />
          Save
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-lg shadow-violet-900/30"
        >
          <Download size={13} />
          Export
          <ChevronDown size={12} className="opacity-70" />
        </button>
      </div>
    </header>
  );
}
