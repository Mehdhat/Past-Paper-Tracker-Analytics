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
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Data, mimeType }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.questions || [];
  } catch (error) {
    console.error("Failed to extract questions:", error);
    throw error;
  }
}
