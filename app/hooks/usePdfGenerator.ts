import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Question {
  questionId: string;
  questionTitle: string;
  questionType: "mcq" | "short-answer";
  answer?: string;
  explanation?: string;
  tips?: string;
  mcqOptions?: Array<{
    optionId: string;
    optionTitle: string;
    optionValue: string;
  }>;
}

export const usePdfGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async (
    contentRef: React.RefObject<HTMLDivElement | null>,
    title: string,
    questions: Question[]
  ) => {
    if (!contentRef.current) return;

    try {
      setIsGenerating(true);

      const pdf = new jsPDF("p", "mm", "a4");
      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
        foreignObjectRendering: false,
      });

      // A4 dimensions in points at 72 DPI
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add title
      pdf.setFontSize(20);
      pdf.text(title, 20, 20);

      let position = 30;

      // Add content
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 1.0),
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      // Generate filename based on title and date
      const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePdf,
    isGenerating,
  };
};
