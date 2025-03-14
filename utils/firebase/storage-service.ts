import { storage } from './config';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
//TODO: need change the template to CURD the exam paper object

/**
 * single file upload
 * @param file - file object
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
    // image after compress
    const mimeType = file.compressedData.split(';')[0].split(':')[1];
    const base64Data = file.compressedData.split(',')[1];
    const blob = Buffer.from(base64Data, 'base64');
    const realBlob = new Blob([blob], { type: mimeType });
    const snapshot = await uploadBytes(fileRef, realBlob, metadata);
    return snapshot;
  } else {
    // original image
    const snapshot = await uploadBytes(fileRef, file.file, metadata);
    return snapshot;
  } 
}

/**
 * batch upload files
 * @param files - file array
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
 * delete single file
 * @param path - file path
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
 * batch delete files
 * @param paths - file path array
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
 * delete folder and its contents
 * @param folderPath - folder path
 */
export const deleteFolder = async (folderPath: string): Promise<void> => {
  try {
    const folderRef = ref(storage, folderPath);
    const list = await listAll(folderRef);
    
    // recursive delete sub folders
    const subFolderPromises = list.prefixes.map(prefix => 
      deleteFolder(prefix.fullPath)
    );
    
    // delete files
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
 * download file (get download URL)
 * @param path - file path
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
 * list folder contents
 * @param folderPath - folder path
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
    console.log('Processed files:', files);
    
    return { files };
  } catch (error) {
    console.error('Error in listFiles:', error);
    throw error;
  }
}

/**
 * List all files in a user's folder or a specific project folder
 * @param userPath - user ID or user ID + project ID path
 */
export async function listUserFiles(userPath: string) {
  const userFolderRef = ref(storage, `users/${userPath}`);
  
  try {
    const result = await listAll(userFolderRef);
    
    // 获取每个文件的详细信息
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
    console.error('List files error:', error);
    throw error;
  }
}
