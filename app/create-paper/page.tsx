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

import { IconAbc, IconInputSpark } from "@tabler/icons-react";
import { useForm } from "react-hook-form";

import { useQueryState } from "nuqs";
import { useRouter } from "next/navigation";

interface CreatePaperForm {
  mcqAnswerNumber: number;
  shortAnswerNumber: number;
}

export default function CreatePaper() {
  const router = useRouter();
  const [folderUid] = useQueryState("folderUid");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePaperForm>({
    defaultValues: {
      mcqAnswerNumber: 10,
      shortAnswerNumber: 2,
    },
  });

  const onSubmit = async (data: CreatePaperForm) => {
    router.push(
      `/paper-view?folderId=${folderUid}&mcqAnswerNumber=${data.mcqAnswerNumber}&shortAnswerNumber=${data.shortAnswerNumber}`
    );
  };

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

        <Field.Root>
          <Field.Label htmlFor="folderName" mt={3}>
            <Span>Title Name</Span>
          </Field.Label>
          <Input
            onChange={(e) => localStorage.setItem("title", e.target.value)}
            size="sm"
            id="title"
            placeholder="COMP9123 - Data Structure"
          />
        </Field.Root>

        <form onSubmit={handleSubmit(onSubmit)}>
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
                    type="number"
                    mt={1}
                    placeholder="Enter Number"
                    {...register("mcqAnswerNumber", {
                      required: "MCQ questions count is required",
                      min: {
                        value: 0,
                        message: "Cannot be negative",
                      },
                    })}
                  />
                  {errors.mcqAnswerNumber && (
                    <Text color="red.500" fontSize="sm">
                      {errors.mcqAnswerNumber.message}
                    </Text>
                  )}
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
                  type="number"
                  mt={1}
                  placeholder="Enter Number"
                  {...register("shortAnswerNumber", {
                    required: "Short answer questions count is required",
                    min: {
                      value: 0,
                      message: "Cannot be negative",
                    },
                  })}
                />
                {errors.shortAnswerNumber && (
                  <Text color="red.500" fontSize="sm">
                    {errors.shortAnswerNumber.message}
                  </Text>
                )}
              </Box>
            </Flex>
          </Grid>
          <div className="w-full flex justify-end">
            <Button mt={4} colorScheme="blue" type="submit">
              Start Generating
            </Button>
          </div>
        </form>
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
