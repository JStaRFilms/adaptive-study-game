# JStar Study

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/landing-page-preview.gif)

A study tool that turns notes, documents and YouTube videos into quizzes, reading canvases and exam practice. It uses GPT-6 Luna through OpenRouter for ordinary AI requests and Gemini for video, audio and Google-grounded search. With a personal AI tutor to guide you, diverse question types to challenge you, and a powerful analytics engine to track your progress, this app is designed to help you learn faster and more effectively.

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img alt="Google Gemini" src="https://img.shields.io/badge/Google%20Gemini-8E44AD?style=for-the-badge&logo=google-gemini&logoColor=white"/>
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
</p>

## Table of Contents
- [✨ Key Features](#-key-features)
- [🚀 Project Philosophy](#-project-philosophy)
- [🛠️ How It Works](#️-how-it-works)
- [💻 Tech Stack](#-tech-stack)
- [🔧 Getting Started](#-getting-started)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)


## ✨ Key Features

- **Your Personal AI Tutor**: Go beyond simple quizzes with a suite of intelligent tools.
  - **Interactive Study Coach**: Stuck on a question? Slide out the chat panel to get hints, explanations, or deeper insights. The AI has full context of your notes and the current quiz.
  - **Personalized Feedback**: After each session, the AI analyzes your performance, identifies strengths & weaknesses, and provides actionable recommendations.
  - **One-Click Focused Quizzes**: Instantly generate a new quiz that targets the topics you struggled with the most.
  - **Comprehensive Stats**: Track your progress over time with a detailed analytics dashboard.
- **AI-Generated Visual Reading Canvas**: A revolutionary way to engage with your study materials.
  - **Explore Visually**: Transforms your notes into a dynamic, mind-map style interface of interconnected concepts.
  - **Dynamic Expansion**: Click to expand any concept, and watch as the AI generates new, detailed sub-topics in real-time.
  - **Intelligent Reflow Animations**: Surrounding blocks fluidly and gracefully animate to make space for new information, creating a seamless exploratory experience.
  - **Stateful & Persistent**: Your canvas layout is saved automatically. Expanded concepts will remain expanded, allowing you to pick up your study session right where you left off.
  - **Fully Responsive**: Adapts from a multi-column grid on desktop to a clean, single-column view on mobile devices.
- **AI-Powered Quiz Generation**: Automatically creates high-quality quizzes from your study materials.
- **Multimodal Input**: Generate quizzes from a mix of sources:
  - Pasted text notes
  - Documents (`.txt`, `.pdf`, `.docx`, `.md`, `.pptx`)
  - Spreadsheets (`.xlsx`, `.csv`)
  - Images (`.png`, `.jpg`, `.webp`)
  - Audio Files (`.mp3`, `.m4a`, `.wav`, etc.)
  - **YouTube videos** via URL.
- **Diverse Question Types**: Keep study sessions fresh with a variety of formats:
  - Multiple Choice
  - True/False
  - Fill-in-the-Blank (with AI-powered fuzzy matching)
  - Open-Ended
  - **Matching**: Drag and drop to match concepts with definitions.
  - **Sequence**: Drag and drop to arrange steps in chronological order.
- **Advanced Study Modes**: Choose your challenge.
  - **Practice & Review**: Classic timed and untimed quiz modes with gamified scoring.
  - **Exam Mode**: A simulated exam with open-ended questions. The AI grades your typed answers and even **uploaded images of handwritten work**.
  - **Spaced Repetition (SRS)**: An intelligent review mode that schedules questions based on your past performance, helping you commit information to long-term memory.
- **AI Exam Prediction**: A powerful "detective mode" where the AI acts as your teacher to predict likely exam questions based on your notes, past exams, and teacher's style.
- **Flexible Knowledge Sources**: Choose how the AI generates questions: from your notes only, supplemented by AI knowledge, or using Google Search for the latest information.
- **Data Portability & Persistence**: Your data stays with you.
  - **Full Data Export/Import**: Download all study sets, quiz history, and progress to a single JSON file for easy backup or transfer between devices.
  - **Local-First Storage**: All data is stored privately and securely in your browser's IndexedDB, ensuring offline access to your materials.

## 🚀 Project Philosophy
> This project is built on a few core principles:
> 1.  **AI-First Experience**: Luna handles most AI requests, with Gemini retained for video, audio and Google-grounded search.
> 2.  **Performance-Oriented Architecture**: Employs advanced patterns like **"Parallel Pipelines"** and **"Guided Generation"** to break down complex AI tasks into smaller, simultaneous jobs. This significantly reduces latency for features like quiz and canvas generation while ensuring reliable, well-structured output.
> 3.  **Development**: Vite builds the React UI. Vercel Functions handle AI requests without exposing API keys in the browser.
> 4.  **Local Data**: Study sets and history stay in browser IndexedDB. AI requests send the materials needed for each task through a Vercel Function to OpenRouter or Gemini.


## 🛠️ How It Works

1.  **Create a Study Set**: Add your notes by pasting text, uploading files (`.pdf`, `.docx`, images, audio, etc.), or adding YouTube URLs. Your sets are saved for later.
2.  **Choose Your Path**:
    - **Read**: Generate a visual **Reading Canvas** from your notes. This creates a mind-map of interconnected concepts that you can explore interactively. Expand topics to get deeper insights, and watch the canvas intelligently reflow around your focus.
    - **Study**: The app analyzes your notes, identifies key topics, and lets you configure a quiz (Practice, Review, or Exam Mode) with various question types, including multiple choice, matching, and sequence.
    - **Spaced Repetition**: Start a review session that intelligently quizzes you on items you're close to forgetting.
    - **Predict**: Enter the Exam Prediction mode. Provide details about your teacher's style, upload past exams or quizzes, and let the AI generate a list of probable exam questions.
    - **Stats**: View your overall progress and topic performance on the statistics dashboard.
3.  **Take the Quiz**: Play through the generated quiz, score points, and actively learn the material. For exams, type your answers or upload photos of your work.
4.  **Get AI-Powered Results**: After an exam, the AI evaluates your answers, providing scores and constructive feedback. For practice quizzes, see a summary of your score and accuracy.
5.  **Review and Improve**: Dive into a detailed review of your answers. The **AI Study Coach** will give you personalized feedback on your strengths and weaknesses. From here, you can retake the same quiz, return to your sets, or instantly launch a new, focused quiz tailored to the topics you struggled with.


## 💻 Tech Stack
The frontend is built with React, TypeScript and Vite. Vercel Functions handle AI requests.

-   **Core Framework**: [React](https://react.dev/) (with Hooks) & [TypeScript](https://www.typescriptlang.org/) for a robust and type-safe UI.
-   **AI Engine**: [OpenRouter](https://openrouter.ai/) with `openai/gpt-6-luna`, plus [Gemini](https://ai.google.dev/) for video, audio and grounded search.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, responsive design system.
-   **Animation**: [Framer Motion](https://www.framer.com/motion/) for fluid, physics-based UI animations.
-   **Build**: Vite bundles the frontend. AI requests go to same-origin Vercel Functions.
-   **Client-Side File Processing**:
    -   [PDF.js](https://mozilla.github.io/pdf.js/) for parsing `.pdf` files.
    -   [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for extracting text from `.docx` files.
    -   [SheetJS](https://sheetjs.com/) for handling `.xlsx` and `.csv` spreadsheets.
-   **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb` library) for robust, persistent client-side storage.


## 🔧 Getting Started

The frontend needs its same-origin API handlers. Use the Vite dev server locally or deploy the Vite app with its Vercel Functions.

### Prerequisites

- Node.js and pnpm 10.33.2
- An OpenRouter key for `openai/gpt-6-luna`
- A Gemini key for YouTube videos, uploaded audio and the Google-grounded web-search quiz mode

### Configuration and data flow

Set `OPENROUTER_API_KEY` and `GEMINI_API_KEY` in ignored `.env.local` for local development and as server-only environment variables on Vercel. Do not use `VITE_` prefixes or paste keys into the browser. Older `API_KEY_POOL` and `API_KEY` variables are no longer used. Rotate any keys previously committed to Git.

The account implementation needs `DATABASE_URL_POOLED` (or `DATABASE_URL`), `BETTER_AUTH_URL` (the app origin), and a random `BETTER_AUTH_SECRET` of at least 32 characters. Better Auth's four tables and the two app tables in `server/sql/001_public_accounts.sql` were applied to the owner's confirmed empty Neon project and branch. The local email/password flow and concurrent quota admission passed against that branch; the temporary test user was removed. Keep database URLs and secrets in ignored local or server-only settings, never in Git.

Local `pnpm dev` offers email/password test accounts when `AUTH_DEV_PASSWORD_ENABLED=true` is set in `.env.local`, without Google credentials. Email verification and password recovery are unavailable, and Vercel disables this method entirely. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your own Google OAuth web client when ready; then authorize the exact app URL plus `/api/auth/callback/google`. The UI shows Google only after both values are present. Test how Google links to existing email/password accounts before using both methods with the same data.

The Vite UI keeps study sets and quiz history in a separate browser IndexedDB database per signed-in user. Existing anonymous browser data is not assigned to an account. AI requests go to `/api/ai` and `/api/chat` on the same origin; these endpoints require a session and configured daily user/global quotas before reaching OpenRouter or Gemini. The local test configuration uses `AI_DAILY_USER_UNITS=25`, `AI_DAILY_GLOBAL_UNITS=100` and `AI_MAX_OUTPUT_TOKENS=8192`; these are provisional, not approved public-launch limits. The server refuses AI calls if any limit is missing. Admission is atomic and charged even if a provider fails. A reading layout costs ten units and supports up to eight selected topics; streamed feedback costs three units, and quiz generation costs one unit for the whole quiz, not per question. Other requests cost one unit each. Video sources add one unit each per request, and a canvas custom prompt adds a separate topic-analysis request. Invalid over-limit canvas topic requests are rejected before admission. Units are a coarse allowance, **not** a currency-denominated spending ceiling. The output-token cap applies to OpenRouter and Gemini text generation, not the separate YouTube extraction request. Do not open public access without an independent provider spending cap and abuse controls.

### Running locally

1. Use pnpm 10.33.2 and run `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to ignored `.env.local` and fill the database URL, auth URL and auth secret. This machine already has local auth settings. Leave the Google fields empty to test email/password. Do not enable public AI access until the spending cap and abuse controls are ready.
3. Run `pnpm dev` and open the displayed Vite URL. Vite runs the auth, AI and chat handlers locally.
4. Run `pnpm test:local`, `pnpm exec tsc --noEmit` and `pnpm build`. Local tests use fake IndexedDB and never contact Neon or an AI provider.

A static file server or `pnpm preview` alone cannot serve `/api/auth/*`, `/api/ai` and `/api/chat`. On Vercel, `vercel.json` builds the Vite frontend into `dist` and the files under `api/` run as functions. The AI endpoints return 503 on Vercel unless you explicitly set server-only `AI_API_ENABLED=true`. No Vercel deployment or AI gate change was made. Keep public AI access off until Google login, a provider spend cap, abuse controls and launch approval are complete.

## 🗺️ Roadmap

Public-account launch requirements are in [docs/features/PublicAccounts.md](docs/features/PublicAccounts.md). Later agent tasks are in [docs/features/DeferredWork.md](docs/features/DeferredWork.md).

- [x] **Deeper Analysis**: Provide users with insights into their weak spots and suggest topics to focus on. (Implemented!)
- [x] **More Question Types**: Introduce matching and sequencing questions. (Implemented!)
- [ ] **Long-term Progress Tracking**: Track performance on specific topics across multiple quiz sessions to visualize improvement over time.
- [ ] **Enhanced Gamification**: Leaderboards, achievements, and shareable results.
- [ ] **Even More Question Types**: Introduce diagram labeling and other interactive formats.
- [ ] **Collaborative Study Sets**: Allow users to share their study sets with others.
- [ ] **Localization**: Translate the UI into multiple languages.


## 🤝 Contributing
Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue to discuss it. If you want to contribute code, please fork the repository and submit a pull request.