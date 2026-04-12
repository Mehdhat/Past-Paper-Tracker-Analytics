export interface Question {
  id: string;
  year: string;
  season: string;
  questionNumber: string;
  part?: string;
  topic: string;
  subtopic?: string;
  content: string;
  createdAt: number;
}

export interface TopicFrequency {
  topic: string;
  count: number;
  years: string[];
  subtopics: string[];
  papers: { year: string; season: string; qNum: string }[];
}
