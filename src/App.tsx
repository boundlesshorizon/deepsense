/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ShieldAlert, FileText, Image as ImageIcon, Video, Mic, Upload, Activity, AlertTriangle, CheckCircle, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type AnalysisMode = 'auto' | 'text' | 'image' | 'audio' | 'video';

export default function App() {
  const [mode, setMode] = useState<AnalysisMode>('auto');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setTextInput(''); // Clear text if a file is dropped
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5 MB max
  });

  const runAnalysis = async () => {
    if (mode === 'text' && !textInput.trim() && !file) {
      setError("Please provide text or a file to analyze.");
      return;
    }
    if ((mode !== 'text' && !file && !textInput.trim())) {
      setError("Please upload a file or enter text.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const isTextMode = textInput.trim().length > 0 && !file;
      
      const formData = new FormData();
      if (isTextMode) {
        formData.append('type', 'text');
        formData.append('textData', textInput);
      } else if (file) {
        formData.append('type', 'media');
        formData.append('media', file);
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new Error(`Server returned an invalid response (not JSON): ${textResponse.slice(0, 500)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setTextInput('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e4e4e7] font-sans selection:bg-rose-900/50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-[#1f1f23] flex flex-shrink-0 items-center justify-between px-6 lg:px-8 bg-[#0a0a0c]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-600 rounded flex items-center justify-center text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">DeepSense <span className="text-rose-500 font-mono text-sm">v2.4.0</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs font-mono uppercase tracking-widest hidden sm:flex">
          <div className="flex items-center gap-2 text-[#e4e4e7]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Active
          </div>
          <div className="text-[#71717a]">Task ID: <span className="text-white">FS-9921-X</span></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1400px] w-full mx-auto">
        
        {/* Left Column: Input */}
        <section className="flex-1 p-6 lg:p-8 bg-[#08080a] relative overflow-y-auto flex flex-col gap-6 border-r border-[#1f1f23]">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-[#71717a] uppercase tracking-widest italic">Source Media Analysis</h2>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">RAW_DATA</span>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-[#121214] rounded-lg border border-[#1f1f23]">
            {[
              { id: 'auto', label: 'Auto Detect', icon: Search },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'image', label: 'Image', icon: ImageIcon },
              { id: 'audio', label: 'Audio', icon: Mic },
              { id: 'video', label: 'Video', icon: Video },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as AnalysisMode)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    mode === tab.id 
                      ? "bg-[#1f1f23] text-rose-500 shadow-sm" 
                      : "text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1f1f23]/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {!file && (
             <div className="flex flex-col gap-4">
              <div 
                {...getRootProps()} 
                className={cn(
                  "relative group flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-[#121214]/30",
                  isDragActive ? "border-rose-500/50 bg-rose-950/20" : "border-[#1f1f23] hover:border-[#27272a] hover:bg-[#121214]/70"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 mb-4 rounded-full bg-[#121214] border border-[#1f1f23] flex items-center justify-center group-hover:bg-[#1f1f23] transition-colors">
                  <Upload className="w-6 h-6 text-[#71717a] group-hover:text-rose-400 transition-colors" />
                </div>
                <p className="text-sm font-medium text-[#e4e4e7] text-center">
                  Drag & drop media here
                </p>
                <p className="text-xs text-[#71717a] mt-1 text-center">
                  Supports Images, Audio, Video (Max 5MB)
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1f1f23]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#08080a] px-2 text-[#71717a] tracking-widest font-mono uppercase">Or Enter Text</span>
                </div>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste text for perplexity and burstiness analysis..."
                className="w-full h-32 bg-[#121214] border border-[#1f1f23] rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 placeholder:text-[#71717a] font-mono text-[#e4e4e7]"
              />
            </div>
          )}

          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#121214] border border-[#1f1f23] flex items-center justify-center flex-shrink-0">
                {file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-rose-500" /> :
                 file.type.startsWith('video/') ? <Video className="w-5 h-5 text-rose-500" /> :
                 file.type.startsWith('audio/') ? <Mic className="w-5 h-5 text-rose-500" /> :
                 <FileText className="w-5 h-5 text-rose-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-[#71717a] font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={clearSelection}
                className="p-2 hover:bg-[#1f1f23] rounded-lg text-[#71717a] hover:text-white transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || (!file && !textInput.trim())}
            className="w-full relative overflow-hidden group bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-bold tracking-wide uppercase text-xs py-3.5 rounded-xl transition-all active:scale-[0.98] outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 flex items-center justify-center gap-2 border border-rose-500/50"
          >
            {isAnalyzing ? (
              <>
                <Activity className="w-5 h-5 animate-pulse" />
                <span>Running Diagnostics...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Run Forensic Analysis</span>
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-200">{error}</p>
            </motion.div>
          )}

        </section>

        {/* Right Column: Results */}
        <aside className="w-full md:w-[380px] lg:w-[420px] bg-[#0a0a0c] flex flex-col border-t md:border-t-0 md:border-l border-[#1f1f23]">
          <div className="p-6 border-b border-[#1f1f23] bg-[#121214]/50">
            <h2 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Diagnostic Report</h2>
            <div className="flex items-end justify-between gap-4">
              <div>
                 {result && !isAnalyzing ? (
                   <div className="text-5xl font-mono font-bold text-white uppercase flex items-center h-12">
                      <span className="text-rose-500 text-lg tracking-tighter">Analysis Complete</span>
                   </div>
                 ) : (
                    <div className="text-5xl font-mono font-bold text-white opacity-20 h-12 flex items-center">
                       00.0<span className="text-rose-600">%</span>
                    </div>
                 )}
                 <div className="text-[10px] uppercase text-[#71717a] mt-1">Confidence Score (N/A)</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-6 space-y-6 overflow-y-auto min-h-[400px]">
             {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-[#71717a] gap-6">
                 <div className="relative w-16 h-16">
                   <div className="absolute inset-0 rounded-full border-t-2 border-rose-500 animate-spin"></div>
                   <div className="absolute inset-2 rounded-full border-b-2 border-rose-800 animate-[spin_2s_reverse_infinite]"></div>
                   <Activity className="absolute inset-0 m-auto w-6 h-6 text-rose-500 animate-pulse" />
                 </div>
                 <div className="text-center font-mono text-[10px] uppercase tracking-widest flex flex-col gap-2 text-[#a1a1aa]">
                    <p className="animate-pulse text-rose-500">SCANNING VECTORS...</p>
                    <p>EXTRACTING FREQUENCY DOMAINS</p>
                 </div>
              </div>
            ) : result ? (
              <div className="prose prose-invert prose-slate prose-sm max-w-none font-mono text-[11px] leading-relaxed">
                 <ReactMarkdown
                   components={{
                     h3: ({node, ...props}) => <h3 className="text-rose-500 font-bold tracking-widest uppercase text-xs border-b border-[#1f1f23] pb-2 mt-6 mb-3 flex items-center gap-2" {...props} />,
                     ul: ({node, ...props}) => <ul className="space-y-2 mt-2" {...props} />,
                     li: ({node, ...props}) => <li className="flex gap-2 text-[#a1a1aa]" {...props} />,
                     strong: ({node, ...props}) => <strong className="text-rose-100 font-semibold" {...props} />
                   }}
                 >
                   {result}
                 </ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#71717a] gap-4 text-center p-6 bg-[#121214]/20 rounded-lg border border-[#1f1f23] border-dashed">
                <Search className="w-8 h-8 opacity-20" />
                <p className="font-mono text-[10px] tracking-widest uppercase mt-2">Awaiting Subject Data</p>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="h-12 border-t border-[#1f1f23] flex items-center px-6 lg:px-8 bg-[#0a0a0c] justify-between text-[10px] uppercase font-mono tracking-widest text-[#71717a] flex-shrink-0">
        <div>&copy; 2026 DEEPSENSE FORENSICS LAB</div>
        <div className="flex gap-6">
          <span className="hidden sm:inline">LOG_LEVEL: VERBOSE</span>
          <span className="text-emerald-500">SYSTEM_READY</span>
        </div>
      </footer>
    </div>
  );
}
