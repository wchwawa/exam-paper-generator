const testPaper = {
  paperId: '123',
  paperTitle: 'Test Paper',
  question: [
    //单选题
    {
      questionId: '1',
      questionTitle: 'What is the capital of France?',
      questionType: 'mcq', //mcq, 
      answer: 'A', 
      userAnswer: 'B',
      hint: '', //hint
      mcqOptions: [
        {
          optionId: 'A',
          optionTitle: 'Paris',
          optionValue: 'Paris',
          explanation: '', //explanation
        },
        {
          optionId: 'B',
          optionTitle: 'Paris',
          optionValue: 'Paris',
          explanation: '', //explanation
        },
        {
          optionId: 'C',
          optionTitle: 'Paris',
          optionValue: 'Paris',
          explanation: '', //explanation
        },
        {
          optionId: 'D',
          optionTitle: 'Paris',
          optionValue: 'Paris',
          explanation: '', //explanation
        },
      ],
    },

    //简答题
    {
      questionId: '2',
      questionTitle: 'What is the capital of France?',
      questionType: 'short-answer', //mcq, 
      userAnswer: 'B',
      explanation: '', //explanation, 在这里就是解题思路 
    },

  ],


}