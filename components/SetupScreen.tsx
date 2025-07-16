
import React, { useState, useCallback } from 'react';
import { StudyMode, StudySet, QuizConfig, PromptPart, KnowledgeSource } from '../types';
import { useStudySets } from '../hooks/useStudySets';

interface SetupScreenProps {
  onStart: (parts: PromptPart[], config: QuizConfig) => void;
  error: string | null;
}

type View = 'LIST' | 'CREATE_EDIT' | 'CONFIG';

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, error }) => {
  const [studySets, addSet, updateSet, deleteSet] = useStudySets();
  const [view, setView] = useState<View>('LIST');
  
  // State for Create/Edit view
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [setName, setSetName] = useState('');
  const [setContent, setSetContent] = useState('');
  const [fileStatus, setFileStatus] = useState('');

  // State for Config view
  const [configuringSet, setConfiguringSet] = useState<StudySet | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
  const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSource>(KnowledgeSource.NOTES_ONLY);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string|null>(null);

  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setFileStatus(`Reading ${files.length} file(s)...`);

    try {
      const fileContents = await Promise.all(
        Array.from(files).map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });
        })
      );
      setSetContent(prev => `${prev}\n\n${fileContents.join('\n\n')}`.trim());
      setFileStatus(`${files.length} file(s) loaded successfully.`);
    } catch (err) {
      setFileStatus(`Error reading files.`);
      console.error(err);
    }
  };
  
  const openCreateView = () => {
    setEditingSet(null);
    setSetName('');
    setSetContent('');
    setFileStatus('');
    setView('CREATE_EDIT');
  };

  const openEditView = (set: StudySet) => {
    setEditingSet(set);
    setSetName(set.name);
    setSetContent(set.content);
    setFileStatus('');
    setView('CREATE_EDIT');
  };
  
  const handleSaveSet = () => {
    if (!setName.trim() || !setContent.trim()) return;
    if (editingSet) {
      updateSet({ ...editingSet, name: setName, content: setContent });
    } else {
      addSet({ name: setName, content: setContent });
    }
    setView('LIST');
  };
  
  const openConfigView = (set: StudySet) => {
    setConfiguringSet(set);
    setFiles([]);
    setProcessingError(null);
    setView('CONFIG');
  };

  const handleStartFromConfig = async () => {
    if (!configuringSet || numQuestions < 5 || numQuestions > 50 || isProcessing) return;
    
    setIsProcessing(true);
    setProcessingError(null);
    
    const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const parts: PromptPart[] = [];
    let combinedText = configuringSet.content;

    try {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const base64Data = await toBase64(file);
                parts.push({
                    inlineData: { mimeType: file.type, data: base64Data }
                });
            } else if (file.type === 'application/pdf') {
                const pdfjsLib = (window as any).pdfjsLib;
                if (!pdfjsLib) {
                    throw new Error("PDF.js library is not loaded. Please refresh the page.");
                }
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    combinedText += '\n\n' + pageText;
                }
            } else if (file.type === 'text/plain') {
                 combinedText += '\n\n' + await file.text();
            }
        }

        if (combinedText.trim()) {
            parts.unshift({ text: combinedText.trim() });
        }

        if (parts.length === 0) {
            setProcessingError("Please provide some study material (notes, images, or PDFs).");
            setIsProcessing(false);
            return;
        }
        onStart(parts, { numberOfQuestions: numQuestions, mode: studyMode, knowledgeSource });
    } catch (err) {
        console.error("Error processing files:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file processing.";
        setProcessingError(errorMessage);
        setIsProcessing(false);
    }
  };

  const handleConfigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setFiles(Array.from(e.target.files));
    }
  };
  
  const renderListView = () => (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Your Study Sets</h1>
        <button onClick={openCreateView} className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105">
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
          <button onClick={openCreateView} className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all">
            Create Your First Study Set
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {studySets.map(set => (
            <div key={set.id} className="bg-surface-dark p-4 rounded-lg flex justify-between items-center transition-shadow hover:shadow-lg">
              <div>
                <h3 className="font-bold text-xl text-text-primary">{set.name}</h3>
                <p className="text-sm text-text-secondary">{set.content.substring(0, 80)}...</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditView(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                <button onClick={() => deleteSet(set.id)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                <button onClick={() => openConfigView(set)} className="px-4 py-2 bg-brand-primary text-white font-bold rounded-md hover:bg-brand-secondary transition-all">Study</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderCreateEditView = () => (
    <div className="animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-6">{editingSet ? 'Edit Study Set' : 'Create New Study Set'}</h1>
        <div className="space-y-6">
            <div>
                <label htmlFor="setName" className="block text-lg font-medium text-text-secondary mb-2">Set Name</label>
                <input type="text" id="setName" value={setName} onChange={e => setSetName(e.target.value)} placeholder="e.g., Biology Chapter 4" className="w-full p-3 bg-surface-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
            </div>
            <div>
                <label htmlFor="setContent" className="block text-lg font-medium text-text-secondary mb-2">Paste Notes</label>
                <textarea id="setContent" value={setContent} onChange={e => setSetContent(e.target.value)} placeholder="Paste your study material here..." className="w-full h-48 p-3 bg-surface-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
            </div>
            <div>
                <label htmlFor="fileUpload" className="block text-lg font-medium text-text-secondary mb-2">Or Upload Text Files</label>
                <input type="file" id="fileUpload" multiple accept=".txt" onChange={handleTextFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"/>
                {fileStatus && <p className="text-sm text-text-secondary mt-2">{fileStatus}</p>}
            </div>
        </div>
        <div className="mt-8 flex gap-4">
            <button onClick={handleSaveSet} disabled={!setName.trim() || !setContent.trim()} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">Save Set</button>
            <button onClick={() => setView('LIST')} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">Cancel</button>
        </div>
    </div>
  );

  const renderConfigView = () => (
    <div className="animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-lg text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Configure Quiz</h1>
            <p className="text-text-secondary mb-8">For "{configuringSet?.name}"</p>
            
            <div className="space-y-8 bg-surface-dark p-8 rounded-xl">
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
                    <label htmlFor="fileUpload" className="block text-lg font-medium text-text-secondary mb-3">Add Files (Optional)</label>
                    <p className="text-sm text-gray-400 mb-2">Supplement your notes with images or PDFs.</p>
                    <input 
                        type="file" 
                        id="fileUploadConfig" 
                        multiple 
                        accept=".txt,.pdf,image/png,image/jpeg,image/webp" 
                        onChange={handleConfigFileChange}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"
                    />
                    {files.length > 0 && (
                      <div className="mt-4 text-left text-sm text-text-secondary bg-background-dark/50 p-3 rounded-md">
                          <p className="font-bold mb-1">Selected files:</p>
                          <ul className="list-disc list-inside space-y-1">
                              {files.map(f => <li key={f.name}>{f.name} <span className="text-gray-400">({Math.round(f.size / 1024)} KB)</span></li>)}
                          </ul>
                      </div>
                    )}
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
            </div>
             {processingError && (
                <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
                  <strong className="font-bold">Processing Error: </strong>
                  <span className="block sm:inline">{processingError}</span>
                </div>
              )}
            <div className="mt-8 flex justify-center gap-4">
                <button onClick={handleStartFromConfig} disabled={isProcessing} className="px-12 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isProcessing && <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>}
                  {isProcessing ? 'Processing...' : 'Start Studying'}
                </button>
                <button onClick={() => setView('LIST')} className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">Back</button>
            </div>
        </div>
    </div>
  );

  switch (view) {
    case 'CREATE_EDIT':
      return renderCreateEditView();
    case 'CONFIG':
      return renderConfigView();
    case 'LIST':
    default:
      return renderListView();
  }
};

export default SetupScreen;
