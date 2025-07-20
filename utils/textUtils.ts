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
    // Regex to find markers like "Question 1", "Q. 2)", "#3", etc.
    const regex = new RegExp(`^(?:\\s*(?:##?|\\*\\*)*\\s*)?(?:question|q)?\\s*${questionNumber}\\s*[.:)]?`, 'im');
    const match = fullText.match(regex);

    // If there's only one question, the whole text is the answer.
    if (numberOfQuestions === 1 && !match) {
        return fullText.trim().length > 0 ? fullText.trim() : null;
    }
    
    if (!match || typeof match.index === 'undefined') {
        return null;
    }

    // Find the start of the answer right after the found marker.
    const startIndex = match.index + match[0].length;
    
    // Find where the next question begins to determine the end of the current answer.
    let endIndex = fullText.length;
    for (let i = questionNumber + 1; i <= numberOfQuestions; i++) {
        const nextRegex = new RegExp(`^(?:\\s*(?:##?|\\*\\*)*\\s*)?(?:question|q)?\\s*${i}\\s*[.:)]?`, 'im');
        const nextMatch = fullText.substring(startIndex).match(nextRegex);
        if (nextMatch && typeof nextMatch.index !== 'undefined') {
            endIndex = startIndex + nextMatch.index;
            break;
        }
    }
    
    const extracted = fullText.substring(startIndex, endIndex).trim();
    
    // Additional check: If the extracted text *is* the question text, it's a parsing failure.
    // This can happen if the user pastes questions without answers.
    if (extracted.toLowerCase().includes("describe") && extracted.toLowerCase().includes("explain")) {
        // This is a heuristic and might need refinement
    }

    return extracted.length > 0 ? extracted : null;
};