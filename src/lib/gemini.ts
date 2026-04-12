import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractedQuestion {
  year: string;
  season: string;
  questionNumber: string;
  part?: string;
  topic: string;
  subtopic?: string;
  content: string;
}

export async function extractQuestionsFromImage(base64Data: string, mimeType: string): Promise<ExtractedQuestion[]> {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Extract all questions from this past paper image. 
            For each question, identify:
            - Year (e.g., 2023)
            - Season (e.g., Summer, Winter, Spring, Autumn)
            - Question Number (e.g., 1, 2, 3)
            - Part (e.g., a, b, i, ii) - leave empty if none
            - Topic (e.g., Algebra, Calculus, Mechanics, etc.)
            - Subtopic (e.g., Quadratic Equations, Integration by Parts, etc.)
            - Content (the actual text of the question)

            Return the data as a JSON array of objects.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            season: { type: Type.STRING },
            questionNumber: { type: Type.STRING },
            part: { type: Type.STRING },
            topic: { type: Type.STRING },
            subtopic: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ["year", "season", "questionNumber", "topic", "content"],
        },
      },
    },
  });

  const response = await model;
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}
