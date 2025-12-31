
import React, { useState, useEffect } from 'react';
import { Crosshair, Lock, ShieldAlert, ChevronRight, ScanLine, Activity, Timer, Check, Clock, ShieldCheck, Cpu, Terminal } from 'lucide-react';

interface LoginScreenProps {
  onValidate: (password: string) => boolean;
  onSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onValidate, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Engineer Mode State
  const [isEngineer, setIsEngineer] = useState(false);
  const [showEngineerLogin, setShowEngineerLogin] = useState(false);
  const [engineerInput, setEngineerInput] = useState('');

  // Security Lockout State
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      return parseInt(localStorage.getItem('warrant_login_attempts') || '0', 10);
    } catch { return 0; }
  });
  
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    try {
      return parseInt(localStorage.getItem('warrant_lockout_until') || '0', 10);
    } catch { return 0; }
  });

  const [timeLeft, setTimeLeft] = useState(0);

  // Time and Lockout Check logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check security lockout
      const nowTs = now.getTime();
      if (lockoutUntil > nowTs) {
        setTimeLeft(Math.ceil((lockoutUntil - nowTs) / 1000));
      } else if (lockoutUntil > 0) {
        setLockoutUntil(0);
        setFailedAttempts(0);
        localStorage.removeItem('warrant_lockout_until');
        localStorage.removeItem('warrant_login_attempts');
        setError(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Trading Hours Check: 08:45 to 13:45
  const isWithinTradingHours = () => {
    if (isEngineer) return true; // Engineer bypass
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;
    
    const startMinutes = 8 * 60 + 45; // 08:45
    const endMinutes = 13 * 60 + 45;  // 13:45
    
    return currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes;
  };

  const isMarketOpen = isWithinTradingHours();
  const isLocked = lockoutUntil > currentTime.getTime();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !isMarketOpen || !password) return;
    
    setError(false);
    
    const isValid = onValidate(password);
    
    if (!isValid) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('warrant_login_attempts', newAttempts.toString());
      
      if (newAttempts >= 3) {
        const lockTime = Date.now() + 300 * 1000;
        setLockoutUntil(lockTime);
        localStorage.setItem('warrant_lockout_until', lockTime.toString());
        setError(true); 
      } else {
        setError(true);
      }

      setPassword('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 50]);
      }
    } else {
      localStorage.removeItem('warrant_login_attempts');
      localStorage.removeItem('warrant_lockout_until');
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    }
  };

  const handleEngineerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (engineerInput === '22336600') {
      setIsEngineer(true);
      setShowEngineerLogin(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
    } else {
      setEngineerInput('');
      setShowEngineerLogin(false);
    }
  };

  const timeString = currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' . ');

  return (
    <div className="fixed inset-0 z-[100] bg-black font-sans overflow-hidden selection:bg-red-900 selection:text-white flex flex-col">
      
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent h-[100%] w-full animate-[scan:4s_linear_infinite] pointer-events-none"></div>
      </div>

      {/* Engineer Access Trigger - Top Right */}
      <div className="absolute top-4 right-4 z-[110]">
        <button 
          onClick={() => setShowEngineerLogin(true)}
          className={`p-2 transition-all duration-300 ${isEngineer ? 'text-blue-500 animate-pulse' : 'text-zinc-800 hover:text-zinc-600'}`}
        >
          <ShieldCheck size={18} />
        </button>
      </div>

      {/* Main Container - Adjusted to fit mobile screens */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4">
        
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
            
            {/* Real-time Clock Section */}
            <div className="flex flex-col items-center">
                <div className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] mb-1 uppercase">戰術時間管理系統</div>
                <div className="text-5xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-none">
                {timeString}
                </div>
                <div className={`text-xs font-bold tracking-[0.3em] mt-3 transition-colors duration-500 ${isMarketOpen ? 'text-red-600' : 'text-amber-600/70'}`}>
                {dateString}
                </div>
            </div>

            {/* Title & Status with Breathing Light background */}
            <div className="text-center space-y-3 relative w-full flex flex-col items-center">
                {/* Subtle Breathing Light specifically behind the title */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 blur-[60px] opacity-20 animate-pulse transition-colors duration-1000 rounded-full ${
                  isEngineer ? 'bg-blue-600' : (isMarketOpen ? 'bg-red-600' : 'bg-amber-600')
                }`}></div>
                
                <h1 className="relative z-10 text-5xl font-black text-white tracking-tighter italic leading-tight">
                    權證<span className={isEngineer ? "text-blue-500" : (isMarketOpen ? "text-red-600" : "text-amber-600")}>狙擊手</span>
                </h1>
                <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600 font-bold tracking-[0.3em]">
                        <Lock size={10} />
                        <span>{isSuccess ? '存取權限已確認' : '系統存取權限管制'}</span>
                    </div>
                    <div className={`text-[10px] font-black tracking-widest px-4 py-1.5 border rounded-full transition-all duration-500 ${isEngineer ? 'text-blue-500 border-blue-900/50 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : (isMarketOpen ? 'text-red-500 border-red-900/50 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'text-amber-500 border-amber-900/50 bg-amber-950/20')}`}>
                        {isEngineer ? '工程師覆寫模式' : (isMarketOpen ? '市場營運中' : '市場待命中')}
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="w-full relative group">
                {!isMarketOpen ? (
                    <div className="relative bg-zinc-950/40 backdrop-blur-sm border border-amber-900/30 overflow-hidden py-8 rounded-xl shadow-xl">
                        <div className="flex flex-col items-center justify-center text-amber-600/50">
                          <p className="text-sm font-bold tracking-[0.2em] mb-2 uppercase">非營運時段</p>
                          <p className="text-[10px] font-mono tracking-widest opacity-70">
                              營運時間: 08:45 - 13:45
                          </p>
                        </div>
                    </div>
                ) : isLocked ? (
                    <div className="relative bg-zinc-950/40 backdrop-blur-sm border border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] overflow-hidden rounded-xl">
                        <div className="flex flex-col items-center justify-center py-6 text-red-500">
                          <div className="flex items-center gap-2 mb-2 animate-pulse">
                              <Timer size={18} />
                              <span className="font-black tracking-widest text-sm uppercase">系統安全鎖定</span>
                          </div>
                          <div className="text-6xl font-mono font-bold text-white tracking-widest leading-none mb-1">
                              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                          </div>
                          <p className="text-[9px] text-red-800 font-mono uppercase tracking-widest opacity-70">
                              SECURITY PROTOCOL ACTIVE
                          </p>
                        </div>
                    </div>
                ) : (
                    <div className={`relative bg-zinc-950/40 backdrop-blur-sm border transition-all duration-300 overflow-hidden rounded-xl ${
                    error 
                        ? 'border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-[shake_0.4s_ease-in-out]' 
                        : (isEngineer ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-red-900/40 focus-within:border-red-500 focus-within:shadow-[0_0_15px_rgba(220,38,38,0.2)]')
                    }`}>
                        <div className={`absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 ${isEngineer ? 'border-blue-500' : 'border-red-500'}`}></div>
                        <div className={`absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 ${isEngineer ? 'border-blue-500' : 'border-red-500'}`}></div>
                        <div className={`absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 ${isEngineer ? 'border-blue-500' : 'border-red-500'}`}></div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 ${isEngineer ? 'border-blue-500' : 'border-red-500'}`}></div>

                        <div className="flex items-center">
                          <div className={`pl-6 pr-4 ${isEngineer ? 'text-blue-700' : 'text-red-700'}`}>
                              <ScanLine size={24} />
                          </div>
                          <input
                              type="password"
                              inputMode="numeric"
                              value={password}
                              onChange={(e) => {
                                  if (isMarketOpen && !isLocked && !isSuccess) {
                                  setError(false);
                                  setPassword(e.target.value);
                                  }
                              }}
                              disabled={!isMarketOpen || isSuccess}
                              className={`w-full bg-transparent ${isEngineer ? 'text-blue-500' : 'text-red-500'} font-bold text-3xl py-5 focus:outline-none placeholder:${isEngineer ? 'text-blue-900/20' : 'text-red-900/20'} tracking-widest text-center`}
                              placeholder={isEngineer ? "解析通行代碼" : "請輸入通行證"}
                              autoFocus
                          />
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                {!isSuccess && (
                    <button
                        type="submit"
                        disabled={!isMarketOpen || (!password && !isLocked) || isLocked}
                        className={`w-full mt-6 py-5 flex items-center justify-center gap-2 font-black tracking-widest text-base transition-all duration-300 relative overflow-hidden rounded-xl ${
                            !isMarketOpen
                                ? 'bg-zinc-900/40 text-amber-900/30 border border-amber-900/10 cursor-not-allowed'
                                : isLocked
                                    ? 'bg-zinc-900/40 text-red-900/30 border border-red-900/10 cursor-not-allowed'
                                    : !password 
                                        ? 'bg-zinc-900/40 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                                        : (isEngineer ? 'bg-blue-600 text-black border-blue-500' : 'bg-red-600 text-black hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-500')
                        }`}
                    >
                        {!isMarketOpen ? (
                            <span className="opacity-50">等待市場開啟</span>
                        ) : isLocked ? (
                            <span className="opacity-50">系統冷卻中</span>
                        ) : (
                            <>
                                <span>{isEngineer ? '執行工程存取' : '解除系統鎖定'}</span>
                                <ChevronRight size={20} className={password ? "animate-[move-right_1s_ease-in-out_infinite]" : ""} />
                            </>
                        )}
                    </button>
                )}
            </form>

            {/* Engineer Debug Section */}
            {isEngineer && (
              <div className="w-full mt-2 p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 mb-3 text-blue-500">
                  <Cpu size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">系統核心細節</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-blue-800 font-bold uppercase">上線時間</span>
                    <span className="text-[11px] text-blue-300 font-mono">1.4.2_NODE_TX</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-blue-800 font-bold uppercase">記憶體</span>
                    <span className="text-[11px] text-blue-300 font-mono">248MB/1.2GB</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-blue-800 font-bold uppercase">延遲</span>
                    <span className="text-[11px] text-blue-300 font-mono">12ms (FIREBASE)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-blue-800 font-bold uppercase">存取層級</span>
                    <span className="text-[11px] text-blue-300 font-mono">ROOT_LEVEL_2</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Announcement - Guaranteed within view */}
            {!isEngineer && (
              <div className="w-full">
                  <div className="px-5 py-4 bg-zinc-950/60 backdrop-blur-md border border-red-900/30 rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center justify-center gap-2 mb-2">
                          <Activity size={14} className="text-red-600" />
                          <span className="text-[11px] text-white font-black tracking-widest uppercase">系統營運公告</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium text-center px-1">
                          本系統僅於交易時段開放 <span className="text-red-500 font-bold">(08:45 - 13:45)</span>，其餘時間系統處於離線監控模式，無法進入戰情室。
                      </p>
                  </div>
                  
                  <p className="mt-6 text-[10px] text-zinc-800 font-mono tracking-widest text-center opacity-60">
                      安全連線已建立<span className={`${showCursor ? 'opacity-100' : 'opacity-0'}`}>_</span>
                  </p>
              </div>
            )}
        </div>
      </div>

      {/* Engineer Login Modal */}
      {showEngineerLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-xs space-y-8">
              <div className="text-center space-y-2">
                <Terminal className="mx-auto text-blue-500 mb-4" size={32} />
                <h2 className="text-white font-black text-xl tracking-widest uppercase italic">工程存取權限</h2>
                <p className="text-blue-900 text-[10px] font-bold tracking-[0.3em] uppercase">需要安全協定覆寫碼</p>
              </div>
              
              <form onSubmit={handleEngineerSubmit} className="space-y-4">
                <div className="relative">
                  <input 
                    type="password" 
                    value={engineerInput}
                    onChange={(e) => setEngineerInput(e.target.value)}
                    placeholder="輸入覆寫代碼"
                    className="w-full bg-zinc-900/50 border border-blue-900/30 rounded-lg py-4 px-4 text-center text-blue-500 font-mono tracking-[0.5em] focus:outline-none focus:border-blue-500 transition-all placeholder:tracking-normal placeholder:text-[10px] placeholder:text-blue-900/50"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                   <button 
                     type="button"
                     onClick={() => setShowEngineerLogin(false)}
                     className="flex-1 py-3 text-[10px] font-black tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
                   >
                     取消
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 py-3 bg-blue-600 text-black font-black tracking-widest uppercase rounded text-[10px]"
                   >
                     授權進駐
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}
      
      <div className="fixed bottom-2 right-4 text-[8px] text-zinc-800 font-mono select-none font-bold opacity-30 pointer-events-none">
         PROTOCOL v122.5
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-120%); }
          100% { transform: translateY(120%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes move-right {
           0%, 100% { transform: translateX(0); }
           50% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
