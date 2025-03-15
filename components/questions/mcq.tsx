"use client";

import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { FC } from "react";

const MCQOption: FC<{
  title: string;
  value: string;
  status?: "correct" | "incorrect";
}> = ({ title, value, status }) => {
  return (
    <Flex
      cursor="pointer"
      borderRadius={"lg"}
      px={2}
      py={2}
      border="1px solid"
      borderColor="gray.300"
      _hover={{
        borderColor: "black",
      }}
      className="gap-1 items-center group"
    >
      <Box
        _groupHover={{
          bg: "black",
          color: "white",
        }}
        borderRadius="lg"
        bg={"gray.200"}
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
  title: string;
  options: { title: string; value: string }[];
}

export default function MCQ({ title, options }: MCQProps) {
  return (
    <Box mt={2}>
      <Text mt={2} fontSize="lg" className=" text-gray-500">
        Question1
      </Text>
      <Text fontSize="xl">
        What is the correct file extension for Python files?
      </Text>

      <Text color="gray.500" mt={3}>
        Select the correct answer
      </Text>
      <Grid mt={2} gap={2} templateColumns="repeat(2, 1fr)">
        {options.map((option, index) => (
          <MCQOption key={index} title={option.title} value={option.value} />
        ))}
      </Grid>
    </Box>
  );
}
