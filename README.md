# Past Paper Tracker & Analytics

An intelligent, full-stack application designed to help educators, students, and exam candidates systematically analyze past examination papers. Powered by **Gemini AI**, this tool automates the extraction, categorization, tracking, and evaluation of questions from past paper documents to uncover trend insights and high-yield focus areas.

---

## 🚀 Concept & Core Features

1. **AI-Powered OCR & Intelligent Parsing**
   - Upload scanned images or PDFs of past paper exams.
   - The integrated server-side **Gemini-2.5-flash** engine processes, reads, and extracts individual questions in real-time.
   - Automatically parses structural descriptors: **Year**, **Season** (e.g., Summer, Winter, Spring, Autumn), **Question Number**, specific **Part** (e.g., a, b, i, ii), **Main Topic**, and granular **Subtopic**.

2. **Interactive Topic Frequency & Trend Analytics**
   - Automatically cross-references extracted content to detect frequency.
   - Features an interactive **Recharts** vertical bar chart showing frequency counts across top topics.
   - Highlights detailed breakdown components: which subtopics appeared where, and in which specific papers (Year/Season/Question #) each concept was asked.
   - Serves an automated **Smart Insights** section pointing out the highest-yielding topics and general volume metrics.

3. **Historical Context Modal**
   - Clicking on any extracted question card immediately opens a deep-dive modal overlay.
   - View the current question side-by-side with **every previous occurrence** of the same topic in prior years.
   - Instantly spot how a certain subject is being re-formulated or repeatedly tested in different exam iterations.

4. **Professional Microsoft Word (.docx) Report Generation**
   - Seamlessly export your entire parsed question ledger and analysis dashboards.
   - Downloads a fully compliant Microsoft Word document styled with tabular breakdowns, bolded headers, and clear topic group descriptions for robust offline printing and offline study packs.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React (v19), Tailwind CSS, Framer Motion (for modal animations), Recharts (for analytics plotting).
- **Backend & Middleware**: Node.js, Express, tsx, esbuild bundling.
- **AI Stack**: Google GenAI SDK (`@google/genai` utilizing the `gemini-2.5-flash` model via full-stack Express proxy routes for zero-exposure client API key safety).
- **Export Utility**: Docx package (`docx` and `file-saver` for client-side blob compiling).

---

## 📂 Project Structure

```bash
├── src/
│   ├── App.tsx          # Master UI Dashboard & State Manager
│   ├── main.tsx         # Virtual DOM Entry Point
│   ├── index.css        # Tailwind Global Styles Setup
│   ├── types.ts         # TypeScript Shared Schemas (Questions, Analytics)
│   └── lib/
│       └── gemini.ts    # Frontend HTTP proxy client for Express AI pipeline
├── server.ts            # Secure Express Backend Route Orchestrator / Gemini Bridge
├── package.json         # Module Dependency Ledger / Dev Scripting
├── vite.config.ts       # Frontend Compilation Configuration
└── tsconfig.json        # TypeScript Core Transpiling Directives
```

---

## ⚙️ Development & Quickstart

### Prerequisites
Make sure you have an active Gemini API Key. Populate your local `.env` environment variables using `.env.example`:

```env
GEMINI_API_KEY="your_api_key_here"
```

### Script Directory

To boot up the application, execute:

```bash
# 1. Install Workspace packages
npm install

# 2. Boot both the Vite compiler & Express Server proxy
npm run dev

# 3. Compiles production assets & bundles backend server mapping CJS via esbuild
npm run build

# 4. Production Host
npm run start
```
