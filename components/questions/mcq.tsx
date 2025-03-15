"use client";

import { Accordion, Alert, Box, Flex, Grid, Text } from "@chakra-ui/react";
import { IconInfoCircle } from "@tabler/icons-react";
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
  tips?: string;
  explanation?: string;
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
      <Accordion.Root collapsible>
        <Accordion.Item value="1">
          <Accordion.ItemTrigger>
            <Flex flex="1">
              <IconInfoCircle /> Explanation
            </Flex>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Text>Explanation goes here</Text>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>

      <Text color="gray.500" mt={3}>
        Select the correct answer
      </Text>
      <Grid mt={2} gap={2} templateColumns="repeat(2, 1fr)">
        {options.map((option, index) => (
          <MCQOption key={index} title={option.title} value={option.value} />
        ))}
      </Grid>

      <Alert.Root mt={2} status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>
            Potentially Wrong Answer, Here are some tips
          </Alert.Title>
          <Alert.Description>
            Your form has some errors. Please fix them and try again.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    </Box>
  );
}
