import { pdfToText } from 'pdf-ts';
import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { db, storage } from '../utils/firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, getDownloadURL, getBytes } from 'firebase/storage';
// import { PROMPT_PARSE_PDF } from '../constant/prompt';
// import { client } from '../utils/openai/client';


export const PROMPT_PARSE_PDF_SHORT = (options: {
  input: string,
}): string => {
  return`You are a helpful assistant that can parse a string and return the text in a structured JSON format.
   The string is an University lecture slides of one week's lecture content.

   ** Task **
   1. extract the lecture title, abstract, key points and content from the PDF file.
   2. the lecture title is the title of the lecture.
   3. summarize the abstract of the given string.
   4. summarize the key points of the given string.

   ** Requirement **
   1. Make sure the key points are simply words
   2. Make sure you return the JSON object in the format of the example.


   ** Format **
     {
      lectureTitle: '',
      abstract: '',
      keyPoints: ['Key Point 1', 'Key Point 2', 'Key Point 3',...]
      }

   ** Example **
    if the input string is: "electric cars are good for the environment they produce zero emissions and are quieter than gasoline cars also they can save you money on fuel and maintenance charging infrastructure is developing rapidly but can still be a concern for some potential buyers the technology is constantly improving with longer ranges and faster charging times."
    
    the output should be:
    {
      lectureTitle: 'Electricity Car',
      abstract: 'Electricity Car is a car that uses electricity to power its engine.',
      keyPoints: ['Electricity', 'Car', 'Engine', 'Dominant Design', 'Future']
      }

   ** Input string (lecture content) **
   ${options.input}
    `
};




// OpenAI 客户端初始化
export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY               
});

// 存储已解析的 PDF 内容
const pdfStringDic: {
  [key: string]: any
} = {};

/**
 * 从 Firestore 获取 PDF 文件列表
 * @param courseId - 可选的课程 ID 过滤
 * @param limit - 限制返回的文件数量
 * @returns 返回 PDF 文件的元数据列表
 */
export async function fetchPdfFilesFromFirestore(courseId?: string, maxResults: number = 10) {
  try {
    // 构建查询
    let pdfQuery;
    if (courseId) {
      pdfQuery = query(
        collection(db, 'pdfs'),
        where('courseId', '==', courseId),
        orderBy('uploadedAt', 'desc'),
        limit(maxResults)
      );
    } else {
      pdfQuery = query(
        collection(db, 'pdfs'),
        orderBy('uploadedAt', 'desc'),
        limit(maxResults)
      );
    }

    // 执行查询
    const querySnapshot = await getDocs(pdfQuery);
    const pdfFiles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`获取到 ${pdfFiles.length} 个 PDF 文件`);
    return pdfFiles;
  } catch (error) {
    console.error('获取 PDF 文件列表失败:', error);
    throw error;
  }
}

/**
 * 从 Storage 下载 PDF 文件并提取文本
 * @param storagePath - Storage 中的文件路径
 * @returns 提取的文本内容
 */
export async function downloadAndExtractPdfText(storagePath: string) {
  try {
    // 获取文件引用
    const fileRef = ref(storage, storagePath);
    
    // 下载文件为 ArrayBuffer
    const fileBytes = await getBytes(fileRef);
    
    // 将 ArrayBuffer 转换为 Buffer
    const buffer = Buffer.from(fileBytes);
    
    // 提取文本
    const text = await pdfToText(buffer);
    return text;
  } catch (error) {
    console.error(`从 ${storagePath} 提取 PDF 文本失败:`, error);
    throw error;
  }
}

/**
 * 从本地文件提取 PDF 文本
 * @param filePath - 本地文件路径
 * @returns 提取的文本内容
 */
export async function extractTextFromPdf(filePath: string) {
  try {
    const buffer = await fs.readFile(filePath);
    const text = await pdfToText(buffer);
    return text;
  } catch (error) {
    console.error(`从 ${filePath} 提取 PDF 文本失败:`, error);
    throw error;
  }
}

/**
 * 使用 OpenAI 总结 PDF 内容
 * @param text - PDF 文本内容
 * @returns 结构化的 PDF 摘要
 */
export async function summarizePdfContent(text: string) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: PROMPT_PARSE_PDF_SHORT({ input: text }) }],
    });
    
    const parsed = response.choices[0].message.content?.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    if (!parsed) {
      throw new Error('未获取到解析结果');
    }
    
    const parsedJson = JSON.parse(parsed);
    // 添加原始内容
    parsedJson.content = text;
    
    // 缓存结果
    if (parsedJson.lectureTitle) {
      pdfStringDic[parsedJson.lectureTitle] = parsedJson;
    }
    
    return parsedJson;
  } catch (error) {
    console.error('总结 PDF 内容失败:', error);
    throw error;
  }
}

/**
 * 处理单个 PDF 文件：下载、提取文本并总结
 * @param pdfFile - PDF 文件元数据
 * @returns 处理后的 PDF 摘要
 */
export async function processPdfFile(pdfFile: any) {
  try {
    // 从 Storage 下载并提取文本
    const text = await downloadAndExtractPdfText(pdfFile.storagePath);
    
    // 总结内容
    const summary = await summarizePdfContent(text);
    
    return {
      ...pdfFile,
      summary
    };
  } catch (error) {
    console.error(`处理 PDF 文件 ${pdfFile.id} 失败:`, error);
    throw error;
  }
}

/**
 * 批量处理多个 PDF 文件
 * @param courseId - 可选的课程 ID 过滤
 * @param maxResults - 最大处理文件数
 * @returns 处理后的 PDF 摘要列表
 */
export async function processAllPdfs(courseId?: string, maxResults: number = 5) {
  try {
    // 获取 PDF 文件列表
    const pdfFiles = await fetchPdfFilesFromFirestore(courseId, maxResults);
    
    // 并行处理所有文件
    const processedFiles = await Promise.all(
      pdfFiles.map(file => processPdfFile(file))
    );
    
    return processedFiles;
  } catch (error) {
    console.error('批量处理 PDF 文件失败:', error);
    throw error;
  }
}

/**
 * 从本地文件处理单个 PDF
 * @param filePath - 本地文件路径
 * @returns 处理后的 PDF 摘要
 */
export async function processLocalPdf(filePath: string) {
  try {
    const text = await extractTextFromPdf(filePath);
    const summary = await summarizePdfContent(text);
    return summary;
  } catch (error) {
    console.error(`处理本地 PDF 文件 ${filePath} 失败:`, error);
    throw error;
  }
}





