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
  
  // Box border color
  const boxBorder = 'border-slate-800'; 

  return (
    <div 
      onClick={() => onClick(data)}
      className={`relative group bg-[#121212] border ${borderColor} rounded-lg transition-all duration-200 cursor-pointer overflow-hidden ${glowHover}`}
    >
      <div className="px-3 py-3 flex items-center justify-between relative z-10">
        
        {/* LEFT COLUMN: Identity + Prices */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            
            {/* Header: Identity */}
            <div className="flex items-center gap-2">
                <button 
                   onClick={onToggleFavorite}
                   className="text-slate-600 hover:text-yellow-400 transition-colors -ml-1"
                >
                   <Star size={18} className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
                </button>

                <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl font-black text-white tracking-wide leading-none">{data.symbol}</span>
                    <span className={`text-[11px] px-1.5 py-[2px] rounded border font-bold tracking-wider whitespace-nowrap ${bgBadge}`}>
                        {data.name}
                    </span>
                </div>
            </div>

            {/* Prices Row */}
            <div className="flex items-center gap-2 sm:gap-4">
               
               {/* Bid Group */}
               <div className="flex items-end gap-1.5">
                   <span className={`text-4xl font-mono font-bold tracking-tighter leading-none ${themeColor}`}>
                       {data.bestBidPrice ? data.bestBidPrice.toFixed(2) : '--'}
                   </span>
                   {/* Bid Volume Box */}
                   <div className={`flex flex-col items-center justify-center border ${boxBorder} rounded bg-slate-900/30 px-1.5 py-0.5 min-w-[2.8rem]`}>
                       <span className="text-[9px] text-slate-500 font-bold mb-0.5 leading-none">委買</span>
                       <span className="text-xs font-mono font-bold text-white leading-none">{data.bestBidVol || 0}</span>
                   </div>
               </div>

               {/* Ask Group */}
               <div className="flex items-end gap-1.5">
                   <span className={`text-4xl font-mono font-bold tracking-tighter leading-none ${themeColor}`}>
                       {data.bestAskPrice ? data.bestAskPrice.toFixed(2) : '--'}
                   </span>
                   {/* Ask Volume Box */}
                   <div className={`flex flex-col items-center justify-center border ${boxBorder} rounded bg-slate-900/30 px-1.5 py-0.5 min-w-[2.8rem]`}>
                       <span className="text-[9px] text-slate-500 font-bold mb-0.5 leading-none">委賣</span>
                       <span className="text-xs font-mono font-bold text-white leading-none">{data.bestAskVol || 0}</span>
                   </div>
               </div>

            </div>
        </div>

        {/* RIGHT COLUMN: Volume + Stats */}
        {/* Reorganized to center Volume in the "box" */}
        <div className="flex flex-col items-center justify-center pl-2 ml-1 border-l border-slate-800/20 shrink-0 min-w-[7.5rem]">
            
            {/* Volume Section - Centered */}
            <div className="flex flex-col items-center mb-1">
                <span className="font-mono font-bold text-2xl leading-none text-white tracking-tight">
                    {data.volume ? data.volume.toLocaleString() : '0'}
                </span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5 leading-none">總量</span>
            </div>

            {/* Stats Row - Centered */}
            <div className="flex items-center gap-3 mt-1">
               {/* Leverage */}
               <div className="flex flex-col items-center">
                  <span className={`font-mono font-bold text-lg leading-none ${data.effectiveLeverage > 5 ? 'text-white' : 'text-slate-300'}`}>
                     {data.effectiveLeverage}x
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5 leading-none">槓桿</span>
               </div>

               {/* Interest */}
               <div className="flex flex-col items-center">
                  <span className={`font-mono font-bold text-lg leading-none ${Math.abs(data.thetaPercent) > 1 ? 'text-red-400' : 'text-slate-300'}`}>
                     {data.thetaPercent}%
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5 leading-none">利息</span>
               </div>
            </div>

        </div>

      </div>
      
      {/* Subtle Volume Bar */}
      <div className="h-[2px] w-full bg-[#1a1a1a] absolute bottom-0 left-0">
         <div 
           className={`h-full ${isCall ? 'bg-red-600' : 'bg-emerald-600'} opacity-30`} 
           style={{ width: `${Math.min((data.volume / 2000) * 100, 100)}%` }}
         />
      </div>

    </div>
  );
};

export default WarrantRow;