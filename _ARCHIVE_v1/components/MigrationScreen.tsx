import React from 'react';
import LoadingSpinner from './common/LoadingSpinner';

const MigrationScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pattern text-case-paper p-4 font-serif animate-fade-in">
        <div className="w-full max-w-2xl text-center bg-case-desk/80 backdrop-blur-sm p-8 rounded-lg shadow-2xl border-2 border-case-folder-border">
            <h1 className="text-2xl md:text-3xl font-display text-case-paper tracking-widest mb-4">
                SYSTEM UPGRADE
            </h1>
            <p className="text-case-paper/80 mb-6">
                We're migrating your local data to our new, faster storage system.
            </p>
            <div className="flex justify-center mb-6">
                <LoadingSpinner />
            </div>
            <p className="text-lg font-bold text-yellow-300 mb-2">
                Please keep this tab open.
            </p>
            <p className="text-sm text-case-paper/70">
                This one-time process ensures your study sets are saved securely and speeds up the app. It may take a few moments.
            </p>
        </div>
    </div>
  );
};

export default MigrationScreen;
