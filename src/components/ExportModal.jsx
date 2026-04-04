import { useState } from 'react';
import { Download, X, Film, Settings2 } from 'lucide-react';

const RESOLUTIONS = [
  { label: '4K (3840×2160)', value: '4k' },
  { label: '1080p (1920×1080)', value: '1080p' },
  { label: '720p (1280×720)', value: '720p' },
  { label: '480p (854×480)', value: '480p' },
];
const FORMATS = ['MP4', 'WebM', 'MOV', 'AVI'];
const QUALITIES = ['High', 'Medium', 'Low'];

export default function ExportModal({ onClose, tracks }) {
  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('MP4');
  const [quality, setQuality] = useState('High');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  function handleExport() {
    setExporting(true);
    // Simulate export process
    setTimeout(() => {
      setExporting(false);
      setDone(true);
      // Create a simple demo blob for download
      const blob = new Blob(
        ['VideoForge Export - This is a demo export.\nFormat: ' + format + '\nResolution: ' + resolution + '\nQuality: ' + quality],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videoforge-export.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    }, 2500);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 fade-in">
      <div className="glass rounded-2xl w-full max-w-sm mx-4 p-6 border border-white/12 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center">
              <Film size={15} className="text-violet-300" />
            </div>
            <h2 className="text-sm font-semibold text-white">Export Project</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/8 text-white/40 hover:text-white transition-all">
            <X size={15} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center">
              <Download size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm text-white/80 font-medium">Export Complete!</p>
            <p className="text-xs text-white/40">Your file has been downloaded</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-sm text-white/70 transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Settings */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-white/50 block mb-1.5">Resolution</label>
                <select
                  value={resolution} onChange={e => setResolution(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-violet-500/50"
                >
                  {RESOLUTIONS.map(r => (
                    <option key={r.value} value={r.value} className="bg-[#1a1a24]">{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Format</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.map(f => (
                      <button
                        key={f} onClick={() => setFormat(f)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          format === f ? 'bg-violet-600/30 text-violet-300 border border-violet-600/50' : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10'
                        }`}
                      >{f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Quality</label>
                  <div className="flex flex-col gap-1">
                    {QUALITIES.map(q => (
                      <button
                        key={q} onClick={() => setQuality(q)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all text-left ${
                          quality === q ? 'bg-violet-600/30 text-violet-300 border border-violet-600/50' : 'bg-white/5 text-white/50 border border-white/8 hover:bg-white/10'
                        }`}
                      >{q}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-violet-900/30"
            >
              {exporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export {format}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
