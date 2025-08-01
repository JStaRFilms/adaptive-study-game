
import React from 'react';

interface ChatActionButtonProps {
    text: string;
    onClick: () => void;
}

const ChatActionButton: React.FC<ChatActionButtonProps> = ({ text, onClick }) => (
    <div className="mt-3">
        <button
            onClick={onClick}
            className="w-full text-center px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-lg hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
            {text}
        </button>
    </div>
);

export default ChatActionButton;
