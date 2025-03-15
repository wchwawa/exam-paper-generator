

const EXAMPLE_LECTURE_CONTENT = `Lets examine the merits of electric cars throu
gh a structured lens, focusing on their environmental, practical, and technological dimensions. First, consider their environmental impact: electric vehicles (EVs) produce zero tailpipe emissions. Unlike gasoline engines, which release carbon dioxide and particulates—contributing to phenomena like urban smog—EVs operate on battery-powered motors. In a city like Los Angeles, widespread EV adoption could measurably reduce air pollution, offering a practical case study in emissions control.

Next, assess their acoustic footprint. EVs are significantly quieter than 


combustion vehicles, 



lacking the mechanical roar of pistons and exhausts. 



This reduction in noise pollution has tangible benefits—imagine a metropolitan area where traffic hum replaces engine clamor, 

-enhancing urban livability. This isnt hypothetical; its observable in EV-heavy zones like Oslo.

-Economically, EVs present a compelling argument. Though their purchase price often exceeds that of gasoline cars, operational costs are lower. Electricity trumps gasoline in per-mile expense—think $500 annually for a Tesla Model 3 versus $1,500 for a gas equivalent. Maintenance further tilts the scale: no oil changes or complex transmissions mean savings, with data suggesting $4,600 less over a vehicles life.

-Now, infrastructure: charging networks are scaling up. By 2025, Teslas Supercharger count exceeds 2,000 globally, yet gaps persist—rural drivers face “range anxiety” where urbanites dont. Technology counters this: the Lucid Air boasts a 500-mile range, and fast chargers, 
like those for the Hyundai Ioniq 6, hit 80% capacity in 18 minutes.
/
/
/
In conclusion, EVs offer a triad of benefits—zero emissions, reduced noise, and cost efficiency—underpinned by evolving infrastructure and tech. Challenges remain, but the trajectory points to a transformative shift in transportation dynamics. Questions? Lets discuss.
5 million
https://www.coursera.org/
https://www.edx.org/
http://www.xuetangx.com/
 

The University of Sydney
Micro credentials 

A 
microcredential
`;


const EXAMPLE_LECTURE_CONTENT_AFTER_PARSING = `### Introduction to Electric Cars  
Lets examine the merits of electric cars through a structured lens, focusing on their environmental, practical, and technological dimensions. This analysis highlights why EVs are increasingly central to discussions on sustainable transportation.

### Environmental Impact  
First, consider their environmental impact: electric vehicles (EVs) produce zero tailpipe emissions. Unlike gasoline engines, which release carbon dioxide and particulates—contributing to phenomena like urban smog—EVs operate on battery-powered motors. In a city like Los Angeles, widespread EV adoption could measurably reduce air pollution, offering a practical case study in emissions control.

### Acoustic Benefits  
Next, assess their acoustic footprint. EVs are significantly quieter than combustion vehicles, lacking the mechanical roar of pistons and exhausts. This reduction in noise pollution has tangible benefits—imagine a metropolitan area where traffic hum replaces engine clamor, enhancing urban livability. This isnt hypothetical; it’s observable in EV-heavy zones like Oslo.

### Economic Advantages  
Economically, EVs present a compelling argument. Though their purchase price often exceeds that of gasoline cars, operational costs are lower. Electricity trumps gasoline in per-mile expense—think $500 annually for a Tesla Model 3 versus $1,500 for a gas equivalent. Maintenance further tilts the scale: no oil changes or complex transmissions mean savings, with data suggesting $4,600 less over a vehicles life.

### Infrastructure and Technology  
Now, infrastructure: charging networks are scaling up. By 2025, Teslas Supercharger count exceeds 2,000 globally, yet gaps persist—rural drivers face “range anxiety” where urbanites dont. Technology counters this: the Lucid Air boasts a 500-mile range, and fast chargers, like those for the Hyundai Ioniq 6, hit 80% capacity in 18 minutes.

### Conclusion  
In conclusion, EVs offer a triad of benefits—zero emissions, reduced noise, and cost efficiency—underpinned by evolving infrastructure and tech. Challenges remain, but the trajectory points to a transformative shift in transportation dynamics. Questions? Let’s discuss.`


export const PROMPT_PARSE_PDF_ADVANCED = (options: {
  input: string
}): string => {
  return`You are a helpful assistant that can parse a string and return the text in a structured JSON format.
   The string is an University lecture slides of one week's lecture content.

   ** Task **
   1. extract the lecture title, abstract, key points and content from the PDF file.
   2. the lecture title is the title of the lecture.
   3. summarize the abstract of the given string.
   4. summarize the key points of the given string.
   5. organize the original string into the content field.

   ** Requirement **
   1. You can add some sections headers to the content field, but DO NOT change the original string, Make sure all the original string is included in the content field.
   2. Make sure the key points are simply words
   3. Remove redundant and repeated new lines and spaces in the content field.


   ** Format **
     {
      lectureTitle: '',
      abstract: '',
      keyPoints: ['Key Point 1', 'Key Point 2', 'Key Point 3',...],
      content:,
      }

   ** Example **
    if the input string is :
    ${EXAMPLE_LECTURE_CONTENT}
    the output should be:
    {
      lectureTitle: 'Electricity Car',
      abstract: 'Electricity Car is a car that uses electricity to power its engine.',
      keyPoints: ['Electricity', 'Car', 'Engine', 'Dominant Design', 'Future'],
      content: '${EXAMPLE_LECTURE_CONTENT_AFTER_PARSING}',
',
      }

   ** Input string (lecture content) **
   ${options.input}
    `
};

export const PROMPT_PARSE_PDF_SHORT = (options: {
  input: string
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



const PROMPT_GENERATE_QUESTION_PAPER = (option?: {
  mcqNumber: number,
  shortAnswerNumber: number,
  content: JSON | any,
}) => {
  if (!option) {
    return `
    You are a helpful assistant that can generate a question paper from a lecture content.

    ** Task **
    1. Fully understand the lecture content by reading the lectureTitle, abstract, keyPoints fields.
    `
  }
  if (!option.mcqNumber) {
    option.mcqNumber = 0;
  }
  if (!option.shortAnswerNumber) {
    option.shortAnswerNumber = 0;
  }
  return `
  You are a helpful assistant that can generate a question paper from a lecture content.

  ** Task **
  1. Fully understand the lecture content by reading the lectureTitle, abstract, keyPoints fields.
  2. Based on content in "content" field, generate ${option.mcqNumber} multiple-choice questions and ${option.shortAnswerNumber} short-answer questions.
  3. The question paper should be in the same language as the lecture content.

  ** Requirement **
  1. Make sure you return the JSON object in the format of the example.

  ** Input content **
  ${option.content}
  `
}
