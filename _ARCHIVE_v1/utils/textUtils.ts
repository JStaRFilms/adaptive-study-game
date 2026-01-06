

import { WebSource } from '../types';

export const markdownToHtml = (text: string, webSources?: WebSource[]): string => {
  if (!text) return '';

  const applyInlineStyles = (line: string): string => {
    let processedLine = line;
    // Web sources need to be processed on the raw line before other markdown
    if (webSources && webSources.length > 0) {
      processedLine = processedLine.replace(/\[([\d\s,]+)\]/g, (_, citationNumbersStr) => {
          const linkedNumbers = citationNumbersStr.split(',')
              .map((numStr: string) => {
                  const n = parseInt(numStr.trim(), 10);
                  if (!isNaN(n) && webSources && n > 0 && n <= webSources.length) {
                      const source = webSources[n - 1];
                      return `<a href="${source.uri}" target="_blank" rel="noopener noreferrer" title="${source.title || source.uri}" class="text-brand-primary font-bold hover:underline">${n}</a>`;
                  }
                  return numStr.trim();
              })
              .join(', ');
          return ` [${linkedNumbers}]`;
      });
    }

    return processedLine
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  };
  
  const parseTable = (block: string): string => {
    const lines = block.split('\n');
    const headerLine = lines[0];
    // Allow for optional leading/trailing pipes
    const headerCells = headerLine.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    let html = '<div class="table-wrapper"><table><thead><tr>';
    html += headerCells.map(cell => `<th>${applyInlineStyles(cell)}</th>`).join('');
    html += '</tr></thead><tbody>';
    
    // Start from line 2, skipping the separator
    for (let i = 2; i < lines.length; i++) {
        const rowLine = lines[i];
        if (!rowLine.trim()) continue;
        const rowCells = rowLine.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        html += '<tr>';
        // Ensure row has same number of cells as header
        for (let j = 0; j < headerCells.length; j++) {
            html += `<td>${applyInlineStyles(rowCells[j] || '')}</td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    return html;
  };

  const blocks = text.split(/(?:\r?\n){2,}/); 

  return blocks.map(block => {
    block = block.trim();
    if (!block) return '';

    const lines = block.split(/\r?\n/);

    // 1. Fenced Code Blocks
    if (block.startsWith('```') && block.endsWith('```')) {
      const language = block.match(/^```(\w*)/)?.[1] || '';
      const code = lines.slice(1, -1).join('\n');
      return `<pre><code class="language-${language}">${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    }

    // 2. Tables
    if (lines.length > 1 && lines[0].includes('|') && /^\s*\|?(:?-+:?\|)+/.test(lines[1])) {
        return parseTable(block);
    }
    
    // 3. Headings
    if (lines.length === 1) {
        const headingMatch = block.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            return `<h${level}>${applyInlineStyles(headingMatch[2])}</h${level}>`;
        }
    }
    
    // 4. Blockquotes
    if (block.startsWith('>')) {
        const quoteContent = lines.map(line => line.replace(/^>\s?/, '')).join('<br />');
        return `<blockquote>${applyInlineStyles(quoteContent)}</blockquote>`;
    }

    // 5. Horizontal Rule
    if (lines.length === 1 && /^(\-\-\-|\*\*\*|\_\_\_)$/.test(block)) {
        return '<hr />';
    }

    // 6. Lists
    const isUnorderedList = lines.every(line => /^\s*[\*\-]\s/.test(line));
    const isOrderedList = lines.every(line => /^\s*\d+\.\s/.test(line));
    if (isUnorderedList || isOrderedList) {
        const listTag = isUnorderedList ? 'ul' : 'ol';
        const listItems = lines.map(line => `<li>${applyInlineStyles(line.replace(/^\s*(?:[\*\-]|\d+\.)\s/, ''))}</li>`).join('');
        return `<${listTag}>${listItems}</${listTag}>`;
    }

    // 7. Default to paragraph
    return `<p>${lines.map(applyInlineStyles).join('<br />')}</p>`;

  }).join('');
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