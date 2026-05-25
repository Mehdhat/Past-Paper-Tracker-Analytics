import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set!");
}

const ai = new GoogleGenAI({ 
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/extract", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "Missing base64Data or mimeType" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
              text: `Extract all questions from this past paper. 
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

    const text = response.text || "[]";
    const parsed = JSON.parse(text);
    return res.json({ questions: parsed });
  } catch (error: any) {
    console.error("Gemini Extraction Error on server:", error);
    return res.status(500).json({ error: error.message || "Failed to extract questions from paper." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
