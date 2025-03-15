"use client";

import { Accordion } from "@chakra-ui/react";
import { useState, useRef, useCallback } from "react";
import { IconFileSmile, IconFileUpload, IconX } from "@tabler/icons-react";
import {
  Box,
  Button,
  createListCollection,
  Portal,
  Select,
  Heading,
  Text,
  Flex,
  HStack,
  Tag,
} from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { uploadFilesWithProgress } from "@/utils/firebase/storage-service";

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [folderUid, setFolderUid] = useState<string>("");
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0 && !folderUid) {
        setFolderUid(uuidv4());
      }
      setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
    },
    [folderUid]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        if (!folderUid) {
          setFolderUid(uuidv4());
        }
        const selectedFiles = Array.from(e.target.files);
        setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
      }
    },
    [folderUid]
  );

  const removeFile = useCallback((fileIndex: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== fileIndex)
    );
  }, []);

  const handleClickUpload = useCallback(() => {
    document.getElementById("fileInput")?.click();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (files.length > 0) {
      setIsUploading(true);
      try {
        // Generate folder ID if not already set
        const uploadFolderId = folderUid || uuidv4();
        if (!folderUid) {
          setFolderUid(uploadFolderId);
        }

        // Upload all files to the same folder
        await uploadFilesWithProgress(files, uploadFolderId);

        // Navigate to results page with folder ID
        router.push(
          `/create-paper?folderUid=${uploadFolderId}&types=${selectedQuestionTypes.join(
            ","
          )}`
        );
      } catch (error) {
        console.error("Error uploading files:", error);
        // Handle error (could add error state and display to user)
      } finally {
        setIsUploading(false);
      }
    }
  }, [router, files, folderUid, selectedQuestionTypes]);

  const handleQuestionTypeChange = useCallback((values: string[]) => {
    setSelectedQuestionTypes(values);
  }, []);

  return (
    <Box
      bg="gray.100"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="100vw"
      h="100vh"
    >
      <Flex flexDirection="column" alignItems="center" justifyContent="center">
        <IconFileSmile size={64} />
        <Heading mt={2} fontSize="4xl" fontWeight="medium">
          Exam Paper Generator
        </Heading>
        <Text mt={3} color="gray.500">
          Simply add your lecture file, we will help you to create{" "}
        </Text>
        <Box
          bg="white"
          mt={6}
          border="1px solid"
          w="650px"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          borderColor="gray.200"
          px={4}
          py={2}
          borderRadius="md"
        >
          <Flex
            ref={dropZoneRef}
            borderBottom="1px"
            w="full"
            px={2}
            color="gray.500"
            alignItems="center"
            h="150px"
            justifyContent="center"
            flexDirection="column"
            border={isDragging ? "2px dashed" : "1px dashed"}
            borderColor={isDragging ? "blue.500" : "gray.300"}
            bg={isDragging ? "blue.50" : "transparent"}
            transition="all 0.2s"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            cursor="pointer"
            position="relative"
          >
            <input
              type="file"
              id="fileInput"
              multiple
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />

            {files.length > 0 ? (
              <>
                <Box w="100%" p={3}></Box>
                <Text mb={2} fontWeight="medium">
                  Selected Files:
                </Text>
                <Flex wrap="wrap" gap={2}>
                  {files.map((file, index) => (
                    <Tag.Root
                      key={index}
                      size="md"
                      colorScheme="blue"
                      borderRadius="full"
                    >
                      <Tag.Label>{file.name}</Tag.Label>
                      {/* <Tag.CloseButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      /> */}
                    </Tag.Root>
                  ))}
                </Flex>
              </>
            ) : (
              <>
                <IconFileUpload size={42} />
                <Text mt={2}>Drag & Drop or Click to Upload Files</Text>
                <Text fontSize="xs" color="gray.400">
                  Accepts PDF, PPTX, Word and More
                </Text>
              </>
            )}
          </Flex>
          <Flex
            borderTop="1px solid"
            borderColor="gray.200"
            w="full"
            px={2}
            py={2}
            justifyContent="space-between"
          >
            <Box w="180px"></Box>

            <Button
              onClick={handleGenerate}
              disabled={files.length === 0 || isUploading}
              loading={isUploading}
              loadingText="Uploading"
            >
              {isUploading ? "Uploading..." : "Generate"}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
