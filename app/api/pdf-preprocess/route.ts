import { NextRequest, NextResponse } from 'next/server';
import { processPdfsByFolderId } from '@/services/generatePaperService';

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();
    const results = await (courseId);
    return NextResponse.json(results);
  } catch (error) {
    console.error('处理 PDF 文件失败:', error);
    return NextResponse.json({ error: '处理 PDF 文件失败' }, { status: 500 });
  }
}