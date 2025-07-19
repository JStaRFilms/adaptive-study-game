
import React, { useState } from 'react';
import { StudyMode, StudySet, KnowledgeSource } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ProgressBar from '../common/ProgressBar';

const QuizConfigurator: React.FC<{
    numQuestions: number, setNumQuestions: (n: number) => void,
    knowledgeSource: KnowledgeSource, setKnowledgeSource: (k: KnowledgeSource) => void,
    studyMode: StudyMode, setStudyMode: (s: StudyMode) => void
}> = ({ numQuestions, setNumQuestions, knowledgeSource, setKnowledgeSource, studyMode, setStudyMode}) => (
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

interface TopicSelectorProps {
    activeSet: StudySet;
    topics: string[] | null;
    isAnalyzingTopics: boolean;
    isProcessing: boolean;
    processingError: string | null;
    progressPercent: number;
    onStartQuiz: (config: { numQuestions: number, studyMode: StudyMode, knowledgeSource: KnowledgeSource, selectedTopics: string[]}) => void;
    onBack: () => void;
    onRegenerateTopics: () => void;
    onReanalyzeWithFiles: (files: File[]) => void;
}


const TopicSelector: React.FC<TopicSelectorProps> = ({
    activeSet, topics, isAnalyzingTopics, isProcessing, processingError, progressPercent, onStartQuiz, onBack, onRegenerateTopics, onReanalyzeWithFiles
}) => {
    const [selectedTopics, setSelectedTopics] = useState<string[]>(topics || []);
    const [numQuestions, setNumQuestions] = useState(10);
    const [studyMode, setStudyMode] = useState<StudyMode>(StudyMode.PRACTICE);
    const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSource>(KnowledgeSource.NOTES_ONLY);
    const [files, setFiles] = useState<File[]>([]);

    const handleTopicToggle = (topic: string) => setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
    const handleSelectAll = () => topics && setSelectedTopics(topics);
    const handleDeselectAll = () => setSelectedTopics([]);

    const handleStartClick = () => {
        onStartQuiz({ numQuestions, studyMode, knowledgeSource, selectedTopics });
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

    const handleReanalyzeClick = () => {
        onReanalyzeWithFiles(files);
        setFiles([]);
    }

    if (isProcessing) {
        return (
             <div className="animate-fade-in w-full max-w-2xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2 text-center">Re-analyzing Materials</h1>
                <p className="text-text-secondary mb-8 text-center">For "{activeSet.name}"</p>
                <div className="bg-surface-dark p-8 rounded-xl min-h-[40vh] flex flex-col justify-center items-center text-center">
                    <LoadingSpinner />
                    <p className="text-lg font-semibold text-text-primary mt-6 mb-4">Analyzing new files and topics...</p>
                    <div className="w-full max-w-sm"><ProgressBar progress={progressPercent} /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in w-full max-w-3xl mx-auto">
            <header className="relative text-center">
                <button onClick={onBack} className="absolute top-0 left-0 p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors" aria-label="Go back">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                 <button onClick={onBack} className="absolute top-0 right-0 p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Configure Quiz</h1>
                <p className="text-text-secondary mb-8">For "{activeSet.name}"</p>
            </header>
            
            <div className="bg-surface-dark p-6 sm:p-8 rounded-xl space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-text-primary">Topics</h3>
                            <button onClick={onRegenerateTopics} disabled={isAnalyzingTopics} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 disabled:opacity-50" title="Regenerate Topics">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isAnalyzingTopics ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSelectAll} className="text-sm font-semibold text-brand-primary hover:underline">Select All</button>
                            <span className="text-gray-500">|</span>
                            <button onClick={handleDeselectAll} className="text-sm font-semibold text-brand-primary hover:underline">Deselect All</button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
                         {isAnalyzingTopics ? <div className="flex justify-center items-center h-48"><LoadingSpinner /></div> : topics && topics.length > 0 ? (
                            topics.map(topic => (
                                <label key={topic} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all border-2 ${selectedTopics.includes(topic) ? 'bg-brand-secondary/30 border-brand-primary' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                    <input type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => handleTopicToggle(topic)} className="sr-only"/>
                                    <div className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center border-2 ${selectedTopics.includes(topic) ? 'bg-brand-primary border-brand-primary' : 'bg-slate-700 border-slate-600'}`}>
                                        {selectedTopics.includes(topic) && (
                                            <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <span className="font-medium text-text-primary flex-1">{topic}</span>
                                </label>
                            ))
                        ) : <div className="text-center text-text-secondary flex flex-col justify-center items-center h-48 py-4"><p>No topics were generated.</p><p className="text-sm">Try regenerating or adding more content.</p></div>}
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                     <h3 className="text-xl font-bold text-text-primary mb-2">Add More Materials</h3>
                    <p className="text-sm text-gray-400 mb-3">You can add supplemental files before generating the quiz.</p>
                    <div className="bg-background-dark p-4 rounded-lg">
                        <input type="file" id="fileUpload-topics" multiple accept=".txt,.pdf,.docx,.xlsx,.csv,image/*,audio/*,.md,text/markdown" onChange={handleFileChange} className="hidden"/>
                        <label htmlFor="fileUpload-topics" className="w-full cursor-pointer bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-secondary transition-all inline-block text-center">Choose files</label>
                        {files.length > 0 && (
                          <div className="mt-4 text-left text-sm text-text-secondary p-3 rounded-md">
                              <p className="font-bold mb-2">Files to add:</p>
                              <ul className="space-y-2">
                                  {files.map((f, i) => (
                                    <li key={`${f.name}-${i}`} className="flex justify-between items-center group bg-gray-700/50 p-2 rounded-md">
                                        <span className="truncate" title={f.name}>{f.name}</span>
                                        <button onClick={() => handleRemoveFile(f)} className="p-1 rounded-full text-gray-400 hover:bg-red-500 hover:text-white ml-2 flex-shrink-0" aria-label={`Remove ${f.name}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </li>
                                  ))}
                              </ul>
                               <button onClick={handleReanalyzeClick} className="mt-4 w-full bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-all">Re-analyze with new files</button>
                          </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-8 space-y-8 text-center">
                    <QuizConfigurator 
                        numQuestions={numQuestions} setNumQuestions={setNumQuestions}
                        knowledgeSource={knowledgeSource} setKnowledgeSource={setKnowledgeSource}
                        studyMode={studyMode} setStudyMode={setStudyMode}
                    />
                </div>
            </div>

            {processingError && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mt-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}

            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button onClick={handleStartClick} disabled={selectedTopics.length === 0 || isProcessing || isAnalyzingTopics} className="w-full sm:w-auto px-12 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-500 flex items-center justify-center gap-2">Start Studying</button>
                <button onClick={onBack} disabled={isProcessing || isAnalyzingTopics} className="w-full sm:w-auto px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all disabled:opacity-50">Back to Sets</button>
            </div>
        </div>
    );
};

export default TopicSelector;
