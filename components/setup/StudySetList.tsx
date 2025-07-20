


import React, { useState } from 'react';
import { StudySet } from '../../types';
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
  onPrepareForQuiz: (set: StudySet) => void;
  onShowHistory: (set: StudySet) => void;
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
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [setForDetails, setSetForDetails] = useState<StudySet | null>(null);

  const handleShowDetails = (set: StudySet) => {
    setSetForDetails(set);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Your Study Sets</h1>
        <button onClick={onNewSet} className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all w-full sm:w-auto">
          + New Set
        </button>
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
                <p className="text-sm text-text-secondary hidden sm:flex items-center gap-2">
                    {set.fileInfo && set.fileInfo.length > 0 && <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a3 3 0 013-3z" clipRule="evenodd" /></svg>{set.fileInfo.length} files</>}
                    <span className="truncate">{set.content.substring(0, 100)}...</span>
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center flex-wrap justify-end">
                <Tooltip text="AI Exam Predictor" position="top">
                  <button onClick={() => onPredict(set.id)} className="px-3 py-2 text-sm bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition-all">Predict</button>
                </Tooltip>
                <Tooltip text="Start a quiz with this set" position="top">
                  <button onClick={() => onPrepareForQuiz(set)} disabled={isProcessing} className="px-3 py-2 text-sm bg-brand-primary text-white font-bold rounded-md hover:bg-brand-secondary transition-all disabled:bg-gray-500">Study</button>
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
};

export default StudySetList;