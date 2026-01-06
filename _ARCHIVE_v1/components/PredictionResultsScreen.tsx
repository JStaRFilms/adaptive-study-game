

import React, { useRef, useState } from 'react';
import { PredictedQuestion, StudyGuide } from '../types';
import Markdown from './common/Markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateStudyGuideForPrediction } from '../services/geminiService';
import Modal from './common/Modal';
import LoadingSpinner from './common/LoadingSpinner';


interface PredictionResultsScreenProps {
  results: PredictedQuestion[];
  onBack: () => void;
  onUpdate: () => void;
}

const PredictionResultsScreen: React.FC<PredictionResultsScreenProps> = ({ results, onBack, onUpdate }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgressMessage, setPdfProgressMessage] = useState('');

  const handleDownloadImage = async () => {
    const reportElement = reportRef.current;
    if (!reportElement || !results || results.length === 0) return;

    try {
        const canvas = await html2canvas(reportElement, {
            backgroundColor: '#fdfaf1', // Explicitly set background to match 'case-paper'
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

  const handleDownloadPdf = async () => {
    if (!results || results.length === 0) return;

    setIsGeneratingPdf(true);
    setPdfProgressMessage('Initializing PDF generation...');

    const guides: (StudyGuide | null)[] = [];
    try {
      for (let i = 0; i < results.length; i++) {
        const question = results[i];
        setPdfProgressMessage(`Generating guide for question ${i + 1} of ${results.length}...`);
        try {
          const guide = await generateStudyGuideForPrediction(question);
          guides.push(guide);
        } catch (err) {
          console.error(`Failed to generate guide for question ${i + 1}`, err);
          guides.push(null); // Push null on failure to keep array length consistent
        }
      }

      setPdfProgressMessage('Assembling PDF document...');
      
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const addPageWithBackground = () => {
          doc.addPage();
          doc.setFillColor(253, 250, 241); // case-paper: #fdfaf1
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          y = margin;
      };

      const checkY = (neededHeight: number) => {
          if (y + neededHeight > pageHeight - margin) {
              addPageWithBackground();
          }
      };
      
      const drawText = (text: string, x: number, currentY: number, options: {
          font?: 'times' | 'courier' | 'helvetica',
          style?: 'normal' | 'bold' | 'italic',
          size?: number,
          color?: [number, number, number],
          maxWidth?: number,
          lineHeightFactor?: number,
          align?: 'left' | 'center' | 'right'
      }) => {
          const { 
              font='times', 
              style='normal', 
              size=10, 
              color=[44, 37, 30],
              maxWidth: textMaxWidth = maxWidth,
              lineHeightFactor = 1.2,
              align = 'left'
          } = options;
          
          doc.setFont(font, style);
          doc.setFontSize(size);
          doc.setTextColor(color[0], color[1], color[2]);
      
          const lines = doc.splitTextToSize(text, textMaxWidth);
          const neededHeight = lines.length * size * lineHeightFactor;
          
          checkY(neededHeight);
      
          doc.text(lines, x, y, { align }); // Use the global 'y' after page check
          return y + neededHeight;
      };

      const drawMarkdown = (markdown: string, x: number, startY: number, options: {
          font?: 'times' | 'courier',
          size?: number,
          color?: [number, number, number],
          lineHeightFactor?: number,
      }) => {
          // 'y' and 'checkY' are from the parent scope, we modify 'y' directly.
          const { 
              font = 'times', 
              size = 10, 
              color = [44, 37, 30],
              lineHeightFactor = 1.2,
          } = options;
          const lineHeight = size * lineHeightFactor;

          const markdownLines = markdown.split('\n');

          for (const line of markdownLines) {
              if (line.trim() === '') {
                  checkY(size * 0.5);
                  y += size * 0.5;
                  continue;
              }

              let currentLineText = line.trim();
              let indent = 0;
              let isBullet = false;

              if (currentLineText.startsWith('* ') || currentLineText.startsWith('- ')) {
                  isBullet = true;
                  currentLineText = currentLineText.substring(2).trim();
                  indent = 15;
                  checkY(lineHeight);
                  doc.setFont('helvetica', 'bold').setFontSize(size).text('•', x, y);
              }

              let cursorX = x + indent;
              // Split by bold delimiter, keeping the delimiter for style switching via regex groups
              const segments = currentLineText.split(/(\*\*.*?\*\*)/g).filter(s => s.length > 0);

              for (const segment of segments) {
                  const isBold = segment.startsWith('**') && segment.endsWith('**');
                  const text = isBold ? segment.substring(2, segment.length - 2) : segment;
                  
                  if (!text) continue;

                  doc.setFont(font, isBold ? 'bold' : 'normal').setFontSize(size).setTextColor(color[0], color[1], color[2]);
                  
                  const words = text.split(/\s+/g);
                  for (let i = 0; i < words.length; i++) {
                      const word = words[i];
                      // Add a space back except for the last word of a segment to avoid trailing spaces
                      const wordWithSpace = i === words.length - 1 ? word : word + ' ';
                      const wordWidth = doc.getTextWidth(wordWithSpace);

                      // Check if word fits, if not (and it's not the first word), wrap to new line
                      if (cursorX + wordWidth > pageWidth - margin && cursorX > x + indent) {
                          y += lineHeight;
                          checkY(lineHeight);
                          cursorX = x + indent;
                      }
                      doc.text(wordWithSpace, cursorX, y);
                      cursorX += wordWidth;
                  }
              }
              // After processing all segments of a markdown line, move to the next line in the PDF.
              y += lineHeight;
              checkY(lineHeight);
          }
          return y;
      };

      // Set background for first page
      doc.setFillColor(253, 250, 241);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header
      y = drawText('Confidential Exam Prediction Report', pageWidth/2, y, { font: 'courier', style: 'bold', size: 18, align: 'center', color: [183, 28, 28] });
      y += 20;

      for (let i = 0; i < results.length; i++) {
        if (i > 0) {
          y += 10;
          checkY(30); // for line and space
          doc.setDrawColor(224, 217, 201);
          doc.line(margin, y, pageWidth - margin, y);
          y += 20;
        }

        const question = results[i];
        const guide = guides[i];

        // Question Section
        y = drawText(`PREDICTION #${i + 1} // TOPIC: ${question.topic}`, margin, y, { font: 'courier', style: 'bold', size: 11, color: [122, 106, 91] });
        y += 10;
        y = drawText(question.questionText, margin, y, { font: 'times', style: 'bold', size: 14 });
        y += 15;

        // Reasoning Section
        y = drawText("Analyst's Reasoning:", margin, y, { font: 'courier', style: 'bold', size: 10, color: [122, 106, 91] });
        y += 5;
        y = drawMarkdown(question.reasoning, margin, y, { size: 10 });
        y += 20;
        
        if (guide) {
          // Answer Outline
          y = drawText("AI-Generated Answer Outline:", margin, y, { font: 'courier', style: 'bold', size: 10, color: [122, 106, 91] });
          y += 5;
          y = drawMarkdown(guide.answerOutline, margin, y, { size: 10 });
          y += 20;

          // YouTube Links
          y = drawText("Recommended Study Resources:", margin, y, { font: 'courier', style: 'bold', size: 10, color: [122, 106, 91] });
          y += 10;

          for (const query of guide.youtubeSearchQueries) {
              const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
              const fullText = `▶ Watch videos on: ${query}`;
              const textLines = doc.splitTextToSize(fullText, maxWidth);
              checkY(textLines.length * 12 + 10);
              
              doc.setFontSize(10);
              doc.setTextColor(20, 184, 166);
              try {
                  doc.textWithLink(fullText, margin, y, { url });
              } catch(e) { 
                  doc.text(`${fullText} (${url})`, margin, y);
              }
              doc.setTextColor(44, 37, 30); // reset color
              y += textLines.length * 12 + 5;
          }
        } else {
            y = drawText("Could not generate study guide for this question.", margin, y, { font: 'times', style: 'italic', color: [183, 28, 28] });
            y += 20;
        }
      }

      doc.save('exam-prediction-guide.pdf');

    } catch (error) {
      console.error("PDF generation failed:", error);
      setPdfProgressMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await new Promise(res => setTimeout(res, 3000));
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgressMessage('');
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto font-serif flex flex-col flex-grow">
      <header className="text-center mb-12 flex-shrink-0">
          <div className="inline-block border-2 border-case-paper/50 p-2 mb-4">
              <h1 className="text-2xl md:text-3xl font-display text-case-paper tracking-widest">ANALYSIS COMPLETE</h1>
          </div>
          <h2 className="text-xl font-display text-case-paper/80 font-normal">PREDICTION REPORT</h2>
      </header>

      <div ref={reportRef} className="bg-case-paper text-case-text-primary p-8 md:p-12 shadow-2xl rounded-sm flex-grow">
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

      <div className="text-center mt-12 flex flex-col sm:flex-row justify-center items-center gap-6 flex-shrink-0">
        <button
          onClick={handleDownloadImage}
          disabled={!results || results.length === 0 || isGeneratingPdf}
          className="font-display text-white bg-case-accent-red hover:bg-red-800 transition-all px-6 py-3 rounded-md shadow-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          Download as Image
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={!results || results.length === 0 || isGeneratingPdf}
          className="font-display text-white bg-blue-700 hover:bg-blue-600 transition-all px-6 py-3 rounded-md shadow-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
          Download PDF Guide
        </button>
        <button
            onClick={onUpdate}
            className="font-display text-white bg-case-text-secondary hover:bg-case-text-primary transition-all px-6 py-3 rounded-md shadow-lg font-bold flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          Update Prediction
        </button>
        <button onClick={onBack} className="font-display text-case-paper hover:underline transition-all">
          Return to Main Menu
        </button>
      </div>
      <Modal isOpen={isGeneratingPdf} onClose={() => {}} title="Generating PDF Study Guide...">
        <div className="text-center text-text-secondary p-4">
          <div className="flex justify-center mb-4">
            <LoadingSpinner />
          </div>
          <p className="font-bold text-text-primary">
            {pdfProgressMessage}
          </p>
          <p className="text-xs mt-2">Please wait, this may take a moment...</p>
        </div>
      </Modal>
    </div>
  );
};

export default PredictionResultsScreen;
