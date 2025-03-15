import { create } from "zustand";
import { type Question } from "./paperStore";

// Types for question progress tracking
interface QuestionProgress {
  questionId: string;
  userAnswer: string | null;
  answer?: string;
  originalQuestion: Question;
  isRevealed: boolean;
}

interface QuestionStore {
  // State
  questions: Record<string, QuestionProgress>;
  paperId: string | null;
  isMarkingRevealed: boolean;

  // Actions
  loadQuestions: (paperId: string, questions: Question[]) => void;
  answerQuestion: (questionId: string, answer: string) => void;
  revealMarking: () => void;
  hideMarking: () => void;
  resetPaper: () => void;

  // Selectors
  getQuestionProgress: (questionId: string) => QuestionProgress | null;
}

export const useQuestionStore = create<QuestionStore>((set, get) => ({
  questions: {},
  paperId: null,
  isMarkingRevealed: false,

  loadQuestions: (paperId, questions) => {
    const questionProgress: Record<string, QuestionProgress> = {};

    questions.forEach((question) => {
      questionProgress[question.questionId] = {
        questionId: question.questionId,
        userAnswer: null,
        originalQuestion: question,
        isRevealed: false,
      };
    });

    set({
      questions: questionProgress,
      paperId,
      isMarkingRevealed: false,
    });
  },

  answerQuestion: (questionId, answer) =>
    set((state) => {
      const question = state.questions[questionId];
      if (!question) return state;

      return {
        questions: {
          ...state.questions,
          [questionId]: {
            ...question,
            userAnswer: answer,
          },
        },
      };
    }),

  revealMarking: () =>
    set((state) => {
      const newQuestions: Record<string, QuestionProgress> = {};

      Object.values(state.questions).forEach((question) => {
        newQuestions[question.questionId] = {
          ...question,
          isRevealed: true,
        };
      });

      return {
        questions: newQuestions,
        isMarkingRevealed: true,
      };
    }),

  hideMarking: () =>
    set((state) => {
      const newQuestions: Record<string, QuestionProgress> = {};

      Object.values(state.questions).forEach((question) => {
        newQuestions[question.questionId] = {
          ...question,
          isRevealed: false,
        };
      });

      return {
        questions: newQuestions,
        isMarkingRevealed: false,
      };
    }),

  resetPaper: () =>
    set({
      questions: {},
      paperId: null,
      isMarkingRevealed: false,
    }),

  getQuestionProgress: (questionId) => {
    const { questions } = get();
    return questions[questionId] || null;
  },
}));
