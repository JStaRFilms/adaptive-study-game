import React from 'react';
import { AnswerLog, Question, QuestionType, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion } from '../types';

interface ReviewScreenProps {
  answerLog: AnswerLog[];
  onRetakeSameQuiz: () => void;
  onStartNewQuiz: () => void;
}

const getAnswerText = (question: Question, answer: any): string => {
  if (answer === null) return 'Not answered';
  switch (question.questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      const mc = question as MultipleChoiceQuestion;
      return typeof answer === 'number' ? mc.options[answer] : 'Invalid Answer';
    case QuestionType.TRUE_FALSE:
      return answer ? 'True' : 'False';
    case QuestionType.FILL_IN_THE_BLANK:
      return `"${answer}"`;
    default:
      return 'N/A';
  }
};

const ReviewCard: React.FC<{ log: AnswerLog, index: number }> = ({ log, index }) => {
  const { question, userAnswer, isCorrect } = log;
  const CorrectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-correct" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const IncorrectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-incorrect" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  
  let correctAnswerText = '';
  switch (question.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
          correctAnswerText = (question as MultipleChoiceQuestion).options[(question as MultipleChoiceQuestion).correctAnswerIndex];
          break;
      case QuestionType.TRUE_FALSE:
          correctAnswerText = (question as TrueFalseQuestion).correctAnswer ? 'True' : 'False';
          break;
      case QuestionType.FILL_IN_THE_BLANK:
          correctAnswerText = (question as FillInTheBlankQuestion).correctAnswer;
          break;
  }

  return (
    <div className="bg-surface-dark p-6 rounded-xl border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <p className="text-text-secondary font-semibold">Question {index + 1}</p>
        {isCorrect ? <CorrectIcon /> : <IncorrectIcon />}
      </div>
      <p className="text-xl font-semibold text-text-primary mb-4" dangerouslySetInnerHTML={{__html: question.questionText}} />
      
      <div className="space-y-3 text-text-secondary">
        <p>Your Answer: <span className={`font-bold ${isCorrect ? 'text-correct' : 'text-incorrect'}`}>{getAnswerText(question, userAnswer)}</span></p>
        {!isCorrect && <p>Correct Answer: <span className="font-bold text-correct">{correctAnswerText}</span></p>}
        <div className="pt-2">
            <p className="font-bold text-sm text-gray-400">EXPLANATION</p>
            <p>{question.explanation}</p>
        </div>
      </div>
    </div>
  );
};


const ReviewScreen: React.FC<ReviewScreenProps> = ({ answerLog, onRetakeSameQuiz, onStartNewQuiz }) => {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-8">Quiz Review</h1>
      
      <div className="space-y-4 mb-8">
        {answerLog.map((log, index) => (
          <ReviewCard key={index} log={log} index={index} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-4">
          <button
            onClick={onRetakeSameQuiz}
            className="w-full sm:w-auto px-8 py-4 bg-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-primary transition-all duration-300 transform hover:scale-105"
          >
            Retake Same Quiz
          </button>
          <button
            onClick={onStartNewQuiz}
            className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105"
          >
            Create New Quiz
          </button>
        </div>
    </div>
  );
};

export default ReviewScreen;
