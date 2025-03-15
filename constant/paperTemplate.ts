const testPaper = {
  paperId: "123",
  paperTitle: "Test Paper",
  question: [
    //单选题
    {
      questionId: "1",
      questionTitle: "What is the capital of France?",
      questionType: "mcq", //mcq,
      answer: "A",
      userAnswer: "B",
      explanation: "", //explanation
      hint: "", //hint

      mcqOptions: [
        {
          optionId: "A",
          optionTitle: "Paris",
          optionValue: "Paris",
        },
        {
          optionId: "B",
          optionTitle: "Paris",
          optionValue: "Paris",
        },
        {
          optionId: "C",
          optionTitle: "Paris",
          optionValue: "Paris",
        },
        {
          optionId: "D",
          optionTitle: "Paris",
          optionValue: "Paris",
        },
      ],
    },

    //简答题
    {
      questionId: "2",
      questionTitle: "What is the capital of France?",
      questionType: "short-answer", //mcq,
      userAnswer: "B",
      explanation: "", //explanation, 在这里就是解题思路
    },
  ],
};
