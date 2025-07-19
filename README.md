# Adaptive Study Game

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/landing-page-preview.gif)

An intelligent study tool that uses the Google Gemini API to transform your notes, documents, and images into an interactive, gamified quiz. It provides a dynamic and engaging experience from the moment you land on the page, helping you learn faster and more effectively.

---

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
- **Multiple Question & Study Modes**:
  - **Practice Mode**: Timed multiple choice, true/false, and fill-in-the-blank questions.
  - **Review Mode**: Untimed, self-paced version of Practice Mode.
  - **Exam Mode**: A simulated exam with open-ended questions requiring long-form answers.
- **AI-Powered Exam Grading**: In Exam Mode, submit typed answers and **upload images of handwritten work**. The AI grades your responses against a rubric, providing a score and detailed feedback for each question.
- **AI Exam Prediction**: A powerful tool where the AI acts as your teacher to predict likely exam questions. Prime the AI with your teacher's persona, past exams, and other materials for a highly tailored study guide.
- **Gamified Learning**: Earn points, build streaks, and get speed bonuses in Practice Mode.
- **Persistent Study Sets**: Create, edit, and save study sets. Your notes and associated files are saved in your browser's local storage.
- **Quiz History & Progress Tracking**: Every quiz session is automatically saved. Review past attempts to track your scores, accuracy, and improvement over time.
- **Detailed Feedback & Review**: After each quiz, access a comprehensive review screen showing each question, your answer, the correct answer, and a clear explanation or AI-generated feedback.
- **Responsive Design**: A clean, modern, and fully responsive UI built with Tailwind CSS.

---

## 🚀 How It Works

1.  **Create a Study Set**: Add your notes by pasting text or uploading files (`.pdf`, `.docx`, images, audio, etc.). Your sets are saved for later.
2.  **Choose Your Path**:
    - **Study**: The app analyzes your notes, identifies key topics, and lets you configure a quiz (Practice, Review, or Exam Mode).
    - **Predict**: Enter the Exam Prediction mode. Provide details about your teacher's style, upload past exams or quizzes, and let the AI generate a list of probable exam questions to guide your studying.
3.  **Take the Quiz**: Play through the generated quiz, score points, and actively learn the material. For exams, type your answers or upload photos of your work.
4.  **Get AI-Graded Results**: After an exam, the AI evaluates your answers, providing scores and constructive feedback. For practice quizzes, see a summary of your score and accuracy.
5.  **Review and Reinforce**: Dive into a detailed review of your answers. From here, you can retake the same quiz or start a new one.

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) (with Hooks) & [TypeScript](https://www.typescriptlang.org/)
- **AI Model**: [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`)
- **File Processing**:
    - [PDF.js](https://mozilla.github.io/pdf.js/) for `.pdf`
    - [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for `.docx`
    - [SheetJS](https://sheetjs.com/) for `.xlsx` and `.csv`
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Module Loading**: Browser-native ES Modules via [esm.sh](https://esm.sh/) CDN for a build-free development setup.

---

## 🔧 Getting Started

This application is designed to run in a web-based development environment that can serve static files and provide environment variables.

### Prerequisites

- A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
- A Google Gemini API Key.

### Configuration

The application requires a Google Gemini API key to function. This key must be available as an environment variable named `API_KEY`.

The application's code (`services/geminiService.ts`) expects to access the key via `process.env.API_KEY`. Please ensure this environment variable is correctly configured in your deployment or development environment.

**Note**: The API key is not to be hard-coded into the application. The app is built with the assumption that the execution environment securely provides this key.

### Running the Application

1. Ensure the `API_KEY` environment variable is set.
2. Serve the `index.html` file from the root of the project directory.
3. Open the served URL in your web browser. The application will initialize and be ready to use.
