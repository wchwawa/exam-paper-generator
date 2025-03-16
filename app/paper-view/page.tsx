"use client";

import MCQ from "@/components/questions/mcq";
import SimpleAnswerQuestion from "@/components/questions/simple-answer";
import { useQuestionStore } from "@/store/questionStore";
import { usePDF } from "react-to-pdf";

import {
  Box,
  Button,
  Flex,
  Group,
  Heading,
  Switch,
  Tag,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Question as StoreQuestion } from "@/store/paperStore";

interface MCQOption {
  optionId: string;
  optionTitle: string;
  optionValue: string;
  explanation: string;
}

interface APIQuestion {
  questionId: string;
  questionTitle: string;
  questionType: "mcq" | "short-answer";
  answer?: string;
  userAnswer: string;
  hint?: string;
  explanation?: string;
  mcqOptions?: MCQOption[];
  learningResource?: string;
}

interface GeneratedPaper {
  paperId: string;
  paperTitle: string;
  question: APIQuestion[];
}

interface APIResponse {
  success: boolean;
  message: string;
  data: {
    generatedPaper: GeneratedPaper;
  };
}

// Example questions data

export default function PaperViewCheck() {
  return (
    <Suspense>
      <PaperView />
    </Suspense>
  );
}

function PaperView() {
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

  const [paperTitle, setPaperTitle] = useState("");

  const { toPDF, targetRef } = usePDF({
    filename: `${paperTitle || "Exam Paper"}.pdf`,
  });

  useEffect(() => setPaperTitle(localStorage.getItem("title") ?? ""), []);
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
        const { generatedPaper } = result.data;

        // Transform the questions into the expected format for our store
        const questions: StoreQuestion[] = generatedPaper.question.map((q) => ({
          questionId: q.questionId,
          questionTitle: q.questionTitle,
          questionType: q.questionType,
          answer: q.answer || "",
          hint: q.hint || "",
          userAnswer: q.userAnswer || "",
          learningResource: q.learningResource,
          ...(q.questionType === "mcq"
            ? {
                mcqOptions:
                  q.mcqOptions?.map((opt) => ({
                    optionId: opt.optionId,
                    optionTitle: opt.optionTitle,
                    optionValue: opt.optionValue,
                    explanation: opt.explanation,
                  })) || [],
              }
            : {
                explanation: q.explanation || "",
              }),
        })) as StoreQuestion[];

        // Load the questions into the store
        loadQuestions(generatedPaper.paperTitle, questions);
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

  if (isLoading) {
    return (
      <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
        <Flex direction="column" align="center" gap={4}>
          <Spinner size="xl" />
          <Text>Generating your exam paper...</Text>
          <Text>It might take up to 2 minutes, be patient...</Text>
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
                max-width: 21cm !important;
              }
              .question-card {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 2rem !important;
                padding: 1rem !important;
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
              }
              .answer-space {
                min-height: 150px;
                border: 1px dashed #e2e8f0;
                margin-top: 1rem;
                margin-bottom: 1rem;
              }
              .page-header {
                position: static !important;
                box-shadow: none !important;
                margin-bottom: 2rem;
                padding: 0 !important;
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
        <Heading>{paperTitle}</Heading>
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
          ref={targetRef}
          w={"100%"}
          px={4}
          py={3}
          className="bg-white flex-1 print-content"
        >
          <Heading size="2xl" mb={6}>
            {paperTitle}
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
                      learningResource={originalQuestion.learningResource}
                    />
                  </Box>
                );
              }

              return (
                <Box key={questionId} className="question-card">
                  <SimpleAnswerQuestion
                    questionNumber={index + 1}
                    hint={progress?.isRevealed ? originalQuestion.hint : ""}
                    title={`${index + 1}. ${originalQuestion.questionTitle}`}
                    explanation={
                      progress?.isRevealed &&
                      originalQuestion.questionType === "short-answer"
                        ? originalQuestion.answer
                        : undefined
                    }
                    onAnswer={(answer) => answerQuestion(questionId, answer)}
                    userAnswer={progress?.userAnswer}
                    learningResource={originalQuestion.learningResource}
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
            <Button variant="outline" w="100%" onClick={() => toPDF()}>
              Generate PDF
            </Button>
            <Box borderBottom="1px solid" borderColor="gray.200" />
            <Button
              variant="outline"
              w="100%"
              onClick={() => {
                setIsTimerRunning(false);
                setElapsedTime(0);
                startGenerate(new AbortController().signal);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" mr={2} />
                  Regenerating...
                </>
              ) : (
                "Regenerate Paper"
              )}
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
