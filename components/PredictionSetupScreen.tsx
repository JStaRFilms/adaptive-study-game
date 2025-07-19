import React, { useState, useCallback } from 'react';
import { StudySet, PromptPart, FileInfo } from '../types';
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

const MultiFileUploader: React.FC<{
    id: string;
    label: string;
    files: File[];
    onFilesChange: (files: File[]) => void;
}> = ({ id, label, files, onFilesChange }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            onFilesChange([...files, ...newFiles]);
            e.target.value = '';
        }
    };
    const handleRemoveFile = (fileToRemove: File) => {
        onFilesChange(files.filter(f => f !== fileToRemove));
    };

    return (
        <div>
            <label htmlFor={id} className="block text-lg font-medium text-text-secondary mb-2">{label}</label>
            <input type="file" id={id} multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,audio/*,.md" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary"/>
            {files.length > 0 && (
                <div className="mt-3 text-left text-sm text-text-secondary bg-background-dark/50 p-2 rounded-md max-h-40 overflow-y-auto">
                    <ul className="space-y-1">
                        {files.map((f, i) => (
                            <li key={`${f.name}-${i}`} className="flex justify-between items-center group bg-gray-700/50 p-1.5 rounded-md">
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
    const [numPredictions, setNumPredictions] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);

    const [pastQuestions, setPastQuestions] = useState<File[]>([]);
    const [pastTests, setPastTests] = useState<File[]>([]);
    const [otherMaterials, setOtherMaterials] = useState<File[]>([]);

    const processFilesToParts = useCallback(async (files: File[]): Promise<PromptPart[]> => {
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });

        let parts: PromptPart[] = [];
        let combinedText = '';

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
            } else if (file.type.startsWith('audio/')) {
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
            const coreNotesParts = await processFilesToParts([]); // This uses the saved content string
            coreNotesParts.unshift({text: studySet.content });

            const pastQuestionsParts = await processFilesToParts(pastQuestions);
            const pastTestsParts = await processFilesToParts(pastTests);
            const otherMaterialsParts = await processFilesToParts(otherMaterials);

            onGenerate({
                teacherName, persona, hints, numPredictions,
                coreNotesParts, pastQuestionsParts, pastTestsParts, otherMaterialsParts
            });

        } catch (err) {
            console.error("Error processing files for prediction", err);
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <div className="animate-fade-in w-full max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Exam Prediction</h1>
            <p className="text-text-secondary mb-8 text-center">For "{studySet.name}"</p>

            {isProcessing ? (
                 <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-text-secondary">Processing materials...</p>
                 </div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-surface-dark p-6 sm:p-8 rounded-xl space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Teacher Profile (Optional)</h2>
                        <p className="text-sm text-gray-400 mb-4">Help the AI think like your teacher by providing some details.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Teacher's Name" className="p-2 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            <textarea value={persona} onChange={e => setPersona(e.target.value)} placeholder="e.g., 'Loves trick questions', 'Focuses on concepts over dates', 'Always includes one question from the first chapter...'" className="md:col-span-2 h-24 p-2 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-6">
                        <h2 className="text-xl font-bold text-text-primary mb-2">Key Information</h2>
                        <textarea value={hints} onChange={e => setHints(e.target.value)} placeholder="e.g., 'The teacher said chapter 5 is very important', 'Hinted that the final question will be about the main theme of the course...'" className="w-full h-24 p-2 bg-background-dark border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                         <h2 className="text-xl font-bold text-text-primary mb-4">Reference Materials</h2>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <MultiFileUploader id="past-questions" label="Past Exams" files={pastQuestions} onFilesChange={setPastQuestions} />
                             <MultiFileUploader id="past-tests" label="Past Quizzes" files={pastTests} onFilesChange={setPastTests} />
                             <MultiFileUploader id="other-materials" label="Other Materials" files={otherMaterials} onFilesChange={setOtherMaterials} />
                         </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6 text-center">
                        <label htmlFor="num-predictions" className="block text-lg font-medium text-text-secondary mb-2">Number of Predictions</label>
                        <input type="number" id="num-predictions" value={numPredictions} onChange={e => setNumPredictions(parseInt(e.target.value))} min="3" max="20" className="w-24 p-2 text-center text-xl bg-gray-900 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                     {error && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg" role="alert">{error}</div>}
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button type="submit" className="w-full sm:w-auto px-10 py-4 bg-purple-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-purple-500 transition-all">Generate Predictions</button>
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PredictionSetupScreen;
