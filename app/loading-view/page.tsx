'use client';

import { Box, Center, Text, VStack, Image, Button } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoadingView() {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 快速增长到85%
    const fastInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) {
          clearInterval(fastInterval);
          return 85;
        }
        return prev + 1;
      });
    }, 30);

    // 慢速增长到100%
    setTimeout(() => {
      const slowInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(slowInterval);
            setIsCompleted(true);
            return 100;
          }
          return prev + 0.2;
        });
      }, 100);

      return () => {
        clearInterval(slowInterval);
      };
    }, 85 * 30); // 等待快速增长完成

    return () => {
      clearInterval(fastInterval);
    };
  }, []);

  return (
    <Center h="100vh" bg="white">
      <VStack gap={8}>
        <Text fontSize="2xl" fontWeight="medium">
          {isCompleted ? "Your paper is completed" : "We are preparing your paper"}
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
            <Box w="400px" h="2px" bg="gray.100" borderRadius="full" overflow="hidden">
              <Box 
                w={`${progress}%`} 
                h="100%" 
                bg="blue.500" 
                transition="width 0.3s ease-in-out"
              />
            </Box>
            <Text color="gray.500">
              Extracting PDF Contents...
            </Text>
          </>
        ) : (
          <Button
            colorScheme="blue"
            size="lg"
            onClick={() => router.push('/paper-view')}
          >
            View Paper
          </Button>
        )}
      </VStack>
    </Center>
  );
} 