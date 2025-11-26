
import { GoogleGenAI } from "@google/genai";
import { WarrantData } from "../types";

const initGenAI = () => {
  // In a real app, use process.env.API_KEY. 
  // For this demo, we check if it exists, otherwise we might fail gracefully or use a placeholder if configured.
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("API Key not found in process.env");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeWarrant = async (warrant: WarrantData): Promise<string> => {
  const ai = initGenAI();
  
  const prompt = `
    你是一位專業的台灣權證交易員。請針對以下這檔權證進行「流動性風險」與「持有成本」的快速健診。
    
    權證資料:
    - 名稱: ${warrant.name} (${warrant.symbol})
    - 標的: ${warrant.underlyingName}
    - 類型: ${warrant.type === 'CALL' ? '認購' : '認售'}
    - 現價: ${warrant.price}
    - 買價(Bid): ${warrant.bestBidPrice} (量: ${warrant.bestBidVol})
    - 賣價(Ask): ${warrant.bestAskPrice} (量: ${warrant.bestAskVol})
    - 價差比: ${warrant.spreadPercent.toFixed(2)}%
    - 實質槓桿: ${warrant.effectiveLeverage.toFixed(2)}倍
    - 每日時間價值流失(Theta Cost): ${warrant.dailyThetaCostPercent.toFixed(2)}%
    - 當日成交量: ${warrant.volume}張

    任務:
    1. 評估價差是否過大導致進出困難。
    2. 評估利息成本是否過高而不適合波段持有。
    3. 綜合給出操作建議 (例如: 適合極短線、可波段、或建議觀望)。
    
    限制:
    - 請用繁體中文。
    - 字數嚴格控制在 100 字以內。
    - 語氣專業、直接。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "無法生成分析結果。";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "AI 服務目前無法使用，請檢查 API Key 或稍後再試。";
  }
};

export interface AnalysisResult {
  content: string;
  sources: Array<{ title: string; uri: string }>;
}

export const generateMarketAnalysis = async (): Promise<AnalysisResult> => {
  const ai = initGenAI();
  
  // Prompt 強制要求搜尋最新的 YouTube 內容，並排除其他雜訊
  const prompt = `
    請使用 Google Search 搜尋 YouTube 頻道「老王愛說笑」的**最新一部**影片（關鍵字：老王愛說笑 最新影片 youtube）。

    任務：
    1. **鎖定目標**：僅找出該頻道最近發布（今天或昨天）的一部最新影片。
    2. **內容解析**：只針對該「影片內容」進行重點解析。**絕對不要**加入其他新聞或大盤數據，我只需要知道老王影片裡說了什麼。
    3. **格式要求**：
       - 第一行標題：【影片日期】 影片標題
       - 內文：整理老王對盤勢的看法、關鍵支撐/壓力位、提到的技術指標（均線、KD等）或看好的族群。
       - 排版：分點條列，字數 200~600 字，讓讀者能快速吸收影片精華。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash 支援 Search Grounding
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // 啟用 Google 搜尋工具
      },
    });
    
    const text = response.text || "目前找不到老王最新的影片資訊。";

    // 提取 Grounding Sources (資料來源)
    // 結構通常在 candidates[0].groundingMetadata.groundingChunks[].web
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title)
      .map((web: any) => ({ title: web.title, uri: web.uri }));

    // 去除重複的來源連結
    const uniqueSources = sources.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.uri === v.uri) === i);

    return { content: text, sources: uniqueSources };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return { 
      content: "AI 連線或搜尋失敗，請檢查 API Key 是否具備 Search Grounding 權限。", 
      sources: [] 
    };
  }
};
