import { storage } from './config';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  uploadBytesResumable
} from 'firebase/storage';
import { UploadItem } from '@/types/storage';
import { Buffer } from 'buffer';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { db } from './config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
//TODO: need to implement CRUD operations for exam paper objects

/**
 * Upload a single file to Firebase Storage
 * @param file - file object to upload
 * @param path - storage path
 * @param projectId - optional project id to store files in
 */
export async function uploadFile(
  file: UploadItem,
  path: string,
  projectId?: string
) {
  // If project ID is provided, add it to the path
  const fullPath = projectId 
    ? `${path}/${projectId}/${file.seoTitle}`
    : `${path}/${file.seoTitle}`;
    
  const fileRef = ref(storage, fullPath);
  const metadata = {
    contentType: file.file.type
  };
  
  if (file.isCompressed && file.compressedData) {
    // Handle compressed image data
    const mimeType = file.compressedData.split(';')[0].split(':')[1];
    const base64Data = file.compressedData.split(',')[1];
    const blob = Buffer.from(base64Data, 'base64');
    const realBlob = new Blob([blob], { type: mimeType });
    const snapshot = await uploadBytes(fileRef, realBlob, metadata);
    return snapshot;
  } else {
    // Upload original file
    const snapshot = await uploadBytes(fileRef, file.file, metadata);
    return snapshot;
  } 
}

/**
 * Upload multiple files in batch
 * @param files - array of files to upload
 * @param path - base storage path
 * @param projectId - optional project id to store files in
 */
export async function uploadAllFiles(
  files: UploadItem[], 
  path: string, 
  projectId?: string
) {
  const uploadPromises = files.map(async (file) => {
    try {
      return await uploadFile(file, path, projectId);
    } catch (error) {
      console.error(`Error uploading ${file.seoTitle}:`, error);
      return {
        name: file.seoTitle,
        error: 'Upload failed'
      };
    }
  });

  const results = await Promise.allSettled(uploadPromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        name: files[index].seoTitle,
        error: result.reason
      };
    }
  });
}

/**
 * Delete a single file from storage
 * @param path - file path to delete
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Delete multiple files in batch
 * @param paths - array of file paths to delete
 */
export const deleteFiles = async (paths: string[]): Promise<void> => {
  try {
    const deletePromises = paths.map((path) => deleteFile(path));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting files:', error);
    throw error;
  }
};

/**
 * Delete a folder and all its contents recursively
 * @param folderPath - path of the folder to delete
 */
export const deleteFolder = async (folderPath: string): Promise<void> => {
  try {
    const folderRef = ref(storage, folderPath);
    const list = await listAll(folderRef);
    
    // Delete sub-folders recursively
    const subFolderPromises = list.prefixes.map(prefix => 
      deleteFolder(prefix.fullPath)
    );
    
    // Delete files in current folder
    const filePromises = list.items.map(item => 
      deleteObject(item)
    );
    
    await Promise.all([...subFolderPromises, ...filePromises]);
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};

/**
 * Get download URL for a file
 * @param path - path of the file
 */
export const getFileDownloadURL = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

/**
 * List contents of a user's folder
 * @param userId - ID of the user
 */
export async function listFiles(userId: string) {
  try {
    console.log('Listing files for userId:', userId);
    const folderRef = ref(storage, `users/${userId}`);
    const result = await listAll(folderRef);
    console.log('List result:', result);

    const filesPromises = result.items.map(async (item) => {
      const url = await getDownloadURL(item);
      return {
        name: item.name,
        url: url,
        path: item.fullPath
      };
    });

    const files = await Promise.all(filesPromises);
    // console.log('Processed files:', files);
    
    return { files };
  } catch (error) {
    console.error('Error in listFiles:', error);
    throw error;
  }
}

/**
 * List all files in a user's folder or project folder
 * @param userPath - user ID or user ID + project ID path
 */
export async function listUserFiles(userPath: string) {
  const userFolderRef = ref(storage, `users/${userPath}`);
  
  try {
    const result = await listAll(userFolderRef);
    
    // Get detailed information for each file
    const filesPromises = result.items.map(async (item) => {
      const metadata = await getMetadata(item);
      const downloadURL = await getDownloadURL(item);
      
      return {
        name: item.name,
        path: item.fullPath,
        url: downloadURL,
        size: metadata.size,
        type: metadata.contentType || '',
        createdAt: metadata.timeCreated
      };
    });

    const files = await Promise.all(filesPromises);
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Get list of all course IDs
 */
export async function listCourseIds(): Promise<string[]> {
  try {
    const uploadsRef = ref(storage, 'uploads');
    const result = await listAll(uploadsRef);
    return result.prefixes.map(prefix => prefix.name);
  } catch (error) {
    console.error('Error listing course IDs:', error);
    throw error;
  }
}

/**
 * Get all files for a specific course
 * @param courseId - ID of the course
 */
export async function getCourseFiles(courseId: string) {
  try {
    console.log('Fetching files for course:', courseId);
    const courseRef = ref(storage, `uploads/${courseId}`);
    const result = await listAll(courseRef);
    console.log('Found items:', result.items.length);
    
    if (result.items.length === 0) {
      console.log('No files found in path:', `uploads/${courseId}`);
      return [];
    }
    
    const filesPromises = result.items.map(async (item) => {
      console.log('Processing file:', item.fullPath);
      try {
        const metadata = await getMetadata(item);
        const url = await getDownloadURL(item);
        
        return {
          name: item.name,
          path: item.fullPath,
          url: url,
          size: metadata.size,
          type: metadata.contentType || '',
          createdAt: metadata.timeCreated
        };
      } catch (error) {
        console.error(`Error processing file ${item.fullPath}:`, error);
        return null;
      }
    });

    const files = (await Promise.all(filesPromises)).filter(file => file !== null);
    // console.log('Processed files:', files);
    return files;
  } catch (error) {
    console.error(`Error getting files for course ${courseId}:`, error);
    throw error;
  }
}

/**
 * Download a single file
 * @param url - URL of the file to download
 */
export const downloadSingleFile = (url: string) => {
  window.open(url, '_blank');
};

/**
 * Download multiple files individually
 * @param files - array of files to download
 */
export const downloadAllFiles = (files: { url: string }[]) => {
  files.forEach(file => {
    downloadSingleFile(file.url);
  });
};

/**
 * Download multiple files as a ZIP archive
 * @param files - array of files to download
 * @param folderName - name of the folder in ZIP
 */
export const downloadAllFilesAsZip = async (
  files: { name: string; url: string }[],
  folderName: string
): Promise<void> => {
  if (files.length === 0) return;

  const zip = new JSZip();
  
  try {
    // Create folder in ZIP
    const folder = zip.folder(folderName);
    if (!folder) throw new Error('Failed to create folder in ZIP');

    // Download and add files to ZIP
    const downloadPromises = files.map(async (file) => {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        folder.file(file.name, blob);
      } catch (error) {
        console.error(`Failed to download file: ${file.name}`, error);
        throw error;
      }
    });

    await Promise.all(downloadPromises);

    // Generate and download ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${folderName}_files.zip`);
  } catch (error) {
    console.error('Failed to create ZIP file:', error);
    throw error;
  }
};

/**
 * Upload a file with progress tracking
 * @param file - file to upload
 * @param folderId - optional folder id
 * @returns Promise with download URL
 */
export const uploadFileWithProgress = async (
  file: File,
  folderId?: string
): Promise<string> => {
  const path = folderId
    ? `uploads/${folderId}/${file.name}`
    : `uploads/${uuidv4()}_${file.name}`;

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Track upload progress if needed
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        // Handle errors
        reject(error);
      },
      async () => {
        // Upload completed successfully
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

/**
 * Upload multiple files to the same folder with progress tracking
 * @param files - array of files to upload
 * @param folderId - folder id
 * @returns Promise with array of download URLs
 */
export const uploadFilesWithProgress = async (
  files: File[],
  folderId: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadFileWithProgress(file, folderId));
  return Promise.all(uploadPromises);
};

/**
 * Get all files from a specific folder by folder ID
 * @param folderId - ID of the folder
 * @param basePath - base path in storage (default: 'uploads')
 * @returns Promise with array of file metadata
 */
export async function getAllFilesByFolderId(folderId: string, basePath: string = 'uploads'): Promise<any[]> {
  try {
    console.log(`获取文件夹 ${folderId} 中的所有文件`);
    console.log(`完整路径: ${basePath}/${folderId}`);
    
    const folderRef = ref(storage, `${basePath}/${folderId}`);
    const result = await listAll(folderRef);
    console.log(`在文件夹中找到 ${result.items.length} 个文件`);
    
    if (result.items.length === 0) {
      console.log(`路径中没有找到文件: ${basePath}/${folderId}`);
      return [];
    }
    
    const filesPromises = result.items.map(async (item) => {
      console.log(`处理文件: ${item.fullPath}`);
      try {
        const metadata = await getMetadata(item);
        const url = await getDownloadURL(item);
        
        return {
          name: item.name,
          path: item.fullPath,
          url: url,
          size: metadata.size,
          type: metadata.contentType || '',
          createdAt: metadata.timeCreated
        };
      } catch (error) {
        console.error(`处理文件 ${item.fullPath} 时出错:`, error);
        return null;
      }
    });

    const files = (await Promise.all(filesPromises)).filter(file => file !== null);
    console.log(`成功处理 ${files.length} 个文件`);
    return files;
  } catch (error) {
    console.error(`获取文件夹 ${folderId} 中的文件时出错:`, error);
    throw error;
  }
}

/**
 * 将生成的试卷上传到Firestore
 * @param examPaperContent - 试卷内容
 * @param sourceFiles - 源文件信息
 * @returns 上传后的文档ID
 */
export async function uploadExamPaperToFirestore(
  examPaperContent: any,
  sourceFiles: Array<{name: string, path: string, url: string}>
): Promise<string> {
  try {
    console.log("Uploading exam paper to Firestore");
    
    // 创建要保存的数据对象
    const examPaperData = {
      content: examPaperContent,
      createdAt: serverTimestamp(),
      sourceFiles: sourceFiles,
      status: "completed"
    };
    
    // 添加到examPapers集合
    const docRef = await addDoc(collection(db, "examPaper"), examPaperData);
    console.log(`Exam paper document written with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error("Error uploading exam paper to Firestore:", error);
    throw error;
  }
}
