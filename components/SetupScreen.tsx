import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { StudyMode, StudySet, QuizConfig, PromptPart, KnowledgeSource, AnswerLog, QuizResult, FileInfo } from '../types';
import { useStudySets } from '../hooks/useStudySets';
import { useQuizHistory } from '../hooks/useQuizHistory';
import { generateTopics } from '../services/geminiService';
import ProgressBar from './common/ProgressBar';
import LoadingSpinner from './common/LoadingSpinner';
import Modal from './common/Modal';

// Configure the PDF.js worker
if (pdfjsLib.version) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SetupScreenProps {
  onStart: (parts: PromptPart[], config: QuizConfig, studySetId: string) => void;
  error: string | null;
  initialContent?: string | null;
  onReviewHistory: (log: AnswerLog[]) => void;
  onPredict: (studySetId: string) => void;
}

type Action = 'LIST' | 'CREATE_EDIT' | 'HISTORY' | 'TOPIC_SELECTION';

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, error, initialContent, onReviewHistory, onPredict }) => {
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  const [, getHistoryForSet] = useQuizHistory();
  const [action, setAction] = useState<Action>('LIST');
  
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  const [setName, setSetName] = useState('');
  const [setContent, setSetContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  
  const [numQuestions, setNumQuestions] = useState(10);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSource>(KnowledgeSource.NOTES_ONLY);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
  const [processingError, setProcessingError] = useState<string|null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [preparedParts, setPreparedParts] = useState<PromptPart[]>([]);
  const [topics, setTopics] = useState<string[] | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // For details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [setForDetails, setSetForDetails] = useState<StudySet | null>(null);

  const resetFormState = useCallback(() => {
    setActiveSet(null);
    setSetName('');
    setSetContent('');
    setFiles([]);
    setNumQuestions(10);
    setStudyMode(StudyMode.PRACTICE);
    setKnowledgeSource(KnowledgeSource.NOTES_ONLY);
    setIsProcessing(false);
    setProcessingError(null);
    setProgressMessage(null);
    setProgressPercent(0);
    setPreparedParts([]);
    setIsAnalyzingTopics(false);
    setTopics(null);
    setSelectedTopics([]);
  }, []);

  useEffect(() => {
    if (initialContent) {
      resetFormState();
      setAction('CREATE_EDIT');
      setSetContent(initialContent);
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
    setSetContent(set.content);
    setAction('CREATE_EDIT');
  };
  
  const handleShowHistory = (set: StudySet) => {
    resetFormState();
    setActiveSet(set);
    setAction('HISTORY');
  }
  
  const handleShowDetails = (set: StudySet) => {
    setSetForDetails(set);
    setIsDetailsModalOpen(true);
  };

  const onProgress = useCallback((message: string, percent: number) => {
    setProgressMessage(message);
    setProgressPercent(percent);
  }, []);

  const prepareQuizParts = useCallback(async (
    baseText: string, 
    filesToProcess: File[],
    onProgressUpdate: (message: string, percent: number) => void
  ): Promise<{parts: PromptPart[], combinedText: string, fileInfo: FileInfo[]}> => {
      onProgressUpdate('Initializing...', 0);
      const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const parts: PromptPart[] = [];
    let combinedText = baseText;
    const fileInfo: FileInfo[] = filesToProcess.map(f => ({ name: f.name, type: f.type }));
    const totalFiles = filesToProcess.length;

    if (totalFiles > 0) {
        let processedFiles = 0;
        for (const file of filesToProcess) {
            const fileIndex = processedFiles;
            const fileProgressStart = (fileIndex / totalFiles) * 100;
            const progressShareForFile = 100 / totalFiles;

            onProgressUpdate(`Reading ${file.name}...`, fileProgressStart);

            if (file.type.startsWith('image/')) {
                parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
            } else if (file.type.startsWith('audio/')) {
                 parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
                combinedText += `\n\n[Content from audio file: ${file.name}]`;
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let pdfText = '';
                onProgressUpdate(`Extracting text from ${file.name}...`, fileProgressStart);
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    pdfText += textContent.items.map((item: any) => ('str' in item) ? item.str : '').join(' ') + '\n';
                }
                if (pdfText.trim()) combinedText += `\n\n--- Start of text from ${file.name} ---\n${pdfText.trim()}\n--- End of text from ${file.name} ---`;

                combinedText += `\n\n[The following are images of each page from the PDF file: ${file.name}]`;
                for (let i = 1; i <= pdf.numPages; i++) {
                    onProgressUpdate(`Capturing page ${i}/${pdf.numPages} from ${file.name}`, fileProgressStart + (progressShareForFile * 0.4) + ((i/pdf.numPages) * progressShareForFile * 0.6));
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    if (!context) continue;
                    await page.render({ canvasContext: context, viewport }).promise;
                    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
                    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } });
                }
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

    return { parts, combinedText, fileInfo };
  }, []);

  const handlePrepareForQuiz = useCallback(async (set: StudySet, supplementalFiles: File[] = []) => {
    if (!activeSet || activeSet.id !== set.id) {
        resetFormState();
    }
    setActiveSet(set);
    setIsProcessing(true);
    setProcessingError(null);
    setProgressPercent(0);

    try {
        const onReanalyzeProgress = (message: string, percent: number) => {
            setProgressMessage(message);
            setProgressPercent(Math.round(percent * 0.7));
        };

        const { parts, combinedText, fileInfo } = await prepareQuizParts(set.content, supplementalFiles, onReanalyzeProgress);
        setPreparedParts(parts);
        
        if (supplementalFiles.length > 0) {
            const updatedSet = {
                ...set,
                content: combinedText.trim(),
                fileInfo: [...(set.fileInfo || []), ...fileInfo]
            };
            updateSet(updatedSet);
            setActiveSet(updatedSet);
            setFiles([]);
        }

        setProgressMessage('Analyzing for topics...');
        setProgressPercent(75);
        const generatedTopics = await generateTopics(parts);
        setProgressPercent(90);
        setTopics(generatedTopics);
        setSelectedTopics(generatedTopics);
        
        setProgressPercent(100);
        await new Promise(res => setTimeout(res, 300));

        setAction('TOPIC_SELECTION');
    } catch (err) {
        console.error("Error preparing quiz:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setProcessingError(errorMessage);
        setAction('LIST');
    } finally {
        setIsProcessing(false);
    }
  }, [activeSet, prepareQuizParts, resetFormState, updateSet]);


  const handleSaveAndAnalyze = async (text: string, filesToProcess: File[]) => {
    if (!setName.trim()) {
        setProcessingError("Please provide a name for your new study set.");
        return;
    }
     if (!text.trim() && filesToProcess.length === 0) {
        setProcessingError("Please provide some study material to analyze.");
        return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    try {
        const { parts, combinedText, fileInfo } = await prepareQuizParts(text, filesToProcess, onProgress);
        setPreparedParts(parts);

        let currentSet: StudySet;
        if (activeSet) { // Editing
            currentSet = { ...activeSet, name: setName, content: combinedText.trim(), fileInfo: [...(activeSet.fileInfo || []), ...fileInfo] };
            updateSet(currentSet);
        } else { // Creating
            currentSet = addSet({ name: setName, content: combinedText.trim(), fileInfo });
        }
        setActiveSet(currentSet);
        
        setIsProcessing(false);
        setIsAnalyzingTopics(true);

        const generatedTopics = await generateTopics(parts);
        setTopics(generatedTopics);
        setSelectedTopics(generatedTopics);
        
        setIsAnalyzingTopics(false);
        setAction('TOPIC_SELECTION');
    } catch (err) {
        console.error("Error during analysis pipeline:", err);
        setProcessingError(err instanceof Error ? err.message : "An unknown error occurred.");
        setIsProcessing(false);
        setIsAnalyzingTopics(false);
    }
  };
  
  const handleRegenerateTopics = useCallback(async () => {
    if (preparedParts.length === 0) return;
    setIsAnalyzingTopics(true);
    setProcessingError(null);
    setTopics(null);
    try {
        const newTopics = await generateTopics(preparedParts);
        setTopics(newTopics);
        setSelectedTopics(newTopics);
    } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An error occurred.");
        setTopics([]);
    } finally {
        setIsAnalyzingTopics(false);
    }
  }, [preparedParts]);

  const handleStartQuizWithTopics = () => {
    if (!activeSet) return;
    const config: QuizConfig = {
        numberOfQuestions: numQuestions,
        mode: studyMode,
        knowledgeSource: knowledgeSource,
        topics: selectedTopics,
    };
    onStart(preparedParts, config, activeSet.id);
  };
  
  const handleSaveOnly = async () => {
    if (!setName.trim() || (!setContent.trim() && files.length === 0)) {
        setProcessingError("Set name and content are required.");
        return;
    };
    
    setIsProcessing(true);
    setProcessingError(null);

    try {
        const { combinedText, fileInfo } = await prepareQuizParts(setContent, files, onProgress);
        
        if (activeSet) {
            updateSet({ ...activeSet, name: setName, content: combinedText.trim(), fileInfo: [...(activeSet.fileInfo || []), ...fileInfo] });
        } else {
            addSet({ name: setName, content: combinedText.trim(), fileInfo });
        }

        handleShowList();

    } catch (err) {
        setProcessingError(err instanceof Error ? err.message : "An error occurred.");
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
        e.target.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== fileToRemove));
  };
  
  const FileUploader = ({ onChange }: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
        <label htmlFor="fileUpload" className="block text-lg font-medium text-text-secondary mb-3">Add Materials</label>
        <p className="text-sm text-gray-400 mb-2">Upload documents (.txt, .pdf, .docx, .md), spreadsheets (.xlsx, .csv), images (.png, .jpg), and audio (.mp3, .m4a, .wav).</p>
        <input type="file" id="fileUpload" multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,audio/*,.md,text/markdown" onChange={onChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"/>
        {files.length > 0 && (
          <div className="mt-4 text-left text-sm text-text-secondary bg-background-dark/50 p-3 rounded-md">
              <p className="font-bold mb-1">Files to add:</p>
              <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex justify-between items-center group bg-gray-700/50 p-2 rounded-md">
                        <span className="truncate" title={f.name}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 align-text-bottom" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            {f.name} <span className="text-gray-400 ml-2">({Math.round(f.size / 1024)} KB)</span>
                        </span>
                        <button onClick={() => handleRemoveFile(f)} className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white opacity-50 group-hover:opacity-100 transition-all ml-2 flex-shrink-0" aria-label={`Remove ${f.name}`}>
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
            <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setKnowledgeSource(KnowledgeSource.NOTES_ONLY)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.NOTES_ONLY ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes Only</p><p className="text-xs font-normal opacity-80">Strictly use my notes</p>
                </button>
                <button onClick={() => setKnowledgeSource(KnowledgeSource.GENERAL)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.GENERAL ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes + AI</p><p className="text-xs font-normal opacity-80">Supplement with AI</p>
                </button>
                 <button onClick={() => setKnowledgeSource(KnowledgeSource.WEB_SEARCH)} className={`px-4 py-3 rounded-lg font-semibold border-2 transition-all ${knowledgeSource === KnowledgeSource.WEB_SEARCH ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Notes + Web</p><p className="text-xs font-normal opacity-80">Use Google Search</p>
                </button>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-medium text-text-secondary mb-3">Study Mode</h3>
            <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => setStudyMode(StudyMode.PRACTICE)} className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all ${studyMode === StudyMode.PRACTICE ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Practice</p><p className="text-sm font-normal">Timed with scoring</p>
                </button>
                <button onClick={() => setStudyMode(StudyMode.REVIEW)} className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all ${studyMode === StudyMode.REVIEW ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Review</p><p className="text-sm font-normal">Untimed, self-paced</p>
                </button>
                <button onClick={() => setStudyMode(StudyMode.EXAM)} className={`px-6 py-3 rounded-lg font-semibold border-2 transition-all ${studyMode === StudyMode.EXAM ? 'bg-brand-primary text-white border-brand-primary' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>
                    <p className="font-bold">Exam</p><p className="text-sm font-normal">Open-ended questions</p>
                </button>
            </div>
        </div>
    </>
  );

  const ProcessingView = () => (
    <div className="bg-surface-dark p-8 rounded-xl min-h-[40vh] flex flex-col justify-center items-center text-center animate-fade-in">
        <LoadingSpinner />
        <p className="text-2xl font-bold text-text-primary mt-6 mb-4">{isAnalyzingTopics ? 'Analyzing topics...' : progressMessage || 'Preparing your files...'}</p>
        {(isProcessing || isAnalyzingTopics) && !isAnalyzingTopics && <div className="w-full max-w-sm"><ProgressBar progress={progressPercent} /></div>}
        <p className="mt-4 text-text-secondary">This may take a moment...</p>
    </div>
  );

  const renderListView = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Your Study Sets</h1>
        <button onClick={handleNewSet} className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all w-full sm:w-auto">
          + New Set
        </button>
      </div>
       {error && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{error}</span></div>}
       {processingError && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}
      
      {studySets.length === 0 ? (
        <div className="text-center py-16 px-6 bg-surface-dark rounded-xl">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome!</h2>
          <p className="text-text-secondary mb-6">You don't have any study sets yet. Create one to get started.</p>
          <button onClick={handleNewSet} className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all">Create Set</button>
        </div>
      ) : (
        <div className="space-y-4">
          {studySets.map(set => (
            <div key={set.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-lg gap-4">
              <div className="flex-grow">
                <h3 className="font-bold text-xl text-text-primary">{set.name}</h3>
                <p className="text-sm text-text-secondary flex items-center gap-2">
                    {set.fileInfo && set.fileInfo.length > 0 && <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a3 3 0 013-3z" clipRule="evenodd" /></svg>{set.fileInfo.length} files</>}
                    <span className="truncate">{set.content.substring(0, 100)}...</span>
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center flex-wrap justify-end">
                 <button onClick={() => onPredict(set.id)} className="px-3 py-2 text-sm bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-all">Predict</button>
                 <button onClick={() => handlePrepareForQuiz(set)} disabled={isProcessing} className="px-3 py-2 text-sm bg-brand-primary text-white font-bold rounded-md hover:bg-brand-secondary transition-all disabled:bg-gray-500">Study</button>
                 <button onClick={() => handleShowHistory(set)} className="px-3 py-2 text-sm bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-all">History</button>
                 <button onClick={() => handleShowDetails(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg></button>
                 <button onClick={() => handleEditSet(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                 <button onClick={() => deleteSet(set.id)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Details for "${setForDetails?.name}"`}>
        {setForDetails?.fileInfo && setForDetails.fileInfo.length > 0 ? (
            <ul className="space-y-2 text-text-secondary max-h-80 overflow-y-auto">
                {setForDetails.fileInfo.map((file, index) => (
                    <li key={index} className="flex items-center gap-3 bg-gray-700/50 p-2 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                        <span className="truncate">{file.name}</span>
                    </li>
                ))}
            </ul>
        ) : <p className="text-text-secondary">No files are associated with this study set.</p>}
      </Modal>
    </div>
  );
  
  const renderCreateEditView = () => (
    <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col flex-grow">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6 text-center">{activeSet ? 'Edit Study Set' : 'Create New Study Set'}</h1>
        
        <div className="flex-grow">
          {isProcessing || isAnalyzingTopics ? <ProcessingView /> : (
              <div className="space-y-8 bg-surface-dark p-6 sm:p-8 rounded-xl h-full">
                  <div>
                      <label htmlFor="setName" className="block text-lg font-medium text-text-secondary mb-2">Set Name</label>
                      <input type="text" id="setName" value={setName} onChange={e => setSetName(e.target.value)} placeholder="e.g., Biology Chapter 4" className="w-full p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                  </div>
                  {activeSet?.fileInfo && activeSet.fileInfo.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-text-secondary mb-2">Included Materials</h3>
                        <ul className="space-y-1 text-sm text-gray-400">
                            {activeSet.fileInfo.map((f, i) => <li key={i} className="truncate">- {f.name}</li>)}
                        </ul>
                      </div>
                  )}
                  <div>
                      <label htmlFor="setContent" className="block text-lg font-medium text-text-secondary mb-2">Paste Notes</label>
                      <textarea id="setContent" value={setContent} onChange={e => setSetContent(e.target.value)} placeholder="Paste your study material here, or upload files below." className="w-full h-40 p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                  </div>
                  <FileUploader onChange={handleFileChange} />
              </div>
          )}
        </div>
        
         {processingError && !isProcessing && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={() => handleSaveAndAnalyze(setContent, files)} disabled={isProcessing || isAnalyzingTopics || !setName.trim()} className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 flex items-center justify-center gap-2">Next: Configure Quiz</button>
            <button onClick={handleSaveOnly} disabled={isProcessing || isAnalyzingTopics || !setName.trim()} className="w-full sm:w-auto px-6 py-3 bg-brand-secondary text-white font-bold rounded-lg hover:bg-brand-primary transition-all disabled:bg-gray-500">{activeSet ? 'Save Changes' : 'Save & Close'}</button>
            <button onClick={handleShowList} disabled={isProcessing || isAnalyzingTopics} className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Cancel</button>
        </div>
    </div>
  );

  const renderTopicSelectionView = () => {
    if (!activeSet) return renderListView();

    const handleTopicToggle = (topic: string) => setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
    const handleSelectAll = () => topics && setSelectedTopics(topics);
    const handleDeselectAll = () => setSelectedTopics([]);

    return (
        <div className="animate-fade-in w-full max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Configure Your Quiz</h1>
            <p className="text-text-secondary mb-8 text-center">For "{activeSet.name}"</p>
            
            <div className="bg-surface-dark p-4 sm:p-8 rounded-xl space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-3"><h3 className="text-xl font-bold text-text-primary">Topics</h3><button onClick={handleRegenerateTopics} disabled={isAnalyzingTopics} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 disabled:opacity-50" title="Regenerate Topics"><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isAnalyzingTopics ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></button></div><div className="flex gap-2"><button onClick={handleSelectAll} className="text-sm font-semibold text-brand-primary hover:underline">Select All</button><span className="text-gray-500">|</span><button onClick={handleDeselectAll} className="text-sm font-semibold text-brand-primary hover:underline">Deselect All</button></div></div>
                    <div className="flex flex-col gap-3 max-h-60 min-h-[8rem] overflow-y-auto pr-2">
                         {isAnalyzingTopics ? <div className="col-span-full flex justify-center items-center h-full"><LoadingSpinner /></div> : topics && topics.length > 0 ? (
                            topics.map(topic => (
                                <label key={topic} className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all border-2 ${selectedTopics.includes(topic) ? 'bg-brand-primary/20 border-brand-primary' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}><input type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => handleTopicToggle(topic)} className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 text-brand-primary focus:ring-brand-primary mt-1 flex-shrink-0" /><span className="font-medium text-text-secondary flex-1">{topic}</span></label>
                            ))
                        ) : <div className="col-span-full text-center text-text-secondary flex flex-col justify-center items-center h-full"><p>No topics were generated.</p><p className="text-sm">Try regenerating or adding more content.</p></div>}
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-8"><FileUploader onChange={handleFileChange} />
                    {files.length > 0 && <div className="mt-4 text-center"><button onClick={() => handlePrepareForQuiz(activeSet, files)} className={`relative px-6 py-2 w-64 text-center font-bold rounded-lg transition-all overflow-hidden ${isProcessing ? 'bg-gray-700 cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-500 animate-pulse'}`} disabled={isProcessing}>{isProcessing && <div className="absolute top-0 left-0 h-full bg-correct transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>}<span className="relative z-10 text-white">{isProcessing ? `Analyzing... ${Math.round(progressPercent)}%` : 'Re-analyze with new files'}</span></button></div>}
                </div>

                <div className="border-t border-gray-700 pt-8 space-y-8 text-center"><QuizConfigurator /></div>
            </div>

            {processingError && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}

            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleStartQuizWithTopics} disabled={selectedTopics.length === 0 || isProcessing} className="w-full sm:w-auto px-12 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 flex items-center justify-center gap-2">Start Studying</button>
                <button onClick={handleShowList} disabled={isProcessing} className="w-full sm:w-auto px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Back to Sets</button>
            </div>
        </div>
    );
  };

  const renderHistoryView = () => {
    if (!activeSet) return renderListView();
    const history = getHistoryForSet(activeSet.id);
    
    return (
        <div className="animate-fade-in w-full max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Quiz History</h1>
            <p className="text-text-secondary mb-8 text-center">For "{activeSet.name}"</p>

            {history.length === 0 ? <div className="text-center py-16 px-6 bg-surface-dark rounded-xl"><h2 className="text-2xl font-semibold text-text-primary mb-2">No History Yet</h2><p className="text-text-secondary mb-6">Complete a quiz for this set to see your history here.</p></div> : (
                <div className="space-y-4">
                    {history.map((result) => (
                        <div key={result.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div><p className="font-bold text-text-primary">{new Date(result.date).toLocaleString()}</p><p className="text-sm text-text-secondary">Mode: {result.mode}</p></div>
                            <div className="flex items-center gap-6"><div><p className="text-xs text-text-secondary">Score</p><p className="font-bold text-xl text-brand-primary">{result.score}</p></div><div><p className="text-xs text-text-secondary">Accuracy</p><p className="font-bold text-xl text-brand-primary">{result.accuracy}%</p></div><button onClick={() => onReviewHistory(result.answerLog)} className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-all">Review</button></div>
                        </div>
                    ))}
                </div>
            )}
             <div className="mt-8 flex justify-center"><button onClick={handleShowList} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">Back to Study Sets</button></div>
        </div>
    );
  };

  if (isProcessing && action === 'LIST') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[80vh]"><LoadingSpinner /><p className="mt-4 text-lg text-text-secondary">{progressMessage || 'Preparing...'}</p><div className="w-full max-w-sm mt-2"><ProgressBar progress={progressPercent} /></div></div>
      );
  }

  switch (action) {
    case 'CREATE_EDIT': return renderCreateEditView();
    case 'TOPIC_SELECTION': return renderTopicSelectionView();
    case 'HISTORY': return renderHistoryView();
    case 'LIST': default: return renderListView();
  }
};

export default SetupScreen;
