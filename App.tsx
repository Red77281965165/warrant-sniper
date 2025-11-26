
import React, { useState, useEffect } from 'react';
import { Search, X, Database, Star, Zap, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Target, Loader2 } from 'lucide-react';
import WarrantRow from './components/WarrantRow';
import WarrantModal from './components/WarrantModal';
import { WarrantData } from './types';
import { sendSearchCommand, subscribeToSearchResult } from './services/firebaseService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CALL' | 'PUT'>('CALL');
  const [warrants, setWarrants] = useState<WarrantData[]>([]);
  const [selectedWarrant, setSelectedWarrant] = useState<WarrantData | null>(null);
  
  // 搜尋狀態
  const [searchQuery, setSearchQuery] = useState(''); // 輸入框內容
  const [currentTarget, setCurrentTarget] = useState(''); // 當前顯示的標的
  const [isSearching, setIsSearching] = useState(false);
  const [resultTime, setResultTime] = useState<Date | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: 'volume' | 'effectiveLeverage' | 'dailyThetaCostPercent' | 'daysToMaturity';
    direction: 'asc' | 'desc';
  }>({ key: 'volume', direction: 'desc' });
  
  // Favorites System
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('warrant_favorites');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 監聽搜尋結果變更
  useEffect(() => {
    if (!currentTarget) return;

    // 訂閱特定標的的搜尋結果
    const unsubscribe = subscribeToSearchResult(currentTarget, (data, time) => {
      // 只有當 data 有內容時，才視為搜尋完成
      // 如果文件存在但 results 為空，可能是後端正在寫入，保持 loading 狀態
      if (data.length > 0) {
        setWarrants(data);
        setResultTime(time || new Date());
        setIsSearching(false);
      } else {
         // 若監聽到空陣列，可能是剛初始化，或真的沒結果
         // 這裡我們先不把 isSearching 設為 false，讓使用者感覺還在找，直到有資料或超時
      }
    });

    return () => unsubscribe();
  }, [currentTarget]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const targetCode = searchQuery.trim().toUpperCase();
    
    // 1. 重置 UI 狀態 (清空舊資料，顯示 Loading)
    setWarrants([]); 
    setCurrentTarget(targetCode);
    setIsSearching(true);
    setShowFavoritesOnly(false); // 自動切回搜尋結果
    setResultTime(null);

    // 2. 發送指令給 Python
    try {
      await sendSearchCommand(targetCode);
      // 指令發送成功後，useEffect 會負責監聽結果更新
    } catch (error) {
      console.error("Failed to send command", error);
      setIsSearching(false);
    }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); 
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    setFavorites(newFavs);
    localStorage.setItem('warrant_favorites', JSON.stringify(Array.from(newFavs)));
  };

  const handleSort = (key: 'volume' | 'effectiveLeverage' | 'dailyThetaCostPercent' | 'daysToMaturity') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Filter and Sort Logic
  const filteredWarrants = warrants
    .filter(w => {
      if (showFavoritesOnly) {
        return favorites.has(w.id);
      }
      if (w.type !== activeTab) return false;
      return true;
    })
    .sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
  
  const activeTabClass = activeTab === 'CALL' 
    ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border-red-500' 
    : 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)] border-green-500';
  
  const inactiveTabClass = 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700';

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-slate-700 selection:text-white pb-10">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-900/20 border border-red-900/50">
                <Target size={24} className="text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">權證狙擊手</h1>
                  <span className="bg-yellow-900/50 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded border border-yellow-800 font-mono flex items-center gap-1">
                    <Zap size={8} /> V23.0
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Server-Side Scan</p>
                   
                   <button 
                     onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                     className={`ml-2 px-3 py-1 rounded-full border flex items-center gap-1.5 transition-all duration-300 text-xs font-medium ${
                       showFavoritesOnly 
                         ? 'bg-yellow-500/20 text-yellow-400 border-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                         : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                     }`}
                   >
                     <Star size={12} className={showFavoritesOnly ? "fill-yellow-400 text-yellow-400" : ""} />
                     <span>自選 ({favorites.size})</span>
                   </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Search Bar is the HERO now */}
            <form onSubmit={handleSearchSubmit} className="relative animate-in fade-in slide-in-from-top-2">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} size={18} />
              <input 
                type="text" 
                placeholder="輸入代號啟動掃描 (e.g., 2330, 3661)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-lg font-mono tracking-wide rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-all placeholder:text-slate-600 placeholder:font-sans"
              />
              {isSearching ? (
                 <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <Loader2 size={20} className="animate-spin text-red-500" />
                 </div>
              ) : searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            {!showFavoritesOnly && warrants.length > 0 && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => setActiveTab('CALL')}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold border transition-all duration-300 ${activeTab === 'CALL' ? activeTabClass : inactiveTabClass}`}
                >
                  <TrendingUpIcon className="w-4 h-4" />
                  認購 (CALL)
                </button>
                <button
                  onClick={() => setActiveTab('PUT')}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold border transition-all duration-300 ${activeTab === 'PUT' ? activeTabClass : inactiveTabClass}`}
                >
                  <TrendingDownIcon className="w-4 h-4" />
                  認售 (PUT)
                </button>
              </div>
            )}

            {!showFavoritesOnly && warrants.length > 0 && (
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 animate-in fade-in slide-in-from-top-1 no-scrollbar border-t border-slate-800/50 pt-2">
                <div className="flex gap-2">
                  {[
                    { key: 'volume', label: '成交量' },
                    { key: 'effectiveLeverage', label: '槓桿' },
                    { key: 'spreadPercent', label: '價差比' },
                    { key: 'daysToMaturity', label: '天期' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleSort(item.key as any)}
                      className={`px-3 py-1 rounded text-xs font-mono border whitespace-nowrap transition-colors ${
                        sortConfig.key === item.key 
                          ? 'bg-slate-700 text-white border-slate-500' 
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {item.label} {sortConfig.key === item.key ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  ))}
                </div>
                {resultTime && (
                   <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      Update: {resultTime.toLocaleTimeString()}
                   </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main List */}
      <main className="max-w-4xl mx-auto pb-20">
        <div className="flex flex-col">
          {filteredWarrants.length > 0 ? (
             filteredWarrants.map((w) => (
              <WarrantRow 
                key={w.id} 
                data={w} 
                onClick={setSelectedWarrant}
                isCall={w.type === 'CALL'}
                isFavorite={favorites.has(w.id)}
                onToggleFavorite={(e) => toggleFavorite(w.id, e)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-6 px-4">
              {isSearching ? (
                 <div className="flex flex-col items-center animate-pulse">
                    <Database size={48} className="text-red-900 opacity-50 mb-4" />
                    <p className="text-lg text-slate-300 font-medium">雲端伺服器掃描中...</p>
                    <p className="text-sm text-slate-500 mt-2">正在過濾 5000+ 檔權證，請稍候</p>
                    <p className="text-xs text-slate-600 mt-1">Status: Pending Backend Response</p>
                 </div>
              ) : currentTarget ? (
                 <div className="text-center">
                    <Database size={48} className="text-slate-700 mx-auto mb-4" />
                    <p>該標的目前無符合「高勝率策略」之權證</p>
                    <p className="text-xs text-slate-500 mt-2">建議：放寬篩選條件或更換標的</p>
                 </div>
              ) : (
                 <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                       <Target size={32} className="text-slate-400" />
                    </div>
                    <p className="text-lg text-slate-300">輸入股票代碼開始狙擊</p>
                    <p className="text-sm text-slate-500 mt-2">支援台股上市櫃所有標的</p>
                 </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <WarrantModal 
        warrant={selectedWarrant} 
        onClose={() => setSelectedWarrant(null)}
        isFavorite={selectedWarrant ? favorites.has(selectedWarrant.id) : false}
        onToggleFavorite={(e) => selectedWarrant && toggleFavorite(selectedWarrant.id, e)}
      />

    </div>
  );
};

export default App;
