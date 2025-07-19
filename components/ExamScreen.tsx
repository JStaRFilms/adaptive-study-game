
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Quiz, OpenEndedAnswer } from '../types';
import { markdownToHtml } from '../utils/textUtils';
import CircularTimer from './common/CircularTimer';
import LoadingSpinner from './common/LoadingSpinner';

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

interface ExamScreenProps {
  quiz: Quiz;
  onFinish: (submission: OpenEndedAnswer) => void;
}

const ExamScreen: React.FC<ExamScreenProps> = ({ quiz, onFinish }) => {
  const [examPhase, setExamPhase] = useState<'ANSWERING' | 'UPLOADING' | 'SUBMITTING'>('ANSWERING');
  
  // Phase 1 state
  const totalTime = useMemo(() => quiz.questions.length * 5 * 60, [quiz.questions.length]); // 5 minutes per question
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [typedText, setTypedText] = useState('');

  // Phase 2 state
  const [uploadTimeLeft, setUploadTimeLeft] = useState(120); // 2 minutes
  const [images, setImages] = useState<{ mimeType: string; data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const submissionRef = useRef({ text: typedText, images });
  submissionRef.current = { text: typedText, images };

  const startUploadPhase = useCallback(() => {
    if (examPhase !== 'ANSWERING') return;
    setExamPhase('UPLOADING');
  }, [examPhase]);
  
  const finalSubmit = useCallback(() => {
    if (examPhase === 'SUBMITTING') return;
    setExamPhase('SUBMITTING');
    onFinishRef.current(submissionRef.current);
  }, [examPhase]);

  useEffect(() => {
    if (examPhase !== 'ANSWERING') return;
    if (timeLeft <= 0) {
      alert("Time's up! You now have 2 minutes to upload any images of your written work.");
      startUploadPhase();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [examPhase, timeLeft, startUploadPhase]);

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

  const handleFinishWritingClick = () => {
    if (window.confirm("Are you sure you want to finish writing? You will have 2 minutes to upload images before the final submission.")) {
        startUploadPhase();
    }
  };
  
  const handleFinalSubmitClick = () => {
      if(window.confirm("Are you sure you want to submit your exam now? You cannot make any more changes.")) {
          finalSubmit();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (newFiles.length === 0) return;
      
      try {
        const processedImages = await Promise.all(newFiles.map(async file => {
          if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            return null;
          }
          return await toBase64(file);
        }));
        
        const validImages = processedImages.filter((img): img is { mimeType: string; data: string; } => img !== null);

        if (validImages.length > 0) {
          setImages(prev => [...prev, ...validImages]);
        }
      } catch (error) {
        console.error("Error converting file to base64", error);
        alert("There was an error processing your image(s).");
      }
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (imageIndex: number) => {
    setImages(prev => prev.filter((_, i) => i !== imageIndex));
  };
  
  if (examPhase === 'SUBMITTING') {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">Submitting and grading your exam...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-80px)] animate-fade-in bg-surface-dark rounded-lg p-4 sm:p-6">
        <header className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-gray-700 mb-4 flex-shrink-0">
            <h1 className="text-2xl font-bold text-text-primary">Exam Mode</h1>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                {examPhase === 'ANSWERING' && (
                    <>
                        <div className="text-center"><p className="font-bold text-text-primary">Time Remaining</p><p className="text-sm text-text-secondary">Answer the questions</p></div>
                        <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                        <button onClick={handleFinishWritingClick} className="px-4 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all">Finish & Upload</button>
                    </>
                )}
                {examPhase === 'UPLOADING' && (
                    <>
                        <div className="text-center"><p className="font-bold text-yellow-400">Image Upload Phase</p><p className="text-sm text-text-secondary">Attach images of work</p></div>
                        <CircularTimer timeLeft={uploadTimeLeft} totalTime={120} />
                        <button onClick={handleFinalSubmitClick} className="px-4 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all animate-pulse">Submit Exam Now</button>
                    </>
                )}
            </div>
        </header>

        {examPhase === 'ANSWERING' && (
            <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
                <div className="md:w-1/2 flex-shrink-0 overflow-y-auto pr-2 space-y-4">
                    <h2 className="text-xl font-bold text-text-secondary sticky top-0 bg-surface-dark pb-2">Questions</h2>
                    {quiz.questions.map((q, index) => (
                        <div key={index} className="p-4 bg-background-dark rounded-md">
                            <p className="font-bold text-brand-primary">Question {index + 1}</p>
                            <div className="prose prose-invert max-w-none text-text-primary mt-1" dangerouslySetInnerHTML={{ __html: markdownToHtml(q.questionText) }}/>
                        </div>
                    ))}
                </div>
                <div className="md:w-1/2 flex flex-col">
                    <h2 className="text-xl font-bold text-text-secondary mb-2">Typed Answers/Notes</h2>
                    <textarea value={typedText} onChange={e => setTypedText(e.target.value)} placeholder="You can type answers or notes here. Remember to number them to match the questions." className="w-full flex-grow p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y" aria-label="Typed answers area" />
                </div>
            </div>
        )}
        
        {examPhase === 'UPLOADING' && (
            <div className="flex-grow flex flex-col items-center justify-center text-center overflow-y-auto p-4">
                <div className="max-w-2xl w-full">
                    <h2 className="text-3xl font-bold text-yellow-400">Final Upload</h2>
                    <p className="text-text-secondary mt-2 mb-6">You have {Math.floor(uploadTimeLeft/60)}m {uploadTimeLeft%60}s to upload images of your handwritten work. <br/> Please ensure your answers are clearly numbered.</p>
                    
                    <div className="bg-background-dark border-2 border-dashed border-gray-600 rounded-lg p-8">
                        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" ref={fileInputRef} id="image-upload-final" />
                        <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary transition-all">+ Add Images of Written Work</button>
                        <p className="text-xs text-gray-500 mt-2">You can select multiple files.</p>
                    </div>

                    {images.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-xl font-bold text-text-primary mb-2">Uploaded Images ({images.length})</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-60 overflow-y-auto p-2 bg-background-dark rounded-lg">
                                {images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={`data:${img.mimeType};base64,${img.data}`} alt={`Answer image ${index + 1}`} className="w-full h-auto object-cover rounded-lg" />
                                        <button onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Remove image ${index + 1}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ExamScreen;
