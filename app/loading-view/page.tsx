"use client";

import { Box, Center, Text, VStack, Image, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";

export default function LoadingView() {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();

  const [folderId] = useQueryState("folderId");
  const [mcqAnswerNumber] = useQueryState("mcqAnswerNumber");
  const [shortAnswerNumber] = useQueryState("shortAnswerNumber");

  const startGenerate = async (signal: AbortSignal) => {
    try {
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

      console.log(await response.json());

      setProgress(100);
      setIsCompleted(true);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Generation failed:", error);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    startGenerate(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    // Only animate up to 85% while waiting
    const fastInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(fastInterval);
          return 85;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearInterval(fastInterval);
    };
  }, []);

  return (
    <Center h="100vh" bg="white">
      <VStack gap={8}>
        <Text fontSize="2xl" fontWeight="medium">
          {isCompleted
            ? "Your paper is completed"
            : "We are preparing your paper"}
        </Text>
        <Box position="relative" w="500px" h="500px">
          <Image
            src={isCompleted ? "/complete.svg" : "/loading.svg"}
            alt={isCompleted ? "Complete" : "Loading animation"}
            width={500}
            height={500}
            objectFit="contain"
          />
        </Box>
        {!isCompleted ? (
          <>
            <Box
              w="400px"
              h="2px"
              bg="gray.100"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                w={`${progress}%`}
                h="100%"
                bg="blue.500"
                transition="width 0.3s ease-in-out"
              />
            </Box>
            <Text color="gray.500">Extracting PDF Contents...</Text>
          </>
        ) : (
          <Button
            colorScheme="blue"
            size="lg"
            onClick={() => router.push("/paper-view")}
          >
            View Paper
          </Button>
        )}
      </VStack>
    </Center>
  );
}
