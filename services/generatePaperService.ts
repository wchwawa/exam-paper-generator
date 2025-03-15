import { pdfToText } from 'pdf-ts';
import fs from 'fs/promises';
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




import { OpenAI } from 'openai';
import { ftruncateSync } from 'fs';

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY               
});

const pdfStringDic: {
  [key: string]: string
} = {}

// export class PdfService {
/**
 * Extracts text from a PDF file.
 * @param filePath - The path to the PDF file.
 * @returns A promise that resolves to the text content of the PDF file.
 */
  async function extractTextFromPdf(filePath: string) {
    const buffer = await fs.readFile(filePath);
    const text = await pdfToText(buffer);
    return text;
  }


  // async function generateQuestionPaper(lectureObject: any) {
  //   const response = await client.chat.completions.create({
  //     model: 'gpt-4o-mini',
  //     messages: [{ role: 'user', content: PROMPT_GENERATE_QUESTION_PAPER({
  //       mcqNumber: 2,
  //       shortAnswerNumber: 2,
  //       content: pdfStringDic[`${lectureObject?.lectureTitle}`]
  //     }) }],
  //   });
  //   return response.choices[0].message.content;
  // }

  /**
   * Parses the text of a PDF file.
   * @param text - The text content of the PDF file.
   * @returns A promise that resolves to the parsed text.
   */
  async function summerizePdf() {
    const text = await extractTextFromPdf('../public/test.pdf');
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: PROMPT_PARSE_PDF_SHORT({ input: text }) }],
    });
    const parsed = response.choices[0].message.content?.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
    if (!parsed) {
      throw new Error('No parsed text');
    }
    const parsedJson = JSON.parse(parsed);

    parsedJson['content'] = text;
    pdfStringDic[`${parsedJson?.lectureTitle}`] = parsedJson;
  }
  

  async function summerizeAllPdf() {

  }





