import React, { useState } from 'react';
import { StudySet, PromptPart } from '../../types';
import Modal from '../common/Modal';
import Tooltip from '../common/Tooltip';


interface StudySetListProps {
  studySets: StudySet[];
  error: string | null;
  processingError: string | null;
  isProcessing: boolean;
  onNewSet: () => void;
  onEditSet: (set: StudySet) => void;
  onDeleteSet: (id: string) => void;
  onPredict: (id: string) => void;
  onPrepareForQuiz: (parts: PromptPart[], set: StudySet) => void;
  onShowHistory: (set: StudySet) => void;
  onShowStats: () => void;
  onStartSrsQuiz: () => void;
  reviewPoolCount: number;
}

const StudySetList: React.FC<StudySetListProps> = ({
  studySets,
  error,
  processingError,
  isProcessing,
  onNewSet,
  onEditSet,
  onDeleteSet,
  onPredict,
  onPrepareForQuiz,
  onShowHistory,
  onShowStats,
  onStartSrsQuiz,
  reviewPoolCount,
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [setForDetails, setSetForDetails] = useState<StudySet | null>(null);

  const handleShowDetails = (set: StudySet) => {
    setSetForDetails(set);
    setIsDetailsModalOpen(true);
  };

  const handlePrepareWrapper = (set: StudySet) => {
    const parts: PromptPart[] = [];
    if (set.content?.trim()) {
        parts.push({ text: set.content.trim() });
    }
    if (set.persistedFiles) {
        for (const pFile of set.persistedFiles) {
            if (pFile.type.startsWith('image/') || pFile.type.startsWith('audio/')) {
                parts.push({ inlineData: { mimeType: pFile.type, data: pFile.data }});
            }
        }
    }
    if (set.youtubeUrls) {
        set.youtubeUrls.forEach(url => {
            parts.push({text: `\n\n[Content from YouTube video: ${url}]\nThis content should be analyzed by watching the video or reading its transcript.`});
        });
    }
    onPrepareForQuiz(parts, set);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 p-4 bg-surface-dark rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-brand-primary/50">
        <div>
            <h2 className="text-xl font-bold text-brand-primary">Spaced Repetition Review</h2>
            <p className="text-text-secondary text-sm mt-1">Strengthen your memory on topics you've struggled with across all sets.</p>
        </div>
        <button
            onClick={onStartSrsQuiz}
            disabled={reviewPoolCount === 0}
            className="relative px-6 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-brand-primary transition-all disabled:bg-gray-600 disabled:cursor-not-allowed w-full sm:w-auto flex-shrink-0"
        >
            Start Review ({reviewPoolCount} items)
            {reviewPoolCount > 0 && <span className="absolute -top-2 -right-2 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-correct opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-correct items-center justify-center text-xs font-bold">{reviewPoolCount}</span>
            </span>}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Your Study Sets</h1>
        <div className="flex gap-2 items-center w-full sm:w-auto">
            <Tooltip text="View Overall Stats" position="top">
              <button onClick={onShowStats} className="p-2.5 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-600 transition-all flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v11.25c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75zM3 13.125c-1.035 0-1.875.84-1.875 1.875v6.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875v-6.75c0-1.035-.84-1.875-1.875-1.875h-.75z" />
                  </svg>
              </button>
            </Tooltip>
            <button onClick={onNewSet} className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all w-full">
              + New Set
            </button>
        </div>
      </div>
       {error && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{error}</span></div>}
       {processingError && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}
      
      {studySets.length === 0 ? (
        <div className="text-center py-16 px-6 bg-surface-dark rounded-xl">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome!</h2>
          <p className="text-text-secondary mb-6">You don't have any study sets yet. Create one to get started.</p>
          <button onClick={onNewSet} className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all">Create Set</button>
        </div>
      ) : (
        <div className="space-y-4">
          {studySets.map(set => (
            <div key={set.id} className="bg-surface-dark p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-lg gap-4">
              <div className="flex-grow min-w-0">
                <h3 className="font-bold text-xl text-text-primary">{set.name}</h3>
                <div className="text-sm text-text-secondary hidden sm:flex items-center gap-3 mt-1">
                    {set.persistedFiles && set.persistedFiles.length > 0 && <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a3 3 0 013-3z" clipRule="evenodd" /></svg>{set.persistedFiles.length} files</span>}
                    {set.youtubeUrls && set.youtubeUrls.length > 0 && <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>{set.youtubeUrls.length} videos</span>}
                    <span className="truncate">{set.content.substring(0, 100)}...</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center flex-wrap justify-end">
                <Tooltip text="AI Exam Predictor" position="top">
                  <button onClick={() => onPredict(set.id)} className="px-3 py-2 text-sm bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-all">Predict</button>
                </Tooltip>
                <Tooltip text="Start a quiz with this set" position="top">
                  <button onClick={() => handlePrepareWrapper(set)} disabled={isProcessing} className="px-3 py-2 text-sm bg-brand-primary text-white font-bold rounded-md hover:bg-brand-secondary transition-all disabled:bg-gray-500 disabled:cursor-wait min-w-[60px] text-center">
                    Study
                  </button>
                </Tooltip>
                <Tooltip text="View past quiz results" position="top">
                  <button onClick={() => onShowHistory(set)} className="px-3 py-2 text-sm bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-all">History</button>
                </Tooltip>
                <Tooltip text="View included files" position="top">
                  <button onClick={() => handleShowDetails(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg></button>
                </Tooltip>
                <Tooltip text="Edit set" position="top">
                  <button onClick={() => onEditSet(set)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                </Tooltip>
                <Tooltip text="Delete set" position="top">
                  <button onClick={() => onDeleteSet(set.id)} className="p-2 rounded-md hover:bg-gray-600" aria-label="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Details for "${setForDetails?.name}"`}>
        {setForDetails?.persistedFiles && setForDetails.persistedFiles.length > 0 && (
            <div>
                <h4 className="font-bold text-gray-300 mb-2">Uploaded Files</h4>
                <ul className="space-y-2 text-text-secondary max-h-40 overflow-y-auto">
                    {setForDetails.persistedFiles.map((file, index) => (
                        <li key={index} className="flex items-center gap-3 bg-gray-700/50 p-2 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                            <span className="truncate">{file.name}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {setForDetails?.youtubeUrls && setForDetails.youtubeUrls.length > 0 && (
            <div className="mt-4">
                <h4 className="font-bold text-gray-300 mb-2">YouTube Videos</h4>
                <ul className="space-y-2 text-text-secondary max-h-40 overflow-y-auto">
                    {setForDetails.youtubeUrls.map((url, index) => (
                        <li key={index} className="flex items-center gap-3 bg-gray-700/50 p-2 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={url}>{url}</a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {(!setForDetails?.persistedFiles || setForDetails.persistedFiles.length === 0) && (!setForDetails?.youtubeUrls || setForDetails.youtubeUrls.length === 0) &&
            <p className="text-text-secondary">No files or videos are associated with this study set.</p>
        }
      </Modal>
      <p className="text-center mt-8 text-xs italic text-text-secondary/80">
        Don't forget to refresh the app at least once a day because I update it regularly.
      </p>
    </div>
  );
};

export default StudySetList;
