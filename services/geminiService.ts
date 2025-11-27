
import { WarrantData } from "../types";

// AI features have been disabled for this version (V39.0).
// These are stub functions to maintain type safety without external API calls.

export const analyzeWarrant = async (warrant: WarrantData): Promise<string> => {
  return "AI Analysis Disabled";
};

export interface AnalysisResult {
  content: string;
  sources: Array<{ title: string; uri: string }>;
}

export const generateMarketAnalysis = async (): Promise<AnalysisResult> => {
  return { 
    content: "AI Analysis Disabled", 
    sources: [] 
  };
};
