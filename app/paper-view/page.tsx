import { Box, Group, Heading, Tag } from "@chakra-ui/react";

export default function PaperView() {
  return (
    <Box>
      <Box>
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
    </Box>
  );
}
