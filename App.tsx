import React, { useState, useRef } from 'react';
import { Search, X, Star, Loader2, Target, Crosshair, BarChart3, Clock, Zap, Shield, Radar, AlertCircle } from 'lucide-react';
import WarrantRow from './components/WarrantRow';
import WarrantModal from './components/WarrantModal';
import { WarrantData } from './types';
import { sendSearchCommand, subscribeToSearchCommand } from './services/firebaseService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CALL' | 'PUT'>('CALL');
  const [warrants, setWarrants] = useState<WarrantData[]>([]);
  const [selectedWarrant, setSelectedWarrant] = useState<WarrantData | null>(null);
  
  const [searchQuery, setSearchQuery] = useState(''); 
  const [currentTarget, setCurrentTarget] = useState(''); 
  const [isSearching, setIsSearching] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: 'volume' | 'effectiveLeverage' | 'thetaPercent' | 'daysToMaturity';
    direction: 'asc' | 'desc';
  }>({ key: 'volume', direction: 'desc' });
  
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('warrant_favorites');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const isCall = activeTab === 'CALL';

  // Dynamic Theme Configuration
  const theme = {
    // Colors
    text: isCall ? 'text-red-500' : 'text-emerald-500',
    textDim: isCall ? 'text-red-500/80' : 'text-emerald-500/80',
    titleHighlight: isCall ? 'text-red-600' : 'text-emerald-500',
    
    // Borders
    border: isCall ? 'border-red-900/30' : 'border-emerald-900/30',
    borderStrong: isCall ? 'border-red-900/50' : 'border-emerald-900/50',
    
    // Backgrounds & Gradients
    gradientVia: isCall ? 'via-red-900' : 'via-emerald-900',
    glowBlob: isCall ? 'bg-red-900/10' : 'bg-emerald-900/10',
    iconBoxBg: isCall ? 'bg-red-950/30' : 'bg-emerald-950/30',
    
    // Shadows
    iconShadow: isCall ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    inputFocus: isCall ? 'focus-within:border-red-600 focus-within:shadow-[0_0_15px_rgba(220,38,38,0.15)]' : 'focus-within:border-emerald-600 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    
    // Interactive Elements
    searchBtn: isCall ? 'bg-red-900/20 hover:bg-red-600 text-red-500 border-red-900/30' : 'bg-emerald-900/20 hover:bg-emerald-600 text-emerald-500 border-emerald-900/30',
    pulseBg: isCall ? 'bg-red-500' : 'bg-emerald-500',
    
    // Specifics
    emptyIcon: isCall ? 'text-red-900/40' : 'text-emerald-900/40',
    loaderBorder: isCall ? 'border-red-500/30 border-t-red-500' : 'border-emerald-500/30 border-t-emerald-500',
    loaderText: isCall ? 'text-red-500' : 'text-emerald-500',
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const targetCode = searchQuery.trim().toUpperCase();
    
    setWarrants([]); 
    setCurrentTarget(targetCode);
    setIsSearching(true);
    setShowFavoritesOnly(false);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const commandId = await sendSearchCommand(targetCode);
      const unsubscribe = subscribeToSearchCommand(commandId, (data, time, isComplete) => {
        if (isComplete) {
          setWarrants(data);
          setIsSearching(false);
        }
      });
      unsubscribeRef.current = unsubscribe;
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

  const handleSort = (key: 'volume' | 'effectiveLeverage' | 'thetaPercent' | 'daysToMaturity') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredWarrants = warrants
    .filter(w => {
      if (showFavoritesOnly) return favorites.has(w.id);
      if (w.type !== activeTab) return false;
      return true;
    })
    .sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

  return (
    <div className="fixed inset-0 bg-tech-pattern text-slate-200 overflow-hidden font-sans select-none">
      
      {/* Decorative Background Glows - Dynamic Color */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${theme.gradientVia} to-transparent opacity-80 transition-colors duration-500`} />
      <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] ${theme.glowBlob} blur-[80px] rounded-full pointer-events-none transition-colors duration-500`} />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto bg-[#0a0a0a]/90 backdrop-blur-sm border-x border-slate-800 shadow-2xl">
        
        {/* Header Section */}
        <header className={`px-5 py-4 bg-gradient-to-b from-[#111] to-[#0a0a0a] border-b ${theme.border} transition-colors duration-300`}>
           <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                 <div className={`relative flex items-center justify-center w-10 h-10 rounded border transition-all duration-300 ${theme.iconBoxBg} ${theme.borderStrong} ${theme.iconShadow}`}>
                    <Crosshair className={`${theme.text}`} size={24} />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black tracking-wider text-white italic drop-shadow-lg">
                       權證<span className={`${theme.titleHighlight} transition-colors duration-300`}>狙擊手</span>
                    </h1>
                    <div className={`flex items-center gap-2 text-[10px] font-mono ${theme.textDim}`}>
                       <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme.pulseBg}`}></span>
                       系統監控中
                    </div>
                 </div>
              </div>
              
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`p-2.5 rounded border transition-all duration-300 ${
                  showFavoritesOnly 
                  ? 'border-yellow-600/50 bg-yellow-900/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                  : 'border-slate-800 bg-slate-900/50 text-slate-600 hover:text-white hover:border-slate-600'
                }`}
              >
                 <Star size={20} className={showFavoritesOnly ? "fill-yellow-400" : ""} />
              </button>
           </div>

           {/* Search Module - Weapon System Style */}
           <form onSubmit={handleSearchSubmit} className="relative group">
              <div className={`relative flex items-center bg-[#050505] border border-slate-700/50 rounded transition-all duration-300 ${theme.inputFocus}`}>
                 <div className="pl-4 text-slate-500">
                    <Target size={18} />
                 </div>
                 <input 
                    type="text" 
                    placeholder="輸入股票代號 (例如 2330)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent px-3 py-3.5 text-lg font-mono text-white placeholder-slate-600 focus:outline-none tracking-wider"
                 />
                 {isSearching ? (
                   <div className={`pr-4 animate-spin ${theme.text}`}>
                      <Loader2 size={20} />
                   </div>
                 ) : (
                    <button type="submit" className={`mr-1 px-4 py-2 text-xs font-bold rounded-sm border transition-all tracking-wider ${theme.searchBtn}`}>
                       鎖定
                    </button>
                 )}
              </div>
           </form>
        </header>

        {/* Tactical Controls (Call/Put) */}
        <div className="px-5 py-2 flex items-center justify-between bg-[#0f0f0f] border-b border-slate-800">
           {/* Custom Toggle Switch */}
           <div className="flex bg-[#050505] p-1 rounded-lg border border-slate-800 relative">
              {/* Active Background Pill Animation */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded transition-all duration-300 ease-out shadow-lg ${
                  activeTab === 'CALL' 
                    ? 'left-1 bg-gradient-to-b from-red-600 to-red-800' 
                    : 'left-[calc(50%+2px)] bg-gradient-to-b from-emerald-600 to-emerald-800'
                }`}
              />
              
              <button 
                 onClick={() => setActiveTab('CALL')}
                 className={`relative z-10 w-24 py-1.5 text-sm font-bold tracking-wider rounded transition-colors ${
                    activeTab === 'CALL' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                 }`}
              >
                 認購
              </button>
              <button 
                 onClick={() => setActiveTab('PUT')}
                 className={`relative z-10 w-24 py-1.5 text-sm font-bold tracking-wider rounded transition-colors ${
                    activeTab === 'PUT' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                 }`}
              >
                 認售
              </button>
           </div>
           
           {/* Target Info */}
           <div className="text-right">
             {currentTarget ? (
                <div>
                   <span className="text-[10px] text-slate-500 block uppercase tracking-wider">目標代號</span>
                   <span className={`font-mono font-bold ${theme.text}`}>{currentTarget}</span>
                </div>
             ) : (
                <div className="flex items-center gap-1 opacity-30">
                   <Radar size={16} />
                   <span className="text-[10px]">掃描中</span>
                </div>
             )}
           </div>
        </div>

        {/* Sort Bar - Removed Days, Renamed Theta */}
        {warrants.length > 0 && (
          <div className="flex gap-2 px-5 py-2 bg-[#0a0a0a] border-b border-slate-800/50 overflow-x-auto no-scrollbar">
              {[
                { key: 'volume', label: '總量', icon: BarChart3 },
                { key: 'effectiveLeverage', label: '槓桿', icon: Zap },
                { key: 'thetaPercent', label: '每日利息', icon: Clock },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleSort(item.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-bold transition-all whitespace-nowrap ${
                     sortConfig.key === item.key
                     ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                     : 'bg-transparent border-transparent text-slate-500 hover:text-slate-400'
                  }`}
                >
                   <item.icon size={12} />
                   {item.label}
                   {sortConfig.key === item.key && (
                     <span className={`text-[9px] ${theme.text}`}>{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>
                   )}
                </button>
              ))}
          </div>
        )}

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
           
           {/* Searching Animation Overlay */}
           {isSearching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
                 <div className="relative">
                    <div className={`w-16 h-16 border-4 rounded-full animate-spin ${theme.loaderBorder}`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className={`w-2 h-2 rounded-full animate-pulse ${theme.pulseBg}`}></div>
                    </div>
                 </div>
                 <p className={`mt-4 font-mono tracking-widest text-sm animate-pulse ${theme.loaderText}`}>正在鎖定目標...</p>
              </div>
           )}

           <div className="space-y-3 pb-20">
              {filteredWarrants.length > 0 ? (
                 filteredWarrants.map((w, i) => (
                    <div key={w.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 30}ms` }}>
                       <WarrantRow 
                          data={w} 
                          onClick={setSelectedWarrant}
                          isCall={activeTab === 'CALL'}
                          isFavorite={favorites.has(w.id)}
                          onToggleFavorite={(e) => toggleFavorite(w.id, e)}
                       />
                    </div>
                 ))
              ) : (
                 !isSearching && (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-800">
                       <div className="relative mb-6">
                         <Target size={80} strokeWidth={0.5} className="text-slate-800" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <AlertCircle size={30} className={`${theme.emptyIcon}`} />
                         </div>
                       </div>
                       <p className="font-bold text-slate-600 text-lg">等待目標確認</p>
                       <p className="text-slate-700 text-sm mt-2 font-mono">請輸入代號開始監控</p>
                    </div>
                 )
              )}
           </div>
        </div>
      </div>

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