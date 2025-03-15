import { db } from './config';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

// Mock MCQ Exam Paper
const mockMCQExamPaper = {
  paperId: 'mcq-001',
  paperTitle: 'Multiple Choice Programming Quiz 2024',
  paperType: 'mcq',
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [
    {
      questionId: '1',
      questionType: 'mcq',
      questionTitle: 'Which of the following is NOT a feature of React?',
      answer: 'C',
      explanation: 'React is a JavaScript library for building user interfaces. It features Virtual DOM, Component-based architecture, and Unidirectional data flow. Two-way data binding is a feature of Angular, not React.',
      tips: 'Think about the core features that distinguish React from other frameworks.',
      mcqOptions: [
        { optionId: 'A', optionTitle: 'Virtual DOM', optionValue: 'virtual_dom' },
        { optionId: 'B', optionTitle: 'Component-based Architecture', optionValue: 'component_based' },
        { optionId: 'C', optionTitle: 'Two-way Data Binding', optionValue: 'two_way_binding' },
        { optionId: 'D', optionTitle: 'Unidirectional Data Flow', optionValue: 'unidirectional_flow' }
      ]
    },
    {
      questionId: '2',
      questionType: 'mcq',
      questionTitle: 'What is the output of: console.log(typeof null)?',
      answer: 'B',
      explanation: 'In JavaScript, typeof null returns "object". This is a known language quirk that has existed since the first version of JavaScript.',
      tips: 'This is a classic JavaScript interview question about type checking.',
      mcqOptions: [
        { optionId: 'A', optionTitle: '"null"', optionValue: 'null_string' },
        { optionId: 'B', optionTitle: '"object"', optionValue: 'object_string' },
        { optionId: 'C', optionTitle: '"undefined"', optionValue: 'undefined_string' },
        { optionId: 'D', optionTitle: '"boolean"', optionValue: 'boolean_string' }
      ]
    }
  ]
};

// Mock Short Answer Exam Paper
const mockShortAnswerExamPaper = {
  paperId: 'short-001',
  paperTitle: 'Programming Concepts Short Answer Test 2024',
  paperType: 'short-answer',
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [
    {
      questionId: '1',
      questionType: 'short-answer',
      questionTitle: 'Explain the concept of closure in JavaScript and provide a practical example.',
      answer: `A closure is the combination of a function bundled together with references to its surrounding state. It gives you access to an outer function's scope from an inner function. Closures are commonly used for data privacy and maintaining state.

Example:
function counter() {
  let count = 0;
  return function() {
    return ++count;
  }
}
const increment = counter();`,
      explanation: 'This question tests understanding of fundamental JavaScript concepts. The example demonstrates how closures can maintain private variables and state.',
      tips: 'Focus on the scope access and practical applications of closures.'
    },
    {
      questionId: '2',
      questionType: 'short-answer',
      questionTitle: 'What are React Hooks? Explain the differences between useEffect and useState.',
      answer: `React Hooks are functions that allow you to "hook into" React state and lifecycle features from function components. 

useState: Allows you to add state to functional components. It returns an array with the current state value and a function to update it.

useEffect: Handles side effects in functional components. It runs after every render and can be used for data fetching, subscriptions, or manually changing the DOM.`,
      explanation: 'This tests understanding of modern React development practices and the transition from class components to functional components with hooks.',
      tips: 'Consider the different use cases and timing of these hooks in the component lifecycle.'
    }
  ]
};

// 上传试卷模板
export const uploadExamTemplate = async (type: 'mcq' | 'short-answer' = 'mcq') => {
  try {
    const examRef = collection(db, 'examTemplates');
    const templateToUpload = type === 'mcq' ? mockMCQExamPaper : mockShortAnswerExamPaper;
    
    // 使用 setDoc 来设置特定 ID 的文档
    await setDoc(doc(examRef, templateToUpload.paperId), templateToUpload);
    
    (`${type} 试卷模板上传成功`);
    return true;
  } catch (error) {
    console.error('上传试卷模板失败:', error);
    throw error;
  }
};

// 获取试卷模板
export const getExamTemplate = async (paperId: string) => {
  try {
    const docRef = doc(db, 'examTemplates', paperId);
    const docSnap = await getDocs(collection(db, 'examTemplates'));
    return docSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('获取试卷模板失败:', error);
    throw error;
  }
};

// 获取所有试卷模板
export const getAllExamTemplates = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'examTemplates'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('获取所有试卷模板失败:', error);
    throw error;
  }
};