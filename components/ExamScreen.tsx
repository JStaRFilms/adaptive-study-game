
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
  
  const totalTime = useMemo(() => quiz.questions.length * 5 * 60, [quiz.questions.length]); // 5 minutes per question
  
  const [examPhase, setExamPhase] = useState<'TYPING' | 'UPLOADING' | 'SUBMITTING'>('TYPING');
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [uploadTimeLeft, setUploadTimeLeft] = useState(120); // 2 minutes for final uploads
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    setAnswers(quiz.questions.map(() => ({ text: '', images: [] })));
  }, [quiz.questions]);

  const startUploadPhase = useCallback(() => {
    if (examPhase !== 'TYPING') return;
    setExamPhase('UPLOADING');
  }, [examPhase]);
  
  const finalSubmit = useCallback(() => {
    if (examPhase === 'SUBMITTING') return;
    setExamPhase('SUBMITTING');
    onFinishRef.current(answersRef.current);
  }, [examPhase]);

  // Main timer countdown logic
  useEffect(() => {
    if (examPhase !== 'TYPING') return;
    if (timeLeft <= 0) {
      alert("Time's up! You now have 2 minutes to upload any remaining images of your written work.");
      startUploadPhase();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [examPhase, timeLeft, startUploadPhase]);

  // Upload timer countdown logic
  useEffect(() => {
    if (examPhase !== 'UPLOADING') return;
    if (uploadTimeLeft <= 0) {
      alert("Image upload time is over. The exam will now be submitted automatically.");
      finalSubmit();
      return;
    }
    const timer = setInterval(() => setUploadTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [examPhase, uploadTimeLeft, finalSubmit]);

  const handleSubmitClick = () => {
    if (window.confirm("Are you sure you want to finish writing? You will have 2 minutes to upload images before the final submission.")) {
        startUploadPhase();
    }
  };
  
  const handleFinalSubmitClick = () => {
      if(window.confirm("Are you sure you want to submit your exam now? You cannot make any more changes.")) {
          finalSubmit();
      }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newAnswers = [...answers];
    newAnswers[activeQuestionIndex].text = e.target.value;
    setAnswers(newAnswers);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      const newImages: { mimeType: string; data: string }[] = [];
      try {
        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            alert(`Skipping non-image file: ${file.name}`);
            continue;
          }
          const { mimeType, data } = await toBase64(file);
          newImages.push({ mimeType, data });
        }
        
        if (newImages.length > 0) {
          const newAnswers = [...answers];
          newAnswers[activeQuestionIndex].images.push(...newImages);
          setAnswers(newAnswers);
        }
      } catch (error) {
        console.error("Error converting file to base64", error);
        alert("There was an error processing your image(s).");
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
  const isReadOnly = examPhase !== 'TYPING';
  const isSubmitPhase = examPhase === 'SUBMITTING';
  
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
                  <button onClick={() => setActiveQuestionIndex(index)} disabled={isSubmitPhase} className={`w-full text-left p-3 rounded-md transition-all flex items-center gap-3 ${activeQuestionIndex === index ? 'bg-brand-primary text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'} disabled:cursor-not-allowed`}>
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
             {examPhase === 'TYPING' && (
                <>
                    <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                    <button onClick={handleSubmitClick} className="px-6 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all">Finish Writing</button>
                </>
             )}
             {examPhase === 'UPLOADING' && (
                <>
                    <div className="text-center">
                        <p className="font-bold text-yellow-400">Image Upload Phase</p>
                        <p className="text-sm text-text-secondary">Attach images of work</p>
                    </div>
                    <CircularTimer timeLeft={uploadTimeLeft} totalTime={120} />
                    <button onClick={handleFinalSubmitClick} className="px-6 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all animate-pulse">Submit Exam</button>
                </>
             )}
             {examPhase === 'SUBMITTING' && <p className="font-bold text-text-secondary">Submitting...</p>}
          </div>
        </header>

        {currentQuestion && (
            <div className="flex-grow flex flex-col overflow-y-auto pr-2">
                <div className="mb-4">
                    <h3 className="text-xl font-semibold text-text-secondary mb-2">Question {activeQuestionIndex + 1}</h3>
                    <p className="text-lg text-text-primary prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(currentQuestion.questionText) }} />
                </div>

                <div className="flex-grow flex flex-col gap-4">
                    <textarea value={currentAnswer?.text || ''} onChange={handleTextChange} placeholder="Type your answer here..." className="w-full h-48 flex-grow p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y disabled:bg-gray-800 disabled:cursor-not-allowed" aria-label="Answer text area" disabled={isReadOnly}/>
                    <div>
                        <input type="file" accept="image/*" multiple capture="environment" onChange={handleFileChange} className="hidden" ref={fileInputRef} id="image-upload" disabled={isSubmitPhase}/>
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-brand-primary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={isSubmitPhase}>+ Add Image(s) of Written Work</button>
                        {currentAnswer?.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {currentAnswer.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={`data:${img.mimeType};base64,${img.data}`} alt={`Answer image ${index + 1}`} className="w-full h-auto object-cover rounded-lg" />
                                        <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 leading-none opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden" aria-label={`Remove image ${index + 1}`} disabled={isSubmitPhase}>
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
