import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Heading,
  Switch,
  Tag,
} from "@chakra-ui/react";

export default function PaperView() {
  return (
    <Box>
      <style>
        {`
            body {
                background-color: #f8f8f8;`}
      </style>
      <Box
        zIndex={99}
        position="fixed"
        top={0}
        bg="white"
        p={4}
        w="100%"
        borderRadius="md"
        boxShadow="md"
      >
        <Heading>Data Structure and Algorithm</Heading>
        <Group spaceX={2}>
          <Tag.Root>
            <Tag.Label>AI Generated Practice Exam</Tag.Label>
          </Tag.Root>
          <Tag.Root>
            <Tag.Label>5 Questions</Tag.Label>
          </Tag.Root>
        </Group>
      </Box>

      <Flex px={12} gapX={18} py={24}>
        <Box w={"100%"} px={4} py={3} className="bg-white flex-1">
          <Heading size="2xl">
            Data Structure And Algorithm Practice Exam
          </Heading>
        </Box>
        <Box
          px={2}
          py={2}
          border="1px solid"
          bg="white"
          rounded="md"
          borderColor="gray.300"
          w={"360px"}
          gapY={2}
          display={"flex"}
          flexDirection={"column"}
        >
          <Heading size="md">Actions</Heading>
          <Button w="100%">Start Timed Practice</Button>
          <Button variant="outline" w="100%">
            Download as PDF
          </Button>
          <Switch.Root mt={1}>
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>Show Answers</Switch.Label>
          </Switch.Root>
        </Box>
      </Flex>
    </Box>
  );
}
