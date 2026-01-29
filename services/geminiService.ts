import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    // Assuming process.env.API_KEY is available as per instructions
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  return aiClient;
};

export async function getSecurityInsight(serviceName: string): Promise<string> {
  try {
    const ai = getClient();
    const model = 'gemini-3-flash-preview'; 

    const prompt = `Provide a concise, single-paragraph security tip (max 30 words) specifically about why enabling Two-Factor Authentication (2FA) is critical for a "${serviceName}" account. Focus on the specific risks associated with this type of service. Response must be in Chinese.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "无法获取安全建议。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "暂时无法连接到 AI 安全助手。";
  }
}