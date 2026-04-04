import { useState, useRef, useEffect, useCallback } from 'react';
import { Film, Image, Music2, Trash2, Plus, ZoomIn, ZoomOut, Scissors, Clock } from 'lucide-react';

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ClipIcon({ type }) {
  if (type === 'video') return <Film size={12} className="text-white/70" />;
  if (type === 'photo') return <Image size={12} className="text-white/70" />;
  return <Music2 size={12} className="text-white/70" />;
}

const TRACK_LABELS = ['Video', 'Photo', 'Audio'];

const DEFAULT_CLIP_WIDTH = 120; // px
const CLIP_HEIGHT = 44;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

export default function Timeline({ tracks, setTracks, mediaItems, selectedClipId, setSelectedClipId, currentTime }) {
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const rulerRef = useRef();
  const tracksRef = useRef();

  const totalDurationPx = 3000 * zoom;

  function handleDropMedia(e, trackIdx) {
    e.preventDefault();
    setDragOver(null);
    const mediaId = e.dataTransfer.getData('application/media-id');
    if (!mediaId) return;
    const item = mediaItems.find(m => m.id === mediaId);
    if (!item) return;

    // Only allow dropping on correct track
    const targetType = ['video', 'photo', 'audio'][trackIdx];
    if (item.type !== targetType) return;

    const clip = {
      id: crypto.randomUUID(),
      mediaId: item.id,
      name: item.name,
      url: item.url,
      type: item.type,
      duration: item.duration || (item.type === 'photo' ? 5 : 10),
      startTime: 0,
      effect: null,
    };

    setTracks(prev => {
      const next = [...prev];
      // Find start time after last clip
      const trackClips = next[trackIdx];
      const lastEnd = trackClips.reduce((acc, c) => Math.max(acc, c.startTime + c.duration), 0);
      clip.startTime = lastEnd;
      next[trackIdx] = [...trackClips, clip];
      return next;
    });
    setSelectedClipId(clip.id);
  }

  function removeClip(trackIdx, clipId) {
    setTracks(prev => {
      const next = [...prev];
      next[trackIdx] = next[trackIdx].filter(c => c.id !== clipId);
      return next;
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
  }

  function splitClip(trackIdx, clipId) {
    setTracks(prev => {
      const next = [...prev];
      const track = [...next[trackIdx]];
      const idx = track.findIndex(c => c.id === clipId);
      if (idx === -1) return prev;
      const clip = track[idx];
      if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return prev;
      const relTime = currentTime - clip.startTime;
      const first = { ...clip, duration: relTime };
      const second = { ...clip, id: crypto.randomUUID(), startTime: currentTime, duration: clip.duration - relTime };
      track.splice(idx, 1, first, second);
      next[trackIdx] = track;
      return next;
    });
  }

  const clipWidth = (duration) => Math.max(DEFAULT_CLIP_WIDTH * zoom * (duration / 10), 60);

  // Ruler ticks
  const totalSecs = 120; // 2 min timeline
  const tickInterval = zoom > 2 ? 1 : zoom > 1 ? 2 : 5;
  const ticks = [];
  for (let i = 0; i <= totalSecs; i += tickInterval) {
    ticks.push(i);
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d14] border-t border-white/6">
      {/* Timeline toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/6 shrink-0">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Clock size={11} /> Timeline
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - 0.25).toFixed(2)))}
          className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-all"
          title="Zoom out"
        ><ZoomOut size={13} /></button>
        <span className="text-xs text-white/30 font-mono w-10 text-center">{zoom.toFixed(1)}x</span>
        <button
          onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + 0.25).toFixed(2)))}
          className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-all"
          title="Zoom in"
        ><ZoomIn size={13} /></button>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-auto" ref={tracksRef}>
        {/* Time ruler */}
        <div className="flex sticky top-0 z-10 bg-[#0d0d14] border-b border-white/6">
          <div className="w-16 shrink-0 border-r border-white/6" />
          <div className="relative overflow-hidden" style={{ width: totalDurationPx }}>
            <div className="flex">
              {ticks.map(tick => (
                <div
                  key={tick}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: (tick / totalSecs) * totalDurationPx }}
                >
                  <span className="text-white/25 text-xs font-mono pl-1 pt-0.5">{formatTime(tick)}</span>
                  <div className="w-px h-2 bg-white/15 ml-px" />
                </div>
              ))}
            </div>
            <div style={{ height: 24 }} />
            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 bg-violet-400 pointer-events-none"
              style={{ left: (currentTime / totalSecs) * totalDurationPx, height: '100%' }}
            />
          </div>
        </div>

        {tracks.map((trackClips, trackIdx) => {
          const typeLabel = TRACK_LABELS[trackIdx];
          const type = ['video', 'photo', 'audio'][trackIdx];

          return (
            <div key={trackIdx} className="flex border-b border-white/4">
              {/* Track label */}
              <div className="w-16 shrink-0 flex flex-col items-center justify-center py-2 border-r border-white/6 bg-[#0f0f18]">
                <ClipIcon type={type} />
                <span className="text-white/30 text-xs mt-1">{typeLabel}</span>
              </div>

              {/* Drop zone */}
              <div
                className={`relative flex-1 timeline-track flex items-center transition-all ${
                  dragOver === trackIdx ? 'drop-zone-active' : 'bg-[#0d0d14]'
                }`}
                style={{ minWidth: totalDurationPx }}
                onDragOver={e => { e.preventDefault(); setDragOver(trackIdx); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDropMedia(e, trackIdx)}
              >
                {/* Clips */}
                {trackClips.map(clip => (
                  <div
                    key={clip.id}
                    className={`absolute flex flex-col justify-center px-2 rounded cursor-pointer transition-all group
                      ${clip.type === 'video' ? 'clip-video' : clip.type === 'photo' ? 'clip-photo' : 'clip-audio'}
                      ${selectedClipId === clip.id ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : ''}
                    `}
                    style={{
                      left: (clip.startTime / totalSecs) * totalDurationPx,
                      width: (clip.duration / totalSecs) * totalDurationPx,
                      height: CLIP_HEIGHT,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      maxWidth: totalDurationPx,
                    }}
                    onClick={() => setSelectedClipId(clip.id)}
                  >
                    <p className="text-white text-xs font-medium truncate leading-tight">{clip.name}</p>
                    <p className="text-white/60 text-xs">{formatTime(clip.duration)}</p>

                    {/* Clip actions */}
                    <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={e => { e.stopPropagation(); splitClip(trackIdx, clip.id); }}
                        className="p-0.5 rounded bg-black/40 hover:bg-black/70 text-white/70 hover:text-white"
                        title="Split at playhead"
                      ><Scissors size={10} /></button>
                      <button
                        onClick={e => { e.stopPropagation(); removeClip(trackIdx, clip.id); }}
                        className="p-0.5 rounded bg-black/40 hover:bg-red-800/70 text-white/70 hover:text-red-300"
                        title="Remove clip"
                      ><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}

                {/* Empty track hint */}
                {trackClips.length === 0 && (
                  <div className="flex items-center gap-1.5 px-4 text-white/15 text-xs pointer-events-none">
                    <Plus size={12} />
                    <span>Drop {type} here</span>
                  </div>
                )}

                {/* Playhead overlay */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-violet-400/70 pointer-events-none"
                  style={{ left: (currentTime / totalSecs) * totalDurationPx }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
