import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './useSpeech';
import { useSpeechSynthesis } from './useSpeech';
import { ChatMessage, ChatContentPart } from '../types';

interface VoiceChatOptions {
    chatMessages: ChatMessage[];
    isAITyping: boolean;
    onSendMessage: (parts: ChatContentPart[]) => void;
}

export const useVoiceChat = ({ chatMessages, isAITyping, onSendMessage }: VoiceChatOptions) => {
    const [isCallActive, setIsCallActive] = useState(false);
    
    const { isSpeaking, speak, cancel } = useSpeechSynthesis();
    const { isListening, finalTranscript, startListening, stopListening, resetFinalTranscript } = useSpeechRecognition();
    
    // Speak new AI messages when in call mode
    useEffect(() => {
        if (isCallActive && !isAITyping) {
            const lastMessage = chatMessages[chatMessages.length - 1];
            // Ensure the last message is from the model and hasn't been spoken yet.
            // A simple way to prevent re-speaking is to check if the AI is currently speaking.
            if (lastMessage && lastMessage.role === 'model' && !isSpeaking) {
                // Find the latest text part to speak. This handles streaming responses.
                const lastTextPart = [...lastMessage.parts].reverse().find(p => p.type === 'text' && (p as any).text.trim() !== '');

                if (lastTextPart) {
                    const textToSpeak = (lastTextPart as { type: 'text', text: string }).text;
                     // Heuristic to check if this is a newly completed message
                    if (chatMessages.length > 1) { // Avoid speaking the initial greeting twice
                        speak(textToSpeak);
                    }
                }
            }
        }
    }, [chatMessages, isAITyping, isCallActive, isSpeaking, speak]);

    // Send user's speech when they release the PTT button
    useEffect(() => {
        if (!isListening && finalTranscript.trim()) {
            onSendMessage([{ type: 'text', text: finalTranscript }]);
            resetFinalTranscript();
        }
    }, [isListening, finalTranscript, onSendMessage, resetFinalTranscript]);

    const handlePttMouseDown = useCallback(() => {
        cancel(); // Stop AI if it's talking
        startListening();
    }, [cancel, startListening]);

    const handlePttMouseUp = useCallback(() => {
        stopListening();
    }, [stopListening]);
    
    const startCall = useCallback(() => {
        setIsCallActive(true);
    }, []);

    const endCall = useCallback(() => {
        cancel();
        stopListening();
        setIsCallActive(false);
    }, [cancel, stopListening]);

    return {
        isCallActive,
        isListening,
        isSpeaking,
        startCall,
        endCall,
        handlePttMouseDown,
        handlePttMouseUp,
    };
};
