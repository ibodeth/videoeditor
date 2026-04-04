import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Maximize2, Film, Music2
} from 'lucide-react';

function safeBlobUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow blob: protocol; return parsed.href to break CodeQL taint flow
    if (parsed.protocol !== 'blob:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildFilter(effect, brightness, contrast, saturation, opacity) {
  const parts = [];
  if (effect && effect.css !== 'none') parts.push(effect.css);
  if (brightness !== 100) parts.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) parts.push(`contrast(${contrast / 100})`);
  if (saturation !== 100) parts.push(`saturate(${saturation / 100})`);
  return {
    filter: parts.join(' ') || 'none',
    opacity: opacity / 100,
  };
}

export default function VideoPreview({ clip, effect, brightness, contrast, saturation, opacity, onTimeUpdate, currentTime }) {
  const videoRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef();

  const filterStyle = buildFilter(effect, brightness, contrast, saturation, opacity);

  useEffect(() => {
    setPlaying(false);
    setLocalTime(0);
  }, [clip]);

  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  }, [playing]);

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setLocalTime(t);
    onTimeUpdate?.(t);
  }

  function handleSeek(e) {
    const t = Number(e.target.value);
    setLocalTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
  }

  function handleEnded() { setPlaying(false); }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }

  function skipBack() {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
  }
  function skipForward() {
    if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0a0a10]">
      {/* Preview area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {!clip ? (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <Film size={48} className="opacity-30" />
            <p className="text-sm">Add media to start editing</p>
            <p className="text-xs opacity-60">Drag & drop from Media Library to Timeline</p>
          </div>
        ) : clip.type === 'video' ? (
          <video
            ref={videoRef}
            src={safeBlobUrl(clip.url)}
            className="max-w-full max-h-full"
            style={filterStyle}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onEnded={handleEnded}
            muted={muted}
          />
        ) : clip.type === 'photo' ? (
          <img
            src={safeBlobUrl(clip.url)}
            alt={clip.name}
            className="max-w-full max-h-full object-contain"
            style={filterStyle}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/40">
            <div className="w-24 h-24 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center pulse-soft">
              <Music2 size={40} className="text-emerald-400" />
            </div>
            <p className="text-sm text-white/50">{clip.name}</p>
            <audio
              ref={videoRef}
              src={safeBlobUrl(clip.url)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onEnded={handleEnded}
              muted={muted}
            />
          </div>
        )}

        {/* Fullscreen button overlay */}
        {clip && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/40 hover:bg-black/70 text-white/50 hover:text-white transition-all"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-4 py-3 border-t border-white/6 bg-[#0d0d14]">
        {/* Seek bar */}
        {clip && (clip.type === 'video' || clip.type === 'audio') && (
          <div className="mb-2">
            <input
              type="range"
              min={0} max={duration || 0}
              step={0.01}
              value={localTime}
              onChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/30 mt-0.5 font-mono">
              <span>{formatTime(localTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Playback */}
          <div className="flex items-center gap-1">
            <button onClick={skipBack} className="p-1.5 rounded-md hover:bg-white/8 text-white/50 hover:text-white transition-all">
              <SkipBack size={14} />
            </button>
            <button
              onClick={togglePlay}
              disabled={!clip || clip.type === 'photo'}
              className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-lg shadow-violet-900/40"
            >
              {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <button onClick={skipForward} className="p-1.5 rounded-md hover:bg-white/8 text-white/50 hover:text-white transition-all">
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={() => setMuted(m => !m)}
            className="p-1.5 rounded-md hover:bg-white/8 text-white/50 hover:text-white transition-all"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
