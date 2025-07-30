
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import Markdown from './Markdown';
import Tooltip from './Tooltip';

const TypingIndicator = () => (
    <div className="flex items-center space-x-1 p-2">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
    </div>
);

interface ChatPanelProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onSendMessage: (message: string) => void;
    messages: ChatMessage[];
    isTyping: boolean;
    error: string | null;
    isEnabled: boolean;
    disabledTooltipText?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    isOpen, onOpen, onClose, onSendMessage, messages, isTyping, error, isEnabled, 
    disabledTooltipText = "Chat is disabled"
}) => {
    const [inputValue, setInputValue] = useState('');
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
    const scrollableContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showTab, setShowTab] = useState(false);

    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };
    
    useEffect(() => {
        // If the user hasn't manually scrolled up, keep the view at the bottom
        if (!userHasScrolledUp) {
            scrollToBottom();
        }
    }, [messages, isTyping, userHasScrolledUp]);
    
    // For the initial appearance of the tab
    useEffect(() => {
      const timer = setTimeout(() => setShowTab(true), 500);
      return () => clearTimeout(timer);
    }, []);

    // When the panel opens, ensure we scroll to the bottom.
    // This is especially important for desktop where the panel might have been
    // closed while scrolled up.
    useEffect(() => {
        if(isOpen) {
            setTimeout(() => scrollToBottom('auto'), 100);
        }
    }, [isOpen])

    const handleScroll = () => {
        const container = scrollableContainerRef.current;
        if (container) {
            // A buffer of 10px helps with precision issues
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
            setUserHasScrolledUp(!isAtBottom);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && !isTyping) {
            setUserHasScrolledUp(false); // When user sends a message, they expect to see the response
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const ChatInterface = (
         <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur-md animate-fade-in">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-bold text-text-primary">AI Study Coach</h2>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
            </header>
            <div ref={scrollableContainerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-2xl max-w-sm lg:max-w-md ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-surface-dark text-text-primary rounded-bl-none'}`}>
                            <Markdown content={msg.text} className="prose prose-invert prose-p:my-0 prose-ul:my-0 prose-ol:my-0" />
                        </div>
                    </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="p-3 rounded-2xl bg-surface-dark rounded-bl-none"><TypingIndicator/></div></div>}
                <div ref={messagesEndRef} />
            </div>
            {error && <div className="p-2 text-center text-sm text-incorrect bg-red-900/50 flex-shrink-0">{error}</div>}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about this question..."
                        className="w-full bg-transparent p-2 text-text-primary focus:outline-none"
                        aria-label="Chat message input"
                    />
                    <button type="submit" disabled={!inputValue.trim() || isTyping} className="bg-brand-secondary p-2 rounded-md text-white hover:bg-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L10 8.184l-4.949 1.414a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L10 15.816l4.949 1.414a.75.75 0 00.95-.826l1.414-4.949a.75.75 0 00-.826-.95L10 11.816l4.949-1.414a.75.75 0 00.826-.95l-1.414-4.949a.75.75 0 00-.95-.826L10 8.184 5.051 6.77a.75.75 0 00-.95.826L5.516 10l-1.414-4.949a.75.75 0 00-.997-1.762z" /></svg>
                    </button>
                </div>
            </form>
        </div>
    );

    const tooltipText = isEnabled ? "AI Study Coach" : disabledTooltipText;

    return (
        <>
            {/* Desktop: Side Panel */}
            <div className="hidden md:block">
                <Tooltip text={tooltipText} position="left">
                    <button
                        onClick={onOpen}
                        disabled={!isEnabled}
                        className={`fixed top-1/2 right-0 -translate-y-1/2 bg-brand-primary text-white p-3 rounded-l-lg shadow-lg z-40 transition-all duration-300 hover:bg-brand-secondary disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${showTab ? 'translate-x-0' : 'translate-x-full'}`}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        aria-label="Open AI Chat"
                    >
                        <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.02-3.06A8.009 8.009 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.72 14.48A6.024 6.024 0 004 10a6 6 0 016-6 6 6 0 016 6 6 6 0 01-2.006 4.41l.94 2.82-2.82-.94A5.965 5.965 0 0110 16a6.023 6.023 0 01-5.28-1.52z" clipRule="evenodd" /></svg>
                            Ask AI
                        </span>
                        {isEnabled && !isOpen && <div className="absolute top-1/2 right-full w-3 h-3 -translate-y-1/2 mr-1 rounded-full bg-correct animate-pulse"></div>}
                    </button>
                </Tooltip>
                
                {/* Overlay for Desktop */}
                {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>}
                
                {/* Panel Container for Desktop */}
                <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-transparent rounded-l-2xl overflow-hidden shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {isOpen && ChatInterface}
                </div>
            </div>

            {/* Mobile: Bottom Sheet */}
            <div className="md:hidden">
                 <Tooltip text={tooltipText} position="top">
                    <button
                        onClick={onOpen}
                        disabled={!isEnabled}
                        className="fixed bottom-6 right-6 bg-brand-primary text-white w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center transition-all duration-300 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Open AI Chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.02-3.06A8.009 8.009 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.72 14.48A6.024 6.024 0 004 10a6 6 0 016-6 6 6 0 016 6 6 6 0 01-2.006 4.41l.94 2.82-2.82-.94A5.965 5.965 0 0110 16a6.023 6.023 0 01-5.28-1.52z" clipRule="evenodd" /></svg>
                        {isEnabled && !isOpen && <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-correct border-2 border-brand-primary animate-pulse"></div>}
                    </button>
                </Tooltip>
                <div className={`fixed inset-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    {isOpen && ChatInterface}
                </div>
                {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose}></div>}
            </div>
        </>
    );
};

export default ChatPanel;
