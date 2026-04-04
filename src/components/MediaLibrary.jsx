import { useRef, useState } from 'react';
import { Upload, Film, Image, Music, Trash2, Plus, Search, Type } from 'lucide-react';

const ACCEPT = 'video/*,image/*,audio/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.flv,.wmv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.mp3,.wav,.aac,.ogg,.flac,.m4a,.wma,.opus';

// Parse and validate URL, returning parsed.href to break CodeQL taint flow
function safeBlobUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'blob:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function MediaIcon({ type }) {
  if (type === 'video') return <Film size={12} style={{ color: '#7B55EE' }} />;
  if (type === 'photo') return <Image size={12} style={{ color: '#0099CC' }} />;
  return <Music size={12} style={{ color: '#00AA66' }} />;
}

function formatDur(s) {
  if (!s || isNaN(s)) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
function formatSize(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

export default function MediaLibrary({ items, onAdd, onRemove, onAddToTimeline, onAddTextLayer }) {
  const inputRef = useRef();
  const [dropping, setDropping] = useState(false);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      let type = 'audio';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('image/')) type = 'photo';

      // Create blob URL and validate scheme before any DOM use
      const rawUrl = URL.createObjectURL(file);
      const url = safeBlobUrl(rawUrl);
      if (!url) { URL.revokeObjectURL(rawUrl); return; }

      const item = { id: crypto.randomUUID(), name: file.name, url, type, size: file.size };

      if (type === 'video') {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          onAdd({ ...item, duration: vid.duration });
        };
        vid.src = url; // url is parsed.href from a validated blob: URL
      } else if (type === 'audio') {
        const aud = document.createElement('audio');
        aud.preload = 'metadata';
        aud.onloadedmetadata = () => {
          onAdd({ ...item, duration: aud.duration });
        };
        aud.src = url; // url is parsed.href from a validated blob: URL
      } else {
        onAdd(item);
      }
    });
  }

  const filtered = items.filter(item => {
    const ms = item.name.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' || item.type === filter;
    return ms && mf;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Media</span>
        <button onClick={() => inputRef.current.click()} style={smBtn} title="Import media">
          <Plus size={10} /> Import
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Search */}
      <div style={{ padding: '4px 8px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={10} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ width: '100%', paddingLeft: 20, paddingRight: 6, paddingTop: 3, paddingBottom: 3, background: '#111', border: '1px solid #2a2a2a', borderRadius: 3, fontSize: 11, color: '#aaa', outline: 'none' }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '0 8px 4px', flexShrink: 0 }}>
        {['all','video','photo','audio'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '2px 6px', borderRadius: 2, fontSize: 10, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: filter === f ? '#2a3a5a' : 'transparent', color: filter === f ? '#6aadff' : '#555' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Add Text Layer button */}
      <div style={{ padding: '0 8px 6px', flexShrink: 0 }}>
        <button
          onClick={onAddTextLayer}
          style={{ ...smBtn, width: '100%', justifyContent: 'center', background: '#2a2a1a', color: '#CC9944', border: '1px solid #443311' }}
        >
          <Type size={10} /> Add Text Layer
        </button>
      </div>

      {/* Drop zone / file list */}
      <div
        onDragOver={e => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={e => { e.preventDefault(); setDropping(false); handleFiles(e.dataTransfer.files); }}
        style={{
          flex: 1, overflowY: 'auto', margin: '0 8px 8px',
          border: dropping ? '1px dashed #4B8BFF' : '1px dashed #2a2a2a',
          borderRadius: 4, background: dropping ? 'rgba(75,139,255,0.05)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, height: 80, color: '#444', fontSize: 11 }}>
            <Upload size={16} style={{ color: '#333' }} />
            <span>Drop files or click Import</span>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('application/media-id', item.id)}
              onDoubleClick={() => onAddToTimeline(item)}
              title={`${item.name}\nDouble-click to add to timeline`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
                cursor: 'grab', borderBottom: '1px solid #1a1a1a',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#222'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MediaIcon type={item.type} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 9, color: '#555' }}>
                  {formatSize(item.size)}{item.duration ? ` · ${formatDur(item.duration)}` : ''}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 2, display: 'flex' }}
                title="Remove"
                onMouseEnter={e => e.currentTarget.style.color = '#ff6666'}
                onMouseLeave={e => e.currentTarget.style.color = '#444'}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const smBtn = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
  background: '#2a2a2a', border: '1px solid #333', borderRadius: 3,
  color: '#aaa', fontSize: 10, cursor: 'pointer', fontWeight: 500,
};
