import type { ChatMessage } from '../types';

const greetingPrefix = 'You are reviewing your quiz on "';
const greetingSuffix = '". Feel free to ask me anything about your performance or the questions.';

export const reviewGreeting = (name: string) => `${greetingPrefix}${name}${greetingSuffix}`;
export const focusedQuizSuggestion = "Based on your results, I've identified some areas we can work on. I can create a quiz to help you practice.";

export const savedReviewHistory = (messages: ChatMessage[]): ChatMessage[] =>
  messages
    .filter(message => message.role === 'user' ||
      !(message.text.startsWith(greetingPrefix) && message.text.endsWith(greetingSuffix)))
    .map(({ action, ...message }) => message);

export const savedReviewTurns = (messages: ChatMessage[]): ChatMessage[] =>
  savedReviewHistory(messages).filter(message => message.role === 'user' || message.text !== focusedQuizSuggestion);
