"use client";

import MCQ from "@/components/questions/mcq";
import SimpleAnswerQuestion from "@/components/questions/simple-answer";
import { useQuestionStore } from "@/store/questionStore";
import { usePdfGenerator } from "../hooks/usePdfGenerator";
import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Heading,
  Switch,
  Tag,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";

// Example questions data
const exampleQuestions = [
  {
    questionId: "q1",
    questionTitle:
      "Which programming language is known for its simplicity and readability?",
    questionType: "mcq" as const,
    answer: "A",

    hint: "Think about which language emphasizes readability in its design philosophy.",
    mcqOptions: [
      {
        optionId: "A",
        optionTitle: "Python",
        optionValue: "Python",
        explanation:
          "Python's design philosophy emphasizes code readability with its notable use of significant whitespace and clean syntax.",
      },
      {
        optionId: "B",
        optionTitle: "Java",
        optionValue: "Java",
        explanation:
          "While Java is widely used, its syntax is more verbose compared to Python, requiring more boilerplate code.",
        hint: "Java's syntax requires explicit type declarations and more ceremony.",
      },
      {
        optionId: "C",
        optionTitle: "C++",
        optionValue: "C++",
        explanation:
          "C++ is a powerful language but is known for its complexity and steep learning curve.",
        hint: "C++ provides low-level control but at the cost of simplicity.",
      },
      {
        optionId: "D",
        optionTitle: "JavaScript",
        optionValue: "JavaScript",
        explanation:
          "JavaScript has flexible syntax but can be confusing due to its quirks and type coercion.",
        hint: "JavaScript's flexibility can sometimes lead to unexpected behavior.",
      },
    ],
  },
  {
    questionId: "q2",
    questionTitle: "What is the time complexity of binary search?",
    questionType: "mcq" as const,
    answer: "B",
    explanation:
      "Binary search repeatedly divides the search space in half, resulting in a logarithmic time complexity.",
    hint: "Consider how many steps it takes to find an element as the input size grows.",
    mcqOptions: [
      {
        optionId: "A",
        optionTitle: "O(n)",
        optionValue: "O(n)",
        explanation:
          "Linear search has O(n) complexity as it needs to check each element in the worst case.",
        hint: "This is the complexity of checking every element one by one.",
      },
      {
        optionId: "B",
        optionTitle: "O(log n)",
        optionValue: "O(log n)",
        explanation:
          "Binary search achieves O(log n) by halving the search space in each step.",
        hint: "Think about how many times you can divide n by 2 before reaching 1.",
      },
      {
        optionId: "C",
        optionTitle: "O(n²)",
        optionValue: "O(n²)",
        explanation:
          "Quadratic complexity is typically seen in nested loops, not in binary search.",
        hint: "This complexity is too high for a search algorithm.",
      },
      {
        optionId: "D",
        optionTitle: "O(1)",
        optionValue: "O(1)",
        explanation:
          "Constant time complexity is not possible for searching in an unsorted array.",
        hint: "This would mean finding the element instantly, regardless of array size.",
      },
    ],
  },
  {
    hint: "Think about which language emphasizes readability in its design philosophy.",
    questionId: "q3",
    questionTitle: "How to implement a binary tree?",
    questionType: "short-answer" as const,
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

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGenerating } = usePdfGenerator();

  // Initialize questions when component mounts
  useEffect(() => {
    loadQuestions("example-paper", exampleQuestions);
  }, []);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isTimerRunning) {
      intervalId = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerRunning]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTimerToggle = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleMarkPaper = () => {
    setIsTimerRunning(false);
    revealMarking();
  };

  const handleDownloadPdf = async () => {
    if (contentRef.current) {
      await generatePdf(
        contentRef,
        "Data Structure And Algorithm Practice Exam",
        exampleQuestions
      );
    }
  };

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
        <Box
          ref={contentRef}
          w={"100%"}
          px={4}
          py={3}
          className="bg-white flex-1"
        >
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
                      explanation: opt.explanation,
                    }))}
                    hint={question.hint}
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
                    isRevealed={progress?.isRevealed}
                  />
                );
              }

              return (
                <SimpleAnswerQuestion
                  hint={question.hint}
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
                onClick={handleMarkPaper}
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
            <Button
              colorScheme={isTimerRunning ? "red" : "blue"}
              w="100%"
              onClick={handleTimerToggle}
            >
              {isTimerRunning
                ? `Stop Practice (${formatTime(elapsedTime)})`
                : "Start Timed Practice"}
            </Button>
            {!isTimerRunning && elapsedTime > 0 && (
              <Text fontSize="sm" textAlign="center" color="gray.600">
                Time spent: {formatTime(elapsedTime)}
              </Text>
            )}
            <Button
              variant="outline"
              w="100%"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
            >
              {isGenerating && <Spinner size="sm" mr={2} />}
              {isGenerating ? "Generating PDF..." : "Download as PDF"}
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
