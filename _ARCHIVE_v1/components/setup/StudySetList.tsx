import React, { useState } from 'react';
import { StudySet, PromptPart } from '../../types';
import Modal from '../common/Modal';
import Tooltip from '../common/Tooltip';
import DataManagementModal from './DataManagementModal';


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
  onPrepareForCanvas: (set: StudySet) => void;
  onShowHistory: (set: StudySet) => void;
  onShowStats: () => void;
  onStartSrsQuiz: () => void;
  reviewPoolCount: number;
  onStartReading: (set: StudySet) => void;
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
  onPrepareForCanvas,
  onShowHistory,
  onShowStats,
  onStartSrsQuiz,
  reviewPoolCount,
  onStartReading,
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [setForDetails, setSetForDetails] = useState<StudySet | null>(null);

  const handleShowDetails = (set: StudySet) => {
    setSetForDetails(set);
    setIsDetailsModalOpen(true);
  };

  const handleReadClick = (set: StudySet) => {
    if (set.readingLayout) {
      onStartReading(set);
    } else {
      onPrepareForCanvas(set);
    }
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
    <div className="animate-fade-in w-full max-w-4xl mx-auto flex flex-col flex-grow">
      <div className="border border-teal-500/30 bg-gray-800/20 rounded-lg p-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-md">
        <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-teal-400">Spaced Repetition Review</h3>
            <p className="text-gray-400 text-sm">Strengthen your memory on topics you've struggled with.</p>
        </div>
        <div className="relative w-full sm:w-auto mt-4 sm:mt-0">
            <button
                onClick={onStartSrsQuiz}
                disabled={reviewPoolCount === 0}
                className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-hover text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 flex-shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <span>Start Review ({reviewPoolCount} items)</span>
            </button>
            {reviewPoolCount > 0 && (
                <span 
                    className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-correct text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg border-2 border-gray-800/50"
                    aria-label={`${reviewPoolCount} items to review`}
                >
                    {reviewPoolCount > 99 ? '99+' : reviewPoolCount}
                </span>
            )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white">Your Study Sets</h1>
        <div className="flex items-center space-x-3">
            <Tooltip text="Data Management" position="top">
                <button onClick={() => setIsDataModalOpen(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </Tooltip>
            <Tooltip text="View Overall Stats" position="top">
              <button onClick={onShowStats} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </button>
            </Tooltip>
            <button onClick={onNewSet} className="bg-brand-teal hover:bg-brand-teal-hover text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-lg transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>New Set</span>
            </button>
        </div>
      </div>
       {error && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{error}</span></div>}
       {processingError && <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert"><span className="block sm:inline">{processingError}</span></div>}
      
      <div className="flex-grow">
        {studySets.length === 0 ? (
          <div className="text-center py-16 px-6 bg-surface-dark rounded-xl h-full flex flex-col justify-center">
            <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome!</h2>
            <p className="text-text-secondary mb-6">You don't have any study sets yet. Create one to get started.</p>
            <button onClick={onNewSet} className="px-8 py-3 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all self-center">Create Set</button>
          </div>
        ) : (
          <div className="space-y-4">
            {studySets.map(set => (
              <div key={set.id} className="bg-gray-800/40 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between shadow-md space-y-4 md:space-y-0">
                <div className="flex-shrink-0 pr-4">
                    <h4 className="font-bold text-white text-lg">{set.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                        {set.persistedFiles && set.persistedFiles.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                <span>{set.persistedFiles.length} file{set.persistedFiles.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {set.youtubeUrls && set.youtubeUrls.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-red" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                <span>{set.youtubeUrls.length} video{set.youtubeUrls.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                  <button onClick={() => handleReadClick(set)} className="flex-shrink-0 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold py-2 px-5 rounded-md transition-colors duration-200">Read</button>
                  <button onClick={() => onPredict(set.id)} className="flex-shrink-0 bg-brand-purple hover:bg-brand-purple-hover text-white font-semibold py-2 px-5 rounded-md transition-colors duration-200">Predict</button>
                  <button onClick={() => handlePrepareWrapper(set)} disabled={isProcessing} className="flex-shrink-0 bg-brand-teal hover:bg-brand-teal-hover text-white font-bold py-2 px-5 rounded-md shadow-md transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-wait">
                    Study
                  </button>
                  <button onClick={() => onShowHistory(set)} className="flex-shrink-0 bg-muted-gray hover:bg-muted-gray-hover text-white font-semibold py-2 px-5 rounded-md transition-colors duration-200">History</button>
                  
                  <span className="border-l border-gray-600 h-6 mx-2"></span>
                  
                  <Tooltip text="View included files" position="top">
                    <button onClick={() => handleShowDetails(set)} className="flex-shrink-0 p-2 text-gray-400 hover:text-white rounded-md" aria-label="Details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg></button>
                  </Tooltip>
                  <Tooltip text="Edit set" position="top">
                    <button onClick={() => onEditSet(set)} className="flex-shrink-0 p-2 text-gray-400 hover:text-white rounded-md" aria-label="Edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                  </Tooltip>
                  <Tooltip text="Delete set" position="top">
                    <button onClick={() => onDeleteSet(set.id)} className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-md" aria-label="Delete"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DataManagementModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
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
      <p className="flex-shrink-0 text-center mt-12 text-xs italic text-text-secondary/80">
        Don't forget to refresh the app at least once a day because I update it regularly.
      </p>
    </div>
  );
};

export default StudySetList;