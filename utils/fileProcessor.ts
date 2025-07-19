
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { PromptPart, FileInfo } from '../types';

if (pdfjsLib.version) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export const processFilesToParts = async (
    baseText: string, 
    filesToProcess: File[],
    onProgressUpdate: (message: string, percent: number) => void
): Promise<{parts: PromptPart[], combinedText: string, fileInfo: FileInfo[]}> => {
    onProgressUpdate('Initializing...', 0);
    const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const parts: PromptPart[] = [];
    let combinedText = baseText;
    const fileInfo: FileInfo[] = filesToProcess.map(f => ({ name: f.name, type: f.type }));
    const totalFiles = filesToProcess.length;

    if (totalFiles > 0) {
        let processedFiles = 0;
        for (const file of filesToProcess) {
            const fileIndex = processedFiles;
            const fileProgressStart = (fileIndex / totalFiles) * 100;
            const progressShareForFile = 100 / totalFiles;

            onProgressUpdate(`Reading ${file.name}...`, fileProgressStart);

            if (file.type.startsWith('image/')) {
                parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
            } else if (file.type.startsWith('audio/')) {
                 parts.push({ inlineData: { mimeType: file.type, data: await toBase64(file) } });
                combinedText += `\n\n[Content from audio file: ${file.name}]`;
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let pdfText = '';
                onProgressUpdate(`Extracting text from ${file.name}...`, fileProgressStart);
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    pdfText += textContent.items.map((item: any) => ('str' in item) ? item.str : '').join(' ') + '\n';
                }
                if (pdfText.trim()) combinedText += `\n\n--- Start of text from ${file.name} ---\n${pdfText.trim()}\n--- End of text from ${file.name} ---`;

                combinedText += `\n\n[The following are images of each page from the PDF file: ${file.name}]`;
                for (let i = 1; i <= pdf.numPages; i++) {
                    onProgressUpdate(`Capturing page ${i}/${pdf.numPages} from ${file.name}`, fileProgressStart + (progressShareForFile * 0.4) + ((i/pdf.numPages) * progressShareForFile * 0.6));
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    if (!context) continue;
                    await page.render({ canvasContext: context, viewport }).promise;
                    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
                    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } });
                }
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                combinedText += '\n\n' + result.value;
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
                 const arrayBuffer = await file.arrayBuffer();
                 const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                 workbook.SheetNames.forEach(sheetName => {
                     const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                     combinedText += `\n\n--- Content from ${file.name} / Sheet: ${sheetName} ---\n${csvText}`;
                 });
            } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.type === 'text/markdown') {
                 combinedText += '\n\n' + await file.text();
            }
            processedFiles++;
        }
    }
    
    onProgressUpdate('Finalizing content...', 99);

    if (combinedText.trim()) {
        parts.unshift({ text: combinedText.trim() });
    }

    return { parts, combinedText, fileInfo };
};
