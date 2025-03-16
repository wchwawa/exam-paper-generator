"use client";

import { Accordion, Alert, Box, Flex, Grid, Text } from "@chakra-ui/react";
import { IconInfoCircle } from "@tabler/icons-react";
import { FC, useEffect, useState } from "react";

const MCQOption: FC<{
  title: string;
  value: string;
  hint: string;
  status?: "correct" | "incorrect";
  isSelected?: boolean;

  onClick?: () => void;
}> = ({ title, value, status, isSelected, onClick }) => {
  return (
    <Flex
      cursor="pointer"
      borderRadius={"lg"}
      px={2}
      py={2}
      border="1px solid"
      borderColor={
        status === "correct"
          ? "green.500"
          : status === "incorrect"
          ? "red.500"
          : isSelected
          ? "blue.500"
          : "gray.300"
      }
      bg={
        status === "correct"
          ? "green.50"
          : status === "incorrect"
          ? "red.50"
          : isSelected
          ? "blue.50"
          : "white"
      }
      _hover={{
        borderColor: status ? undefined : isSelected ? "blue.500" : "black",
      }}
      className="gap-1 items-center group"
      onClick={onClick}
    >
      <Box
        _groupHover={{
          bg: status ? undefined : isSelected ? "blue.500" : "black",
          color: status ? undefined : "white",
        }}
        borderRadius="lg"
        bg={
          status === "correct"
            ? "green.200"
            : status === "incorrect"
            ? "red.200"
            : isSelected
            ? "blue.200"
            : "gray.200"
        }
        color={status || isSelected ? "black" : undefined}
        px={4}
        py={2}
      >
        {value}
      </Box>
      {title}
    </Flex>
  );
};

interface MCQProps {
  questionNumber: number;
  title: string;
  options: { title: string; value: string; explanation: string }[];
  hint?: string;
  explanation?: string;
  onAnswer?: (answer: string) => void;
  userAnswer?: string | null;
  correctAnswer?: string;
  isRevealed?: boolean;
  learningResource?: string;
}

export default function MCQ({
  questionNumber,
  title,
  options,
  hint,
  onAnswer,
  userAnswer,
  correctAnswer,
  isRevealed,
  learningResource,
}: MCQProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Find the selected option's explanation
  const selectedExplanation =
    selectedOption !== null ? options[selectedOption].explanation : "";

  return (
    <Box mt={2}>
      <Text mt={2} fontSize="lg" className=" text-gray-500">
        Question {questionNumber}
      </Text>
      <Text fontSize="xl">{title}</Text>

      <Accordion.Root collapsible>
        <Accordion.Item value="1">
          <Accordion.ItemTrigger>
            <Flex flex="1">
              <IconInfoCircle /> Hint
            </Flex>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Text>{hint}</Text>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>

      <Text color="gray.500" mt={3}>
        Select the correct answer
      </Text>
      <Grid mt={2} gap={2} templateColumns="repeat(2, 1fr)">
        {options.map((option, index) => (
          <MCQOption
            key={index}
            hint={option.explanation}
            title={option.title}
            value={option.value}
            status={
              correctAnswer && isRevealed
                ? option.value === correctAnswer
                  ? "correct"
                  : option.value === userAnswer &&
                    option.value !== correctAnswer
                  ? "incorrect"
                  : undefined
                : undefined
            }
            isSelected={selectedOption === index}
            onClick={() => {
              setSelectedOption(index);
              onAnswer?.(option.value);
            }}
          />
        ))}
      </Grid>

      {selectedExplanation &&
        isRevealed &&
        userAnswer &&
        userAnswer !== correctAnswer && (
          <Alert.Root mt={2} status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Explanation</Alert.Title>
              <Alert.Description>{selectedExplanation}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
    </Box>
  );
}
