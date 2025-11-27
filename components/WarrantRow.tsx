
import React from 'react';
import { WarrantData } from '../types';
import { ChevronRight, Star } from 'lucide-react';

interface WarrantRowProps {
  data: WarrantData;
  onClick: (warrant: WarrantData) => void;
  isCall: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const WarrantRow: React.FC<WarrantRowProps> = ({ data, onClick, isCall, isFavorite, onToggleFavorite }) => {
  const themeColorClass = isCall ? 'text-red-400' : 'text-green-400';
  const bgColorHover = isCall ? 'hover:bg-red-900/10' : 'hover:bg-green-900/10';
  const barColor = isCall ? 'bg-red-500' : 'bg-green-500';

  return (
    <div 
      onClick={() => onClick(data)}
      className={`group relative flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 cursor-pointer transition-all duration-200 ${bgColorHover}`}
    >
      {/* Favorite Button */}
      <div 
        onClick={onToggleFavorite}
        className="mr-3 p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-600 hover:text-yellow-500 cursor-pointer transition-colors z-10"
      >
        <Star 
          size={18} 
          className={isFavorite ? "fill-yellow-500 text-yellow-500" : "fill-transparent"} 
        />
      </div>

      {/* Left: Info */}
      <div className="flex flex-col w-1/4 min-w-[110px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-bold tracking-wide">{data.underlyingName}</span>
          <span className="text-xs text-slate-500 font-mono">{data.underlyingSymbol}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300 border border-slate-700`}>
             {data.symbol}
          </span>
          <span className="text-slate-400">{data.broker}</span>
        </div>
      </div>

      {/* Center: Bid / Ask Visuals - The most obvious part */}
      <div className="flex-1 px-4 flex items-center justify-center gap-6">
         {/* Bid */}
         <div className="flex flex-col items-end w-1/3 md:w-1/4">
            <span className={`text-xl md:text-2xl font-bold font-mono ${themeColorClass}`}>
               {data.bestBidPrice.toFixed(2)}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
               <span>量 {data.bestBidVol}</span>
            </div>
         </div>

         {/* Divider / Spread Info */}
         <div className="flex flex-col items-center justify-center w-[60px]">
            <span className="text-[10px] text-slate-500 uppercase">Spread</span>
            <span className={`text-xs font-mono ${data.spreadPercent > 2 ? 'text-orange-500' : 'text-slate-400'}`}>
               {data.spreadPercent.toFixed(1)}%
            </span>
         </div>

         {/* Ask */}
         <div className="flex flex-col items-start w-1/3 md:w-1/4">
            <span className={`text-xl md:text-2xl font-bold font-mono ${themeColorClass}`}>
               {data.bestAskPrice.toFixed(2)}
            </span>
             <div className="flex items-center gap-1 text-xs text-slate-500">
               <span>量 {data.bestAskVol}</span>
            </div>
         </div>
      </div>

      {/* Right: Technicals (Hidden on small mobile) */}
      <div className="hidden sm:flex flex-col items-end w-1/5 min-w-[100px] text-right gap-1">
        <div className="flex items-center gap-2" title="Days to Maturity">
           <span className="text-xs text-slate-500">天期</span>
           <span className={`text-sm font-mono ${data.daysToMaturity < 60 ? 'text-red-400' : 'text-slate-200'}`}>
             {data.daysToMaturity}天
           </span>
        </div>
        <div className="flex items-center gap-2" title="Theta Cost">
           <span className="text-xs text-slate-500">利息</span>
           <span className={`text-sm font-mono ${data.dailyThetaCostPercent === 0 ? 'text-slate-600' : 'text-yellow-500/80'}`}>
             {data.dailyThetaCostPercent === 0 ? '-' : `${data.dailyThetaCostPercent.toFixed(2)}%`}
           </span>
        </div>
      </div>
      
      {/* Visual Bar for Volume (Subtle background hint) */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-800">
         <div 
           className={`h-full opacity-50 ${barColor}`} 
           style={{ width: `${Math.min(data.volume / 2000, 100)}%` }} // Normalized visual to 2000 lots
         />
      </div>

      <ChevronRight className="ml-2 text-slate-700 group-hover:text-slate-400 transition-colors" size={20} />
    </div>
  );
};

export default WarrantRow;
