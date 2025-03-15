import { NextRequest, NextResponse } from 'next/server';
import { processPdfsByFolderId } from '@/services/generatePaperService';
import { agent_call } from '@/utils/agents/agent';

/**
 * 处理文件夹中的pdf文件并生成试卷
 * @param request 请求对象{folderId: string, mcqAnswerNumber: number, shortAnswerNumber: number}
 * @returns 处理结果
 */
export async function POST(request: NextRequest) {
  try {
    const { folderId 
    
    } = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: 'need paramater: folderId' }, 
        { status: 400 }
      );
    }
    
    const results = await processPdfsByFolderId(folderId);
    
    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No PDF files found in the specified folder',
        data: []
      });
    }
    
    const generatedPaper = await agent_call(results);
    

    let paperContent;
    try {
      paperContent = JSON.parse(generatedPaper);
    } catch (e) {
      paperContent = generatedPaper;
    }
    const examPaper = JSON.parse(paperContent.trim().replace(/^```json\n/, '').replace(/\n```$/, ''));
    console.log(examPaper);
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} PDF files and generated exam paper`,
      data: {
        examPaper: examPaper
      }
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