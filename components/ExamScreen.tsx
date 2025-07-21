
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Quiz, OpenEndedAnswer } from '../types';
import Markdown from './common/Markdown';
import CircularTimer from './common/CircularTimer';
import LoadingSpinner from './common/LoadingSpinner';
import Modal from './common/Modal';

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
  onCancel: () => void;
}

const ExamScreen: React.FC<ExamScreenProps> = ({ quiz, onFinish, onCancel }) => {
  const [examPhase, setExamPhase] = useState<'ANSWERING' | 'UPLOADING' | 'SUBMITTING'>('ANSWERING');
  
  // Phase 1 state
  const totalTime = useMemo(() => quiz.questions.length * 5 * 60, [quiz.questions.length]); // 5 minutes per question
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [typedText, setTypedText] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'answer'>('questions');

  // Phase 2 state
  const [uploadTimeLeft, setUploadTimeLeft] = useState(120); // 2 minutes
  const [images, setImages] = useState<{ mimeType: string; data: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modals & Progress
  const [modalInfo, setModalInfo] = useState<{
    type: 'cancel' | 'finish' | 'submit_final' | 'timeup' | 'upload_timeup' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [showCopyMessage, setShowCopyMessage] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const submissionRef = useRef({ text: typedText, images });
  submissionRef.current = { text: typedText, images };

  const copyToClipboard = useCallback(async (text: string) => {
    if (!text.trim() || !navigator.clipboard) return;
    try {
        await navigator.clipboard.writeText(text);
        setShowCopyMessage(true);
        setTimeout(() => setShowCopyMessage(false), 3000); // Hide message after 3 seconds
    } catch (err) {
        console.error("Failed to copy exam answers to clipboard:", err);
    }
  }, []);

  const startUploadPhase = useCallback(() => {
    if (examPhase !== 'ANSWERING') return;
    copyToClipboard(submissionRef.current.text);
    setExamPhase('UPLOADING');
  }, [examPhase, copyToClipboard]);
  
  const finalSubmit = useCallback(() => {
    if (examPhase === 'SUBMITTING') return;
    setExamPhase('SUBMITTING');
    onFinishRef.current(submissionRef.current);
  }, [examPhase]);

  useEffect(() => {
    if (examPhase !== 'ANSWERING') return;
    if (timeLeft <= 0) {
      copyToClipboard(submissionRef.current.text);
      setModalInfo({ type: 'timeup', isOpen: true });
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [examPhase, timeLeft, copyToClipboard]);

  useEffect(() => {
    if (examPhase !== 'UPLOADING') return;
    if (uploadTimeLeft <= 0) {
      setModalInfo({ type: 'upload_timeup', isOpen: true });
      return;
    }
    const timer = setInterval(() => setUploadTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [examPhase, uploadTimeLeft]);

  const handleFinishWritingClick = () => {
    setModalInfo({ type: 'finish', isOpen: true });
  };
  
  const handleFinalSubmitClick = () => {
      setModalInfo({ type: 'submit_final', isOpen: true });
  };

  const processFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsProcessingImages(true);
    setImageProgress({ current: 0, total: imageFiles.length });

    try {
        const processedImages: { mimeType: string; data: string }[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            setImageProgress({ current: i + 1, total: imageFiles.length });
            const processed = await toBase64(file);
            processedImages.push(processed);
        }
        setImages(prev => [...prev, ...processedImages]);
    } catch (error) {
        console.error("Error converting file to base64", error);
    } finally {
        setIsProcessingImages(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary for onDrop to fire
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveImage = (imageIndex: number) => {
    setImages(prev => prev.filter((_, i) => i !== imageIndex));
  };
  
  const getModalContent = () => {
    const closeModal = () => setModalInfo({ type: null, isOpen: false });

    switch (modalInfo.type) {
        case 'cancel':
            return {
                title: 'Cancel Exam',
                content: (
                    <div className="text-text-secondary">
                        <p className="font-bold text-red-400">This action cannot be undone.</p>
                        <p className="mt-2">Are you sure you want to cancel this exam? All your progress will be lost and no grade will be recorded.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Continue Exam</button>
                            <button onClick={() => { onCancel(); closeModal(); }} className="px-4 py-2 bg-incorrect text-white font-bold rounded-lg hover:bg-red-600 transition-colors">Cancel Exam</button>
                        </div>
                    </div>
                )
            };
        case 'finish':
            return {
                title: 'Finish Writing?',
                content: (
                    <div className="text-text-secondary">
                        <p>Are you sure you want to finish writing? You will have <strong>2 minutes</strong> to upload images before your work is submitted.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Keep Writing</button>
                            <button onClick={() => { startUploadPhase(); closeModal(); }} className="px-4 py-2 bg-correct text-white font-bold rounded-lg hover:bg-green-600 transition-colors">Finish & Upload</button>
                        </div>
                    </div>
                )
            };
        case 'submit_final':
            return {
                title: 'Submit Exam Now?',
                content: (
                    <div className="text-text-secondary">
                        <p>Are you sure you want to submit your exam? You cannot make any more changes.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                            <button onClick={() => { finalSubmit(); closeModal(); }} className="px-4 py-2 bg-correct text-white font-bold rounded-lg hover:bg-green-600 transition-colors">Submit Now</button>
                        </div>
                    </div>
                )
            };
        case 'timeup':
            return {
                title: "Time's Up!",
                content: (
                    <div className="text-text-secondary">
                        <p>Your writing time has expired. Your typed answers have been copied to your clipboard as a backup.</p>
                        <p className="mt-2">You now have <strong>2 minutes</strong> to upload any images of your handwritten work.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => { startUploadPhase(); closeModal(); }} className="px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors">Proceed to Upload</button>
                        </div>
                    </div>
                )
            };
        case 'upload_timeup':
            return {
                title: 'Upload Time Over',
                content: (
                    <div className="text-text-secondary">
                        <p>Your time for uploading images has expired. The exam will now be submitted automatically.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => { finalSubmit(); closeModal(); }} className="px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors">Submit Exam</button>
                        </div>
                    </div>
                )
            };
        default:
            return { title: '', content: null };
    }
  };

  if (examPhase === 'SUBMITTING') {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-text-secondary">Submitting and grading your exam...</p>
        </div>
    );
  }

  const currentModal = getModalContent();

  return (
    <div className="flex flex-col w-full h-[calc(100vh-80px)] animate-fade-in bg-surface-dark rounded-lg p-2 sm:p-4">
        <header className="flex flex-wrap justify-between items-center pb-4 border-b border-gray-700 mb-4 flex-shrink-0 gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Exam Mode</h1>
              <button onClick={() => setModalInfo({ type: 'cancel', isOpen: true })} className="text-sm font-semibold text-red-500 hover:text-red-400 hover:underline transition-colors">Cancel Exam</button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                {examPhase === 'ANSWERING' && (
                    <>
                        <div className="hidden sm:block text-right"><p className="font-bold text-text-primary">Time Remaining</p><p className="text-xs text-text-secondary">Answer the questions</p></div>
                        <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
                        <button onClick={handleFinishWritingClick} className="px-3 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all text-sm sm:text-base">
                            <span className="hidden sm:inline">Finish & Upload</span>
                            <span className="sm:hidden">Finish</span>
                        </button>
                    </>
                )}
                {examPhase === 'UPLOADING' && (
                    <>
                        <div className="text-right"><p className="font-bold text-yellow-400">Image Upload</p><p className="text-xs text-text-secondary">Attach images of work</p></div>
                        <CircularTimer timeLeft={uploadTimeLeft} totalTime={120} />
                        <button onClick={handleFinalSubmitClick} className="px-3 py-2 bg-correct text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all animate-pulse text-sm sm:text-base">Submit Now</button>
                    </>
                )}
            </div>
        </header>

        {examPhase === 'ANSWERING' && (
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                {/* Mobile Tab Controls */}
                <div className="md:hidden flex-shrink-0 border-b border-gray-700">
                    <div className="flex">
                        <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 font-bold text-sm flex-1 transition-colors ${activeTab === 'questions' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-text-secondary'}`} aria-pressed={activeTab === 'questions'}>
                            Questions ({quiz.questions.length})
                        </button>
                        <button onClick={() => setActiveTab('answer')} className={`px-4 py-2 font-bold text-sm flex-1 transition-colors ${activeTab === 'answer' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-text-secondary'}`} aria-pressed={activeTab === 'answer'}>
                            My Answer
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
                    {/* Questions Pane */}
                    <div className={`w-full md:w-1/2 flex-col flex-grow min-h-0 ${activeTab === 'questions' ? 'flex' : 'hidden'} md:flex`}>
                        <h2 className="text-xl font-bold text-text-secondary pb-2 flex-shrink-0">Questions</h2>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                            {quiz.questions.map((q, index) => (
                                <div key={index} className="p-4 bg-background-dark rounded-md">
                                    <p className="font-bold text-brand-primary">Question {index + 1}</p>
                                    <Markdown content={q.questionText} className="prose prose-invert max-w-none text-text-primary mt-1" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Answer Pane */}
                    <div className={`w-full md:w-1/2 flex-col flex-grow min-h-0 ${activeTab === 'answer' ? 'flex' : 'hidden'} md:flex`}>
                        <h2 className="text-xl font-bold text-text-secondary mb-2 flex-shrink-0">Typed Answers/Notes</h2>
                        <textarea
                            value={typedText}
                            onChange={e => setTypedText(e.target.value)}
                            placeholder="You can type answers or notes here. Remember to number them to match the questions."
                            className="w-full flex-grow p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                            aria-label="Typed answers area"
                        />
                        <p className="text-xs text-yellow-300/80 mt-2">
                            Pro Tip: Copy your typed answers to a safe place before submitting, just in case of network issues.
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        {examPhase === 'UPLOADING' && (
            <div className="flex-grow flex flex-col items-center justify-center text-center overflow-y-auto p-4">
                <div className="max-w-2xl w-full">
                    <h2 className="text-3xl font-bold text-yellow-400">Final Upload</h2>
                    {showCopyMessage && <p className="text-correct mt-2 animate-fade-in">✔ Typed answers copied to clipboard!</p>}
                    <p className="text-text-secondary mt-2 mb-6">You have {Math.floor(uploadTimeLeft/60)}m {uploadTimeLeft%60}s to upload images of your handwritten work. <br/> Please ensure your answers are clearly numbered.</p>
                    
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all duration-300 ${isDragging ? 'border-brand-primary scale-105 bg-brand-primary/10' : 'border-gray-600 hover:border-gray-500'}`}
                    >
                        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" ref={fileInputRef} id="image-upload-final" />
                        <div className="text-center pointer-events-none flex flex-col items-center justify-center">
                            {isDragging ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand-primary mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1m-1 9l-4-4m0 0l-4 4m4-4v12" /></svg>
                                    <p className="text-xl font-bold text-brand-primary">Drop files to upload</p>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    <p className="font-semibold text-text-primary">Click to upload or drag & drop</p>
                                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, etc.</p>
                                </>
                            )}
                        </div>
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

        <Modal isOpen={modalInfo.isOpen} onClose={() => setModalInfo({ ...modalInfo, isOpen: false })} title={currentModal.title}>
          {currentModal.content}
        </Modal>

        <Modal isOpen={isProcessingImages} onClose={() => {}} title="Processing Images...">
            <div className="text-center text-text-secondary">
                <LoadingSpinner />
                <p className="mt-4">
                    Processing image {imageProgress.current} of {imageProgress.total}...
                </p>
                <div className="w-full bg-surface-dark rounded-full h-2.5 mt-4">
                    <div
                    className="bg-brand-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${imageProgress.total > 0 ? (imageProgress.current / imageProgress.total) * 100 : 0}%` }}
                    ></div>
                </div>
                <p className="text-xs mt-2">Please wait, this may take a moment for large files.</p>
            </div>
        </Modal>
    </div>
  );
};

export default ExamScreen;
