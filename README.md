# Adaptive Study Game

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/landing-page-preview.gif)

An intelligent study tool that uses the Google Gemini API to transform your notes, documents, and even audio files into an interactive, gamified quiz. It provides a dynamic and engaging experience from the moment you land on the page, helping you learn faster and more effectively.

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

- **AI-Powered Quiz Generation**: Automatically creates high-quality quizzes from your study materials.
- **Multimodal Input**: Generate quizzes from a mix of sources:
  - Pasted text notes
  - Documents (`.txt`, `.pdf`, `.docx`, `.md`)
  - Spreadsheets (`.xlsx`, `.csv`)
  - Images (`.png`, `.jpg`, `.webp`)
  - Audio Files (`.mp3`, `.m4a`, `.wav`, etc.) - The AI transcribes the content for you.
- **Flexible Knowledge Sources**: Choose how the AI generates questions:
  - **Notes Only**: Strictly uses the materials you provide.
  - **Notes + AI Knowledge**: Supplements your notes with the AI's vast general knowledge.
  - **Notes + Web Search**: Uses Google Search to find the latest information on your topic.
- **AI Study Coach Chat**: While taking a quiz, slide out a chat panel to ask the AI for hints or explanations about the current question. The AI has context on your notes and the quiz.
- **AI Study Coach Feedback**: After each quiz, receive personalized feedback from an AI coach that analyzes your performance to identify your strengths and weaknesses.
- **Actionable Recommendations**: The AI coach provides clear next steps, including a one-click button to instantly generate a new, focused practice quiz on the topics you need to improve on.
- **Multiple Question & Study Modes**:
  - **Practice Mode**: Timed multiple choice, true/false, and fill-in-the-blank questions.
  - **Review Mode**: Untimed, self-paced version of Practice Mode.
  - **Exam Mode**: A simulated exam with open-ended questions requiring long-form answers.
- **AI-Powered Exam Grading**: In Exam Mode, submit typed answers and **upload images of handwritten work**. The AI grades your responses against a rubric, providing a score and detailed feedback for each question.
- **AI Exam Prediction**: A powerful "detective mode" where the AI acts as your teacher to predict likely exam questions. Prime the AI with your teacher's persona, past exams, and other materials for a highly tailored study guide.
- **Gamified Learning**: A redesigned quiz interface with points, streaks, and speed bonuses to make studying engaging.
- **Persistent Study Sets**: Create, edit, and save study sets. Your notes and associated files are saved in your browser's local storage.
- **Quiz History & Progress Tracking**: Every quiz session is automatically saved. Review past attempts to track your scores, accuracy, and improvement over time.
- **Detailed Answer Review**: After each quiz, access a comprehensive review screen showing each question, your answer, the correct answer, and a clear explanation. The AI Study Coach report is also available here.


## 🚀 Project Philosophy
> This project is built on a few core principles:
> 1.  **AI-First Experience**: Leveraging the powerful, multimodal `gemini-2.5-flash` model to provide intelligent features that feel like a magic.
> 2.  **Frictionless Development**: By using browser-native ES Modules and a CDN (`esm.sh`), the project avoids complex build steps. There's no `npm install`, no bundler configuration—just modern web technologies.
> 3.  **User-Centric Design**: The entire experience, from the landing page to the quiz review screen, is designed to be intuitive, engaging, and effective for learning. Data is stored locally in the user's browser, ensuring privacy and persistence without a backend.


## 🛠️ How It Works

1.  **Create a Study Set**: Add your notes by pasting text or uploading files (`.pdf`, `.docx`, images, audio, etc.). Your sets are saved for later.
2.  **Choose Your Path**:
    - **Study**: The app analyzes your notes, identifies key topics, and lets you configure a quiz (Practice, Review, or Exam Mode).
    - **Predict**: Enter the Exam Prediction mode. Provide details about your teacher's style, upload past exams or quizzes, and let the AI generate a list of probable exam questions to guide your studying.
3.  **Take the Quiz**: Play through the generated quiz, score points, and actively learn the material. For exams, type your answers or upload photos of your work.
4.  **Get AI-Powered Results**: After an exam, the AI evaluates your answers, providing scores and constructive feedback. For practice quizzes, see a summary of your score and accuracy.
5.  **Review and Improve**: Dive into a detailed review of your answers. The **AI Study Coach** will give you personalized feedback on your strengths and weaknesses. From here, you can retake the same quiz, return to your sets, or instantly launch a new, focused quiz tailored to the topics you struggled with.


## 💻 Tech Stack
This app is built with a modern, build-free stack, focusing on performance and developer experience.

-   **Core Framework**: [React](https://react.dev/) (with Hooks) & [TypeScript](https://www.typescriptlang.org/) for a robust and type-safe UI.
-   **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`) for all intelligent features, including quiz generation, exam grading, and prediction.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first, responsive design system.
-   **Module System**: Browser-native ES Modules loaded directly from the [esm.sh](https://esm.sh/) CDN. This eliminates the need for local `node_modules` or a bundling step.
-   **Client-Side File Processing**:
    -   [PDF.js](https://mozilla.github.io/pdf.js/) for parsing `.pdf` files.
    -   [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for extracting text from `.docx` files.
    -   [SheetJS](https://sheetjs.com/) for handling `.xlsx` and `.csv` spreadsheets.


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

- [x] **Deeper Analysis**: Provide users with insights into their weak spots and suggest topics to focus on. (Initial version implemented!)
- [ ] **Long-term Progress Tracking**: Track performance on specific topics across multiple quiz sessions to visualize improvement over time.
- [ ] **Enhanced Gamification**: Leaderboards, achievements, and shareable results.
- [ ] **More Question Types**: Introduce diagram labeling, matching, and sequencing questions.
- [ ] **Collaborative Study Sets**: Allow users to share their study sets with others.
- [ ] **Localization**: Translate the UI into multiple languages.


## 🤝 Contributing
Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue to discuss it. If you want to contribute code, please fork the repository and submit a pull request.