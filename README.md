# Adaptive Study Game

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/landing-page-preview.gif)

An intelligent study tool that uses the Google Gemini API to transform your notes, documents, and images into an interactive, gamified quiz. It provides a dynamic and engaging experience from the moment you land on the page, helping you learn faster and more effectively.

---

## ✨ Key Features

- **AI-Powered Quiz Generation**: Automatically creates high-quality quizzes from your study materials, leveraging the power of the Gemini API.
- **Multimodal Input**: Generate quizzes from a mix of sources:
  - Pasted text notes
  - Documents (`.txt`, `.pdf`, `.docx`, `.md`)
  - Spreadsheets (`.xlsx`, `.csv`)
  - Images (`.png`, `.jpg`, `.webp`)
  - Audio Files (`.mp3`, `.m4a`, `.wav`, etc.) - The AI transcribes the content for you.
- **Flexible Knowledge Sources**: Choose how the AI generates questions:
  - **Notes Only**: Strictly uses the materials you provide.
  - **Notes + AI Knowledge**: Supplements your notes with the AI's vast general knowledge for a more comprehensive quiz.
  - **Notes + Web Search**: Uses Google Search to find the latest information on your topic and includes source links with the results.
- **Multiple Question Types**: Generates a mix of question formats to keep you engaged, including Multiple Choice, True/False, and Fill-in-the-Blank.
- **Flexible Answer Validation**: For fill-in-the-blank questions, the AI is prompted to accept common synonyms, typos, and misspellings, so you don't get marked incorrect for a minor mistake.
- **Gamified Learning**: Earn points for correct answers, build streaks for bonuses, and answer quickly in Practice Mode for extra points.
- **Two Distinct Study Modes**:
  - **Practice Mode**: A timed challenge where you race against the clock for the highest score.
  - **Review Mode**: A relaxed, untimed mode perfect for self-paced learning.
- **Enhanced Review Mode**: In addition to being untimed, Review Mode now features **back-and-forth navigation**, allowing you to move freely between questions to solidify your understanding.
- **Persistent Study Sets**: Create, edit, and save study sets. Your notes are saved in your browser's local storage for easy access anytime.
- **Quiz History & Progress Tracking**: Every quiz session is automatically saved. Go back and review past attempts for any study set to track your scores, accuracy, and improvement over time.
- **Detailed Feedback & Review**: After each quiz, access a comprehensive review screen showing each question, your answer, the correct answer, and a clear explanation.
- **Retake or Start Anew**: From the review screen, choose to retake the exact same quiz to reinforce weak spots or generate a brand new quiz.
- **Dynamic & Interactive Landing Page**: A visually engaging entry point with animations and an interactive text area to seamlessly start your first study session.
- **Responsive Design**: A clean, modern, and fully responsive UI built with Tailwind CSS, ensuring a great experience on any device.

---

## 🚀 How It Works

1.  **Provide Your Material**: Paste notes directly on the landing page, or create a Study Set by uploading files (`.pdf`, `.docx`, `.md`, images, audio, etc.).
2.  **Manage Your Library**: Your study sets are saved in the browser. From the list, you can edit, delete, start a new quiz, or **view the quiz history** for any set.
3.  **Configure Your Quiz**: Before starting, choose the number of questions, knowledge source (Notes Only, AI-supplemented, Web Search), and study mode (timed Practice vs. untimed Review).
4.  **Take the Quiz**: The app processes your materials and uses the Gemini API to generate a custom quiz. Answer questions and get real-time feedback on your score and streaks.
5.  **View Results & Sources**: After finishing, see a summary of your score and accuracy. If you used web search, all sources are cited.
6.  **Review and Reinforce**: Dive into a detailed review of your answers. From here, you can retake the same quiz to improve, or start a new one.

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

---

## 📂 Project Structure

```
/
├── components/
│   ├── common/              # Reusable UI components (ProgressBar, etc.)
│   ├── LandingPage.tsx      # The animated, interactive landing page
│   ├── ResultsScreen.tsx    # Screen displaying final quiz score
│   ├── ReviewScreen.tsx     # Screen for detailed answer review
│   ├── SetupScreen.tsx      # Initial screen for creating sets and configuring quizzes
│   └── StudyScreen.tsx      # The main interactive quiz screen
├── hooks/
│   ├── useQuizHistory.ts    # Custom hook for managing quiz history
│   └── useStudySets.ts      # Custom hook for managing study sets in localStorage
├── services/
│   └── geminiService.ts     # Handles all API calls to Google Gemini
├── App.tsx                  # Main app component, manages state and views
├── index.html               # Main HTML entry point, loads Tailwind and scripts
├── index.tsx                # React root renderer
├── metadata.json            # Project metadata
├── types.ts                 # All TypeScript type and interface definitions
└── README.md                # You are here!
```

---

## 📄 License

This project is licensed under the MIT License.