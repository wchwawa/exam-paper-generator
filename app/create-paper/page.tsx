"use client";
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  Span,
  Steps,
  Text,
} from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Separator } from "@chakra-ui/react";
import { IconAbc, IconInputSearch, IconInputSpark } from "@tabler/icons-react";

export default function CreatePaper() {
  return (
    <Box
      bg="gray.100"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="100vw"
      minH={"100vh"}
    >
      <Box borderRadius="md" px={8} py={4} w={750} bg="white">
        <Steps.Root step={1} count={steps.length}>
          <Steps.List>
            {steps.map((step, index) => (
              <Steps.Item key={index} index={index} title={step.title}>
                <Steps.Indicator />
                <Steps.Title>{step.title}</Steps.Title>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>
          {steps.map((step, index) => (
            <Steps.Content key={index} index={index}></Steps.Content>
          ))}
        </Steps.Root>

        <Heading mt={2} fontSize="3xl" fontWeight="medium">
          Create New Paper
        </Heading>

        <Field.Root mt={4}>
          <Field.Label>Enter Paper Title</Field.Label>
          <Input placeholder="Enter Title" />
        </Field.Root>

        <Separator my={4} />

        <Text mt={3}>How many questions would you like to have?</Text>

        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Flex
            rounded="md"
            mt={2}
            gap={2}
            alignItems="top"
            border="1px solid"
            px={2}
            py={2}
            borderColor="gray.300"
          >
            <Flex
              justifyContent="center"
              alignItems="center"
              rounded="md"
              bg="gray.100"
              h="48px"
              w={"48px"}
            >
              <IconAbc />
            </Flex>
            <Box>
              <Text fontWeight="medium">MCQ Questions</Text>
              <Field.Root>
                <Input
                  size="sm"
                  defaultValue={0}
                  type="number"
                  mt={1}
                  placeholder="Enter Number"
                />
              </Field.Root>
            </Box>
          </Flex>
          <Flex
            rounded="md"
            mt={2}
            gap={2}
            alignItems="top"
            border="1px solid"
            px={2}
            py={2}
            borderColor="gray.300"
          >
            <Flex
              justifyContent="center"
              alignItems="center"
              rounded="md"
              bg="gray.100"
              h="48px"
              w={"48px"}
            >
              <IconInputSpark />
            </Flex>
            <Box>
              <Text fontWeight="medium">Short Answer Questions</Text>
              <Input
                size="sm"
                defaultValue={0}
                type="number"
                mt={1}
                placeholder="Enter Number"
              />
            </Box>
          </Flex>
        </Grid>
        <div className="w-full flex justify-end">
          <Button mt={4} colorScheme="blue">
            Start Generating
          </Button>
        </div>
      </Box>
    </Box>
  );
}

const steps = [
  {
    title: "Upload File",
  },
  {
    title: "Configure Questions",
  },
  {
    title: "Start Generate",
  },
];
