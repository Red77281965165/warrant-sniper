
import React, { useState, useEffect } from 'react';
import { Crosshair, Lock, ShieldAlert, ChevronRight, ScanLine, Activity, Timer, Check } from 'lucide-react';

interface LoginScreenProps {
  onValidate: (password: string) => boolean;
  onSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onValidate, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

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

  // Timer Effect for Lockout
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setTimeLeft(Math.ceil((lockoutUntil - now) / 1000));
      } else if (lockoutUntil > 0) {
        // Lockout expired
        setLockoutUntil(0);
        setFailedAttempts(0);
        localStorage.removeItem('warrant_lockout_until');
        localStorage.removeItem('warrant_login_attempts');
        setError(false);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const isLocked = lockoutUntil > Date.now();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !password) return;
    
    setError(false);
    
    // Immediate validation - No simulation delay
    const isValid = onValidate(password);
    
    if (!isValid) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('warrant_login_attempts', newAttempts.toString());
      
      // Lockout Logic
      if (newAttempts >= 3) {
        const lockTime = Date.now() + 300 * 1000; // 300 seconds
        setLockoutUntil(lockTime);
        localStorage.setItem('warrant_lockout_until', lockTime.toString());
        setError(true); 
      } else {
        setError(true);
      }

      setPassword('');
      
      // Haptic feedback for mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 50]);
      }
    } else {
      // Success: Clear security counters
      localStorage.removeItem('warrant_login_attempts');
      localStorage.removeItem('warrant_lockout_until');
      
      // Show Success UI
      setIsSuccess(true);
      
      // Short delay for visual transition only
      setTimeout(() => {
        onSuccess();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-sans overflow-hidden selection:bg-red-900 selection:text-white">
      
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
         {/* Vignette */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_90%)]"></div>
         {/* Red Scanline */}
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent h-[100%] w-full animate-[scan_4s_linear_infinite] pointer-events-none"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm px-6">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-8 relative">
           <div className={`absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse transition-opacity duration-500 ${error || isLocked ? 'opacity-40 bg-red-500' : ''} ${isSuccess ? 'opacity-50 bg-red-500 blur-3xl' : ''}`}></div>
           <div className={`relative border p-6 rounded-full backdrop-blur-sm transition-all duration-500 ${
             isSuccess 
               ? 'border-red-500 bg-red-950/20 shadow-[0_0_30px_rgba(220,38,38,0.4)] scale-110' 
               : 'border-red-900/50 bg-black/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
           }`}>
              {isSuccess ? (
                <Check size={48} className="text-red-500 animate-[scale-up_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]" />
              ) : isLocked ? (
                <Lock size={48} className="text-red-500 animate-pulse" />
              ) : error ? (
                <ShieldAlert size={48} className="text-red-500 animate-[shake_0.5s_ease-in-out]" />
              ) : (
                <Crosshair size={48} className="text-red-600 animate-[spin_10s_linear_infinite]" />
              )}
           </div>
           
           {/* Decorative Lines */}
           <div className={`absolute top-1/2 left-0 -translate-x-full w-20 h-[1px] bg-gradient-to-r from-transparent to-red-900/50 transition-all ${isSuccess ? 'w-32 opacity-0' : 'opacity-100'}`}></div>
           <div className={`absolute top-1/2 right-0 translate-x-full w-20 h-[1px] bg-gradient-to-l from-transparent to-red-900/50 transition-all ${isSuccess ? 'w-32 opacity-0' : 'opacity-100'}`}></div>
        </div>

        {/* Title */}
        <div className="text-center mb-10 space-y-2">
           <h1 className="text-3xl font-black text-white tracking-tighter italic">
              權證<span className="text-red-600">狙擊手</span>
           </h1>
           <div className="flex items-center justify-center gap-2 text-[10px] text-red-800 font-bold tracking-[0.3em]">
              <Lock size={10} />
              <span>{isSuccess ? '存取權限已確認' : '系統存取權限管制'}</span>
           </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="relative group">
           
           {/* Input Box OR Lockout Display */}
           {isLocked ? (
             <div className="relative bg-[#080808] border border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)] overflow-hidden">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-red-500"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-red-500"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-red-500"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-red-500"></div>

                <div className="flex flex-col items-center justify-center py-5 text-red-500">
                   <div className="flex items-center gap-2 mb-2 animate-pulse">
                      <Timer size={16} />
                      <span className="font-black tracking-widest text-sm">系統安全鎖定</span>
                   </div>
                   <div className="text-4xl font-mono font-bold text-white tracking-widest leading-none mb-1">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                   </div>
                   <p className="text-[9px] text-red-800 font-mono uppercase tracking-widest opacity-70">
                      Security Protocol Active
                   </p>
                </div>
             </div>
           ) : isSuccess ? (
             <div className="relative bg-red-950/20 border border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] overflow-hidden py-4">
                 <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-red-500 font-bold text-sm tracking-[0.2em] animate-pulse">
                       身份驗證成功
                    </p>
                    <p className="text-[10px] text-red-400/70 font-mono">
                       REDIRECTING...
                    </p>
                 </div>
             </div>
           ) : (
             <div className={`relative bg-[#080808] border transition-all duration-300 overflow-hidden ${
               error 
                 ? 'border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-[shake_0.4s_ease-in-out]' 
                 : 'border-red-900/30 focus-within:border-red-500 focus-within:shadow-[0_0_15px_rgba(220,38,38,0.2)]'
             }`}>
                
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-red-500"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-red-500"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-red-500"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-red-500"></div>

                <div className="flex items-center">
                   <div className="pl-4 pr-3 text-red-700">
                      <ScanLine size={18} />
                   </div>
                   <input
                      type="password"
                      inputMode="numeric"
                      value={password}
                      onChange={(e) => {
                        if (!isLocked && !isSuccess) {
                          setError(false);
                          setPassword(e.target.value);
                        }
                      }}
                      disabled={isSuccess}
                      className="w-full bg-transparent text-red-500 font-bold text-xl py-4 focus:outline-none placeholder:text-red-900/30 tracking-widest text-center"
                      placeholder="請輸入通行證"
                      autoFocus
                   />
                   <div className="pr-4 pl-3 text-red-700 opacity-50">
                      {password.length > 0 && !isSuccess ? <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> : <div className="w-2 h-2" />}
                   </div>
                </div>
             </div>
           )}

           {/* Attempts Indicator (Only show if not locked and has failed attempts) */}
           {!isLocked && !isSuccess && failedAttempts > 0 && !error && (
              <div className="mt-3 flex justify-center gap-1">
                 {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full border border-red-900 ${i < failedAttempts ? 'bg-red-600' : 'bg-transparent'}`}
                    />
                 ))}
              </div>
           )}

           {/* Error Message */}
           <div className={`mt-3 text-center transition-all duration-300 ${error && !isLocked ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 h-0'}`}>
              <p className="text-red-500 font-bold text-xs tracking-widest bg-red-950/30 py-1 px-3 inline-block border border-red-900/50">
                 存取被拒 // 還剩 {3 - failedAttempts} 次機會
              </p>
           </div>

           {/* Submit Button */}
           {!isSuccess && (
            <button
                type="submit"
                disabled={(!password && !isLocked) || isLocked}
                className={`w-full mt-6 py-4 flex items-center justify-center gap-2 font-black tracking-widest text-sm transition-all duration-300 relative overflow-hidden ${
                    isLocked
                        ? 'bg-[#111] text-red-900/30 border border-red-900/10 cursor-not-allowed'
                        : !password 
                            ? 'bg-[#111] text-zinc-600 cursor-not-allowed border border-zinc-800' 
                            : 'bg-red-600 text-black hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-500'
                }`}
            >
                {isLocked ? (
                    <span>系統冷卻中</span>
                ) : (
                    <>
                        <span>解除系統鎖定</span>
                        <ChevronRight size={16} className={password ? "animate-[move-right_1s_ease-in-out_infinite]" : ""} />
                    </>
                )}
            </button>
           )}
        </form>

        {/* Footer */}
        <div className="mt-12 text-center pb-8">
           <p className="text-[10px] text-zinc-700 font-mono tracking-widest mb-6">
              安全連線已建立<span className={`${showCursor ? 'opacity-100' : 'opacity-0'}`}>_</span>
           </p>

           <div className="border-t border-red-900/10 pt-4 mx-auto max-w-[280px]">
               <p className="text-[10px] text-zinc-600 leading-relaxed font-medium mb-2">
                  <span className="text-red-900">免責聲明:</span> 已修改找不到臺股指權證之問題，槓桿、利息、價格均準確無誤，如有修改建議請聯繫開發者，也請使用者謹慎下單，出事了開發者決不負責。
               </p>
               <p className="text-[10px] text-zinc-600 leading-relaxed font-medium mt-4">
                  如通行證忘記，請聯繫開發者索取通行證
               </p>
           </div>
        </div>
      </div>
      
      {/* Version Indicator */}
      <div className="absolute bottom-2 right-2 text-[8px] text-zinc-800 font-mono select-none">
         v122.0
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes move-right {
           0%, 100% { transform: translateX(0); }
           50% { transform: translateX(3px); }
        }
        @keyframes scale-up {
           0% { transform: scale(0.5); opacity: 0; }
           100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
