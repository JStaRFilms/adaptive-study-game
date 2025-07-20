import React from 'react';
import { AnswerLog, QuestionType, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, OpenEndedAnswer } from '../types';
import Markdown from './common/Markdown';

interface ReviewCardProps {
  log: AnswerLog;
  index: number;
  parsedAnswerText?: string | null;
  isExamReview?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ log, index, parsedAnswerText, isExamReview }) => {
  const { question, userAnswer, isCorrect, feedback, questionScore } = log;
  const CorrectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-correct" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const IncorrectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-incorrect" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

  const renderUserAnswer = () => {
    if (userAnswer === null) return <span className="text-incorrect font-bold">Not answered</span>;

    switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            const mc = question as MultipleChoiceQuestion;
            const mcAnswer = typeof userAnswer === 'number' ? mc.options[userAnswer] : 'Invalid Answer';
            return <span className={`font-bold ${isCorrect ? 'text-correct' : 'text-incorrect'}`}>{mcAnswer}</span>;
        case QuestionType.TRUE_FALSE:
            return <span className={`font-bold ${isCorrect ? 'text-correct' : 'text-incorrect'}`}>{userAnswer ? 'True' : 'False'}</span>;
        case QuestionType.FILL_IN_THE_BLANK:
            return <span className={`font-bold ${isCorrect ? 'text-correct' : 'text-incorrect'}`}>"{userAnswer as string}"</span>;
        case QuestionType.OPEN_ENDED:
            if (parsedAnswerText) {
                return <div className="bg-gray-900 p-3 rounded-md whitespace-pre-wrap">{parsedAnswerText}</div>;
            }
            if (isExamReview) {
                return <p className="text-gray-500 italic">See full submission above.</p>;
            }
            // Fallback for non-exam open-ended or misconfigurations
            return <p className="bg-gray-900 p-3 rounded-md whitespace-pre-wrap">{(userAnswer as OpenEndedAnswer).text}</p>;
        default:
            return <span className="font-bold">N/A</span>;
    }
  };

  const renderCorrectAnswer = () => {
    if (isCorrect && question.questionType !== QuestionType.FILL_IN_THE_BLANK) return null;
    let correctAnswerText = '';
    switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            correctAnswerText = (question as MultipleChoiceQuestion).options[(question as MultipleChoiceQuestion).correctAnswerIndex];
            break;
        case QuestionType.TRUE_FALSE:
            correctAnswerText = (question as TrueFalseQuestion).correctAnswer ? 'True' : 'False';
            break;
        case QuestionType.FILL_IN_THE_BLANK:
            const fibUserAnswer = (userAnswer as string || '').trim().toLowerCase();
            const fibCorrectAnswer = (question as FillInTheBlankQuestion).correctAnswer.trim().toLowerCase();
            if (fibUserAnswer === fibCorrectAnswer) return null;
            correctAnswerText = (question as FillInTheBlankQuestion).correctAnswer;
            break;
        default:
            return null;
    }
    return <p>Correct Answer: <span className="font-bold text-correct">{correctAnswerText}</span></p>;
  };

  return (
    <div className="bg-surface-dark p-6 rounded-xl border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <p className="text-text-secondary font-semibold">Question {index + 1}</p>
        <div className="flex items-center gap-2">
            {question.questionType === QuestionType.OPEN_ENDED && typeof questionScore === 'number' && (
                <span className={`font-bold text-lg ${questionScore >= 7 ? 'text-correct' : questionScore >= 4 ? 'text-yellow-400' : 'text-incorrect'}`}>
                    {questionScore}/10
                </span>
            )}
            {isCorrect ? <CorrectIcon /> : <IncorrectIcon />}
        </div>
      </div>
      <Markdown content={question.questionText} className="prose prose-invert max-w-none text-text-primary mb-4" />
      
      <div className="space-y-3 text-text-secondary">
        <div className="border-t border-gray-700 pt-3">
            <p className="font-bold text-sm text-gray-400 mb-1">YOUR ANSWER</p>
            {renderUserAnswer()}
        </div>
        
        {renderCorrectAnswer()}

        {feedback && (
             <div className="border-t border-gray-700 pt-3">
                <p className="font-bold text-sm text-gray-400 mb-1">AI FEEDBACK</p>
                <Markdown content={feedback} className="prose prose-invert max-w-none text-text-secondary" />
            </div>
        )}
        
        <div className="border-t border-gray-700 pt-3">
            <p className="font-bold text-sm text-gray-400 mb-1">{question.questionType === QuestionType.OPEN_ENDED ? "GRADING RUBRIC" : "EXPLANATION"}</p>
            <Markdown content={question.explanation} className="prose prose-invert max-w-none text-text-secondary" />
        </div>
      </div>
    </div>
  );
};

const extractAnswerForQuestion = (fullText: string, questionNumber: number): string | null => {
    const regex = /^(?:\s*(?:##?)\s*)?(?:question|q)?\s*(\d+)\s*[.:)]?/gim;
    let match;
    const markers = [];
    while ((match = regex.exec(fullText)) !== null) {
        markers.push({
            number: parseInt(match[1], 10),
            index: match.index,
            headerText: match[0],
        });
    }

    if (markers.length === 0) return null;

    const currentMarker = markers.find(m => m.number === questionNumber);
    if (!currentMarker) return null;

    const nextMarker = markers
        .filter(m => m.index > currentMarker.index)
        .sort((a,b) => a.index - b.index)[0];

    const startIndex = currentMarker.index + currentMarker.headerText.length;
    const endIndex = nextMarker ? nextMarker.index : fullText.length;
    
    const extracted = fullText.substring(startIndex, endIndex).trim();
    return extracted.length > 0 ? extracted : null;
};

interface ReviewScreenProps {
  answerLog: AnswerLog[];
  onRetakeSameQuiz: () => void;
  onStartNewQuiz: () => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({ answerLog, onRetakeSameQuiz, onStartNewQuiz }) => {
  const isExamReview = answerLog.some(log => log.question.questionType === QuestionType.OPEN_ENDED);
  
  let parsedAnswers: (string | null)[] | null = null;
  let fullAnswerText: string | null = null;
  let submittedImages: OpenEndedAnswer['images'] = [];

  if (isExamReview && answerLog.length > 0) {
      const firstOpenEndedLog = answerLog.find(log => log.question.questionType === QuestionType.OPEN_ENDED);
      if (firstOpenEndedLog) {
          const openEndedAnswer = firstOpenEndedLog.userAnswer as OpenEndedAnswer;
          fullAnswerText = openEndedAnswer.text;
          submittedImages = openEndedAnswer.images;
          
          const tempParsed = answerLog.map((log, index) => {
              if (log.question.questionType === QuestionType.OPEN_ENDED && fullAnswerText) {
                  return extractAnswerForQuestion(fullAnswerText, index + 1);
              }
              return null; // Not an open-ended question we need to parse
          });
          
          if (!tempParsed.every(p => p === null)) {
              parsedAnswers = tempParsed;
          }
      }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-8">Quiz Review</h1>
      
      {isExamReview && (
          <div className="mb-8">
              <h2 className="text-2xl font-bold text-text-primary text-center mb-4">Your Submitted Answers</h2>
              {parsedAnswers === null && fullAnswerText && (
                 <div className="bg-surface-dark p-6 rounded-xl border border-gray-700">
                     <p className="font-bold text-sm text-gray-400 mb-2">FULL SUBMISSION (COULD NOT PARSE INDIVIDUAL ANSWERS)</p>
                     <div className="prose prose-invert max-w-none text-text-primary whitespace-pre-wrap">{fullAnswerText}</div>
                 </div>
              )}
              {submittedImages && submittedImages.length > 0 && (
                  <div className="bg-surface-dark p-6 rounded-xl border border-gray-700 mt-4">
                     <p className="font-bold text-sm text-gray-400 mb-4">SUBMITTED IMAGES</p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {submittedImages.map((img, i) => (
                            <a href={`data:${img.mimeType};base64,${img.data}`} target="_blank" rel="noopener noreferrer" key={i}>
                                <img src={`data:${img.mimeType};base64,${img.data}`} alt={`Submitted image ${i+1}`} className="rounded-md object-cover w-full h-full aspect-square hover:opacity-80 transition-opacity" />
                            </a>
                        ))}
                     </div>
                  </div>
              )}
          </div>
      )}

      <div className="space-y-4 mb-8">
        {answerLog.map((log, index) => (
          <ReviewCard 
            key={index} 
            log={log} 
            index={index}
            parsedAnswerText={parsedAnswers ? parsedAnswers[index] : null}
            isExamReview={isExamReview}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-4 p-4">
          <button onClick={onRetakeSameQuiz} className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-secondary transition-all">Retake This Quiz</button>
          <button onClick={onStartNewQuiz} className="w-full sm:w-auto px-8 py-4 bg-brand-secondary text-white font-bold text-lg rounded-lg shadow-lg hover:bg-brand-primary transition-all">Back to Study Sets</button>
      </div>
    </div>
  );
};

export default ReviewScreen;