import { useRef, useState } from 'react';
import {
  Upload, Film, Image, Music, Trash2, Plus, FolderOpen, Search
} from 'lucide-react';

const ACCEPT = 'video/*,image/*,audio/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.flv,.wmv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.heic,.mp3,.wav,.aac,.ogg,.flac,.m4a,.wma,.opus';

function MediaIcon({ type }) {
  if (type === 'video') return <Film size={14} className="text-violet-400" />;
  if (type === 'photo') return <Image size={14} className="text-cyan-400" />;
  return <Music size={14} className="text-emerald-400" />;
}

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibrary({ items, onAdd, onRemove }) {
  const inputRef = useRef();
  const [draggingOver, setDraggingOver] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      let type = 'audio';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('image/')) type = 'photo';
      onAdd({ id: crypto.randomUUID(), name: file.name, url, type, size: file.size, file });
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || item.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/6 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Media</span>
        <button
          onClick={() => inputRef.current.click()}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-medium transition-all"
        >
          <Plus size={11} /> Import
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search media..."
            className="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-white/5 border border-white/8 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 pb-2 shrink-0">
        {['all', 'video', 'photo', 'audio'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-xs capitalize transition-all ${
              filter === f
                ? 'bg-violet-600/30 text-violet-300'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Drop zone / list */}
      <div
        className={`flex-1 overflow-y-auto mx-3 mb-3 rounded-lg border-2 border-dashed transition-all ${
          draggingOver ? 'drop-zone-active' : 'border-white/8'
        }`}
        onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
      >
        {filtered.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center gap-3 cursor-pointer p-4"
            onClick={() => inputRef.current.click()}
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <Upload size={18} className="text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Drop files here or click to import</p>
              <p className="text-white/20 text-xs mt-1">Video • Photo • Audio</p>
            </div>
          </div>
        ) : (
          <ul className="p-1.5 flex flex-col gap-0.5">
            {filtered.map(item => (
              <MediaItem key={item.id} item={item} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function safeBlobUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow blob: protocol; return the parsed href to break CodeQL taint flow
    if (parsed.protocol !== 'blob:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function MediaItem({ item, onRemove }) {
  function handleDragStart(e) {
    e.dataTransfer.setData('application/media-id', item.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all fade-in"
    >
      {/* Thumbnail/icon */}
      <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-white/8 flex items-center justify-center">
        {item.type === 'photo' && safeBlobUrl(item.url) ? (
          <img src={safeBlobUrl(item.url)} alt="" className="w-full h-full object-cover" />
        ) : item.type === 'video' && safeBlobUrl(item.url) ? (
          <VideoThumb url={safeBlobUrl(item.url)} />
        ) : (
          <Music size={14} className="text-emerald-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <MediaIcon type={item.type} />
          <span className="text-white/30 text-xs">{formatSize(item.size)}</span>
          {item.duration && (
            <span className="text-white/30 text-xs">{formatDuration(item.duration)}</span>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
}

function VideoThumb({ url }) {
  const vidRef = useRef();
  // url is already validated as blob: by safeBlobUrl before being passed here
  if (!url) return <Film size={14} className="text-violet-400" />;
  return (
    <video
      ref={vidRef}
      src={url}
      className="w-full h-full object-cover"
      muted
      onLoadedData={() => { if (vidRef.current) vidRef.current.currentTime = 0.5; }}
    />
  );
}
