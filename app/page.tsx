"use client";
import Image from "next/image";

import { IconFileSmile, IconFileUpload } from "@tabler/icons-react";
import {
  Box,
  Button,
  createListCollection,
  Portal,
  Select,
  Heading,
  Text,
  Flex,
} from "@chakra-ui/react";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <Box
      bg="gray.100"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="100vw"
      h="100vh"
    >
      <Flex flexDirection="column" alignItems="center" justifyContent="center">
        <IconFileSmile size={64} />
        <Heading mt={2} fontSize="4xl" fontWeight="medium">
          Exam Paper Generator
        </Heading>
        <Text mt={3} color="gray.500">
          Simply add your lecture file, we will help you to create{" "}
        </Text>
        <Box
          bg="white"
          mt={6}
          border="1px solid"
          w="650px"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          borderColor="gray.200"
          px={4}
          py={2}
          borderRadius="md"
        >
          <Flex
            borderBottom="1px"
            w="full"
            px={2}
            color="gray.500"
            alignItems="center"
            h="150px"
            justifyContent="center"
            flexDirection="column"
          >
            <IconFileUpload size={42} />
            <Text mt={2}>Add Lecture Files</Text>
            <Text fontSize="xs" color="gray.400">
              Accepts PDF, PPTX, Word and More
            </Text>
          </Flex>
          <Flex
            borderTop="1px solid"
            borderColor="gray.200"
            w="full"
            px={2}
            py={2}
            justifyContent="space-between"
          >
            <Box w="180px">
              <Select.Root size="md" collection={questionTypes} multiple>
                <Select.HiddenSelect />

                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select Question Type" />
                  </Select.Trigger>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {questionTypes.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>

            <Button onClick={() => router.push("/create-paper")}>
              Generate
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}

const questionTypes = createListCollection({
  items: [
    {
      label: "Multiple Choice",
      value: "mcq",
    },
    {
      label: "Short Answer",
      value: "short_answer",
    },
  ],
});
