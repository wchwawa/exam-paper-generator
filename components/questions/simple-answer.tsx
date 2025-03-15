import { Accordion, Box, Flex, Span, Text, Textarea } from "@chakra-ui/react";
import { FC } from "react";

import { IconCircle, IconInfoCircle } from "@tabler/icons-react";
import { Alert } from "@chakra-ui/react";
const SimpleAnswerQuestion: FC<{
  title: string;
  tips?: string;
  correct?: boolean;
  explanation?: string;
}> = () => {
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

      <Textarea
        mt="2"
        size="lg"
        height={"180px"}
        placeholder="Here is a sample placeholder"
      />
      <Alert.Root status="error">
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
};

export default SimpleAnswerQuestion;
