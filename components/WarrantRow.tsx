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

  // Conditional Styling for Stats
  // Leverage > 5 -> Light Yellow
  const leverageColor = data.effectiveLeverage > 5 ? 'text-[#fef08a]' : 'text-white';
  
  // Interest (Theta) > 1.5% (Absolute value) -> Light Yellow
  const interestColor = Math.abs(data.thetaPercent) > 1.5 ? 'text-[#fef08a]' : 'text-white';

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
      <div className="flex items-center justify-between mb-4 gap-2">
         
         {/* BUY SIDE (Left) - Red */}
         <div className="flex items-end gap-1">
             <span className={`text-sm font-black ${buyColor} mb-2 whitespace-nowrap shrink-0`}>
                 買進
             </span>
             {/* Price - Variable width to allow tight spacing */}
             <span className={`text-4xl font-mono font-bold ${buyColor} leading-none`}>
               {data.bestBidPrice && data.bestBidPrice > 0 ? data.bestBidPrice.toFixed(2) : '--'}
             </span>
             {/* Volume Box - Smaller, tight to price */}
             <div className={`flex shrink-0 items-center justify-center min-w-[20px] px-1 h-[19px] border ${buyBorder} rounded-[2px] mb-1.5 ml-0.5`}>
               <span className={`text-[11px] font-bold font-mono ${buyColor} leading-none pt-[1px]`}>
                 {data.bestBidVol ?? 0}
               </span>
             </div>
         </div>

         {/* SELL SIDE (Right) - Green */}
         <div className="flex items-end gap-1 justify-end">
             <span className={`text-sm font-black ${sellColor} mb-2 whitespace-nowrap shrink-0`}>
                 賣出
             </span>
             {/* Price */}
             <span className={`text-4xl font-mono font-bold ${sellColor} leading-none`}>
               {data.bestAskPrice && data.bestAskPrice > 0 ? data.bestAskPrice.toFixed(2) : '--'}
             </span>
             {/* Volume Box */}
             <div className={`flex shrink-0 items-center justify-center min-w-[20px] px-1 h-[19px] border ${sellBorder} rounded-[2px] mb-1.5 ml-0.5`}>
               <span className={`text-[11px] font-bold font-mono ${sellColor} leading-none pt-[1px]`}>
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
            <span className="text-white font-mono text-[22px] font-bold">
              {data.volume ? data.volume.toLocaleString() : '0'}
            </span>
         </div>
         
         {/* Leverage - Center Aligned */}
         <div className="flex items-baseline gap-1 justify-self-center min-w-[100px] justify-center">
            <span className="text-[#888] text-sm font-bold whitespace-nowrap">槓桿</span>
            <span className={`${leverageColor} font-mono text-[22px] font-bold w-[70px] text-left`}>
               {data.effectiveLeverage > 0 ? `${data.effectiveLeverage.toFixed(2)}x` : '--'}
            </span>
         </div>
         
         {/* Interest - Right Aligned */}
         <div className="flex items-baseline gap-1 justify-self-end min-w-[100px] justify-end">
            <span className="text-[#888] text-sm font-bold whitespace-nowrap">利息</span>
            <span className={`${interestColor} font-mono text-[22px] font-bold w-[78px] text-left`}>
               {data.thetaPercent ? `${data.thetaPercent}%` : '--'}
            </span>
         </div>

      </div>

    </div>
  );
};

export default WarrantRow;