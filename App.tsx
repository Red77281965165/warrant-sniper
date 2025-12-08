
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Star, Loader2, Target, Crosshair, BarChart3, Clock, Zap, Shield, Radar, AlertCircle, RefreshCw } from 'lucide-react';
import WarrantRow from './components/WarrantRow';
import WarrantModal from './components/WarrantModal';
import LoginScreen from './components/LoginScreen';
import { WarrantData } from './types';
import { sendSearchCommand, subscribeToSearchCommand } from './services/firebaseService';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // App State
  const [activeTab, setActiveTab] = useState<'CALL' | 'PUT'>('CALL');
  const [warrants, setWarrants] = useState<WarrantData[]>([]);
  const [selectedWarrant, setSelectedWarrant] = useState<WarrantData | null>(null);
  
  const [searchQuery, setSearchQuery] = useState(''); 
  const [currentTarget, setCurrentTarget] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  
  // Interaction State for Button
  const [isButtonFlashing, setIsButtonFlashing] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false); // Debounce cooldown
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: 'volume' | 'effectiveLeverage' | 'thetaPercent' | 'daysToMaturity';
    direction: 'asc' | 'desc';
  }>({ key: 'volume', direction: 'desc' });
  
  // Favorites Storage (V2 - Stores full object)
  const [savedWarrants, setSavedWarrants] = useState<WarrantData[]>(() => {
    try {
      const saved = localStorage.getItem('warrant_favorites_v2');
      if (saved) return JSON.parse(saved);
      return [];
    } catch (e) {
      return [];
    }
  });

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Helper for quick lookup
  const favoriteIds = new Set(savedWarrants.map(w => w.id));

  // Dynamic Theme Configuration
  const theme = (() => {
    // 1. Favorites Mode (Yellow Theme)
    if (showFavoritesOnly) {
      return {
        bg: 'bg-[#050500]',
        headerBg: 'bg-[#0f0f00]/80',
        border: 'border-yellow-900/30',
        // Text Colors
        primary: 'text-yellow-500',
        text: 'text-slate-200',
        // Button/Badge Backgrounds
        softBg: 'bg-yellow-950/30',
        softBorder: 'border-yellow-900/30',
        hoverBg: 'hover:bg-yellow-900/40',
        // Effects
        pulse: 'bg-yellow-600',
        ring: 'focus:ring-yellow-500/50',
        inputBorder: 'focus:border-yellow-500/50',
      };
    }
    
    // 2. Put Mode (Emerald/Green Theme)
    if (activeTab === 'PUT') {
      return {
        bg: 'bg-[#000502]',
        headerBg: 'bg-[#000f05]/80',
        border: 'border-emerald-900/30',
        // Text Colors
        primary: 'text-emerald-500',
        text: 'text-slate-200',
        // Button/Badge Backgrounds
        softBg: 'bg-emerald-950/30',
        softBorder: 'border-emerald-900/30',
        hoverBg: 'hover:bg-emerald-900/40',
        // Effects
        pulse: 'bg-emerald-600',
        ring: 'focus:ring-emerald-500/50',
        inputBorder: 'focus:border-emerald-500/50',
      };
    }

    // 3. Default Call Mode (Red/Sniper Theme)
    return {
      bg: 'bg-black',
      headerBg: 'bg-black/80',
      border: 'border-slate-800',
      // Text Colors
      primary: 'text-red-500',
      text: 'text-slate-200',
      // Button/Badge Backgrounds
      softBg: 'bg-red-950/30',
      softBorder: 'border-red-900/30',
      hoverBg: 'hover:bg-red-900/40',
      // Effects
      pulse: 'bg-red-600',
      ring: 'focus:ring-red-500/50',
      inputBorder: 'focus:border-red-500/50',
    };
  })();

  // Effects
  useEffect(() => {
    localStorage.setItem('warrant_favorites_v2', JSON.stringify(savedWarrants));
  }, [savedWarrants]);

  // Auth Handlers
  const validatePassword = (password: string) => {
    return password === '0616';
  };
  
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isCooldown) return;
    if (!searchQuery.trim()) return;

    // Activate cooldown
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 500);

    setLastUpdatedTime(new Date());

    setIsSearching(true);
    setWarrants([]);
    setCurrentTarget(searchQuery);

    try {
      if (unsubscribeRef.current) unsubscribeRef.current();

      const commandId = await sendSearchCommand(searchQuery);
      
      unsubscribeRef.current = subscribeToSearchCommand(commandId, (data, updatedAt, isComplete) => {
        setWarrants(data);
        if (isComplete) setIsSearching(false);
      });
      
    } catch (error) {
      console.error(error);
      setIsSearching(false);
    }
  };

  const handleRefresh = () => {
    // 1. If actively searching, re-run the search (Refresh Data)
    if (!showFavoritesOnly && searchQuery.trim()) {
      handleSearch();
      return;
    }

    // Debounce for reset action
    if (isCooldown) return;
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 500);

    // 2. Otherwise, perform a full soft reset (Home/Clear)
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setSearchQuery('');
    setCurrentTarget('');
    setWarrants([]);
    setIsSearching(false);
    setActiveTab('CALL');
    setShowFavoritesOnly(false);
    setSelectedWarrant(null);
    setLastUpdatedTime(null);
  };

  const toggleFavorite = (e: React.MouseEvent, warrant: WarrantData) => {
    e.stopPropagation();
    if (favoriteIds.has(warrant.id)) {
      setSavedWarrants(prev => prev.filter(w => w.id !== warrant.id));
    } else {
      setSavedWarrants(prev => [...prev, warrant]);
    }
  };

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const triggerButtonFeedback = () => {
    // Haptic Feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    
    // Visual Flash
    setIsButtonFlashing(true);
    setTimeout(() => {
      setIsButtonFlashing(false);
    }, 150);
  };

  // Filter and Sort Logic
  const filteredWarrants = warrants
    .filter(w => {
        if (showFavoritesOnly) return true;
        return w.type === activeTab;
    });

  const displayWarrants = showFavoritesOnly ? savedWarrants : filteredWarrants;

  const sortedWarrants = [...displayWarrants].sort((a, b) => {
    const aVal = a[sortConfig.key] || 0;
    const bVal = b[sortConfig.key] || 0;
    return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onValidate={validatePassword} onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen ${theme.bg} text-slate-200 font-sans selection:bg-red-500/30 pb-20 transition-colors duration-500`}>
      
      {/* Top Control Bar */}
      <div className={`sticky top-0 z-30 ${theme.headerBg} backdrop-blur-md border-b ${theme.border} shadow-2xl transition-colors duration-500`}>
        <div className="max-w-md mx-auto px-4 py-3">
          
          {/* Header Row: Title + Favorites Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="relative">
                 {/* Enhanced Breathing Light Effect */}
                 <div className={`absolute -inset-3 ${theme.pulse} blur-xl opacity-30 animate-pulse transition-colors duration-500`}></div>
                 <div className={`absolute -inset-1 ${theme.pulse} blur-md opacity-50 animate-pulse transition-colors duration-500`}></div>
                 
                 <div className="relative w-10 h-10 bg-gradient-to-br from-slate-800 to-black rounded-lg border border-slate-700 flex items-center justify-center shadow-inner z-10">
                   <Crosshair className={`${theme.primary} transition-colors duration-500`} size={24} />
                 </div>
               </div>
               <div>
                 <h1 className="text-xl font-black italic tracking-tighter text-white">
                   權證<span className={`${theme.primary} transition-colors duration-500`}>狙擊手</span>
                 </h1>
                 <div className="flex items-center gap-1.5">
                   <div className="relative flex items-center justify-center">
                      <span className={`absolute w-3 h-3 rounded-full ${theme.pulse} opacity-60 animate-pulse`}></span>
                      <span className={`relative w-1.5 h-1.5 rounded-full ${theme.pulse} transition-colors duration-500`}></span>
                   </div>
                   <p className={`text-[10px] font-bold ${theme.primary} tracking-wider transition-colors duration-500`}>戰術雷達掃描中</p>
                 </div>
               </div>
            </div>

            {/* Favorites Toggle Button */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-300 relative overflow-hidden group ${
                  showFavoritesOnly 
                    ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <div className={`absolute inset-0 bg-yellow-400/20 blur-xl transition-opacity duration-300 ${showFavoritesOnly ? 'opacity-100' : 'opacity-0'}`} />
                <Star size={18} className={`relative z-10 transition-transform duration-300 ${showFavoritesOnly ? 'fill-yellow-400' : ''}`} />
                <span className="relative z-10 text-sm font-bold tracking-wide">自選</span>
              </button>

              <button 
                 onClick={handleRefresh}
                 disabled={isCooldown}
                 className={`p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-500 hover:text-white transition-colors duration-300 hover:border-current hover:${theme.primary} ${isCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                 <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {!showFavoritesOnly && (
            <form onSubmit={handleSearch} className="relative mb-4 group">
              <div className={`absolute inset-0 rounded-lg blur opacity-0 group-focus-within:opacity-10 transition-opacity pointer-events-none ${theme.softBg}`}></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="請指定獵殺目標...(例如 2330)"
                className={`w-full bg-[#050505] border border-slate-800 text-white pl-12 pr-20 py-3.5 rounded-lg focus:outline-none ${theme.inputBorder} focus:ring-1 ${theme.ring} transition-all font-mono tracking-wider placeholder:text-slate-600`}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
              <button 
                type="submit"
                disabled={isSearching || isCooldown}
                onClick={triggerButtonFeedback}
                className={`absolute right-2 top-2 bottom-2 px-4 rounded border text-xs font-bold transition-all duration-100 flex items-center gap-2 ${
                  isButtonFlashing 
                    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] scale-95' 
                    : `${theme.softBg} ${theme.softBorder} ${theme.primary} ${theme.hoverBg}`
                } ${(isSearching || isCooldown) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSearching ? <Loader2 className="animate-spin" size={14} /> : '鎖定'}
              </button>
            </form>
          )}

          {/* Controls: Type Toggle & Sort */}
          <div className="flex items-center justify-between gap-4">
             {/* Type Toggle - Sliding Segmented Control */}
             {!showFavoritesOnly ? (
               <div className="relative flex w-full bg-[#1a1a1a] rounded-md p-1 border border-[#333]">
                  {/* Sliding Pill */}
                  <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[4px] shadow-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                      activeTab === 'CALL' 
                        ? 'translate-x-0 bg-[#ef4444] shadow-[0_2px_10px_rgba(239,68,68,0.4)]' 
                        : 'translate-x-full bg-[#10b981] shadow-[0_2px_10px_rgba(16,185,129,0.4)]'
                    }`}
                  ></div>
                  
                  <button 
                    onClick={() => setActiveTab('CALL')}
                    className={`flex-1 py-1.5 font-black text-base tracking-widest relative z-10 transition-colors duration-300 ${
                        activeTab === 'CALL' ? 'text-white' : 'text-[#555] hover:text-[#777]'
                    }`}
                  >
                    認購
                  </button>
                  <button 
                    onClick={() => setActiveTab('PUT')}
                    className={`flex-1 py-1.5 font-black text-base tracking-widest relative z-10 transition-colors duration-300 ${
                        activeTab === 'PUT' ? 'text-white' : 'text-[#555] hover:text-[#777]'
                    }`}
                  >
                    認售
                  </button>
               </div>
             ) : (
                <div className="text-yellow-500 font-bold flex items-center gap-2 px-2 py-3">
                   <Star className="fill-yellow-500" size={16} />
                   自選監控清單
                </div>
             )}

             {/* Target Info (Right Side) */}
             {currentTarget && !showFavoritesOnly && (
               <div className="text-center shrink-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">目標名稱</div>
                  <div className={`text-xl font-black leading-none ${theme.primary} transition-colors duration-500`}>
                     {warrants.length > 0 ? warrants[0].underlyingName : currentTarget}
                  </div>
               </div>
             )}
          </div>
          
          {/* Strategy Advice & Timestamp */}
          {!showFavoritesOnly && (
            <div className="mt-3 px-1">
               <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
                  建議操作者:請挑選量大、槓桿不高的，才不會選錯。
               </p>
            </div>
          )}

          {/* Filter / Sort Bar */}
          <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-slate-500 border-t border-slate-800/50 pt-3">
             <div className="flex items-center gap-4">
               <button 
                  onClick={() => handleSort('volume')}
                  className={`flex items-center gap-1 hover:text-white transition-colors ${sortConfig.key === 'volume' ? theme.text : ''}`}
               >
                  <BarChart3 size={12} />
                  總量
                  {sortConfig.key === 'volume' && <span className="text-[9px]">{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>}
               </button>
               <button 
                  onClick={() => handleSort('effectiveLeverage')}
                  className={`flex items-center gap-1 hover:text-white transition-colors ${sortConfig.key === 'effectiveLeverage' ? theme.text : ''}`}
               >
                  <Zap size={12} />
                  槓桿
                  {sortConfig.key === 'effectiveLeverage' && <span className="text-[9px]">{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>}
               </button>
               <button 
                  onClick={() => handleSort('thetaPercent')}
                  className={`flex items-center gap-1 hover:text-white transition-colors ${sortConfig.key === 'thetaPercent' ? theme.text : ''}`}
               >
                  <Clock size={12} />
                  每日利息
                  {sortConfig.key === 'thetaPercent' && <span className="text-[9px]">{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>}
               </button>
             </div>
             
             {/* Timestamp moved here */}
             {!showFavoritesOnly && lastUpdatedTime && (
               <span className="text-[10px] text-zinc-600 font-mono">
                 資料更新時間:{lastUpdatedTime.toLocaleTimeString('zh-TW', { hour12: false })}
               </span>
             )}
          </div>

        </div>
      </div>

      {/* Main List */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {displayWarrants.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            {isSearching ? (
               <div className="flex flex-col items-center gap-3">
                  <Loader2 className={`animate-spin ${theme.primary}`} size={32} />
                  <p className="text-sm font-mono text-slate-500">掃描市場數據中...</p>
               </div>
            ) : (
               <div className="flex flex-col items-center gap-3">
                  <Radar className="text-slate-700" size={48} />
                  <p className="text-sm text-slate-600">
                    {showFavoritesOnly ? '尚未加入自選權證' : '等待目標進入射程. . . '}
                  </p>
               </div>
            )}
          </div>
        ) : (
          sortedWarrants.map((warrant) => (
            <WarrantRow 
              key={warrant.id} 
              data={warrant} 
              onClick={setSelectedWarrant}
              isCall={warrant.type === 'CALL'}
              isFavorite={favoriteIds.has(warrant.id)}
              onToggleFavorite={(e) => toggleFavorite(e, warrant)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      <WarrantModal 
        warrant={selectedWarrant} 
        onClose={() => setSelectedWarrant(null)}
        isFavorite={selectedWarrant ? favoriteIds.has(selectedWarrant.id) : false}
        onToggleFavorite={(e) => selectedWarrant && toggleFavorite(e, selectedWarrant)}
      />

    </div>
  );
};

export default App;
    