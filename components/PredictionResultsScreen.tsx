import React, { useRef } from 'react';
import { PredictedQuestion } from '../types';
import Markdown from './common/Markdown';
import html2canvas from 'html2canvas';

interface PredictionResultsScreenProps {
  results: PredictedQuestion[];
  onBack: () => void;
}

const PredictionResultsScreen: React.FC<PredictionResultsScreenProps> = ({ results, onBack }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    const reportElement = reportRef.current;
    if (!reportElement || !results || results.length === 0) return;

    try {
        const canvas = await html2canvas(reportElement, {
            background: '#fdfaf1', // Explicitly set background to match 'case-paper'
            useCORS: true,
            logging: false,
        });
        
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');

        link.href = image;
        link.download = 'exam-prediction-report.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error generating image:", error);
        alert("Sorry, an error occurred while generating the image.");
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto font-serif">
      <header className="text-center mb-12">
          <div className="inline-block border-2 border-case-paper/50 p-2 mb-4">
              <h1 className="text-2xl md:text-3xl font-display text-case-paper tracking-widest">ANALYSIS COMPLETE</h1>
          </div>
          <h2 className="text-xl font-display text-case-paper/80 font-normal">PREDICTION REPORT</h2>
      </header>

      <div ref={reportRef} className="bg-case-paper text-case-text-primary p-8 md:p-12 shadow-2xl rounded-sm">
        {results.length > 0 ? (
          <div className="space-y-12">
            {results.map((item, index) => (
              <div key={index} className="pl-6 border-l-2 border-case-paper-lines">
                  <p className="font-display text-case-text-secondary font-bold text-xs tracking-widest mb-3">
                    PREDICTION #{index + 1} // TOPIC: {item.topic}
                  </p>
                  <Markdown
                    as="h2"
                    content={item.questionText}
                    className="text-2xl font-bold text-case-text-primary leading-tight"
                  />
                  
                  <hr className="my-6 border-t border-case-paper-lines/80" />

                  <h3 className="font-display text-sm font-bold text-case-text-secondary tracking-widest uppercase mb-2">
                    Analyst's Reasoning
                  </h3>
                  <Markdown
                    as="p"
                    content={item.reasoning}
                    className="text-base text-case-text-primary/90 leading-relaxed"
                  />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-semibold font-display mb-2">Analysis Yielded No Results</h2>
            <p>The AI was unable to generate predictions from the provided case file. Please try again with more detailed evidence.</p>
          </div>
        )}
      </div>

      <div className="text-center mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
        <button
          onClick={handleDownload}
          disabled={!results || results.length === 0}
          className="font-display text-white bg-case-accent-red hover:bg-red-800 transition-all px-8 py-3 rounded-md shadow-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Download Image
        </button>
        <button onClick={onBack} className="font-display text-case-paper hover:underline transition-all">
          Return to Main Menu
        </button>
      </div>
    </div>
  );
};

export default PredictionResultsScreen;
