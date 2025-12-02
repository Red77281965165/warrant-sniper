import React from 'react';
import { OrderBookEntry } from '../types';

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  type: 'CALL' | 'PUT';
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, type }) => {
  const isCall = type === 'CALL';
  const highlightColor = isCall ? 'text-red-400' : 'text-emerald-400';
  const barColor = isCall ? 'bg-red-600' : 'bg-emerald-600';

  // Only show the first row (Best 1)
  const rows = Array.from({ length: 1 }, (_, i) => ({
    bid: bids[i] || { price: 0, volume: 0 },
    ask: asks[i] || { price: 0, volume: 0 },
  }));

  return (
    <div className="w-full text-xs font-mono rounded-sm bg-[#050505] border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 bg-slate-900/50 text-slate-500 py-2 text-center border-b border-slate-800 font-bold tracking-wider text-[10px]">
        <span>委買量</span>
        <span>買進</span>
        <span>賣出</span>
        <span>委賣量</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-4 items-center border-b border-slate-800/30 last:border-0 relative hover:bg-white/5 transition-colors group">
          
          {/* Bid Volume */}
          <div className="relative h-8 flex items-center justify-end px-2 border-r border-slate-800/30">
             <span className={`relative z-10 ${row.bid.volume > 0 ? 'text-slate-300' : 'text-slate-800 group-hover:text-slate-600'}`}>
               {row.bid.volume > 0 ? row.bid.volume : '-'}
             </span>
             {row.bid.volume > 0 && (
               <div 
                 className={`absolute top-0 right-0 bottom-0 opacity-20 ${barColor}`} 
                 style={{ width: `${Math.min((row.bid.volume / 50) * 100, 100)}%` }}
               />
             )}
          </div>

          {/* Bid Price */}
          <div className={`h-8 flex items-center justify-center font-bold border-r border-slate-800/30 ${row.bid.price > 0 ? highlightColor : 'text-slate-800'}`}>
            {row.bid.price > 0 ? row.bid.price.toFixed(2) : '-'}
          </div>

          {/* Ask Price */}
          <div className={`h-8 flex items-center justify-center font-bold border-r border-slate-800/30 ${row.ask.price > 0 ? highlightColor : 'text-slate-800'}`}>
            {row.ask.price > 0 ? row.ask.price.toFixed(2) : '-'}
          </div>

          {/* Ask Volume */}
          <div className="relative h-8 flex items-center justify-start px-2">
             <span className={`relative z-10 ${row.ask.volume > 0 ? 'text-slate-300' : 'text-slate-800 group-hover:text-slate-600'}`}>
               {row.ask.volume > 0 ? row.ask.volume : '-'}
             </span>
             {row.ask.volume > 0 && (
               <div 
                 className={`absolute top-0 left-0 bottom-0 opacity-20 ${barColor}`} 
                 style={{ width: `${Math.min((row.ask.volume / 50) * 100, 100)}%` }}
               />
             )}
          </div>

        </div>
      ))}
    </div>
  );
};

export default OrderBook;