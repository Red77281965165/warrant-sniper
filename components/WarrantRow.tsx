import React from 'react';
import { WarrantData } from '../types';
import { Star } from 'lucide-react';

interface WarrantRowProps {
  data: WarrantData;
  onClick: (warrant: WarrantData) => void;
  isCall: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const WarrantRow: React.FC<WarrantRowProps> = ({ data, onClick, isCall, isFavorite, onToggleFavorite }) => {
  
  // Theme logic
  const themeColor = isCall ? 'text-red-500' : 'text-emerald-500';
  const borderColor = isCall ? 'border-red-900/30' : 'border-emerald-900/30';
  const glowHover = isCall ? 'hover:shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:border-red-500/40' : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/40';
  const bgBadge = isCall ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50';
  
  return (
    <div 
      onClick={() => onClick(data)}
      className={`relative group bg-[#121212] border ${borderColor} rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${glowHover}`}
    >
      <div className="px-4 py-3 flex justify-between relative z-10 min-h-[105px]">
        
        {/* LEFT SECTION: Identity + Bid/Ask */}
        <div className="flex flex-col justify-between flex-grow">
            
            {/* Identity Header */}
            <div className="flex items-center gap-2 mb-2">
                <button 
                   onClick={onToggleFavorite}
                   className="text-slate-600 hover:text-yellow-400 transition-colors -ml-1"
                >
                   <Star size={18} className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
                </button>

                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black text-white tracking-wide leading-none">{data.symbol}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold tracking-wider whitespace-nowrap ${bgBadge}`}>
                        {data.name}
                    </span>
                </div>
            </div>

            {/* Bid/Ask Data */}
            <div className="flex items-end gap-5">
                
                {/* Bid Group */}
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold mb-0.5">買進</span>
                    <div className="flex items-center gap-2">
                       <span className={`text-4xl font-mono font-black tracking-tighter leading-none ${themeColor}`}>
                           {data.bestBidPrice ? data.bestBidPrice.toFixed(2) : '--'}
                       </span>
                       <div className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded px-1.5 py-1 min-w-[2.5rem]">
                           <span className="text-xs font-mono font-bold text-slate-300 leading-none">{data.bestBidVol || '-'}</span>
                       </div>
                    </div>
                </div>

                {/* Ask Group */}
                <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 font-bold mb-0.5">賣出</span>
                   <div className="flex items-center gap-2">
                       <span className={`text-4xl font-mono font-black tracking-tighter leading-none ${themeColor}`}>
                           {data.bestAskPrice ? data.bestAskPrice.toFixed(2) : '--'}
                       </span>
                       <div className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded px-1.5 py-1 min-w-[2.5rem]">
                           <span className="text-xs font-mono font-bold text-slate-300 leading-none">{data.bestAskVol || '-'}</span>
                       </div>
                   </div>
                </div>

            </div>
        </div>

        {/* RIGHT SECTION: Metrics Stack (Volume -> Leverage -> Theta) */}
        <div className="flex flex-col justify-between items-end pl-4 border-l border-slate-800/30 ml-2 py-0.5 min-w-[4.5rem]">
            
            {/* 1. Volume (Top) */}
            <div className="flex flex-col items-end">
                <span className="font-mono font-bold text-xl leading-none text-white tracking-tight">
                    {data.volume ? data.volume.toLocaleString() : '0'}
                </span>
                <span className="text-[9px] text-slate-500 font-bold mt-0.5 leading-none">總量</span>
            </div>

            {/* 2. Leverage (Middle) */}
            <div className="flex flex-col items-end">
                <span className={`font-mono font-bold text-lg leading-none ${data.effectiveLeverage > 5 ? 'text-white' : 'text-slate-400'}`}>
                    {data.effectiveLeverage > 0 ? `${data.effectiveLeverage}x` : '--'}
                </span>
                <span className="text-[9px] text-slate-600 font-bold mt-0.5 leading-none">槓桿</span>
            </div>

            {/* 3. Interest/Theta (Bottom) */}
            <div className="flex flex-col items-end">
                <span className={`font-mono font-bold text-lg leading-none ${Math.abs(data.thetaPercent) > 1 ? 'text-red-400' : 'text-slate-400'}`}>
                    {data.thetaPercent ? `${data.thetaPercent}%` : '--'}
                </span>
                <span className="text-[9px] text-slate-600 font-bold mt-0.5 leading-none">利息</span>
            </div>

        </div>

      </div>
      
      {/* Subtle Volume Bar */}
      <div className="h-[2px] w-full bg-[#1a1a1a] absolute bottom-0 left-0">
         <div 
           className={`h-full ${isCall ? 'bg-red-600' : 'bg-emerald-600'} opacity-40`} 
           style={{ width: `${Math.min((data.volume / 2000) * 100, 100)}%` }}
         />
      </div>

    </div>
  );
};

export default WarrantRow;