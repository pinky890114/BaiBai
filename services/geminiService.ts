import { GoogleGenAI } from "@google/genai";
import { Commission } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateClientUpdate = async (commission: Commission): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "錯誤: 缺少 API Key。";

  const prompt = `
    你是一位專業且親切的接案繪師小幫手。
    請用**繁體中文**為委託人 "${commission.clientName}" 寫一則簡短、有禮貌的進度回報訊息。
    
    委託資訊：
    - 標題: ${commission.title}
    - 目前狀態: ${commission.status}
    - 類型: ${commission.type}
    
    語氣要親切但專業。
    提到目前的 "${commission.status}" 階段進展順利。
    如果狀態是 "排單中"，請感謝他們的耐心等待。
    如果狀態是 "結案"，請告知檔案已準備好可供確認。
    字數控制在 100 字以內。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "無法產生回覆。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "產生回覆失敗，請稍後再試。";
  }
};

export const suggestWorkPlan = async (commission: Commission): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "錯誤: 缺少 API Key。";
  
    const prompt = `
      我是一位數位繪圖創作者。請針對這個委託案，提供我 3 個具體的下一步工作建議清單。
      請用**繁體中文**回答。
      
      委託類型: ${commission.type}
      描述: ${commission.description}
      目前階段: ${commission.status}
  
      請提供 3 個簡潔、可執行的點列式建議，幫助我推進到下一個階段。
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "無法產生計畫。";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "產生計畫失敗。";
    }
  };

export const estimateEffort = async (commission: Commission): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "錯誤: 缺少 API Key。";

  const prompt = `
    請分析以下繪圖委託的複雜度，並估計所需的工作時間（小時）與建議的報價調整（如果有的話）。
    這是一個輔助功能，幫助繪師評估工作量。
    請用**繁體中文**回答，保持簡短（150字內）。

    委託類型: ${commission.type}
    描述: ${commission.description}
    目前設定價格: ${commission.price}

    回答格式參考：
    預估工時：X ~ Y 小時
    複雜度評估：高/中/低
    分析建議：(簡短說明為何，例如細節多寡、背景複雜度等)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "無法進行估算。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "估算失敗。";
  }
};
