import { NextRequest, NextResponse } from 'next/server';
import { processPdfsByFolderId } from '@/services/generatePaperService';

/**
 * 处理文件夹中的pdf文件
 * @param request 请求对象{folderId: string, mcqAnswerNumber: number, shortAnswerNumber: number}
 * @returns 处理结果
 */
export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: 'need paramater: folderId' }, 
        { status: 400 }
      );
    }
    
    const results = await processPdfsByFolderId(folderId);

    
    
    return NextResponse.json({
      success: true,
      message: `success process ${results.length} pdf files`,
      data: results
    });
  } catch (error) {
    console.error('process pdf files in folder failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'process pdf files in folder failed',
        message: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 