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
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Question } from "@/store/paperStore";

interface MCQOption {
  option: string;
  explanation: string;
}

interface MultipleChoiceQuestion {
  question: string;
  options: MCQOption[];
  answer: string;
}

interface ShortAnswerQuestion {
  question: string;
  answer: string;
}

interface APIResponse {
  success: boolean;
  message: string;
  data: {
    examPaper: {
      multiple_choice: MultipleChoiceQuestion[];
      "short-answer": ShortAnswerQuestion[];
    };
  };
}

// Example questions data

export default function PaperView() {
  const {
    loadQuestions,
    answerQuestion,
    revealMarking,
    hideMarking,
    isMarkingRevealed,
    getQuestionProgress,
    questions,
  } = useQuestionStore();

  const router = useRouter();

  const [folderId] = useQueryState("folderId");
  const [mcqAnswerNumber] = useQueryState("mcqAnswerNumber");
  const [shortAnswerNumber] = useQueryState("shortAnswerNumber");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startGenerate = async (signal: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/generatePaper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId,
          mcqAnswerNumber,
          shortAnswerNumber,
        }),
        signal,
      });

      const result: APIResponse = await response.json();

      if (result.success) {
        const { multiple_choice, "short-answer": shortAnswer } =
          result.data.examPaper;

        // Transform the questions into the expected format
        const questions: Question[] = [
          ...multiple_choice.map(
            (q: MultipleChoiceQuestion, index: number) => ({
              questionId: `mcq-${index}`,
              questionTitle: q.question,
              questionType: "mcq" as const,
              answer: q.answer,
              hint: "", // Required by BaseQuestion interface
              explanation: q.options.find((opt) =>
                opt.option.startsWith(q.answer + ".")
              )?.explanation,
              mcqOptions: q.options.map((opt: MCQOption, optIndex: number) => {
                const optionId = String.fromCharCode(65 + optIndex); // A, B, C, D
                return {
                  optionId,
                  optionTitle: opt.option.substring(3), // Remove "A. ", "B. " etc
                  optionValue: optionId,
                  explanation: opt.explanation,
                };
              }),
            })
          ),
          ...shortAnswer.map((q: ShortAnswerQuestion, index: number) => ({
            questionId: `sa-${index}`,
            answer: q.answer,
            questionTitle: q.question,
            questionType: "short-answer" as const,
            hint: "", // Required by BaseQuestion interface
            explanation: q.answer,
          })),
        ];

        // Load the questions into the store
        loadQuestions("generated-paper", questions);
      } else {
        setError("Failed to generate exam paper");
      }

      setIsLoading(false);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Generation failed:", error);
      setError("Failed to generate exam paper: " + error.message);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    startGenerate(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, []);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGenerating } = usePdfGenerator();

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

  // const handleDownloadPdf = async () => {
  //   if (contentRef.current) {
  //     await generatePdf(
  //       contentRef,
  //       "Data Structure And Algorithm Practice Exam",
  //       exampleQuestions
  //     );
  //   }
  // };

  if (isLoading) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Flex direction="column" align="center" gap={4}>
          <Spinner size="xl" />
          <Text>Generating your exam paper...</Text>
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Flex direction="column" align="center" gap={4}>
          <Text color="red.500">{error}</Text>
          <Button onClick={() => startGenerate(new AbortController().signal)}>
            Try Again
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <style>
        {`
            body {
                background-color: #f8f8f8;
            }
            @media print {
              body {
                background-color: white !important;
                margin: 0;
                padding: 0;
              }
              @page {
                margin: 2cm;
                size: A4;
              }
              .no-print {
                display: none !important;
              }
              .print-content {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
              }
              .question-card {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 1.5rem;
                border: none !important;
                box-shadow: none !important;
              }
              .page-header {
                position: static !important;
                box-shadow: none !important;
                margin-bottom: 2rem;
              }
            }
        `}
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
        className="page-header"
      >
        <Heading>Data Structure and Algorithm</Heading>
        <Group spaceX={2}>
          <Tag.Root>
            <Tag.Label>AI Generated Practice Exam</Tag.Label>
          </Tag.Root>
          <Tag.Root>
            <Tag.Label>{Object.keys(questions).length} Questions</Tag.Label>
          </Tag.Root>
        </Group>
      </Box>

      <Flex px={12} gapX={18} py={24}>
        <Box
          ref={contentRef}
          w={"100%"}
          px={4}
          py={3}
          className="bg-white flex-1 print-content"
        >
          <Heading size="2xl" mb={6}>
            Data Structure And Algorithm Practice Exam
          </Heading>

          <section className="flex flex-col gap-5">
            {Object.entries(questions).map(([questionId, question], index) => {
              const progress = getQuestionProgress(questionId);
              const originalQuestion = progress?.originalQuestion;

              if (!originalQuestion) {
                return null;
              }

              if (originalQuestion.questionType === "mcq") {
                return (
                  <Box key={questionId} className="question-card">
                    <MCQ
                      questionNumber={index + 1}
                      title={`${index + 1}. ${originalQuestion.questionTitle}`}
                      options={originalQuestion.mcqOptions.map((opt) => ({
                        title: opt.optionTitle,
                        value: opt.optionId,
                        explanation: opt.explanation,
                      }))}
                      hint={originalQuestion.hint}
                      explanation={
                        progress?.isRevealed
                          ? originalQuestion.answer
                          : undefined
                      }
                      onAnswer={(answer) => answerQuestion(questionId, answer)}
                      userAnswer={progress?.userAnswer}
                      correctAnswer={
                        progress?.isRevealed
                          ? originalQuestion.answer
                          : undefined
                      }
                      isRevealed={progress?.isRevealed}
                    />
                  </Box>
                );
              }

              return (
                <Box key={questionId} className="question-card">
                  <SimpleAnswerQuestion
                    questionNumber={index + 1}
                    hint={originalQuestion.hint}
                    title={`${index + 1}. ${originalQuestion.questionTitle}`}
                    explanation={
                      progress?.isRevealed &&
                      originalQuestion.questionType === "short-answer"
                        ? originalQuestion.answer
                        : undefined
                    }
                    onAnswer={(answer) => answerQuestion(questionId, answer)}
                    userAnswer={progress?.userAnswer}
                  />
                </Box>
              );
            })}

            <Box
              mt={8}
              pt={4}
              borderTop="1px solid"
              borderColor="gray.200"
              className="no-print"
            >
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
        <Box pos="relative" className="no-print">
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
            <Button variant="outline" w="100%" disabled={isGenerating}>
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
