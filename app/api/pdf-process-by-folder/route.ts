import { NextRequest, NextResponse } from 'next/server';
import { processPdfsByFolderId } from '@/services/generatePaperService';

export async function POST(request: NextRequest) {
  try {
    // 从请求体中获取文件夹ID和可选的基础路径
    const { folderId } = await request.json();
    
    // 验证必要参数
    if (!folderId) {
      return NextResponse.json(
        { error: 'need paramater: folderId' }, 
        { status: 400 }
      );
    }
    
    // 调用处理函数
    const results = await processPdfsByFolderId(folderId);
    
    // 返回处理结果
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