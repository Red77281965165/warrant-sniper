
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
  
  // Optional fields (Python script might not provide these explicitly)
  change?: number;
  changePercent?: number;
  delta?: number;
  
  volume: number; // 當日成交量
  
  // Best Bid/Ask
  bestBidPrice: number;
  bestBidVol: number;
  bestAskPrice: number;
  bestAskVol: number;

  // Calculated Metrics
  effectiveLeverage: number; // 實質槓桿
  dailyThetaCostPercent: number; // 每日利息成本 %
  spreadPercent: number; // 價差比
  daysToMaturity: number;

  // Depth (Python script v23.0 may not return depth, allow empty)
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}
