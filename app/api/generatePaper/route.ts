import { NextRequest, NextResponse } from "next/server";
import { processPdfsByFolderId } from "@/services/generatePaperService";

import { callAgentCluster } from "@/Agents/advanceAgents/agentCluster";
/**
 * 处理文件夹中的pdf文件并生成试卷
 * @param request 请求对象{folderId: string, mcqAnswerNumber: number, shortAnswerNumber: number}
 * @returns 处理结果
 */
export async function POST(request: NextRequest) {
  try {
    const { folderId, totalMcq, totalEssay } = await request.json();

    if (!folderId) {
      return NextResponse.json(
        { error: "need paramater: folderId" },
        { status: 400 }
      );
    }

    const pdfContent = await processPdfsByFolderId(folderId);

    if (pdfContent.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No PDF files found in the specified folder",
        data: [],
      });
    }
    const totalWeeks = Object.keys(pdfContent).length;
    // console.log(pdfContent);

    const generatedPaper = await callAgentCluster(
      pdfContent,
      totalWeeks,
      totalMcq,
      totalEssay
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${pdfContent.length} PDF files and generated exam paper`,
      data: {
        generatedPaper: generatedPaper.testPaper,
      },
    });
  } catch (error) {
    console.error("process pdf files in folder failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "process pdf files in folder failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
