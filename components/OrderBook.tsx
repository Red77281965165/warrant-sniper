
import React from 'react';
import { OrderBookEntry } from '../types';

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  type: 'CALL' | 'PUT';
}

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, type }) => {
  const highlightColor = type === 'CALL' ? 'text-red-400' : 'text-green-400';
  const barColor = type === 'CALL' ? 'bg-red-500' : 'bg-green-500';

  // Create 5 rows. 
  // In mock data:
  // Bids are descending (Best Bid at index 0)
  // Asks are ascending (Best Ask at index 0)
  // We want to display Best Bid and Best Ask at the top (Row 0).
  const rows = Array.from({ length: 5 }, (_, i) => ({
    bid: bids[i] || { price: 0, volume: 0 },
    ask: asks[i] || { price: 0, volume: 0 },
  }));

  return (
    <div className="w-full text-sm font-mono border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="grid grid-cols-4 bg-slate-800 text-slate-400 text-xs uppercase tracking-wider py-2 text-center border-b border-slate-700">
        <span>委買量 (Bid Vol)</span>
        <span>委買價 (Bid)</span>
        <span>委賣價 (Ask)</span>
        <span>委賣量 (Ask Vol)</span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-4 items-center border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors py-2">
            
            {/* Bid Volume */}
            <div className="relative h-full flex items-center justify-end px-3">
               <span className="relative z-10 text-slate-300">{row.bid.volume > 0 ? row.bid.volume : '-'}</span>
               {row.bid.volume > 0 && (
                 <div 
                   className={`absolute top-0 right-0 h-full opacity-20 ${barColor}`} 
                   style={{ width: `${Math.min((row.bid.volume / 500) * 100, 100)}%` }}
                 />
               )}
            </div>

            {/* Bid Price */}
            <div className={`text-center font-bold text-lg ${highlightColor} border-r border-slate-800/50`}>
              {row.bid.price > 0 ? row.bid.price.toFixed(2) : '-'}
            </div>

            {/* Ask Price */}
            <div className={`text-center font-bold text-lg ${highlightColor} border-l border-slate-800/50`}>
              {row.ask.price > 0 ? row.ask.price.toFixed(2) : '-'}
            </div>

            {/* Ask Volume */}
            <div className="relative h-full flex items-center justify-start px-3">
               <span className="relative z-10 text-slate-300">{row.ask.volume > 0 ? row.ask.volume : '-'}</span>
               {row.ask.volume > 0 && (
                 <div 
                   className={`absolute top-0 left-0 h-full opacity-20 ${barColor}`} 
                   style={{ width: `${Math.min((row.ask.volume / 500) * 100, 100)}%` }}
                 />
               )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
