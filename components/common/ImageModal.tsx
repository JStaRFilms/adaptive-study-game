
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
  mode?: 'visualize' | 'coming_soon';
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  error,
  imageUrl,
  imagePrompt,
  conceptText,
  mode = 'visualize',
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
      title={mode === 'coming_soon' ? 'Feature Coming Soon' : error ? 'Error' : `Visualizing Concept`}
    >
      <div className="min-h-[30vh] flex flex-col justify-center items-center text-text-secondary">
        {mode === 'coming_soon' ? (
          <div className="text-center py-8 px-4 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand-primary mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-bold text-text-primary mb-2">Image Generation is a Premium Feature</h3>
            <p>This functionality is coming soon and will be available to paid users.</p>
            <p className="mt-4 text-sm">Thank you for your interest!</p>
          </div>
        ) : isLoading ? (
          <>
            <LoadingSpinner />
            <p className="mt-4 text-lg">AI is creating a visual aid...</p>
            <p className="mt-2 text-sm text-center">"{conceptText?.substring(0, 100)}..."</p>
          </>
        ) : error ? (
            <div className="text-center">
                <p className="text-incorrect font-bold mb-2">Could not generate visual aid.</p>
                <p className="text-sm">{error}</p>
            </div>
        ) : imageUrl && imagePrompt ? (
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
        ) : null}
      </div>
    </Modal>
  );
};

export default ImageModal;
