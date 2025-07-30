import React, { useState, useCallback, useRef } from 'react';
import { StudySet, PromptPart } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import LoadingSpinner from './common/LoadingSpinner';

// Configure the PDF.js worker
if (pdfjsLib.version) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PredictionSetupScreenProps {
  studySet: StudySet;
  onGenerate: (data: any) => void;
  onCancel: () => void;
  error: string | null;
}

const SectionTitle: React.FC<{ step: string; title: string; }> = ({ step, title }) => (
    <h3 className="font-display border-b-2 border-case-paper-lines pb-2 mb-6 text-xl">
        <span className="bg-case-accent-red text-white py-1 px-2.5 mr-2 font-serif font-bold text-xs rounded-sm">
            {step}
        </span>
        {title}
    </h3>
);

const EvidenceFolder: React.FC<{
  id: string;
  title: string;
  description: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  rotation?: string;
}> = ({ id, title, description, files, onFilesChange, rotation = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let newFiles: File[] = [];
    if ('dataTransfer' in e) {
        newFiles = Array.from(e.dataTransfer.files);
    } else if (e.target && 'files' in e.target && e.target.files) {
        newFiles = Array.from(e.target.files);
    }
    onFilesChange([...files, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    handleFileChange(e);
  };
  
  const handleRemoveFile = (fileToRemove: File) => {
    onFilesChange(files.filter(f => f !== fileToRemove));
  };

  return (
    <div className={`evidence-folder rounded relative mb-6 p-4 pt-6 ${rotation}`}>
        <div className="folder-tab absolute rounded-t-md font-bold text-sm px-4 py-1">{title}</div>
        <div
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 border-2 border-dashed rounded-sm text-center cursor-pointer transition-colors ${isDragging ? 'border-case-accent-red bg-red-100/50' : 'border-case-text-secondary hover:border-case-text-primary'}`}
        >
            <input type="file" id={id} multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,.md,.pptx" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <p className="text-case-text-secondary pointer-events-none">{description}</p>
        </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 list-none p-0 max-h-24 overflow-y-auto">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex justify-between items-center group bg-case-paper text-sm p-1.5 shadow-sm">
                <span className="truncate flex items-center" title={f.name}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" className="mr-1.5 fill-current text-case-text-secondary flex-shrink-0"><path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M13,3.5L18.5,9H13V3.5Z" /></svg>
                    {f.name}
                </span>
                <button onClick={() => handleRemoveFile(f)} className="p-0.5 text-gray-500 hover:bg-case-accent-red hover:text-white ml-2 flex-shrink-0" aria-label={`Remove ${f.name}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </li>
            ))}
          </ul>
      )}
    </div>
  );
};


const PredictionSetupScreen: React.FC<PredictionSetupScreenProps> = ({ studySet, onGenerate, onCancel, error }) => {
    const [numPredictions, setNumPredictions] = useState(10);
    const [isProcessing, setIsProcessing] = useState(false);
    const [teacherName, setTeacherName] = useState('');
    const [persona, setPersona] = useState('');
    const [hints, setHints] = useState('');

    const [files, setFiles] = useState<{ core: File[], past: File[], related: File[] }>({
        core: [],
        past: [],
        related: []
    });

    const processFilesToParts = useCallback(async (filesToProcess: File[]): Promise<PromptPart[]> => {
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });

        let parts: PromptPart[] = [];
        let combinedText = '';

        for (const file of filesToProcess) {
            if (file.type.startsWith('image/')) {
                parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    combinedText += textContent.items.map((item: any) => ('str' in item) ? item.str : '').join(' ') + '\n';
                }
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                combinedText += (await mammoth.extractRawText({ arrayBuffer })).value;
            } else {
                combinedText += await file.text();
            }
        }
        if (combinedText.trim()) parts.unshift({ text: combinedText.trim() });
        return parts;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        
        try {
            const coreNotesParts = await processFilesToParts(files.core);
            coreNotesParts.unshift({text: studySet.content });

            const pastQuestionsParts = await processFilesToParts(files.past);
            const otherMaterialsParts = await processFilesToParts(files.related);

            onGenerate({
                teacherName, 
                persona, 
                hints,
                numPredictions,
                coreNotesParts, 
                pastQuestionsParts,
                pastTestsParts: [], 
                otherMaterialsParts
            });

        } catch (err) {
            console.error("Error processing files for prediction", err);
        }
    };
    
    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-case-paper font-display">
               <LoadingSpinner />
               <p className="mt-4 text-lg">Building case file... initiating analysis...</p>
               <p className="mt-2 text-sm text-yellow-300">Please keep this page open to ensure analysis completes.</p>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in w-full max-w-6xl mx-auto font-serif text-case-text-primary">
            <header className="text-center mb-8">
                <div className="inline-block border-2 border-white/50 p-2 mb-4">
                    <h1 className="text-2xl md:text-3xl font-display text-case-paper tracking-widest">CONFIDENTIAL // EXAM ANALYSIS DIVISION</h1>
                </div>
                <h2 className="text-xl font-serif text-white/70 font-normal">CASE FILE BUILDER FOR: "{studySet.name}"</h2>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                
                {/* Step 1 */}
                <section className="paper-section bg-case-paper p-8 shadow-2xl rounded-sm lg:col-span-3">
                    <SectionTitle step="STEP 1" title="Profile the Suspect" />
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="teacher-name" className="font-display text-case-text-secondary block mb-1">Suspect's Alias:</label>
                            <input type="text" id="teacher-name" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="e.g., Professor Moriarty" className="w-full bg-transparent border-0 border-b border-case-paper-lines p-2 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-case-accent-red"/>
                        </div>
                            <div>
                            <label htmlFor="persona" className="font-display text-case-text-secondary block mb-1">Modus Operandi (Teaching Style):</label>
                            <textarea id="persona" value={persona} onChange={e => setPersona(e.target.value)} rows={5} placeholder="Detail the suspect's patterns. Theory or memorization? Multi-part questions? Favors textbook chapters or lecture slides?" className="w-full bg-transparent border-0 border-b border-case-paper-lines p-2 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-case-accent-red resize-y leading-relaxed"/>
                        </div>
                        <div>
                            <label htmlFor="known-hints" className="font-display text-case-text-secondary block mb-1">Intercepted Intel (Hints & Clues):</label>
                            <textarea id="known-hints" value={hints} onChange={e => setHints(e.target.value)} rows={4} placeholder="Log any direct chatter. e.g., 'Chapter 5 is key,' or 'Remember the underlying theme...'" className="w-full bg-transparent border-0 border-b border-case-paper-lines p-2 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-case-accent-red resize-y leading-relaxed"/>
                        </div>
                    </div>
                </section>
                
                {/* Step 2 */}
                <aside className="lg:col-span-2 lg:row-span-2 cork-board rounded p-6 pt-12 relative">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-50 p-2 px-4 shadow-md font-display z-10">
                            <span className="bg-case-accent-red text-white text-xs py-0.5 px-1.5 mr-2 font-serif font-bold">STEP 2</span>
                            Gather the Evidence
                    </div>
                    <EvidenceFolder 
                        id="core-notes"
                        title="Core Notes" 
                        description={`Drop "Crime Scene" files here`}
                        files={files.core} 
                        onFilesChange={(f) => setFiles(p => ({...p, core: f}))} 
                        rotation="transform rotate-1"
                    />
                    <EvidenceFolder 
                        id="past-offenses" 
                        title="Past Offenses"
                        description="Drop past exams/quizzes" 
                        files={files.past} 
                        onFilesChange={(f) => setFiles(p => ({...p, past: f}))} 
                        rotation="transform -rotate-2"
                    />
                    <EvidenceFolder 
                        id="related-docs" 
                        title="Related Docs"
                        description="Drop syllabus, guides, etc."
                        files={files.related} 
                        onFilesChange={(f) => setFiles(p => ({...p, related: f}))} 
                        rotation="transform rotate-1"
                    />
                </aside>

                {/* Step 3 */}
                <section className="paper-section bg-case-paper p-8 shadow-2xl rounded-sm flex flex-col lg:col-span-3">
                    <SectionTitle step="STEP 3" title="Request the Analysis" />
                        <div className="form-group flex-grow">
                        <label htmlFor="prediction-count" className="font-display text-case-text-secondary block mb-2">Number of Predicted Questions:</label>
                        <div className="flex items-center gap-4">
                            <input type="range" id="prediction-count" value={numPredictions} onChange={e => setNumPredictions(parseInt(e.target.value))} min="5" max="25" step="1" className="case-slider"/>
                            <span className="bg-gray-200 text-case-text-primary font-display text-lg py-1 px-3 shadow-inner border border-gray-300">{numPredictions}</span>
                        </div>
                    </div>
                        <button type="submit" className="w-full p-3 bg-case-accent-red text-white font-bold font-serif text-lg tracking-wider shadow-lg hover:bg-red-800 transition-all disabled:bg-gray-500 flex items-center justify-center gap-2 mt-8">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
                        SUBMIT FOR ANALYSIS
                    </button>
                </section>

            </form>
            
             {error && <div className="mt-6 bg-red-900/80 border border-red-500 text-red-100 px-4 py-3 text-center font-serif" role="alert">{error}</div>}
             <div className="text-center mt-8">
                 <button type="button" onClick={onCancel} className="font-display text-case-paper hover:underline transition-all">Cancel and Return to Sets</button>
             </div>
        </div>
    );
};

export default PredictionSetupScreen;