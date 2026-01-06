import React, { useState, useEffect } from 'react';

const ANNOUNCEMENT_ID = 'reading-canvas-interactive-questions-20240801'; // Change this ID for new announcements
const ANNOUNCEMENT_MESSAGE = (
    <>
        <strong>✨ Major Update!</strong> Explore your notes with the new visual Reading Canvas and master concepts with interactive Matching & Sequence questions!
    </>
);

const AnnouncementBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        try {
            const dismissedId = localStorage.getItem('dismissedAnnouncementId');
            if (dismissedId !== ANNOUNCEMENT_ID) {
                setIsVisible(true);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
            // If localStorage is not available, show the banner by default
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        try {
            localStorage.setItem('dismissedAnnouncementId', ANNOUNCEMENT_ID);
        } catch (error) {
            console.error("Could not write to localStorage:", error);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white p-2 text-center text-sm font-semibold rounded-lg shadow-lg mb-8 flex items-center justify-center animate-fade-in-down"
            role="alert"
        >
            <span className="flex-grow">{ANNOUNCEMENT_MESSAGE}</span>
            <button 
                onClick={handleDismiss} 
                className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0 ml-4"
                aria-label="Dismiss announcement"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default AnnouncementBanner;