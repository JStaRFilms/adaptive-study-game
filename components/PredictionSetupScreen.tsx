import React, { useState, useCallback, useRef } from 'react';
import { StudySet, PromptPart } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
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

// --- Internal Components for the new design ---

const SectionHeader: React.FC<{ number: string; title: string }> = ({ number, title }) => (
    <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-700 text-cyan-400 font-bold rounded-full border-2 border-slate-600">
            {number}
        </div>
        <h2 className="text-xl font-bold text-text-primary tracking-wide">{title}</h2>
    </div>
);

const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const ToolIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;


const FileDropzone: React.FC<{
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}> = ({ id, icon, title, description, files, onFilesChange }) => {
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
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="flex items-center gap-4 mb-3">
        {icon}
        <div>
          <h3 className="font-bold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      <div
        onDragOver={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors ${isDragging ? 'border-cyan-400 bg-cyan-900/20' : 'border-slate-600 hover:border-slate-500'}`}
      >
        <input type="file" id={id} multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,.md" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <p className="text-text-secondary">Drag & Drop Files or Click to Browse</p>
      </div>
      {files.length > 0 && (
        <div className="mt-3 text-left text-sm text-text-secondary bg-slate-900/50 p-2 rounded-md max-h-28 overflow-y-auto">
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex justify-between items-center group bg-slate-700/50 p-1.5 rounded-md">
                <span className="truncate" title={f.name}>{f.name}</span>
                <button onClick={() => handleRemoveFile(f)} className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white ml-2 flex-shrink-0" aria-label={`Remove ${f.name}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


const PredictionSetupScreen: React.FC<PredictionSetupScreenProps> = ({ studySet, onGenerate, onCancel, error }) => {
    const [teacherName, setTeacherName] = useState('');
    const [persona, setPersona] = useState('');
    const [hints, setHints] = useState('');
    const [numPredictions, setNumPredictions] = useState(10);
    const [isProcessing, setIsProcessing] = useState(false);

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
            // Original study set content always forms the base of the core notes
            const coreNotesParts = await processFilesToParts(files.core);
            coreNotesParts.unshift({text: studySet.content });

            const pastQuestionsParts = await processFilesToParts(files.past);
            const otherMaterialsParts = await processFilesToParts(files.related);

            onGenerate({
                teacherName, persona, hints, numPredictions,
                coreNotesParts, 
                pastQuestionsParts, // For exams/quizzes
                pastTestsParts: [], // Keep prop for compatibility, but merge logic
                otherMaterialsParts // For syllabus, etc.
            });

        } catch (err) {
            console.error("Error processing files for prediction", err);
        } finally {
            // The parent component handles the state change, so we might not need to set it back here
            // setIsProcessing(false);
        }
    };
    
    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
               <LoadingSpinner />
               <p className="mt-4 text-lg text-text-secondary">Building case file and initiating analysis...</p>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in w-full max-w-6xl mx-auto">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-bold text-cyan-400 tracking-widest">EXAM PREDICTOR // CASE FILE BUILDER</h1>
                <p className="text-text-secondary">Based on your study set: <span className="font-bold text-text-primary">"{studySet.name}"</span></p>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Profile Section */}
                    <section className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                        <SectionHeader number="01" title="Profile the Target" />
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="teacherName" className="text-sm font-bold text-text-secondary mb-1 block">Target's Name (Optional)</label>
                                <input type="text" id="teacherName" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="e.g., Prof. Alistair Finch" className="w-full p-2 bg-slate-900 border-2 border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                            <div>
                                <label htmlFor="persona" className="text-sm font-bold text-text-secondary mb-1 block">Teaching Style & Tendencies</label>
                                <textarea id="persona" value={persona} onChange={e => setPersona(e.target.value)} placeholder="Describe the target's style. Do they love theory or memorization? Are questions usually multi-part? Do they focus on textbook chapters or their own lecture slides?" className="w-full h-28 p-2 bg-slate-900 border-2 border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                             <div>
                                <label htmlFor="hints" className="text-sm font-bold text-text-secondary mb-1 block">Known Hints & Clues</label>
                                <textarea id="hints" value={hints} onChange={e => setHints(e.target.value)} placeholder="Log any direct intelligence. e.g., 'Chapter 5 will be on the test for sure', or 'Make sure you understand the main theme...'" className="w-full h-24 p-2 bg-slate-900 border-2 border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                        </div>
                    </section>

                    {/* Request Section */}
                    <section className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                        <SectionHeader number="03" title="Request the Analysis" />
                        <div className="space-y-4">
                            <div>
                               <label htmlFor="num-predictions" className="text-sm font-bold text-text-secondary mb-2 block">Number of Predicted Questions</label>
                               <div className="flex items-center gap-4">
                                   <input type="range" id="num-predictions" value={numPredictions} onChange={e => setNumPredictions(parseInt(e.target.value))} min="3" max="20" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                   <span className="font-bold text-cyan-400 text-lg w-8 text-center">{numPredictions}</span>
                               </div>
                            </div>
                            <button type="submit" className="w-full mt-4 p-4 bg-cyan-500 text-slate-900 font-bold text-lg rounded-lg shadow-lg hover:bg-cyan-400 transition-all disabled:bg-slate-600">Initiate Analysis</button>
                            <button type="button" onClick={onCancel} className="w-full mt-2 p-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 transition-all">Cancel</button>
                        </div>
                    </section>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-3">
                     <section className="bg-slate-800 p-6 rounded-lg border border-slate-700 h-full">
                        <SectionHeader number="02" title="Gather the Evidence" />
                        <div className="space-y-4">
                            <FileDropzone id="core-notes" icon={<FileIcon/>} title="The Crime Scene (Core Notes)" description="Your primary study set is the foundation." files={files.core} onFilesChange={(f) => setFiles(p => ({...p, core: f}))} />
                            <FileDropzone id="past-offenses" icon={<BuildingIcon/>} title="Past Offenses (Exams/Quizzes)" description="The most valuable clues for prediction." files={files.past} onFilesChange={(f) => setFiles(p => ({...p, past: f}))} />
                            <FileDropzone id="related-docs" icon={<ToolIcon/>} title="Related Docs (Syllabus, etc.)" description="Catch-all for study guides, articles." files={files.related} onFilesChange={(f) => setFiles(p => ({...p, related: f}))} />
                        </div>
                     </section>
                </div>
            </form>
             {error && <div className="mt-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-center" role="alert">{error}</div>}
        </div>
    );
};

export default PredictionSetupScreen;
