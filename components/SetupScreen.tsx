
import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { StudyMode, StudySet, QuizConfig, PromptPart, KnowledgeSource, AnswerLog } from '../types';
import { useStudySets } from '../hooks/useStudySets';
import { useQuizHistory } from '../hooks/useQuizHistory';
import ProgressBar from './common/ProgressBar';
import LoadingSpinner from './common/LoadingSpinner';

// Configure the PDF.js worker to be loaded from a CDN. This is necessary for the library to process PDFs in a separate thread.
// By using `pdfjsLib.version`, we ensure the worker version always matches the library version imported from the import map.
if (pdfjsLib.version) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SetupScreenProps {
  onStart: (parts: PromptPart[], config: QuizConfig, studySetId: string) => void;
  error: string | null;
  initialContent?: string | null;
  onReviewHistory: (log: AnswerLog[]) => void;
}

type Action = 'LIST' | 'CREATE_EDIT' | 'STUDY' | 'HISTORY';

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, error, initialContent, onReviewHistory }) => {
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  const [, getHistoryForSet] = useQuizHistory();
  const [action, setAction] = useState<Action>('LIST');
  
  // State for Create/Edit/Study actions
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  const [setName, setSetName] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  
  // State for Config
  const [numQuestions, setNumQuestions] = useState(10);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSource>(KnowledgeSource.NOTES_ONLY);

  // State for file processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string|null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const resetFormState = useCallback(() => {
    setActiveSet(null);
    setSetName('');
    setContent('');
    setFiles([]);
    setNumQuestions(10);
    setStudyMode(StudyMode.PRACTICE);
    setKnowledgeSource(KnowledgeSource.NOTES_ONLY);
    setIsProcessing(false);
    setProcessingError(null);
    setProgressMessage(null);
    setProgressPercent(0);
  }, []);

  useEffect(() => {
    if (initialContent) {
      // Pre-configure the screen for creating a new set with the provided content.
      resetFormState();
      setAction('CREATE_EDIT');
      setContent(initialContent);
    }
  }, [initialContent, resetFormState]);
  
  const handleShowList = useCallback(() => {
    resetFormState();
    setAction('LIST');
  }, [resetFormState]);

  const handleNewSet = () => {
    resetFormState();
    setAction('CREATE_EDIT');
  };

  const handleEditSet = (set: StudySet) => {
    resetFormState();
    setActiveSet(set);
    setSetName(set.name);
    setContent(set.content);
    setAction('CREATE_EDIT');
  };
  
  const handleStudySet = (set: StudySet) => {
    resetFormState();
    setActiveSet(set);
    setAction('STUDY');
  };
  
  const handleShowHistory = (set: StudySet) => {
    resetFormState();
    setActiveSet(set);
    setAction('HISTORY');
  }

  const onProgress = useCallback((message: string, percent: number) => {
    setProgressMessage(message);
    setProgressPercent(percent);
  }, []);

  const prepareQuizParts = useCallback(async (
    baseText: string, 
    filesToProcess: File[],
    onProgressUpdate: (message: string, percent: number) => void
  ): Promise<{parts: PromptPart[], combinedText: string}> => {
      onProgressUpdate('Initializing...', 0);
      const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const parts: PromptPart[] = [];
    let combinedText = baseText;
    const totalFiles = filesToProcess.length;

    if (totalFiles > 0) {
        let processedFiles = 0;
        for (const file of filesToProcess) {
            const fileIndex = processedFiles;
            const fileProgressStart = (fileIndex / totalFiles) * 100;

            onProgressUpdate(`Reading ${file.name}...`, fileProgressStart);

            if (file.type.startsWith('image/')) {
                parts.push({
                    inlineData: { mimeType: file.type, data: await toBase64(file) }
                });
            } else if (file.type.startsWith('audio/')) {
                 parts.push({
                    inlineData: { mimeType: file.type, data: await toBase64(file) }
                });
                combinedText += `\n\n[Content from audio file: ${file.name}]`;
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let pdfText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const pageProgress = i / pdf.numPages;
                    const overallProgress = fileProgressStart + (pageProgress / totalFiles * 100);
                    onProgressUpdate(`Page ${i}/${pdf.numPages} of ${file.name}`, overallProgress);

                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    pdfText += textContent.items.map((item: any) => ('str' in item) ? item.str : '').join(' ');
                }
                combinedText += '\n\n' + pdfText;
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                combinedText += '\n\n' + result.value;
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
                 const arrayBuffer = await file.arrayBuffer();
                 const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                 workbook.SheetNames.forEach(sheetName => {
                     const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                     combinedText += `\n\n--- Content from ${file.name} / Sheet: ${sheetName} ---\n${csvText}`;
                 });
            } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.type === 'text/markdown') {
                 combinedText += '\n\n' + await file.text();
            }
            processedFiles++;
        }
    }
    
    onProgressUpdate('Finalizing content...', 99);

    if (combinedText.trim()) {
        parts.unshift({ text: combinedText.trim() });
    }

    return { parts, combinedText };
  }, []);


  const handleStartQuiz = async () => {
    if (!activeSet) return;
    setIsProcessing(true);
    setProcessingError(null);

    const baseText = activeSet.content;
    
    try {
        const { parts } = await prepareQuizParts(baseText, files, onProgress);
        if (parts.length === 0) {
            setProcessingError("Please provide some study material (notes, images, or PDFs).");
            setIsProcessing(false);
            return;
        }
        onStart(parts, { numberOfQuestions: numQuestions, mode: studyMode, knowledgeSource }, activeSet.id);
    } catch (err) {
        console.error("Error processing files:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
        setProcessingError(errorMessage);
        setIsProcessing(false);
    }
  };
  
  const handleSaveOnly = async () => {
    if (!setName.trim() || (!content.trim() && files.length === 0)) {
        setProcessingError("Set name and content (pasted or from files) are required.");
        return;
    };
    
    setIsProcessing(true);
    setProcessingError(null);

    try {
        const { combinedText } = await prepareQuizParts(content, files, onProgress);
        
        if (activeSet) {
            updateSet({ ...activeSet, name: setName, content: combinedText.trim() });
        } else {
            addSet({ name: setName, content: combinedText.trim() });
        }

        handleShowList();

    } catch (err) {
        console.error("Error processing files for saving:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
        setProcessingError(errorMessage);
        setIsProcessing(false);
    }
  };

  const handleSaveAndStart = async () => {
    if (!setName.trim() || (!content.trim() && files.length === 0)) {
        setProcessingError("Set name and content (pasted or from files) are required.");
        return;
    };
    
    setIsProcessing(true);
    setProcessingError(null);

    try {
        // Call prepareQuizParts once to get both parts for the quiz and text for saving
        const { parts, combinedText } = await prepareQuizParts(content, files, onProgress);
        
        let savedSet: StudySet;
        // Save or update the set with the full text content
        if (activeSet) { // Editing existing set
            savedSet = { ...activeSet, name: setName, content: combinedText.trim() };
            updateSet(savedSet);
        } else { // Creating new set
            savedSet = addSet({ name: setName, content: combinedText.trim() });
        }

        if (parts.length === 0) {
            setProcessingError("Please provide some study material.");
            setIsProcessing(false);
            return;
        }
        onStart(parts, { numberOfQuestions: numQuestions, mode: studyMode, knowledgeSource }, savedSet.id);

    } catch (err) {
        console.error("Error processing files:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
        setProcessingError(errorMessage);
        setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        setFiles(prevFiles => {
            const existingFileKeys = new Set(prevFiles.map(f => `${f.name}-${f.size}-${f.lastModified}`));
            const uniqueNewFiles = newFiles.filter(f => !existingFileKeys.has(`${f.name}-${f.size}-${f.lastModified}`));
            return [...prevFiles, ...uniqueNewFiles];
        });
        // Reset the input value to allow selecting the same file again after removing it.
        e.target.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== fileToRemove));
  };
  
  const FileUploader = ({ onChange }: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
        <label htmlFor="fileUpload" className="block text-lg font-medium text-text-secondary mb-3">Upload Materials</label>
        <p className="text-sm text-gray-400 mb-2">Upload documents (.txt, .pdf, .docx, .md), spreadsheets (.xlsx, .csv), images (.png, .jpg), and audio (.mp3, .m4a, .wav).</p>
        <input 
            type="file" 
            id="fileUpload" 
            multiple 
            accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,audio/*,.md,text/markdown"
            onChange={onChange}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"
        />
        {files.length > 0 && (
          <div className="mt-4 text-left text-sm text-text-secondary bg-background-dark/50 p-3 rounded-md">
              <p className="font-bold mb-1">Selected files:</p>
              <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex justify-between items-center group bg-gray-700/50 p-2 rounded-md">
                        <span className="truncate" title={f.name}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 align-text-bottom" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            {f.name} <span className="text-gray-400 ml-2">({Math.round(f.size / 1024)} KB)</span>
                        </span>
                        <button 
                            onClick={() => handleRemoveFile(f)} 
                            className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white opacity-50 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
                            aria-label={`Remove ${f.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </li>
                  ))}
              </ul>
          </div>
        )}
    </div>
  );
  
  const QuizConfigurator = () => (
    <>
        <div>
            <label htmlFor="numQuestions" className="block text-lg font-medium text-text-secondary mb-2">Number of Questions</label>
            <input type="number" id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value, 10))} min="5" max="50" className="w-32 p-2 text-center text-xl bg-gray-900 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
        </div>
        <div>
            <h3 className="text-lg font-medium text-text-secondary mb-3">Knowledge Source</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button onClick={() => setKnowledgeSource(KnowledgeSource.NOTES_ONLY)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.NOTES_ONLY ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes Only</p>
                    <p className="text-xs font-normal opacity-80">Strictly use my notes</p>
                </button>
                <button onClick={() => setKnowledgeSource(KnowledgeSource.GENERAL)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.GENERAL ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes + AI</p>
                    <p className="text-xs font-normal opacity-80">Supplement with AI</p>
                </button>
                 <button onClick={() => setKnowledgeSource(KnowledgeSource.WEB_SEARCH)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.WEB_SEARCH ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes + Web</p>
                    <p className="text-xs font-normal opacity-80">Use Google Search</p>
                </button>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-medium text-text-secondary mb-3">Study Mode</h3>
            <div className="flex justify-center gap-4">
                <button onClick={() => setStudyMode(StudyMode.PRACTICE)} className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all ${studyMode === StudyMode.PRACTICE ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Practice</p>
                    <p className="text-sm font-normal">Timed with scoring</p>
                </button>
                <button onClick={() => setStudyMode(StudyMode.REVIEW)} className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all ${studyMode === StudyMode.REVIEW ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Review</p>
                    <p className="text-sm font-normal">Untimed, self-paced</p>
                </button>
            </div>
        </div>
    </>
  );

  const ProcessingFilesView = () => (
    <div className="bg-surface-dark p-8 rounded-xl min-h-[40vh] flex flex-col justify-center items-center text-center animate-fade-in">
        <LoadingSpinner />
        <p className="text-2xl font-bold text-text-primary mt-6 mb-4">{progressMessage || 'Preparing your files...'}</p>
        <div className="w-full max-w-sm">
            <ProgressBar progress={progressPercent} />
        </div>
        <p className="mt-4 text-text-secondary">This may take a moment for large files...</p>
    </div>
  );

  const renderListView = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Your Study Sets</h1>
        <button onClick={handleNewSet} className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
          + New Set
        </button>
      </div>
       {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6 w-full" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {studySets.length === 0 ? (
        <div className="text-center py-16 px-6 bg-surface-dark rounded-xl">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome!</h2>
          <p className="text-text-secondary mb-6">You don't have any study sets yet. Create one to get started.</p>
          <button onClick={handleNewSet} className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all">
            Create Your First Study Set
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {studySets.map(set => (
            <div key={set.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-lg gap-4">
              <div className="flex-grow">
                <h3 className="font-bold text-xl text-text-primary">{set.name}</h3>
                <p className="text-sm text-text-secondary">{set.content.substring(0, 100)}...</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                <button onClick={() => handleEditSet(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                <button onClick={() => deleteSet(set.id)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                <button onClick={() => handleShowHistory(set)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-all">History</button>
                <button onClick={() => handleStudySet(set)} className="px-4 py-2 bg-brand-primary text-white font-bold rounded-md hover:bg-brand-secondary transition-all">Study</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderCreateEditView = () => (
    <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col flex-grow">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6 text-center">{activeSet ? 'Edit Study Set' : 'Create New Study Set'}</h1>
        
        <div className="flex-grow">
          {isProcessing ? <ProcessingFilesView /> : (
              <div className="space-y-8 bg-surface-dark p-6 sm:p-8 rounded-xl h-full">
                  <div>
                      <label htmlFor="setName" className="block text-lg font-medium text-text-secondary mb-2">Set Name</label>
                      <input type="text" id="setName" value={setName} onChange={e => setSetName(e.target.value)} placeholder="e.g., Biology Chapter 4" className="w-full p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                  </div>
                  <div>
                      <label htmlFor="content" className="block text-lg font-medium text-text-secondary mb-2">Paste Notes</label>
                      <textarea id="content" value={content} onChange={e => setContent(e.target.value)} placeholder="Paste your study material here, or upload files below." className="w-full h-40 p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                  </div>
                  <FileUploader onChange={handleFileChange} />
                  <div className="border-t border-gray-700 pt-8 space-y-8 text-center">
                      <QuizConfigurator />
                  </div>
              </div>
          )}
        </div>
        
         {processingError && !isProcessing && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{processingError}</span>
            </div>
          )}
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={handleSaveAndStart} disabled={isProcessing || !setName.trim()} className="px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {activeSet ? 'Update & Start' : 'Save & Start'}
            </button>
            <button onClick={handleSaveOnly} disabled={isProcessing || !setName.trim()} className="px-6 py-3 bg-brand-secondary text-white font-bold rounded-lg hover:bg-brand-primary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
              {activeSet ? 'Save & Close' : 'Save Only'}
            </button>
            <button onClick={handleShowList} disabled={isProcessing} className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Cancel</button>
        </div>
    </div>
  );

  const renderStudyConfigView = () => (
    <div className="animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-lg text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Configure Quiz</h1>
            <p className="text-text-secondary mb-8">For "{activeSet?.name}"</p>
            
            {isProcessing ? <ProcessingFilesView /> : (
              <div className="space-y-8 bg-surface-dark p-8 rounded-xl">
                  <div>
                      <p className="block text-lg font-medium text-text-secondary mb-3">Add Supplemental Files</p>
                      <FileUploader onChange={handleFileChange} />
                  </div>
                  <div className="border-t border-gray-700 pt-8 space-y-8">
                    <QuizConfigurator />
                  </div>
              </div>
            )}

             {processingError && !isProcessing && (
                <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
                  <strong className="font-bold">Processing Error: </strong>
                  <span className="block sm:inline">{processingError}</span>
                </div>
              )}
            <div className="mt-8 flex justify-center gap-4">
                <button onClick={handleStartQuiz} disabled={isProcessing} className="px-12 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Start Studying
                </button>
                <button onClick={handleShowList} disabled={isProcessing} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Back</button>
            </div>
        </div>
    </div>
  );

  const renderHistoryView = () => {
    if (!activeSet) return renderListView();
    const history = getHistoryForSet(activeSet.id);
    
    return (
        <div className="animate-fade-in w-full max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Quiz History</h1>
            <p className="text-text-secondary mb-8 text-center">For "{activeSet.name}"</p>

            {history.length === 0 ? (
                <div className="text-center py-16 px-6 bg-surface-dark rounded-xl">
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">No History Yet</h2>
                    <p className="text-text-secondary mb-6">Complete a quiz for this set to see your history here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((result) => (
                        <div key={result.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="font-bold text-text-primary">{new Date(result.date).toLocaleString()}</p>
                                <p className="text-sm text-text-secondary">Mode: {result.mode}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xs text-text-secondary">Score</p>
                                    <p className="font-bold text-xl text-brand-primary">{result.score}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-secondary">Accuracy</p>
                                    <p className="font-bold text-xl text-brand-primary">{result.accuracy}%</p>
                                </div>
                                <button
                                    onClick={() => onReviewHistory(result.answerLog)}
                                    className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-all"
                                >
                                    Review
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
             <div className="mt-8 flex justify-center">
                <button onClick={handleShowList} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">
                    Back to Study Sets
                </button>
            </div>
        </div>
    );
  };


  switch (action) {
    case 'CREATE_EDIT':
      return renderCreateEditView();
    case 'STUDY':
      return renderStudyConfigView();
    case 'HISTORY':
      return renderHistoryView();
    case 'LIST':
    default:
      return renderListView();
  }
};

export default SetupScreen;