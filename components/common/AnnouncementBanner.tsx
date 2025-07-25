import React, { useState, useEffect } from 'react';

const ANNOUNCEMENT_ID = 'feedback-srs-update-20240726'; // Change this ID for new announcements
const ANNOUNCEMENT_MESSAGE = (
    <>
        <strong>✨ New Feature:</strong> Personalized AI feedback and Spaced Repetition are here! Check your quiz results for AI Coach feedback and find your review items on the main screen.
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
            className="bg-gradient-to-r from-purple-600 via-brand-primary to-teal-500 text-white p-3 text-center text-sm relative animate-fade-in-down"
            role="alert"
        >
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 px-4">
                <p className="flex-grow">{ANNOUNCEMENT_MESSAGE}</p>
                <button 
                    onClick={handleDismiss} 
                    className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                    aria-label="Dismiss announcement"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default AnnouncementBanner;
