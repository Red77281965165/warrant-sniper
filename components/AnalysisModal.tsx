
import React, { useEffect, useState } from 'react';
import { X, Youtube, Bot, Sparkles, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { generateMarketAnalysis, AnalysisResult } from '../services/geminiService';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [sources, setSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && !content) {
      const fetchAnalysis = async () => {
        setLoading(true);
        const result: AnalysisResult = await generateMarketAnalysis();
        setContent(result.content);
        setSources(result.sources);
        setLoading(false);
      };
      fetchAnalysis();
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-600 rounded-full">
                <Youtube size={20} className="text-white" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  老王愛說笑
                  <span className="px-2 py-0.5 text-[10px] bg-blue-900/50 text-blue-300 border border-blue-800 rounded-full flex items-center gap-1">
                    <Sparkles size={8} /> AI 聯網解析
                  </span>
                </h2>
                <p className="text-xs text-slate-400">最新盤勢重點摘要 (Google Grounding)</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 size={40} className="text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-slate-300 font-medium">AI 正在搜尋最新影片...</p>
                <p className="text-slate-500 text-xs mt-1">正在存取 YouTube 與大盤資訊</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis Content */}
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-sans">
                  {content}
                </div>
              </div>

              {/* Sources Section */}
              {sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <LinkIcon size={12} />
                    資料來源 (Google Search)
                  </h4>
                  <ul className="space-y-2">
                    {sources.map((source, idx) => (
                      <li key={idx} className="group">
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-start gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors p-2 rounded hover:bg-slate-800/50"
                        >
                          <ExternalLink size={12} className="mt-0.5 shrink-0 opacity-70 group-hover:opacity-100" />
                          <span className="break-all">{source.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-xl flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1">
            <Bot size={12} />
            Powered by Gemini 2.5 with Google Search
          </div>
          <span>投資請自負風險</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
