import { create } from "zustand";

// Types for our store
type MCQOption = {
  optionId: string;
  optionTitle: string;
  optionValue: string;
  explanation: string; //explanation
};

type BaseQuestion = {
  questionId: string;
  questionTitle: string;
  userAnswer?: string;
  hint: string;
  learningResource?: string;
};

type MCQQuestion = BaseQuestion & {
  questionType: "mcq";
  answer: string;

  mcqOptions: MCQOption[];
};

type ShortAnswerQuestion = BaseQuestion & {
  questionType: "short-answer";
  answer: string;
};

export type Question = MCQQuestion | ShortAnswerQuestion;

type TestPaper = {
  paperId: string;
  paperTitle: string;
  questions: Question[];
};

interface PaperStore {
  papers: Record<string, TestPaper>;
  currentPaperId: string | null;
  // Actions
  addPaper: (paper: TestPaper) => void;
  updatePaper: (paperId: string, paper: Partial<TestPaper>) => void;
  setCurrentPaper: (paperId: string) => void;
  updateQuestionAnswer: (
    paperId: string,
    questionId: string,
    userAnswer: string
  ) => void;
  // Selectors
  getCurrentPaper: () => TestPaper | null;
  getPaperById: (paperId: string) => TestPaper | null;
}

export const usePaperStore = create<PaperStore>((set, get) => ({
  papers: {},
  currentPaperId: null,

  // Add a new paper to the store
  addPaper: (paper) =>
    set((state) => ({
      papers: {
        ...state.papers,
        [paper.paperId]: paper,
      },
    })),

  // Update an existing paper
  updatePaper: (paperId, paperUpdate) =>
    set((state) => ({
      papers: {
        ...state.papers,
        [paperId]: {
          ...state.papers[paperId],
          ...paperUpdate,
        },
      },
    })),

  // Set the current paper ID
  setCurrentPaper: (paperId) =>
    set(() => ({
      currentPaperId: paperId,
    })),

  // Update a question's user answer
  updateQuestionAnswer: (paperId, questionId, userAnswer) =>
    set((state) => {
      const paper = state.papers[paperId];
      if (!paper) return state;

      return {
        papers: {
          ...state.papers,
          [paperId]: {
            ...paper,
            questions: paper.questions.map((q) =>
              q.questionId === questionId
                ? {
                    ...q,
                    userAnswer,
                  }
                : q
            ),
          },
        },
      };
    }),

  // Get the current paper
  getCurrentPaper: () => {
    const { papers, currentPaperId } = get();
    return currentPaperId ? papers[currentPaperId] : null;
  },

  // Get a paper by ID
  getPaperById: (paperId) => {
    const { papers } = get();
    return papers[paperId] || null;
  },
}));
