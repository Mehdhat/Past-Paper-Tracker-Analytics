import { useState, useEffect, useMemo } from "react";
import { 
  FileUp, 
  Search, 
  BarChart3, 
  List, 
  Trash2, 
  Loader2, 
  ChevronRight, 
  Calendar, 
  Sun, 
  Hash, 
  BookOpen,
  Plus,
  Download,
  FileText,
  Layers,
  History
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { extractQuestionsFromImage, ExtractedQuestion } from "./lib/gemini";
import { Question, TopicFrequency } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopicQuestion, setSelectedTopicQuestion] = useState<Question | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("past_paper_questions");
    if (saved) {
      try {
        setQuestions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load questions", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("past_paper_questions", JSON.stringify(questions));
  }, [questions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const mimeType = file.type;
        const extracted = await extractQuestionsFromImage(base64.split(",")[1], mimeType);
        
        const newQuestions: Question[] = extracted.map((q) => ({
          ...q,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        }));

        setQuestions(prev => [...newQuestions, ...prev]);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file. Please try again.");
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all questions?")) {
      setQuestions([]);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => 
      q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subtopic && q.subtopic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.year.includes(searchQuery)
    );
  }, [questions, searchQuery]);

  const topicAnalytics = useMemo(() => {
    const map = new Map<string, TopicFrequency>();
    questions.forEach(q => {
      const existing = map.get(q.topic) || { 
        topic: q.topic, 
        count: 0, 
        years: [], 
        subtopics: [], 
        papers: [] 
      };
      existing.count += 1;
      if (!existing.years.includes(q.year)) {
        existing.years.push(q.year);
      }
      if (q.subtopic && !existing.subtopics.includes(q.subtopic)) {
        existing.subtopics.push(q.subtopic);
      }
      existing.papers.push({ year: q.year, season: q.season, qNum: q.questionNumber });
      map.set(q.topic, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [questions]);

  const relatedQuestions = useMemo(() => {
    if (!selectedTopicQuestion) return [];
    return questions
      .filter(q => q.topic === selectedTopicQuestion.topic && q.id !== selectedTopicQuestion.id)
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [questions, selectedTopicQuestion]);

  const downloadWordReport = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Past Paper Analytics Report",
              heading: HeadingLevel.TITLE,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Total Questions Analyzed: ${questions.length}`,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Topic Frequency Analysis",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...topicAnalytics.flatMap(item => [
              new Paragraph({
                text: item.topic,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Total Frequency: ", bold: true }),
                  new TextRun(item.count.toString()),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Subtopics: ", bold: true }),
                  new TextRun(item.subtopics.join(", ") || "None identified"),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Appeared in Papers: ", bold: true }),
                  new TextRun(item.papers.map(p => `${p.year} ${p.season} (Q${p.qNum})`).join(", ")),
                ],
                spacing: { after: 200 },
              }),
            ]),
            new Paragraph({
              text: "Detailed Question List",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Year/Season", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Topic", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Subtopic", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Question", bold: true })] })] }),
                  ],
                }),
                ...questions.map(q => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(`${q.year} ${q.season}`)] }),
                    new TableCell({ children: [new Paragraph(q.topic)] }),
                    new TableCell({ children: [new Paragraph(q.subtopic || "-")] }),
                    new TableCell({ children: [new Paragraph(q.content)] }),
                  ],
                })),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Past_Paper_Analytics_Report.docx");
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <BookOpen size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
              Past Paper Tracker
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search topics, subtopics..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-full text-sm transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <label className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95">
              <Plus size={18} />
              <span>Upload Paper</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,application/pdf" 
                multiple
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs and Download */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <List size={18} />
              Questions ({questions.length})
            </button>
            <button 
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "analytics" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BarChart3 size={18} />
              Analytics
            </button>
          </div>

          {questions.length > 0 && (
            <button 
              onClick={downloadWordReport}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <Download size={18} />
              Download Report (.docx)
            </button>
          )}
        </div>

        {isProcessing && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4 animate-pulse">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <div>
              <p className="font-semibold text-blue-900">Processing Paper...</p>
              <p className="text-sm text-blue-700">Gemini is extracting questions, topics, and subtopics. This may take a few seconds.</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "list" ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {questions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <FileUp size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">No questions yet</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    Upload a past paper image or PDF to start tracking topics and questions.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Recent Questions</h2>
                    <button 
                      onClick={clearAll}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                    >
                      <Trash2 size={16} />
                      Clear All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuestions.map((q) => (
                      <motion.div 
                        layout
                        key={q.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedTopicQuestion(q)}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col cursor-pointer"
                      >
                        <div className="p-5 flex-1">
                          <div className="flex flex-wrap items-start gap-2 mb-4">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">
                              {q.topic}
                            </span>
                            {q.subtopic && (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase tracking-wider">
                                {q.subtopic}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-slate-700 text-sm line-clamp-4 mb-6 leading-relaxed">
                            {q.content}
                          </p>
                        </div>

                        <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase">
                              <Calendar size={12} />
                              {q.year}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase">
                              <Sun size={12} />
                              {q.season}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase">
                              <Hash size={12} />
                              Q{q.questionNumber}{q.part && ` (${q.part})`}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestion(q.id);
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="text-blue-600" size={20} />
                    Topic Frequency
                  </h3>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicAnalytics.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="topic" 
                          type="category" 
                          width={100} 
                          tick={{ fontSize: 12, fontWeight: 500, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                          {topicAnalytics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Detailed Stats List */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Detailed Breakdown</h3>
                  <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {topicAnalytics.map((item, idx) => (
                      <div key={item.topic} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                              {idx + 1}
                            </div>
                            <p className="text-sm font-bold text-slate-800">{item.topic}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {item.count} Qs
                          </span>
                        </div>
                        
                        <div className="pl-8 space-y-2">
                          <div className="flex items-start gap-2">
                            <Layers size={12} className="text-slate-400 mt-1 shrink-0" />
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              <span className="font-bold text-slate-700">Subtopics:</span> {item.subtopics.join(", ") || "None"}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <FileText size={12} className="text-slate-400 mt-1 shrink-0" />
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              <span className="font-bold text-slate-700">Papers:</span> {item.papers.map(p => `${p.year} ${p.season}`).join(", ")}
                            </p>
                          </div>
                        </div>
                        {idx < topicAnalytics.length - 1 && <div className="border-b border-slate-100 pt-2" />}
                      </div>
                    ))}
                    {topicAnalytics.length === 0 && (
                      <p className="text-center text-slate-400 py-10 text-sm">No data available yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights Section */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl">
                <div className="max-w-3xl">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    Smart Insights
                  </h3>
                  <p className="text-blue-100 leading-relaxed mb-6">
                    Based on the {questions.length} questions analyzed, 
                    <span className="font-bold text-white"> {topicAnalytics[0]?.topic || "..."} </span> 
                    is the most frequent topic, appearing in {topicAnalytics[0]?.years.length || 0} different years.
                    The most common subtopics identified include: <span className="font-bold text-white"> {topicAnalytics[0]?.subtopics.slice(0, 3).join(", ") || "..."} </span>.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                      <p className="text-xs text-blue-200 uppercase font-bold mb-1">Total Topics</p>
                      <p className="text-xl font-bold">{topicAnalytics.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                      <p className="text-xs text-blue-200 uppercase font-bold mb-1">Avg. Qs per Year</p>
                      <p className="text-xl font-bold">
                        {questions.length > 0 ? (questions.length / new Set(questions.map(q => q.year)).size).toFixed(1) : 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Topic Detail Modal */}
        <AnimatePresence>
          {selectedTopicQuestion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTopicQuestion(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedTopicQuestion.topic}</h3>
                    <p className="text-sm text-slate-500">Related questions from previous papers</p>
                  </div>
                  <button 
                    onClick={() => setSelectedTopicQuestion(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="rotate-45" size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                  {/* Current Question */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded">Current Selection</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">{selectedTopicQuestion.year} {selectedTopicQuestion.season} (Q{selectedTopicQuestion.questionNumber})</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedTopicQuestion.content}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <History size={16} className="text-blue-600" />
                      Previous Appearances ({relatedQuestions.length})
                    </h4>
                    
                    {relatedQuestions.length === 0 ? (
                      <p className="text-center py-8 text-slate-400 text-sm italic">No other questions found for this topic.</p>
                    ) : (
                      <div className="space-y-4">
                        {relatedQuestions.map(rq => (
                          <div key={rq.id} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-800">{rq.year} {rq.season}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Question {rq.questionNumber}{rq.part && ` (${rq.part})`}</span>
                              </div>
                              {rq.subtopic && (
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{rq.subtopic}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-800 transition-colors">{rq.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <BookOpen size={20} />
            <span className="text-sm font-bold">Past Paper Tracker</span>
          </div>
          <p className="text-slate-400 text-sm">
            Powered by Gemini AI for smart content extraction.
          </p>
        </div>
      </footer>
    </div>
  );
}
