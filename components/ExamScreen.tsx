
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Quiz, OpenEndedAnswer } from '../types';
import { markdownToHtml } from '../utils/textUtils';
import CircularTimer from './common/CircularTimer';

interface ExamScreenProps {
  quiz: Quiz;
  onFinish: (answers: OpenEndedAnswer[]) => void;
}

const toBase64 = (file: File): Promise<{ mimeType: string; data: string }> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const [mimeString, data] = result.split(',');
        const mimeType = mimeString.split(':')[1].split(';')[0];
        resolve({ mimeType, data });
    };
    reader.onerror = error => reject(error);
});

const ExamScreen: React.FC<ExamScreenProps> = ({ quiz, onFinish }) => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<OpenEndedAnswer[]>([]);
  
  const totalTime = useMemo(() => quiz.questions.length * 4 * 60, [quiz.questions.length]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Use a ref to track submission state to prevent race conditions from rapid events.
  const submissionStartedRef = useRef(false);

  useEffect(() => {
    setAnswers(quiz.questions.map(() => ({ text: '', images: [] })));
  }, [quiz.questions]);

  // Unified submission function. It can be called by the timer or a manual click.
  const finishExam = useCallback((options: { byTimer: boolean }) => {
    // Prevent the exam from being submitted multiple times.
    if (submissionStartedRef.current) {
      return;
    }
    submissionStartedRef.current = true;
    setIsSubmitting(true);

    if (options.byTimer) {
      alert("Time's up! The exam will now be submitted.");
    }
    
    onFinishRef.current(answersRef.current);
  }, []); // This callback is stable and uses refs to access current data.

  // Timer countdown logic.
  useEffect(() => {
    // Stop the timer if submission has already started.
    if (isSubmitting) return;

    if (timeLeft <= 0) {
      finishExam({ byTimer: true });
      return;
    }

    const timer = setInterval(() => {
        setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, finishExam]);


  const handleSubmit = useCallback(() => {
    if (window.confirm("Are you sure you want to submit your exam? You cannot make changes after submitting.")) {
        finishExam({ byTimer: false });
    }
  }, [finishExam]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newAnswers = [...answers];
    newAnswers[activeQuestionIndex].text = e.target.value;
    setAnswers(newAnswers);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert("Please upload a valid image file.");
        return;
      }
      try {
        const { mimeType, data } = await toBase64(file);
        const newAnswers = [...answers];
        newAnswers[activeQuestionIndex].images.push({ mimeType, data });
        setAnswers(newAnswers);
      } catch (error) {
        console.error("Error converting file to base64", error);
        alert("There was an error processing your image.");
      }
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (imageIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[activeQuestionIndex].images.splice(imageIndex, 1);
    setAnswers(newAnswers);
  };
  
  const currentAnswer = answers[activeQuestionIndex];
  const currentQuestion = quiz.questions[activeQuestionIndex];

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-[calc(100vh-80px)] animate-fade-in">
      <aside className="w-full md:w-1/4 bg-surface-dark p-4 rounded-lg flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-text-primary">Questions</h2>
        <nav className="flex-grow overflow-y-auto pr-2">
          <ul className="space-y-2">
            {quiz.questions.map((_, index) => {
              const isAnswered = answers[index]?.text.trim() || answers[index]?.images.length > 0;
              return (
                <li key={index}>
                  <button onClick={() => setActiveQuestionIndex(index)} disabled={isSubmitting} className={`w-full text-left p-3 rounded-md transition-all flex items-center gap-3 ${activeQuestionIndex === index ? 'bg-brand-primary text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'} disabled:cursor-not-allowed`}>
                    {isAnswered ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-correct flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> : <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex-shrink-0"></div>}
                    <span className="flex-grow">Question {index + 1}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="w-full md:w-3/4 bg-surface-dark p-6 rounded-lg flex flex-col">
        <header className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-gray-700 mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Exam Mode</h1>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
             <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">Submit Exam</button>
          </div>
        </header>

        {currentQuestion && (
            <div className="flex-grow flex flex-col overflow-y-auto pr-2">
                <div className="mb-4">
                    <h3 className="text-xl font-semibold text-text-secondary mb-2">Question {activeQuestionIndex + 1}</h3>
                    <p className="text-lg text-text-primary prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(currentQuestion.questionText) }} />
                </div>

                <div className="flex-grow flex flex-col gap-4">
                    <textarea value={currentAnswer?.text || ''} onChange={handleTextChange} placeholder="Type your answer here..." className="w-full h-48 flex-grow p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y" aria-label="Answer text area" disabled={isSubmitting}/>
                    <div>
                        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" ref={fileInputRef} id="image-upload" disabled={isSubmitting}/>
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-brand-primary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isSubmitting}>+ Add Image of Written Work</button>
                        {currentAnswer?.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {currentAnswer.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={`data:${img.mimeType};base64,${img.data}`} alt={`Answer image ${index + 1}`} className="w-full h-auto object-cover rounded-lg" />
                                        <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 leading-none opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden" aria-label={`Remove image ${index + 1}`} disabled={isSubmitting}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default ExamScreen;
