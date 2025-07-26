import React from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
  imageUrl: string | null;
  imagePrompt: string | null;
  conceptText: string | null;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  imageUrl,
  imagePrompt,
  conceptText,
}) => {

  const handleDownload = () => {
    if (!imageUrl || !conceptText) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    const safeFilename = conceptText.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `visual_aid_${safeFilename}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={error ? 'Error' : `Visualizing Concept`}
    >
      <div className="min-h-[40vh] flex flex-col justify-center items-center text-text-secondary">
        {isLoading && (
          <>
            <LoadingSpinner />
            <p className="mt-4 text-lg">AI is creating a visual aid...</p>
            <p className="mt-2 text-sm text-center">"{conceptText?.substring(0, 100)}..."</p>
          </>
        )}
        {error && (
            <div className="text-center">
                <p className="text-incorrect font-bold mb-2">Could not generate visual aid.</p>
                <p className="text-sm">{error}</p>
            </div>
        )}
        {!isLoading && !error && imageUrl && imagePrompt && (
          <div className="w-full animate-fade-in space-y-4">
            <img src={imageUrl} alt="AI-generated visual aid" className="w-full h-auto object-contain rounded-lg max-h-[60vh] bg-black" />
            <div className="bg-gray-900/50 p-3 rounded-md text-left">
                <p className="font-bold text-sm text-gray-400 mb-1">AI-GENERATED PROMPT</p>
                <p className="text-sm italic">{imagePrompt}</p>
            </div>
            <button onClick={handleDownload} className="w-full px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary transition-colors">
                Download Image
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImageModal;
