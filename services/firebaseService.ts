
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

// 1. 發送搜尋指令 (Request)
export const sendSearchCommand = async (stockCode: string) => {
  if (!db) throw new Error("Firebase not initialized");
  
  try {
    // 嚴格遵守後端 Python 規格:
    // Collection: "search_commands"
    // Fields: stock_code, status="pending", timestamp
    await addDoc(collection(db, "search_commands"), {
      stock_code: stockCode,
      status: 'pending',
      timestamp: serverTimestamp() // Python 監聽此時間戳記順序
    });
    return true;
  } catch (error) {
    console.error("Error sending command:", error);
    throw error;
  }
};

// 2. 監聽搜尋結果 (Response)
export const subscribeToSearchResult = (
  stockCode: string,
  onData: (data: WarrantData[], updatedAt?: Date) => void
) => {
  if (!db) return () => {};

  // 嚴格遵守後端 Python 規格:
  // Collection: "search_results"
  // Document ID: stockCode (使用者輸入的代號)
  const docRef = doc(db, "search_results", stockCode);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawResults = data.results || [];
      
      // 將 Python 回傳的精簡 JSON 轉換為前端 WarrantData 格式
      const warrants: WarrantData[] = rawResults.map((item: any) => {
        // 簡單判斷認購/認售 (後端回傳名稱如 "台積電元大...購01")
        const isCall = item.name.includes('購'); 
        
        return {
          id: item.id,
          symbol: item.id,
          name: item.name,
          underlyingSymbol: stockCode,
          underlyingName: stockCode, // 後端未回傳中文股名，暫用代號顯示
          broker: "N/A", // 後端未回傳券商
          type: isCall ? 'CALL' : 'PUT',
          
          // 核心數據
          price: Number(item.price) || 0,
          volume: Number(item.volume) || 0,
          
          // 欄位映射 (Python key -> Frontend key)
          effectiveLeverage: Number(item.lev) || 0,
          spreadPercent: Number(item.spread) || 0,
          daysToMaturity: Number(item.days) || 0,
          
          // 衍生數據 (後端未算，給預設值)
          dailyThetaCostPercent: 0, 
          change: 0,
          changePercent: 0,

          // 模擬最佳買賣價 (前端顯示用，因後端只給成交價)
          bestBidPrice: Number(item.price),
          bestBidVol: 0,
          bestAskPrice: Number(item.price),
          bestAskVol: 0,

          // 深度資訊 (後端無提供，給空陣列)
          bids: [], 
          asks: []
        };
      });

      // 處理最後更新時間
      let updatedAt = new Date();
      if (data.updatedAt) {
          updatedAt = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
      }

      onData(warrants, updatedAt);
    } else {
      // 文件不存在 (代表尚未搜尋過，或正在等待後端建立)
      onData([], undefined);
    }
  });

  return unsubscribe;
};
