import React, { useState, useEffect } from 'react';
import { StudySet } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ProgressBar from '../common/ProgressBar';

interface FileUploaderProps {
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileToRemove: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFileChange, onRemoveFile }) => (
  <div>
      <label htmlFor="fileUpload" className="block text-lg font-medium text-text-secondary mb-3">Add Materials</label>
      <p className="text-sm text-gray-400 mb-2">Upload documents (.txt, .pdf, .docx, .md), spreadsheets (.xlsx, .csv), images (.png, .jpg), and audio (.mp3, .m4a, .wav).</p>
      <input type="file" id="fileUpload" multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,audio/*,.md,text/markdown,.pptx" onChange={onFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"/>
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
                      <button onClick={() => onRemoveFile(f)} className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white opacity-50 group-hover:opacity-100 transition-all ml-2 flex-shrink-0" aria-label={`Remove ${f.name}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </li>
                ))}
            </ul>
        </div>
      )}
  </div>
);

const ProcessingView = ({ message, progress }: { message: string, progress: number }) => (
    <div className="bg-surface-dark p-8 rounded-xl min-h-[40vh] flex flex-col justify-center items-center text-center animate-fade-in">
        <LoadingSpinner />
        <p className="text-2xl font-bold text-text-primary mt-6 mb-4">{message}</p>
        <div className="w-full max-w-sm"><ProgressBar progress={progress} /></div>
        <p className="mt-4 text-text-secondary">This may take a moment...</p>
        <p className="mt-2 text-sm text-yellow-400">Please keep this page open. Leaving the app may interrupt the process.</p>
    </div>
);

interface StudySetFormProps {
    activeSet: StudySet | null;
    initialContent?: string | null;
    isProcessing: boolean;
    isAnalyzingTopics: boolean;
    processingError: string | null;
    progressMessage: string | null;
    progressPercent: number;
    onSave: (data: { name: string; content: string; files: File[] }) => void;
    onSaveOnly: (data: { name: string; content: string; files: File[] }) => void;
    onCancel: () => void;
}

const StudySetForm: React.FC<StudySetFormProps> = ({
    activeSet, initialContent, isProcessing, isAnalyzingTopics, processingError, progressMessage, progressPercent, onSave, onSaveOnly, onCancel
}) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [internalError, setInternalError] = useState<string | null>(null);

    useEffect(() => {
        if (activeSet) {
            setName(activeSet.name);
            setContent(activeSet.content);
            setFiles([]); // Don't show existing files in the "add" list
        } else if (initialContent) {
            setContent(initialContent);
            setName('');
            setFiles([]);
        } else {
            setName('');
            setContent('');
            setFiles([]);
        }
    }, [activeSet, initialContent]);

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

    const handleSaveAndAnalyzeClick = () => {
        setInternalError(null);
        if (!name.trim()) { setInternalError("Please provide a name for your new study set."); return; }
        if (!content.trim() && files.length === 0 && (!activeSet || !activeSet.persistedFiles || activeSet.persistedFiles.length === 0)) { 
            setInternalError("Please provide some study material to analyze."); 
            return; 
        }
        onSave({ name, content, files });
    };

    const handleSaveOnlyClick = () => {
        setInternalError(null);
        if (!name.trim()) { setInternalError("Please provide a name."); return; }
        if (!content.trim() && files.length === 0 && (!activeSet || !activeSet.persistedFiles || activeSet.persistedFiles.length === 0)) { 
            setInternalError("Please provide some study material to save."); 
            return; 
        }
        onSaveOnly({ name, content, files });
    };
    
    return (
        <div className="animate-fade-in w-full max-w-2xl mx-auto flex flex-col flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6 text-center">{activeSet ? 'Edit Study Set' : 'Create New Study Set'}</h1>
            
            <div className="flex-grow">
                {isProcessing || isAnalyzingTopics ? (
                    <ProcessingView message={isAnalyzingTopics ? 'Analyzing topics...' : progressMessage || 'Preparing your files...'} progress={progressPercent} />
                ) : (
                    <div className="space-y-8 bg-surface-dark p-6 sm:p-8 rounded-xl h-full">
                        <div>
                            <label htmlFor="setName" className="block text-lg font-medium text-text-secondary mb-2">Set Name</label>
                            <input type="text" id="setName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Biology Chapter 4" className="w-full p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                        </div>
                        {activeSet?.persistedFiles && activeSet.persistedFiles.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium text-text-secondary mb-2">Included Materials</h3>
                                <ul className="space-y-1 text-sm text-gray-400 max-h-24 overflow-y-auto pr-2">
                                    {activeSet.persistedFiles.map((f, i) => <li key={i} className="truncate">- {f.name}</li>)}
                                </ul>
                            </div>
                        )}
                        <div>
                            <label htmlFor="setContent" className="block text-lg font-medium text-text-secondary mb-2">Paste Notes</label>
                            <textarea id="setContent" value={content} onChange={e => setContent(e.target.value)} placeholder="Paste your study material here, or upload files below." className="w-full h-40 p-3 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                        </div>
                        <FileUploader files={files} onFileChange={handleFileChange} onRemoveFile={handleRemoveFile} />
                    </div>
                )}
            </div>
            
            {(processingError || internalError) && !isProcessing && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6" role="alert"><span className="block sm:inline">{processingError || internalError}</span></div>}
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleSaveAndAnalyzeClick} disabled={isProcessing || isAnalyzingTopics || !name.trim()} className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 flex items-center justify-center gap-2">Next: Configure Quiz</button>
                <button onClick={handleSaveOnlyClick} disabled={isProcessing || isAnalyzingTopics || !name.trim()} className="w-full sm:w-auto px-6 py-3 bg-brand-secondary text-white font-bold rounded-lg hover:bg-brand-primary transition-all disabled:bg-gray-500">{activeSet ? 'Save Changes' : 'Save & Close'}</button>
                <button onClick={onCancel} disabled={isProcessing || isAnalyzingTopics} className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Cancel</button>
            </div>
        </div>
    );
};

export default StudySetForm;