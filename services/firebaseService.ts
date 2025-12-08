
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
          const bestBid = Number(item.best_bid) || Number(item.bid) || Number(item.bid_price) || 0;
          const bestAsk = Number(item.best_ask) || Number(item.ask) || Number(item.ask_price) || 0;
          const bestBidVol = Number(item.best_bid_vol) || Number(item.bid_vol) || 0;
          const bestAskVol = Number(item.best_ask_vol) || Number(item.ask_vol) || 0;

          // ---------------------------------------------------------
          // Logic to determine underlying name (Avoid Numbers/Codes)
          // ---------------------------------------------------------
          let uName = data.stock_name || data.stockName || item.stock_name || item.stockName || item.underlying_name;

          // If name is missing or numeric (e.g. "2330"), try to extract from warrant name
          if ((!uName || /^\d+$/.test(uName)) && item.name) {
             const nameStr = String(item.name);
             // Match prefix of non-digits (e.g., "台積電永豐" from "台積電永豐55購07")
             const match = nameStr.match(/^(\D+)/); 
             if (match) {
                const prefix = match[1];
                // Heuristic: Most broker suffixes are 2 chars (e.g., 凱基, 永豐)
                // If prefix length >= 4 (e.g. 台積電永豐), strip last 2 chars -> 台積電
                // This covers most cases: 
                // 台積電(3)+永豐(2)=5 -> 台積電
                // 鴻海(2)+富邦(2)=4 -> 鴻海
                // 中鋼(2)+凱基(2)=4 -> 中鋼
                if (prefix.length >= 4) {
                   uName = prefix.slice(0, -2);
                } else {
                   // e.g. 友達 (2)? If no broker suffix? Just use prefix.
                   uName = prefix;
                }
             } else {
                // Name starts with digits (e.g. 0050元大...), use full name as fallback
                // Better to show "0050元大..." than just "0050"
                uName = nameStr;
             }
          }

          // Absolute fallback
          if (!uName) uName = data.stock_code || "Unknown";

          return {
            id: item.id,
            symbol: item.id,
            name: item.name,
            underlyingSymbol: data.stock_code || "Unknown",
            underlyingName: uName,
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
