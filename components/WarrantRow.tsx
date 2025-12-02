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
      className={`relative group bg-[#121212] border ${borderColor} rounded-sm transition-all duration-200 cursor-pointer overflow-hidden ${glowHover}`}
    >
      {/* Background Decor */}
      <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-[#1a1a1a] to-transparent opacity-50 pointer-events-none" />

      <div className="p-3.5 relative z-10 flex items-center gap-3">
        
        {/* Favorite Button */}
        <button 
           onClick={onToggleFavorite}
           className="text-slate-700 hover:text-yellow-400 transition-colors p-1 self-start mt-0.5"
        >
           <Star size={18} className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
        </button>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
           <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-mono text-lg font-bold text-white tracking-wide leading-none">{data.symbol}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap ${bgBadge}`}>
                 {data.name}
              </span>
           </div>
           
           {/* Price & Broker Info Row */}
           <div className="flex items-end gap-3">
               <div className="flex items-baseline gap-1.5">
                  <div className={`text-2xl font-mono font-bold leading-none ${themeColor}`}>
                      {data.price.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">現價</div>
               </div>

               <div className="flex items-center gap-2 text-xs text-slate-500 pb-0.5 border-l border-slate-800 pl-3">
                  <span>{data.broker}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="font-mono">{data.type === 'CALL' ? '認購' : '認售'}</span>
               </div>
           </div>
        </div>

        {/* Metrics Grid - Right Side */}
        <div className="flex gap-3 pl-3 border-l border-slate-800">
           
           {/* Leverage */}
           <div className="flex flex-col items-center min-w-[40px]">
              <span className={`font-mono font-bold text-sm ${data.effectiveLeverage > 5 ? 'text-yellow-500' : 'text-slate-300'}`}>
                 {data.effectiveLeverage}x
              </span>
              <span className="text-[9px] text-slate-600 scale-90">槓桿</span>
           </div>

           {/* Theta / Daily Interest */}
           <div className="flex flex-col items-center min-w-[40px]">
              <span className={`font-mono font-bold text-sm ${Math.abs(data.thetaPercent) > 1.5 ? 'text-red-400' : 'text-slate-400'}`}>
                 {data.thetaPercent}
              </span>
              <span className="text-[9px] text-slate-600 scale-90 whitespace-nowrap">每日利息</span>
           </div>
        </div>
      </div>

      {/* Volume Bar Footer */}
      <div className="h-0.5 w-full bg-[#1a1a1a] relative">
         <div 
           className={`h-full ${isCall ? 'bg-red-600' : 'bg-emerald-600'} opacity-60`} 
           style={{ width: `${Math.min((data.volume / 1000) * 100, 100)}%` }}
         />
      </div>
    </div>
  );
};

export default WarrantRow;