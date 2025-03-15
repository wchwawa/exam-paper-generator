'use client';

import { useState, useEffect } from 'react';
import {
  uploadFile,
  listCourseIds,
  getCourseFiles,
  downloadSingleFile,
  downloadAllFiles,
  downloadAllFilesAsZip
} from '@/utils/firebase/storage-service';
import { Box, Button, Text, Flex, Link } from '@chakra-ui/react';

export default function TestStoragePage() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // 组件加载时获取课程列表
    loadCourseIds();
  }, []);

  // 加载课程ID列表
  const loadCourseIds = async () => {
    try {
      const ids = await listCourseIds();
      setCourseIds(ids);
    } catch (error) {
      console.error('获取课程列表失败:', error);
      setError('获取课程列表失败');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourseId) {
      setError('请先选择课程');
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadStatus('正在上传...');
      setError(null);
      
      try {
        const uploadItem = {
          file: file,
          seoTitle: file.name,
          isCompressed: false
        };
        
        await uploadFile(uploadItem, `uploads/${selectedCourseId}`);
        setUploadStatus('上传成功！');
        
        // 上传成功后刷新文件列表
        refreshFileList();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        setError(errorMessage);
        setUploadStatus('上传失败');
        console.error('上传错误:', error);
      }
    }
  };

  // 刷新文件列表
  const refreshFileList = async () => {
    if (!selectedCourseId) {
      setFileList([]);
      return;
    }

    try {
      setError(null);
      console.log('开始获取课程文件:', selectedCourseId);
      const files = await getCourseFiles(selectedCourseId);
      // console.log('获取到的文件:', files);
      setFileList(files || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取文件列表失败';
      setError(errorMessage);
      console.error('获取文件列表失败:', error);
    }
  };

  // 处理课程选择
  const handleCourseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCourseId(e.target.value);
    refreshFileList();
  };

  // 处理打包下载
  const handleZipDownload = async () => {
    if (fileList.length === 0) return;

    setIsDownloading(true);
    setError(null);

    try {
      await downloadAllFilesAsZip(fileList, selectedCourseId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败';
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Box p={8}>
      <Flex direction="column" gap={4}>
        <Text fontSize="2xl">Firebase Storage 测试</Text>
        
        {/* 课程选择 */}
        <Box>
          <Text mb={2}>选择课程：</Text>
          <select
            value={selectedCourseId}
            onChange={handleCourseSelect}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '16px',
              borderRadius: '4px',
              border: '1px solid #E2E8F0'
            }}
          >
            <option value="">请选择课程</option>
            {courseIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </Box>

        {/* 文件上传 */}
        <Box>
          <input
            type="file"
            onChange={handleFileUpload}
            style={{ marginBottom: '10px' }}
            disabled={!selectedCourseId}
          />
          <Text color={error ? 'red.500' : 'green.500'}>{uploadStatus}</Text>
          {error && <Text color="red.500">{error}</Text>}
        </Box>

        {/* 文件列表 */}
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="xl">文件列表：</Text>
            <Flex gap={2}>
              <Button 
                onClick={refreshFileList} 
                colorScheme="blue"
                size="sm"
              >
                刷新列表
              </Button>
              {fileList.length > 0 && (
                <>
                  <Button
                    onClick={() => downloadAllFiles(fileList)}
                    colorScheme="green"
                    size="sm"
                  >
                    单独下载
                  </Button>
                  <Button
                    onClick={handleZipDownload}
                    colorScheme="purple"
                    size="sm"
                    disabled={isDownloading}
                  >
                    {isDownloading ? '打包中...' : '打包下载'}
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
          
          <Flex direction="column" gap={2}>
            {!selectedCourseId ? (
              <Text color="gray.500">请先选择课程</Text>
            ) : fileList.length === 0 ? (
              <Text color="gray.500">暂无文件</Text>
            ) : (
              fileList.map((file, index) => (
                <Box 
                  key={index} 
                  p={4} 
                  border="1px" 
                  borderColor="gray.200" 
                  borderRadius="md"
                  shadow="sm"
                >
                  <Text fontWeight="bold">文件名: {file.name}</Text>
                  <Text>类型: {file.type || '未知'}</Text>
                  <Text>大小: {Math.round(file.size / 1024)} KB</Text>
                  <Button
                    onClick={() => downloadSingleFile(file.url)}
                    colorScheme="blue"
                    size="sm"
                    mt={2}
                  >
                    下载文件
                  </Button>
                </Box>
              ))
            )}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
} 