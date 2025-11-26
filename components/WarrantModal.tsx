
import React from 'react';
import { X, AlertTriangle, TrendingUp, DollarSign, Clock, Activity, CalendarDays, Star } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900`}>
          <div className="flex items-center gap-3">
             <span className={`px-2 py-1 text-xs font-bold rounded ${warrant.type === 'CALL' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {warrant.type === 'CALL' ? '認購 (CALL)' : '認售 (PUT)'}
             </span>
             <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {warrant.name}
                  <span className="text-sm text-slate-400 font-normal">({warrant.symbol})</span>
                </h2>
                <p className="text-sm text-slate-400">
                  標的: <span className="text-slate-200">{warrant.underlyingName} ({warrant.underlyingSymbol})</span>
                  <span className="mx-2">•</span>
                  券商: {warrant.broker}
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Favorite Button in Modal */}
            <button 
               onClick={onToggleFavorite}
               className={`p-2 rounded-full transition-colors ${isFavorite ? 'bg-yellow-500/10 text-yellow-500' : 'text-slate-500 hover:text-yellow-500 hover:bg-slate-800'}`}
               title={isFavorite ? "移除自選" : "加入自選"}
            >
               <Star size={20} className={isFavorite ? "fill-yellow-500" : ""} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* Main Visuals: OrderBook + Metrics */}
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Left: Order Book */}
            <div className="w-full md:w-1/2">
               <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                 <DollarSign size={16} /> 五檔報價
               </h3>
               <OrderBook bids={warrant.bids} asks={warrant.asks} type={warrant.type} />
            </div>

            {/* Right: Metrics & Warnings */}
            <div className="w-full md:w-1/2 flex flex-col gap-5">
              
              {/* Key Metrics - Moved from top to side column */}
              <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                     <Activity size={16} /> 關鍵數據
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">成交量</p>
                      <p className="text-lg font-mono font-bold text-white">{warrant.volume.toLocaleString()}<span className="text-xs ml-1 text-slate-500">張</span></p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">實質槓桿</p>
                      <p className={`text-lg font-mono font-bold ${warrant.type === 'CALL' ? 'text-red-400' : 'text-green-400'}`}>
                        {warrant.effectiveLeverage.toFixed(2)}x
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                       <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          每日利息(Theta) <Clock size={12} />
                       </p>
                      <p className="text-lg font-mono font-bold text-yellow-400">
                        {warrant.dailyThetaCostPercent.toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                       <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          剩餘天數 <CalendarDays size={12} />
                       </p>
                      <p className={`text-lg font-mono font-bold ${warrant.daysToMaturity < 60 ? 'text-red-400' : 'text-blue-300'}`}>
                        {warrant.daysToMaturity} <span className="text-xs text-slate-500 font-normal">天</span>
                      </p>
                    </div>
                  </div>
              </div>

              {/* Warnings */}
              <div className="bg-yellow-900/10 border border-yellow-700/30 rounded p-3">
                 <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                       注意：權證為高槓桿商品，每日利息成本會隨持有時間侵蝕價值。請嚴格遵守停損紀律。
                    </p>
                 </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WarrantModal;
