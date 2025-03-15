import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const firebaseConfig = {
  // Replace with your Firebase configuration
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Upload a file to Firebase Storage
export const uploadFile = async (
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

// Upload multiple files to the same folder
export const uploadFiles = async (
  files: File[],
  folderId: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadFile(file, folderId));
  return Promise.all(uploadPromises);
};

export { storage };
