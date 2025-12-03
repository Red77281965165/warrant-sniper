import React from 'react';
import { X, Star, AlertTriangle, Target, Activity, Calendar, BarChart2, Clock, Zap, TrendingUp } from 'lucide-react';
import { WarrantData } from '../types';
import OrderBook from './OrderBook';

interface WarrantModalProps {
  warrant: WarrantData | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const WarrantModal: React.FC<WarrantModalProps> = ({ warrant, onClose, isFavorite, onToggleFavorite }) => {
  if (!warrant) return null;

  const isCall = warrant.type === 'CALL';
  const themeText = isCall ? 'text-red-500' : 'text-emerald-500';
  const themeBorder = isCall ? 'border-red-600' : 'border-emerald-600';
  const themeShadow = isCall ? 'shadow-red-900/20' : 'shadow-emerald-900/20';
  
  // Format helpers
  const fmt = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Frame */}
      <div className={`relative w-full max-w-lg bg-[#0e0e0e] border-t-2 sm:border ${themeBorder} flex flex-col max-h-[90vh] sm:rounded-lg overflow-hidden shadow-2xl ${themeShadow}`}>
        
        {/* Header */}
        <div className="relative px-6 py-5 bg-[#141414] border-b border-slate-800 flex justify-between items-start">
           <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-5xl font-black text-white font-mono tracking-wide">{warrant.symbol}</h2>
                 <span className={`text-base font-bold px-3 py-1 border rounded ${isCall ? 'border-red-500 text-red-500 bg-red-950/30' : 'border-emerald-500 text-emerald-500 bg-emerald-950/30'}`}>
                    {isCall ? '認購' : '認售'}
                 </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">
                 {warrant.name} <span className="text-slate-600 mx-2">|</span> {warrant.underlyingName}
              </p>
           </div>
           <div className="flex gap-2">
              <button onClick={onToggleFavorite} className="p-2 bg-slate-900 rounded hover:bg-slate-800 transition-colors border border-slate-800">
                 <Star size={20} className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-500"} />
              </button>
              <button onClick={onClose} className="p-2 bg-slate-900 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800">
                 <X size={20} />
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-tech-pattern pb-6">
           <div className="p-6 space-y-6">
              
              {/* Main Price Row */}
              <div className="flex items-end justify-between pb-4 border-b border-slate-800/50">
                 <div>
                    <p className="text-sm text-slate-500 font-bold mb-1">即時成交價</p>
                    <div className="flex items-baseline gap-2">
                       <span className={`text-7xl font-mono font-bold ${themeText} drop-shadow-md`}>{warrant.price.toFixed(2)}</span>
                       <span className="text-slate-500 text-xl">TWD</span>
                    </div>
                 </div>
                 <div className="text-right">
                     <p className="text-sm text-slate-500 font-bold mb-1">當日成交量</p>
                     <div className="text-3xl font-mono font-bold text-white">{warrant.volume.toLocaleString()}</div>
                 </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                 {/* Leverage */}
                 <div className="bg-[#1a1a1a]/50 border border-slate-800 p-4 rounded-sm relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                       <Zap size={16} className="text-yellow-500" />
                       <span className="text-sm font-bold">槓桿</span>
                    </div>
                    <p className="text-4xl font-mono font-bold text-white">
                       {warrant.effectiveLeverage.toFixed(2)}<span className="text-lg text-slate-600 ml-1">x</span>
                    </p>
                 </div>

                 {/* Theta / Daily Interest */}
                 <div className="bg-[#1a1a1a]/50 border border-slate-800 p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                       <Clock size={16} className={Math.abs(warrant.thetaPercent) > 1.5 ? 'text-red-500' : 'text-slate-500'} />
                       <span className="text-sm font-bold">每日利息 (Theta)</span>
                    </div>
                    <p className={`text-4xl font-mono font-bold ${Math.abs(warrant.thetaPercent) > 2 ? 'text-red-400' : 'text-slate-300'}`}>
                       {warrant.thetaPercent}%
                    </p>
                 </div>

                 {/* Days Left */}
                 <div className="col-span-2 bg-[#1a1a1a]/50 border border-slate-800 p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                       <Calendar size={16} />
                       <span className="text-sm font-bold">剩餘天數</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-200">{warrant.daysToMaturity} <span className="text-lg text-slate-500">天</span></p>
                 </div>
              </div>

              {/* Risk Warning */}
              {Math.abs(warrant.thetaPercent) > 1.5 && (
                <div className="flex items-start gap-3 p-3 bg-red-950/10 border border-red-900/30 rounded">
                   <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                   <p className="text-xs text-red-200/70 leading-relaxed">
                      <strong className="text-red-400 block mb-0.5">高時間價值風險</strong>
                      此權證時間價值流失較快，建議進行短線操作，不宜久留。
                   </p>
                </div>
              )}

              {/* Order Book */}
              <div className="pt-2">
                 <div className="flex items-center justify-between mb-3 border-l-2 border-red-500 pl-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       最佳委買&委賣
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">LIVE DATA</span>
                 </div>
                 <OrderBook bids={warrant.bids} asks={warrant.asks} type={warrant.type} />
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default WarrantModal;