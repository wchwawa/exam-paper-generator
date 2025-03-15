"use client";
import { Box, Flex, Grid, Heading, Span, Text } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Separator } from "@chakra-ui/react";

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
        <Heading mt={2} fontSize="3xl" fontWeight="medium">
          Create New Paper
        </Heading>
        <Input mt={4} placeholder="Enter Title" />

        <Separator />

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
            <Box rounded="md" bg="gray.100" h="48px" w={"48px"}></Box>
            <Box>
              <Text fontWeight="medium">MCQ Questions</Text>
              <Input mt={1} placeholder="Enter Number" />
            </Box>
          </Flex>
        </Grid>
      </Box>
    </Box>
  );
}
