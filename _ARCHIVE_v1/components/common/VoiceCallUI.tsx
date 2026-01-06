import React from 'react';

interface VoiceCallUIProps {
    isListening: boolean;
    isThinking: boolean;
    isSpeaking: boolean;
    onPttMouseDown: () => void;
    onPttMouseUp: () => void;
    onEndCall: () => void;
}

const VoiceCallUI: React.FC<VoiceCallUIProps> = ({
    isListening, isThinking, isSpeaking, onPttMouseDown, onPttMouseUp, onEndCall
}) => {
    
    const getStatus = () => {
        if(isListening) return { text: "Listening...", color: "bg-red-500", pulse: true };
        if(isThinking) return { text: "Thinking...", color: "bg-purple-500", pulse: true };
        if(isSpeaking) return { text: "AI is speaking...", color: "bg-blue-500", pulse: true };
        return { text: "Hold to Speak", color: "bg-brand-primary", pulse: false };
    }

    const { text, color, pulse } = getStatus();

    return (
        <div className="flex flex-col items-center justify-center gap-4 h-full p-4">
            <p className="text-text-secondary font-semibold h-6">{text}</p>
            <button
                onMouseDown={onPttMouseDown}
                onMouseUp={onPttMouseUp}
                onTouchStart={onPttMouseDown}
                onTouchEnd={onPttMouseUp}
                className={`w-24 h-24 rounded-full text-white flex items-center justify-center transition-all duration-200 shadow-lg transform active:scale-95 ${color} ${pulse ? 'animate-pulse' : ''}`}
                aria-label="Push to talk"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            </button>
            <button onClick={onEndCall} className="mt-2 px-4 py-2 bg-incorrect text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors">
                End Call
            </button>
        </div>
    );
};

export default VoiceCallUI;
