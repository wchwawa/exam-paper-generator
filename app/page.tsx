"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { IconFileSmile, IconFileUpload } from "@tabler/icons-react";
import Image from "next/image";
import { Box, Button, Heading, Text, Flex, Tag } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import {
	uploadFilesWithProgress,
	listCourseIds,
} from "@/utils/firebase/storage-service";

// 添加全局样式
const globalStyles = `
@keyframes fadeIn {
	from { opacity: 0; transform: translateY(10px); }
	to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
	0% { opacity: 0.2; }
	20% { opacity: 1; }
	100% { opacity: 0.2; }
}

@keyframes float {
	0% { transform: translateY(0px) rotate(5deg); }
	50% { transform: translateY(-10px) rotate(3deg); }
	100% { transform: translateY(0px) rotate(5deg); }
}

@keyframes floatReverse {
	0% { transform: translateY(0px) rotate(-5deg); }
	50% { transform: translateY(-8px) rotate(-2deg); }
	100% { transform: translateY(0px) rotate(-5deg); }
}

.right-image {
	animation: float 6s ease-in-out infinite;
}

.left-image {
	animation: floatReverse 7s ease-in-out infinite;
}

.loading-dots .dot {
	display: inline-block;
	animation: blink 1.4s infinite both;
}

.loading-dots .dot:nth-child(2) {
	animation-delay: 0.2s;
}

.loading-dots .dot:nth-child(3) {
	animation-delay: 0.4s;
}

.mr-2 {
	margin-right: 8px;
}
`;

export default function Home() {
	const router = useRouter();
	const [files, setFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [folderUid, setFolderUid] = useState<string>("");
	const [customFolderName, setCustomFolderName] = useState<string>("");
	const dropZoneRef = useRef<HTMLDivElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(
		[]
	);
	const [courseIds, setCourseIds] = useState<string[]>([]);
	const [useExistingFolder, setUseExistingFolder] = useState(false);

	// 加载已有的文件夹列表
	useEffect(() => {
		const loadCourseIds = async () => {
			try {
				const ids = await listCourseIds();
				setCourseIds(ids);
			} catch (error) {
				console.error("获取文件夹列表失败:", error);
			}
		};

		loadCourseIds();
	}, []);

	// 添加全局样式
	useEffect(() => {
		// 添加样式到head
		const styleElement = document.createElement("style");
		styleElement.innerHTML = globalStyles;
		document.head.appendChild(styleElement);

		// 清理函数
		return () => {
			document.head.removeChild(styleElement);
		};
	}, []);

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
			if (droppedFiles.length > 0 && !useExistingFolder) {
				// 不再自动生成 UUID
			}
			setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
		},
		[useExistingFolder]
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files && e.target.files.length > 0) {
				// 不再自动生成 UUID
				const selectedFiles = Array.from(e.target.files);
				setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
			}
		},
		[useExistingFolder]
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
		if ((files.length > 0 && customFolderName) || useExistingFolder) {
			setIsUploading(true);
			try {
				// 如果使用已有文件夹，直接跳转
				if (useExistingFolder) {
					router.push(
						`/create-paper?folderUid=${folderUid}&types=${selectedQuestionTypes.join(
							","
						)}`
					);
					return;
				}

				// 使用自定义文件夹名称
				const uploadFolderId = customFolderName;

				// 上传所有文件到同一个文件夹
				await uploadFilesWithProgress(files, uploadFolderId);

				// 跳转到结果页面，带上文件夹ID
				router.push(
					`/create-paper?folderUid=${uploadFolderId}&types=${selectedQuestionTypes.join(
						","
					)}`
				);
			} catch (error) {
				console.error("Error uploading files:", error);
			} finally {
				setIsUploading(false);
			}
		}
	}, [
		router,
		files,
		folderUid,
		customFolderName,
		selectedQuestionTypes,
		useExistingFolder,
	]);

	const handleQuestionTypeChange = useCallback((values: string[]) => {
		setSelectedQuestionTypes(values);
	}, []);

	const handleFolderChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			setFolderUid(e.target.value);
		},
		[]
	);

	const handleCustomFolderNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setCustomFolderName(e.target.value);
		},
		[]
	);

	const toggleFolderMode = useCallback(() => {
		setUseExistingFolder(!useExistingFolder);
		if (!useExistingFolder) {
			setFiles([]);
		} else {
			setFolderUid("");
			setCustomFolderName("");
		}
	}, [useExistingFolder]);

	return (
		<Box
			bg="gray.100"
			display="flex"
			alignItems="center"
			justifyContent="center"
			w="100vw"
			h="100vh"
			position="relative"
			overflow="hidden"
		>
			{/* 右上角图片 */}
			<Box
				position="absolute"
				top="100px"
				right="100px"
				zIndex={1}
				animation="fadeIn 0.8s ease-out 0.3s backwards"
				className="right-image"
				_hover={{ animation: "none", transform: "rotate(0deg) scale(1.1)" }}
				transition="transform 0.3s ease"
			>
				<Image
					src="/5ee772d099588c0004aa684b.png"
					alt="Decorative image"
					width={220}
					height={220}
					style={{ objectFit: "contain" }}
				/>
			</Box>

			{/* 右下角图片 */}
			<Box
				position="absolute"
				bottom="20px"
				right="20px"
				zIndex={1}
				animation="fadeIn 0.8s ease-out 0.5s backwards"
				className="left-image"
				_hover={{ animation: "none", transform: "rotate(0deg) scale(1.1)" }}
				transition="transform 0.3s ease"
			>
				<Image
					src="/kids.webp"
					alt="Kids learning"
					width={260}
					height={180}
					style={{ objectFit: "contain" }}
				/>
			</Box>

			{/* 右上角图片 */}
			<Box
				position="absolute"
				top="80px"
				left="30px"
				zIndex={1}
				animation="fadeIn 0.8s ease-out 0.5s backwards"
				className="left-image"
				_hover={{ animation: "none", transform: "rotate(0deg) scale(1.1)" }}
				transition="transform 0.3s ease"
			>
				<Image
					src="/wow.gif"
					alt="Kids learning"
					width={300}
					height={300}
					style={{ objectFit: "contain" }}
				/>
			</Box>

			{/* 左下角图片 */}
			<Box
				position="absolute"
				bottom="20px"
				left="20px"
				zIndex={1}
				animation="fadeIn 0.8s ease-out 0.5s backwards"
				className="left-image"
				_hover={{ animation: "none", transform: "rotate(0deg) scale(1.1)" }}
				transition="transform 0.3s ease"
			>
				<Image
					src="/doit.png"
					alt="Kids learning"
					width={260}
					height={180}
					style={{ objectFit: "contain" }}
				/>
			</Box>

			<Flex
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				style={{
					animation: "fadeIn 0.6s ease-out",
				}}
			>
				<IconFileSmile size={64} />
				<Heading mt={2} fontSize="4xl" fontWeight="medium">
					Exam Paper Generator
				</Heading>
				<Text mt={3} color="gray.500">
					Simply add your lecture file, we&apos;ll design the practice exam
					paper for you
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
					<Flex w="full" justifyContent="center" mb={4}>
						<Flex bg="gray.100" borderRadius="lg" p={1} gap={1} w="fit-content">
							<Button
								size="sm"
								bg={!useExistingFolder ? "white" : "transparent"}
								color={!useExistingFolder ? "blue.500" : "gray.600"}
								onClick={() => setUseExistingFolder(false)}
								_hover={{
									bg: !useExistingFolder ? "white" : "gray.200",
								}}
								boxShadow={!useExistingFolder ? "sm" : "none"}
								transition="all 0.2s ease"
							>
								new course
							</Button>
							<Button
								size="sm"
								bg={useExistingFolder ? "white" : "transparent"}
								color={useExistingFolder ? "blue.500" : "gray.600"}
								onClick={() => setUseExistingFolder(true)}
								_hover={{
									bg: useExistingFolder ? "white" : "gray.200",
								}}
								boxShadow={useExistingFolder ? "sm" : "none"}
								transition="all 0.2s ease"
							>
								choose course
							</Button>
						</Flex>
					</Flex>

					{useExistingFolder ? (
						<Flex
							w="full"
							px={2}
							py={4}
							color="gray.500"
							alignItems="center"
							justifyContent="center"
							flexDirection="column"
							border="1px dashed"
							borderColor="gray.300"
							h="150px"
						>
							<Text mb={3}>choose existing folder:</Text>
							<select
								style={{
									width: "80%",
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #E2E8F0",
									transition: "all 0.3s ease",
								}}
								value={folderUid}
								onChange={handleFolderChange}
								onFocus={(e) => {
									e.target.style.borderColor = "#3182CE";
									e.target.style.boxShadow = "0 0 0 1px #3182CE";
								}}
								onBlur={(e) => {
									e.target.style.borderColor = "#E2E8F0";
									e.target.style.boxShadow = "none";
								}}
							>
								<option value="">请选择文件夹</option>
								{courseIds.map((id) => (
									<option key={id} value={id}>
										{id}
									</option>
								))}
							</select>
						</Flex>
					) : (
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
							transition="all 0.3s ease"
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={handleClickUpload}
							cursor="pointer"
							position="relative"
							_hover={{
								borderColor: "blue.400",
								bg: "blue.50",
								transform: "translateY(-2px)",
								boxShadow: "md",
							}}
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
												style={{
													animation: `fadeIn 0.3s ease-out ${
														index * 0.1
													}s both`,
													transition: "all 0.2s ease",
												}}
												_hover={{
													transform: "translateY(-2px)",
													boxShadow: "sm",
												}}
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
					)}
					{!useExistingFolder && (
						<Flex
							w="full"
							px={2}
							py={2}
							alignItems="center"
							justifyContent="center"
							borderBottom="1px solid"
							borderColor="gray.200"
						>
							<Text mr={2} whiteSpace="nowrap">
								Course name:
							</Text>
							<input
								type="text"
								value={customFolderName}
								onChange={handleCustomFolderNameChange}
								placeholder="please input course code, like COMP9123"
								style={{
									flex: 1,
									padding: "8px",
									borderRadius: "4px",
									border: "1px solid #E2E8F0",
									transition: "all 0.3s ease",
								}}
								onFocus={(e) => {
									e.target.style.borderColor = "#3182CE";
									e.target.style.boxShadow = "0 0 0 1px #3182CE";
								}}
								onBlur={(e) => {
									e.target.style.borderColor = "#E2E8F0";
									e.target.style.boxShadow = "none";
								}}
							/>
						</Flex>
					)}
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
							disabled={
								(files.length === 0 && !useExistingFolder) ||
								(useExistingFolder && !folderUid) ||
								(!useExistingFolder && !customFolderName) ||
								isUploading
							}
							loading={isUploading}
							loadingText="Uploading"
							_hover={{
								transform: "translateY(-2px)",
								boxShadow: "md",
							}}
							transition="all 0.3s ease"
							bg={isUploading ? "blue.400" : "blue.500"}
							color="white"
							_disabled={{
								opacity: 0.6,
								cursor: "not-allowed",
								transform: "none",
								boxShadow: "none",
							}}
						>
							{isUploading ? (
								<>
									<span className="mr-2">上传中</span>
									<span className="loading-dots">
										<span className="dot">.</span>
										<span className="dot">.</span>
										<span className="dot">.</span>
									</span>
								</>
							) : (
								"Upload"
							)}
						</Button>
					</Flex>
				</Box>
			</Flex>
		</Box>
	);
}
