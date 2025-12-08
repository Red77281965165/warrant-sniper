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
  
  // Design: High contrast sniper style matching the screenshot
  // Call = Red, Put = Green
  const colorClass = isCall ? 'text-[#ef4444]' : 'text-[#10b981]';
  
  // Buy / Sell colors (Fixed: Buy=Red, Sell=Green as per screenshot)
  const buyColor = 'text-[#ef4444]'; 
  const buyBorder = 'border-[#ef4444]';
  
  const sellColor = 'text-[#10b981]';
  const sellBorder = 'border-[#10b981]';

  return (
    <div 
      onClick={() => onClick(data)}
      className="relative group bg-[#161616] border border-[#333333] rounded-xl p-3 mb-3 cursor-pointer hover:border-[#555] transition-all"
    >
      {/* ROW 1: Header (Star + Symbol + Name) */}
      <div className="flex items-center gap-3 mb-4">
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onToggleFavorite(e);
           }}
           className="shrink-0 pt-0.5"
         >
           <Star size={20} className={isFavorite ? "fill-yellow-500 text-yellow-500" : "text-[#444]"} />
         </button>
         
         <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-black text-white tracking-wider leading-none">
               {data.symbol}
            </span>
            <span className={`text-sm font-bold ${colorClass} tracking-wide`}>
               {data.name}
            </span>
         </div>
      </div>

      {/* ROW 2: Price Grid (Buy vs Sell) - Strictly Horizontal */}
      <div className="flex items-center justify-between mb-4 gap-1">
         
         {/* BUY SIDE (Left) - Red */}
         <div className="flex items-end gap-1">
             <span className={`text-sm font-black ${buyColor} mb-1 whitespace-nowrap shrink-0`}>
                 買進
             </span>
             {/* Fixed width for Price to prevent layout shift */}
             <div className="w-[88px] text-center">
               <span className={`text-4xl font-mono font-bold ${buyColor} leading-none`}>
                 {data.bestBidPrice && data.bestBidPrice > 0 ? data.bestBidPrice.toFixed(2) : '--'}
               </span>
             </div>
             {/* Volume Box - Fixed Width (w-10), Centered, No Shrink */}
             <div className={`flex shrink-0 items-center justify-center w-10 h-[22px] border ${buyBorder} rounded-[3px] mb-1`}>
               <span className={`text-xs font-bold font-mono ${buyColor} leading-none`}>
                 {data.bestBidVol ?? 0}
               </span>
             </div>
         </div>

         {/* SELL SIDE (Right) - Green */}
         <div className="flex items-end gap-1 justify-end">
             <span className={`text-sm font-black ${sellColor} mb-1 whitespace-nowrap shrink-0`}>
                 賣出
             </span>
             {/* Fixed width for Price to prevent layout shift */}
             <div className="w-[88px] text-center">
               <span className={`text-4xl font-mono font-bold ${sellColor} leading-none`}>
                 {data.bestAskPrice && data.bestAskPrice > 0 ? data.bestAskPrice.toFixed(2) : '--'}
               </span>
             </div>
             {/* Volume Box - Fixed Width (w-10), Centered, No Shrink */}
             <div className={`flex shrink-0 items-center justify-center w-10 h-[22px] border ${sellBorder} rounded-[3px] mb-1`}>
               <span className={`text-xs font-bold font-mono ${sellColor} leading-none`}>
                 {data.bestAskVol ?? 0}
               </span>
             </div>
         </div>

      </div>

      {/* ROW 3: Stats Footer - Grid Layout for Perfect Vertical Alignment */}
      <div className="grid grid-cols-3 gap-1 items-center">
         
         {/* Volume - Left Aligned */}
         <div className="flex items-baseline gap-1 justify-self-start">
            <span className="text-[#888] text-sm font-bold whitespace-nowrap">總量</span>
            <span className="text-white font-mono text-xl font-bold">
              {data.volume ? data.volume.toLocaleString() : '0'}
            </span>
         </div>
         
         {/* Leverage - Center Aligned */}
         {/* Using fixed width value container + text-left ensures "Leverage" label stays in constant position */}
         <div className="flex items-baseline gap-1 justify-self-center min-w-[100px] justify-center">
            <span className="text-[#888] text-sm font-bold whitespace-nowrap">槓桿</span>
            <span className="text-white font-mono text-xl font-bold w-[64px] text-left">
               {data.effectiveLeverage > 0 ? `${data.effectiveLeverage.toFixed(2)}x` : '--'}
            </span>
         </div>
         
         {/* Interest - Right Aligned */}
         {/* Switched to text-left within fixed container to keep number tight to label */}
         <div className="flex items-baseline gap-1 justify-self-end min-w-[100px] justify-end">
            <span className="text-[#888] text-sm font-bold whitespace-nowrap">利息</span>
            <span className="text-white font-mono text-xl font-bold w-[72px] text-left">
               {data.thetaPercent ? `${data.thetaPercent}%` : '--'}
            </span>
         </div>

      </div>

    </div>
  );
};

export default WarrantRow;