import { Accordion, Box, Flex, Span, Text, Textarea } from "@chakra-ui/react";
import { FC } from "react";

import { IconCircle, IconInfoCircle } from "@tabler/icons-react";
import { Alert } from "@chakra-ui/react";

const SimpleAnswerQuestion: FC<{
  questionNumber: number;
  title: string;
  hints?: string;
  explanation?: string;
  onAnswer?: (answer: string) => void;
  userAnswer?: string | null;
  hint: string;
}> = ({ title, hint, explanation, onAnswer, userAnswer, questionNumber }) => {
  return (
    <Box mt={2}>
      <Text mt={2} fontSize="lg" className=" text-gray-500">
        Question {questionNumber}
      </Text>
      <Text fontSize="xl">{title}</Text>
      {hint && (
        <Accordion.Root collapsible>
          <Accordion.Item value="1">
            <Accordion.ItemTrigger>
              <Flex flex="1">
                <IconInfoCircle /> hint
              </Flex>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Text>{hint}</Text>
            </Accordion.ItemContent>
          </Accordion.Item>
        </Accordion.Root>
      )}

      <Text color="gray.500" mt={3}>
        Enter your answer
      </Text>

      <Textarea
        mt="2"
        size="lg"
        height={"180px"}
        placeholder="Type your answer here..."
        value={userAnswer || ""}
        onChange={(e) => onAnswer?.(e.target.value)}
      />
      {explanation && (
        <Accordion.Root collapsible>
          <Accordion.Item value="1">
            <Accordion.ItemTrigger>
              <Flex flex="1">
                <IconInfoCircle /> Simple Answer
              </Flex>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Text>{explanation}</Text>
            </Accordion.ItemContent>
          </Accordion.Item>
        </Accordion.Root>
      )}
    </Box>
  );
};

export default SimpleAnswerQuestion;
