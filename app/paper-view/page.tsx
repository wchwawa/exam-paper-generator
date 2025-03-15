"use client";

import MCQ from "@/components/questions/mcq";
import SimpleAnswerQuestion from "@/components/questions/simple-answer";
import { useQuestionStore } from "@/store/questionStore";
import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Heading,
  Switch,
  Tag,
} from "@chakra-ui/react";
import { useEffect } from "react";

// Example questions data
const exampleQuestions = [
  {
    questionId: "q1",
    questionTitle:
      "Which programming language is known for its simplicity and readability?",
    questionType: "mcq" as const,
    answer: "A",
    explanation:
      "Python is widely recognized for its clean syntax and readability, making it an excellent choice for beginners.",
    tips: "Think about which language emphasizes readability in its design philosophy.",
    mcqOptions: [
      { optionId: "A", optionTitle: "Python", optionValue: "Python" },
      { optionId: "B", optionTitle: "Java", optionValue: "Java" },
      { optionId: "C", optionTitle: "C++", optionValue: "C++" },
      { optionId: "D", optionTitle: "JavaScript", optionValue: "JavaScript" },
    ],
  },
  {
    questionId: "q2",
    questionTitle: "What is the time complexity of binary search?",
    questionType: "mcq" as const,
    answer: "B",
    explanation:
      "Binary search repeatedly divides the search space in half, resulting in a logarithmic time complexity.",
    tips: "Consider how many steps it takes to find an element as the input size grows.",
    mcqOptions: [
      { optionId: "A", optionTitle: "O(n)", optionValue: "O(n)" },
      { optionId: "B", optionTitle: "O(log n)", optionValue: "O(log n)" },
      { optionId: "C", optionTitle: "O(n²)", optionValue: "O(n²)" },
      { optionId: "D", optionTitle: "O(1)", optionValue: "O(1)" },
    ],
  },
  {
    questionId: "q3",
    questionTitle: "How to implement a binary tree?",
    questionType: "short-answer" as const,
    explanation:
      "A binary tree can be implemented using a node class with left and right child pointers, and a value field.",
  },
];

export default function PaperView() {
  const {
    loadQuestions,
    answerQuestion,
    revealMarking,
    hideMarking,
    isMarkingRevealed,
    getQuestionProgress,
  } = useQuestionStore();

  // Initialize questions when component mounts
  useEffect(() => {
    loadQuestions("example-paper", exampleQuestions);
  }, []);

  return (
    <Box>
      <style>
        {`
            body {
                background-color: #f8f8f8;`}
      </style>
      <Box
        zIndex={99}
        position="fixed"
        top={0}
        bg="white"
        p={4}
        w="100%"
        borderRadius="md"
        boxShadow="md"
      >
        <Heading>Data Structure and Algorithm</Heading>
        <Group spaceX={2}>
          <Tag.Root>
            <Tag.Label>AI Generated Practice Exam</Tag.Label>
          </Tag.Root>
          <Tag.Root>
            <Tag.Label>{exampleQuestions.length} Questions</Tag.Label>
          </Tag.Root>
        </Group>
      </Box>

      <Flex px={12} gapX={18} py={24}>
        <Box w={"100%"} px={4} py={3} className="bg-white flex-1">
          <Heading size="2xl" mb={6}>
            Data Structure And Algorithm Practice Exam
          </Heading>

          <section className="flex flex-col gap-5">
            {exampleQuestions.map((question, index) => {
              const progress = getQuestionProgress(question.questionId);

              if (question.questionType === "mcq") {
                return (
                  <MCQ
                    key={question.questionId}
                    title={question.questionTitle}
                    options={question.mcqOptions.map((opt) => ({
                      title: opt.optionTitle,
                      value: opt.optionId,
                    }))}
                    tips={progress?.isRevealed ? question.tips : undefined}
                    explanation={
                      progress?.isRevealed ? question.explanation : undefined
                    }
                    onAnswer={(answer) =>
                      answerQuestion(question.questionId, answer)
                    }
                    userAnswer={progress?.userAnswer}
                    correctAnswer={
                      progress?.isRevealed ? question.answer : undefined
                    }
                  />
                );
              }

              return (
                <SimpleAnswerQuestion
                  key={question.questionId}
                  title={question.questionTitle}
                  explanation={
                    progress?.isRevealed ? question.explanation : undefined
                  }
                  onAnswer={(answer) =>
                    answerQuestion(question.questionId, answer)
                  }
                  userAnswer={progress?.userAnswer}
                />
              );
            })}

            <Box mt={8} pt={4} borderTop="1px solid" borderColor="gray.200">
              <Button
                size="lg"
                colorScheme="blue"
                width="100%"
                onClick={() => {
                  revealMarking();
                }}
              >
                Mark Paper
              </Button>
            </Box>
          </section>
        </Box>
        <Box pos="relative">
          <Box
            pos="sticky"
            top={24}
            px={4}
            py={4}
            border="1px solid"
            bg="white"
            rounded="md"
            borderColor="gray.300"
            w={"360px"}
            h={"fit-content"}
            display={"flex"}
            flexDirection={"column"}
            gap={4}
          >
            <Heading size="md">Actions</Heading>
            <Button colorScheme="blue" w="100%">
              Start Timed Practice
            </Button>
            <Button variant="outline" w="100%">
              Download as PDF
            </Button>
            <Box borderBottom="1px solid" borderColor="gray.200" />
            <Switch.Root
              checked={isMarkingRevealed}
              onCheckedChange={(details) => {
                if (typeof details === "boolean") {
                  if (details) {
                    revealMarking();
                  } else {
                    hideMarking();
                  }
                }
              }}
            >
              <Switch.HiddenInput />
              <Switch.Control />
              <Switch.Label>Show Answers</Switch.Label>
            </Switch.Root>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
