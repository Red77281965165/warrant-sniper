
export interface OrderBookEntry {
  price: number;
  volume: number;
}

export interface WarrantData {
  id: string;
  symbol: string; // 權證代號 (e.g., 089988)
  name: string; // 權證名稱
  underlyingSymbol: string; // 標的代號 (e.g., 2330)
  underlyingName: string; // 標的名稱 (e.g., 台積電)
  broker: string; // 發行券商
  type: 'CALL' | 'PUT';
  
  // Real-time Market Data
  price: number; // Current Market Price (Last)
  strikePrice: number; // 履約價
  volume: number; // 當日成交量
  
  // Calculated Metrics from Python Backend
  effectiveLeverage: number; // 實質槓桿 (lev)
  thetaPercent: number;      // Theta % (theta_pct)
  daysToMaturity: number;    // 剩餘天數 (days)
  impliedVolatility: number; // 隱含波動率 (iv)

  // Optional/Legacy fields
  delta?: number;             
  spreadPercent?: number;     
  change?: number;
  changePercent?: number;
  
  bestBidPrice?: number;
  bestBidVol?: number;
  bestAskPrice?: number;
  bestAskVol?: number;

  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}
