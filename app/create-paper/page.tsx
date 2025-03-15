"use client";
import { Box, Heading } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";

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
      <Box borderRadius="md" px={8} py={4} w={500} bg="white">
        <Heading mt={2} fontSize="4xl" fontWeight="medium">
          New Project
        </Heading>
        <Input mt={4} placeholder="Enter Title" />
      </Box>
    </Box>
  );
}
