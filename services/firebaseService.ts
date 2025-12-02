
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../constants';
import { WarrantData } from '../types';

let db: any = null;

try {
  // Initialize Firebase
  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// 1. 發送搜尋指令 (Request) - Returns the Document ID
export const sendSearchCommand = async (stockCode: string): Promise<string> => {
  if (!db) throw new Error("Firebase not initialized");
  
  try {
    // 嚴格遵守後端 Python 規格:
    // Collection: "search_commands"
    // Fields: stock_code, status="pending", timestamp
    const docRef = await addDoc(collection(db, "search_commands"), {
      stock_code: stockCode,
      status: 'pending',
      timestamp: serverTimestamp() // Python 監聽此時間戳記順序
    });
    return docRef.id;
  } catch (error) {
    console.error("Error sending command:", error);
    throw error;
  }
};

// 2. 監聽特定指令的結果 (Response)
// Python 後端會直接更新原本的 Command Document，將 status 改為 completed 並附上 data
export const subscribeToSearchCommand = (
  commandId: string,
  onData: (data: WarrantData[], updatedAt?: Date, isComplete?: boolean) => void
) => {
  if (!db || !commandId) return () => {};

  const docRef = doc(db, "search_commands", commandId);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // 檢查狀態是否完成
      if (data.status === 'completed' && Array.isArray(data.data)) {
        const rawResults = data.data;
        
        // 將 Python 回傳的 JSON 轉換為前端 WarrantData 格式
        // Python keys: id, name, price, volume, lev, theta_pct, days, strike, iv, broker
        const warrants: WarrantData[] = rawResults.map((item: any) => {
          // 簡單判斷認購/認售
          const isCall = item.name.includes('購') || item.name.includes('CALL');
          const type = item.type ? (item.type === 'call' ? 'CALL' : 'PUT') : (isCall ? 'CALL' : 'PUT');
          
          // 嘗試從 Python 資料中解析最佳一檔 (如果有提供)
          // Python keys typically: best_bid, best_ask OR bid, ask, bid_price, ask_price
          const bestBid = Number(item.best_bid) || Number(item.bid) || Number(item.bid_price) || 0;
          const bestAsk = Number(item.best_ask) || Number(item.ask) || Number(item.ask_price) || 0;
          const bestBidVol = Number(item.best_bid_vol) || Number(item.bid_vol) || 0;
          const bestAskVol = Number(item.best_ask_vol) || Number(item.ask_vol) || 0;

          return {
            id: item.id,
            symbol: item.id,
            name: item.name,
            underlyingSymbol: data.stock_code || "Unknown",
            underlyingName: data.stock_code || "Unknown", 
            broker: item.broker || "N/A", 
            type: type,
            
            // 核心數據
            price: Number(item.price) || 0,
            strikePrice: Number(item.strike) || 0,
            volume: Number(item.volume) || 0,
            
            // 欄位映射 (Python key -> Frontend key)
            effectiveLeverage: Number(item.lev) || 0,
            thetaPercent: Number(item.theta_pct) || 0,
            daysToMaturity: Number(item.days) || 0,
            impliedVolatility: Number(item.iv) || 0,
            
            // Order Book Data (Best 1 Gear)
            delta: 0,
            spreadPercent: 0,
            bids: bestBid > 0 ? [{price: bestBid, volume: bestBidVol}] : [],
            asks: bestAsk > 0 ? [{price: bestAsk, volume: bestAskVol}] : [],
            bestBidPrice: bestBid,
            bestAskPrice: bestAsk,
            bestBidVol: bestBidVol,
            bestAskVol: bestAskVol
          };
        });

        // 處理最後更新時間
        let updatedAt = new Date();
        if (data.updatedAt) {
            updatedAt = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        }

        onData(warrants, updatedAt, true);
      }
    }
  });

  return unsubscribe;
};
