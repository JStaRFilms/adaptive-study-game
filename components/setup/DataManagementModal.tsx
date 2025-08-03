import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { getDb, STORE_NAMES, StoreName } from '../../utils/db';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileToImport = useRef<File | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setFeedbackMessage('Gathering all data...');
    setError('');
    try {
      const db = await getDb();
      const exportData: { [key in StoreName]?: any[] } = {};

      for (const storeName of STORE_NAMES) {
        setFeedbackMessage(`Exporting ${storeName}...`);
        const allRecords = await db.getAll(storeName);
        if (allRecords.length > 0) {
          exportData[storeName] = allRecords;
        }
      }

      if (Object.keys(exportData).length === 0) {
        setFeedbackMessage('No data to export.');
        setError('');
        setTimeout(() => setFeedbackMessage(''), 3000);
        setIsLoading(false);
        return;
      }

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.href = url;
      link.download = `adaptive-study-data-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFeedbackMessage('Export successful!');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during export.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedbackMessage(''), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToImport.current = file;
    setConfirmImport(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const executeImport = async () => {
    const file = fileToImport.current;
    if (!file) return;

    setConfirmImport(false);
    setIsLoading(true);
    setFeedbackMessage('Importing data...');
    setError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const dataKeys = Object.keys(data);
      const isValid = dataKeys.every(key => STORE_NAMES.includes(key as StoreName) && Array.isArray(data[key]));
      if (!isValid || dataKeys.length === 0) {
        throw new Error('File content is not valid for this application.');
      }

      const db = await getDb();
      const tx = db.transaction(STORE_NAMES, 'readwrite');

      await Promise.all(
        dataKeys.map(async (storeName) => {
          const store = tx.objectStore(storeName as StoreName);
          const items = data[storeName];
          if (items.length > 0) {
            setFeedbackMessage(`Importing ${items.length} items to ${storeName}...`);
            await Promise.all(items.map((item: any) => store.put(item)));
          }
        })
      );

      await tx.done;

      setFeedbackMessage('Import successful! The app will reload to apply changes.');
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data. Please check file format.');
      console.error(err);
      setIsLoading(false);
    } finally {
      fileToImport.current = null;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !confirmImport} onClose={onClose} title="Data Management">
        <div className="space-y-6 text-text-secondary">
          <p>You can export all your study sets, quiz history, and progress to a file. This is useful for backups or transferring data between devices.</p>
          
          <div className="space-y-4">
            <button onClick={handleExport} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-brand-secondary transition-all disabled:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6.293-7.707a1 1 0 011.414 0L12 10.586V3a1 1 0 112 0v7.586l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Export All Data
            </button>
            
            <div>
              <input type="file" accept=".json" onChange={handleFileSelected} ref={fileInputRef} className="hidden" />
              <button onClick={handleImportClick} disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-brand-primary transition-all disabled:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L12 5.414V13a1 1 0 11-2 0V5.414L8.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                Import from File
              </button>
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center gap-3 text-brand-primary">
              <LoadingSpinner />
              <p className="font-semibold">{feedbackMessage}</p>
            </div>
          )}
          {feedbackMessage && !isLoading && <p className="text-center text-correct font-semibold">{feedbackMessage}</p>}
          {error && <p className="text-center text-incorrect font-semibold">{error}</p>}
        </div>
      </Modal>

      <Modal isOpen={confirmImport} onClose={() => setConfirmImport(false)} title="Confirm Data Import">
        <div className="space-y-4 text-text-secondary">
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-4 rounded-lg">
            <h3 className="font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              Warning: Overwrite Data
            </h3>
            <p className="mt-2 text-sm">This will merge the data from your file with your current data. If any items have the same ID (e.g., an existing study set), the version from the file will **overwrite** what you currently have.</p>
            <p className="mt-2 text-sm">This action cannot be undone. Are you sure you want to proceed?</p>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button onClick={() => setConfirmImport(false)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
            <button onClick={executeImport} className="px-4 py-2 bg-incorrect text-white font-bold rounded-lg hover:bg-red-600 transition-colors">Confirm & Import</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DataManagementModal;