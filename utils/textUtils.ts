
import { WebSource } from '../types';

export const markdownToHtml = (text: string, webSources?: WebSource[]): string => {
  if (!text) return '';
  
  let processedText = text
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italics: *text* -> <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Newlines: \n -> <br />
    .replace(/\n/g, '<br />');

  if (webSources && webSources.length > 0) {
    // Linkify citations like [1] or [2, 3]. Citations from the AI are 1-based.
    // This is more robust and handles cases where a citation number is invalid.
    processedText = processedText.replace(/\[([\d\s,]+)\]/g, (_, citationNumbersStr) => {
        const linkedNumbers = citationNumbersStr.split(',')
            .map((numStr: string) => {
                const n = parseInt(numStr.trim(), 10);
                if (!isNaN(n) && webSources && n > 0 && n <= webSources.length) {
                    const source = webSources[n - 1]; // Convert 1-based citation to 0-based index
                    return `<a href="${source.uri}" target="_blank" rel="noopener noreferrer" title="${source.title || source.uri}" class="text-brand-primary font-bold hover:underline">${n}</a>`;
                }
                return numStr.trim(); // Return the original number string if invalid
            })
            .join(', ');
        
        return ` [${linkedNumbers}]`; // Prepend space for separation and re-add brackets
    });
  }
  
  return processedText;
};

export const extractAnswerForQuestion = (fullText: string, questionNumber: number, numberOfQuestions: number): string | null => {
    const regex = /^(?:\s*(?:##?)\s*)?(?:question|q)?\s*(\d+)\s*[.:)]?/gim;
    let match;
    const markers = [];
    while ((match = regex.exec(fullText)) !== null) {
        markers.push({
            number: parseInt(match[1], 10),
            index: match.index,
            headerText: match[0],
        });
    }

    if (markers.length === 0 && numberOfQuestions === 1) {
        return fullText.trim().length > 0 ? fullText.trim() : null;
    }
    
    if (markers.length === 0) return null;

    const currentMarker = markers.find(m => m.number === questionNumber);
    if (!currentMarker) return null;

    const nextMarker = markers
        .filter(m => m.index > currentMarker.index)
        .sort((a,b) => a.index - b.index)[0];

    const startIndex = currentMarker.index + currentMarker.headerText.length;
    const endIndex = nextMarker ? nextMarker.index : fullText.length;
    
    const extracted = fullText.substring(startIndex, endIndex).trim();
    return extracted.length > 0 ? extracted : null;
};
