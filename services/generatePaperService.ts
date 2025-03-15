import { pdfToText } from 'pdf-ts';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from 'fs/promises';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, getDownloadURL, getBytes } from 'firebase/storage';
import { getCourseFiles, getAllFilesByFolderId } from '../utils/firebase/storage-service';
import { PROMPT_PARSE_PDF_SHORT } from '../constant/prompt';
import { client as openaiClient } from '../utils/openai/client';


// 存储已解析的 PDF 内容
const pdfStringDic: {
  [key: string]: any
} = {};



/**
 * 从本地文件提取 PDF 文本
 * @param file - File 对象
 * @returns 提取的文本内容
 */
export async function extractTextFromPdf(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // 将 ArrayBuffer 转换为 Buffer
    const buffer = Buffer.from(arrayBuffer);
    const text = await pdfToText(buffer);
    return text;
  } catch (error) {
    console.error(`从 ${file.name} 提取 PDF 文本失败:`, error);
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
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: PROMPT_PARSE_PDF_SHORT({ input: text }) }],
    });
    
    const parsed = response.choices[0].message.content?.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    if (!parsed) {
      throw new Error('no parse result');
    }
    
    const parsedJson = JSON.parse(parsed);

    parsedJson.content = text;
    
    if (parsedJson.lectureTitle) {
      pdfStringDic[parsedJson.lectureTitle] = parsedJson;
    }
    
    return parsedJson;
  } catch (error) {
    console.error('总结 PDF 内容失败:', error);
    throw error;
  }
}


// 定义文件信息接口
interface FileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

/**
 * 通过文件夹ID获取并处理所有PDF文件
 * @param folderId - Storage中的文件夹ID
 * @param basePath - 基础路径，默认为'uploads'
 * @returns 按周数排序的PDF摘要对象
 */
export async function   processPdfsByFolderId(folderId: string, basePath: string = 'uploads') {
  try {
    console.log(`Start to process pdf files in folder ${folderId}`);
    console.log(`Using base path: ${basePath}`);
    
    // 获取文件夹中的所有文件
    const files = await getAllFilesByFolderId(folderId, basePath);
    console.log(`Found ${files.length} files`);
    
    // 过滤出PDF文件
    const pdfFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.name.toLowerCase().endsWith('.pdf')
    );
    console.log(`Found ${pdfFiles.length} pdf files`);
    
    if (pdfFiles.length === 0) {
      console.log('no pdf file');
      return {};
    }
    
    // 按文件名排序（假设文件名包含顺序信息）
    const sortedPdfFiles = [...pdfFiles].sort((a, b) => a.name.localeCompare(b.name));
    
    // 处理每个PDF文件
    const processedFiles = await Promise.all(
      sortedPdfFiles.map(async (file: FileInfo, index: number) => {
        try {
          console.log(`Processing pdf file: ${file.name}`);
          
          // 从URL获取PDF内容
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // 提取文本
          const text = await pdfToText(buffer);
          
          // 总结内容
          const summary = await summarizePdfContent(text);
          
          return {
            index,
            summary
          };
        } catch (error) {
          console.error(`Failed to process pdf file ${file.name}:`, error);
          return null;
        }
      })
    );
    
    // 过滤掉处理失败的文件并转换为所需格式
    const result: Record<string, any> = {};
    processedFiles
      .filter((item): item is {index: number, summary: any} => item !== null)
      .forEach(({index, summary}) => {
        result[`week${index + 1}`] = summary;
      });
    
    console.log(`Successfully processed ${Object.keys(result).length} pdf files`);
    
    return result;
  } catch (error) {
    console.error(`Failed to process pdf files in folder ${folderId}:`, error);
    throw error;
  }
}






