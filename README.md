
# Adaptive Study Game

![App Screenshot](https://storage.googleapis.com/project-screenshots/adaptive-study-game/app-preview.png)

An intelligent study tool that uses the Google Gemini API to transform your notes, documents, and images into an interactive, gamified quiz. Learn faster and more effectively by turning passive study material into an engaging challenge.

---

## ✨ Key Features

- **AI-Powered Quiz Generation**: Automatically creates high-quality quizzes from your study materials, leveraging the power of the Gemini API.
- **Multimodal Input**: Generate quizzes from a mix of sources:
  - Pasted text notes
  - Uploaded text files (`.txt`)
  - PDF documents (`.pdf`)
  - Images (`.png`, `.jpg`, `.webp`)
- **Flexible Knowledge Sources**: Choose how the AI generates questions:
  - **Notes Only**: Strictly uses the materials you provide.
  - **Notes + AI Knowledge**: Supplements your notes with the AI's vast general knowledge for a more comprehensive quiz.
  - **Notes + Web Search**: Uses Google Search to find the latest information on your topic and includes source links with the results.
- **Multiple Question Types**: Generates a mix of question formats to keep you engaged, including:
  - Multiple Choice
  - True/False
  - Fill-in-the-Blank
- **Flexible Answer Validation**: For fill-in-the-blank questions, the AI is prompted to accept common synonyms, typos, and misspellings, so you don't get marked incorrect for a minor mistake.
- **Gamified Learning**:
  - **Scoring System**: Earn points for correct answers.
  - **Streak Bonuses**: Build a streak of correct answers for bonus points.
  - **Speed Bonuses**: Answer quickly in Practice Mode for extra points.
- **Two Distinct Study Modes**:
  - **Practice Mode**: A timed challenge where you race against the clock for the highest score.
  - **Review Mode**: A relaxed, untimed mode perfect for self-paced learning and reinforcing concepts without pressure.
- **Persistent Study Sets**: Create and manage multiple "Study Sets". Your notes are automatically saved in your browser's local storage for easy access later.
- **Detailed Feedback & Review**: After each quiz, you can access a comprehensive review screen showing:
  - Each question and your answer.
  - The correct answer.
  - A clear explanation for every question.
- **Retake or Start Anew**: From the review screen, choose to retake the exact same quiz to reinforce weak spots or generate a brand new quiz from your notes.
- **Responsive Design**: A clean, modern, and fully responsive UI built with Tailwind CSS, ensuring a great experience on any device.

---

## 🚀 How It Works

1.  **Create a Study Set**: On the main screen, create a new study set. Give it a name and paste your notes. This serves as the text base for your quiz.
2.  **Configure Your Quiz**: Choose a study set and configure your quiz settings:
    -   **Add Files (Optional)**: Supplement your text notes by uploading images or PDF documents.
    -   **Number of Questions**: From 5 to 50.
    -   **Knowledge Source**: Choose whether to use your notes only, supplement with AI knowledge, or use the web.
    -   **Study Mode**: Choose between the timed "Practice" mode or the untimed "Review" mode.
3.  **Start Studying**: The app processes your files and sends your materials to the Gemini API, which generates a custom quiz based on your configuration.
4.  **Take the Quiz**: Answer the questions. The interface provides immediate feedback and tracks your score and streaks in real-time.
5.  **View Results**: Once the quiz is complete, you'll see a results screen with your final score and a performance summary. If you used web search, you'll see a list of sources.
6.  **Review and Reinforce**: Click "Review Answers" to see a detailed breakdown of your performance. From here, you can either "Retake Same Quiz" or "Create New Quiz".

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) (with Hooks) & [TypeScript](https://www.typescriptlang.org/)
- **AI Model**: [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`)
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
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
│   ├── ResultsScreen.tsx    # Screen displaying final quiz score
│   ├── ReviewScreen.tsx     # Screen for detailed answer review
│   ├── SetupScreen.tsx      # Initial screen for creating sets and configuring quizzes
│   └── StudyScreen.tsx      # The main interactive quiz screen
├── hooks/
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
