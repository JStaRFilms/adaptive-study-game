# Adaptive Study Game

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/landing-page-preview.gif)

An intelligent study tool that uses the Google Gemini API to transform your notes, documents, and even YouTube videos into an interactive, gamified quest for knowledge. With a personal AI tutor to guide you, diverse question types to challenge you, and a powerful analytics engine to track your progress, this app is designed to help you learn faster and more effectively.

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
> 1.  **AI-First Experience**: Leveraging the powerful Gemini family of models, using `gemini-2.5-flash` for fast, real-time interactions and `gemini-2.5-pro` for high-quality analysis and generation tasks.
> 2.  **Performance-Oriented Architecture**: Employs advanced patterns like **"Parallel Pipelines"** and **"Guided Generation"** to break down complex AI tasks into smaller, simultaneous jobs. This significantly reduces latency for features like quiz and canvas generation while ensuring reliable, well-structured output.
> 3.  **Frictionless Development**: By using browser-native ES Modules and a CDN (`esm.sh`), the project avoids complex build steps. There's no `npm install`, no bundler configuration—just modern web technologies.
> 4.  **User-Centric Design**: The entire experience is designed to be intuitive, engaging, and effective for learning. Data is stored locally in the user's browser, ensuring privacy and persistence without a backend.


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
This app is built with a modern, build-free stack, focusing on performance and developer experience.

-   **Core Framework**: [React](https://react.dev/) (with Hooks) & [TypeScript](https://www.typescriptlang.org/) for a robust and type-safe UI.
-   **AI Engine**: [Google Gemini API](https://ai.google.dev/) using a suite of models (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`) for intelligent features.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, responsive design system.
-   **Animation**: [Framer Motion](https://www.framer.com/motion/) for fluid, physics-based UI animations.
-   **Module System**: Browser-native ES Modules loaded directly from the [esm.sh](https://esm.sh/) CDN. This eliminates the need for local `node_modules` or a bundling step.
-   **Client-Side File Processing**:
    -   [PDF.js](https://mozilla.github.io/pdf.js/) for parsing `.pdf` files.
    -   [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for extracting text from `.docx` files.
    -   [SheetJS](https://sheetjs.com/) for handling `.xlsx` and `.csv` spreadsheets.
-   **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb` library) for robust, persistent client-side storage.


## 🔧 Getting Started

This application is designed to run in a web-based development environment that can serve static files and provide environment variables.

### Prerequisites

- A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
- A Google Gemini API Key.

### Configuration

The application requires a Google Gemini API key to function. The key(s) must be available as an environment variable. The app checks for variables in the following order of precedence:

1.  **`API_KEY_POOL`**: For one or more keys, comma-separated. **This is the recommended method** for enabling load balancing and failover.
2.  **`API_KEY`**: A fallback for a single key, supported for backward compatibility.
3.  **`GEMINI_API_KEY`**: A final fallback, primarily for compatibility with certain development environments (like Vite configs that expose this variable).

#### Recommended Method (for one or more keys)

Use the `API_KEY_POOL` environment variable.

**Example with multiple keys:**
`API_KEY_POOL="key_one,key_two,key_three"`

**Example with a single key:**
`API_KEY_POOL="my_only_key"`

#### Fallback Methods (for a single key)

If `API_KEY_POOL` is not set, the app will look for `API_KEY` or `GEMINI_API_KEY`.

**Example:**
`API_KEY="my_single_key"`

or

`GEMINI_API_KEY="my_single_key"`

**Note**: It is best practice to use `API_KEY_POOL`. If `API_KEY_POOL` is set, all other key variables will be **ignored**.

### Running the Application

1. Ensure one of the API key environment variables is set (`API_KEY_POOL`, `API_KEY`, or `GEMINI_API_KEY`).
2. Serve the `index.html` file from the root of the project directory.
3. Open the served URL in your web browser. The application will initialize and be ready to use.

**Note**: This is a live web application under active development. If you are using a hosted version, please refresh the page periodically to access the latest features and improvements.

# vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY_POOL': JSON.stringify(env.API_KEY_POOL),
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

## 🗺️ Roadmap

- [x] **Deeper Analysis**: Provide users with insights into their weak spots and suggest topics to focus on. (Implemented!)
- [x] **More Question Types**: Introduce matching and sequencing questions. (Implemented!)
- [ ] **Long-term Progress Tracking**: Track performance on specific topics across multiple quiz sessions to visualize improvement over time.
- [ ] **Enhanced Gamification**: Leaderboards, achievements, and shareable results.
- [ ] **Even More Question Types**: Introduce diagram labeling and other interactive formats.
- [ ] **Collaborative Study Sets**: Allow users to share their study sets with others.
- [ ] **Localization**: Translate the UI into multiple languages.


## 🤝 Contributing
Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue to discuss it. If you want to contribute code, please fork the repository and submit a pull request.