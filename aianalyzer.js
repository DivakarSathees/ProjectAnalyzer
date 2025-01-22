// require('dotenv').config();
// const Groq = require("groq-sdk");

// const grop = new Groq({
//     apiKey: process.env.GROQ_API_KEY,
//     // apiKey: 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,
// });
// exports.aianalyzer = async (data, analysisType) => {
//     // let prompt = data.codeComponents;
//     let prompt = data.codeComponents.map(obj => JSON.stringify(obj, null, 2)).join('\n'); // Join objects as JSON with line breaks

//     // let systemPrompt = data.QuestionData + data.tcList;
//     let systemPrompt = data.QuestionData;
//     let tcList = data.tcList;
//     if(analysisType == "detailed"){
//     prompt += '\nAnalyze the provided solution file line by line based on the given description, and give failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
//     } else if (analysisType == "short"){
//     prompt += '\nGive analysis for the provided solution file based on the given description, even if the methods classes, properties spelling were wrong reporst in the analysis. The analysis should contains only 3 to 4 sentences.'
//     // console.log(prompt);
//     }
    
//     try {
//         // console.log(data.codeComponents);
        
//         // console.log("try block");
//         if(data.codeComponents == [] || data.codeComponents == ""){
//             return "No solution is fetched"
//         }
        
//         // Call OpenAI GPT-3 or GPT-4 API with the generated prompt
//         const response = await grop.chat.completions.create({
//             model: 'llama3-8b-8192',  // or 'gpt-4' if using GPT-4
//             // prompt: prompt,
//             messages: [
//                         { role: "system", content: "You are Code analyzer, need to check line by line of the provided solution based on description for any syntax wise error, logical implementation error, funtionality wise error, runntime error, compile time error." },
//                         { role: "system", content: systemPrompt },
//                         { role: "system", content: tcList },
//                         {
//                             role: "user",
//                             content: prompt,
//                         },
//                     ],
//             // max_tokens: 2720,
//             // temperature: 1,
//             // "top_p": 1,
//             // "stream": true,
//             // "stop": null
//         });
//         console.log(response.choices[0].message);
        
//         return response.choices[0].message;
//     } catch (error) {
//         throw new Error('Error with GPT model text generation');
//     }
// }

// require('dotenv').config();
// const Groq = require("groq-sdk");

// const grop = new Groq({
//     apiKey: process.env.GROQ_API_KEY,
//     // apiKey: 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,
// });
// exports.aianalyzer = async (data, analysisType) => {
//     // let prompt = data.codeComponents;
//     let prompt = data.codeComponents.map(obj => JSON.stringify(obj, null, 2)).join('\n'); // Join objects as JSON with line breaks

//     // let systemPrompt = data.QuestionData + data.tcList;
//     let systemPrompt = data.QuestionData;
//     let tcList = data.tcList;
//     let log = data.log;
//     let testCode = data.testCode
//     console.log("asdertt "+log);
//     // if(analysisType == "detailed"){
//     // prompt += '\nAnalyze the provided solution file line by line based on the given description, and give failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
//     // } else if (analysisType == "short"){
//     // prompt += '\nGive analysis for the provided solution file based on the given description, even if the methods classes, properties spelling were wrong reporst in the analysis. The analysis should contains only 3 to 4 sentences.'
//     // }
//     if(analysisType == "detailed"){
//     prompt += '\nAnalyze the provided solution file line by line based on the given description, and give failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
//     } else if (analysisType == "short"){
//     prompt += '\nGive analysis for the provided solution file based on the given description, testcases, log, even if the methods classes, properties spelling were wrong reporst in the analysis. The analysis should contains only 3 to 4 sentences.'
//     }
    
//     try {
//         // console.log(data.codeComponents);
        
//         // console.log("try block");
//         if(data.codeComponents == [] || data.codeComponents == ""){
//             return "No solution is fetched"
//         }
        
//         // Call OpenAI GPT-3 or GPT-4 API with the generated prompt
//         const response = await grop.chat.completions.create({
//             model: 'llama3-8b-8192', 
//             // model: 'gemma2-9b-it',  // or 'gpt-4' if using GPT-4
//             // prompt: prompt,
//             messages: [
//                         { role: "system", content: "You are Code analyzer, need to check line by line of the provided solution based on description for any syntax wise error, logical implementation error, funtionality wise error, runntime error, compile time error." },
//                         { role: "system", content: systemPrompt }, // duestion data
//                         { role: "system", content: tcList+log }, // testcases list
//                         { role: "system", content: testCode },
//                         { role: "system", content: "log" }, // log in terminal
//                         // { role: "system", content: testCode }, // testcase file
//                         {
//                             role: "user",
//                             content: prompt,
//                         },
//                     ],
//                 // "model": "gemma2-9b-it",
//                 // "temperature": 1,
//                 "max_completion_tokens": 8192,
//                 // "top_p": 1,
//                 // "stream": true,
//                 // "stop": null
//         });

//         // for await (const chunk of response) {
//         //     process.stdout.write(chunk.choices[0]?.delta?.content || '');
//         //   }
//         console.log(response.choices[0].message);
        
//         return response.choices[0].message;
//     } catch (error) {
//         throw new Error('Error with GPT model text generation');
//     }
// }



require('dotenv').config();
const encoder = require('gpt-3-encoder');

// Check number of tokens in the input prompt
function getTokenCount(input) {
    const encoded = encoder.encode(input); // Encode the text into tokens
    console.log(encoded.length);
    
    return encoded.length; // Return the token count
}

const Groq = require("groq-sdk");

const grop = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    // apiKey: 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,
});
exports.aianalyzer = async (data, analysisType) => {
    // let prompt = data.codeComponents;
    let prompt = data.codeComponents.map(obj => JSON.stringify(obj, null, 2)).join('\n'); // Join objects as JSON with line breaks

    // let systemPrompt = data.QuestionData + data.tcList;
    let systemPrompt = data.QuestionData;
    let tcList = data.tcList;
    // console.log("aialaysis +"+data.log);
    const wrappedLogs = `[${data.log}]`;

    
    let log123 = JSON.parse(wrappedLogs) || wrappedLogs;

    // console.log("lodStrin g ");
    // console.log("Input Logs:", log123);

    let logString;
    try{
        const flattenedLogs = log123.flatMap(entry => {

            if (!entry || typeof entry !== "object") return []; // Ignore null or invalid entries

            if (entry.errors && entry.errors.length > 0) {
                const uniqueErrors = Array.from(
                  new Set(entry.errors.flat()) // Flatten the array and remove duplicates
                ).filter(error => error.trim() !== ""); // Remove empty strings if any
              
                // console.log(uniqueErrors);
                return uniqueErrors;
            }

            if (Array.isArray(entry.failed) && entry.failed.some(item => item.testName)) {
                return entry.failed
                // .filter(failure => failure !== null).map(failure => ({
                // testName: failure, // Assume failure is the testName in this case
                // errorMessage: null // No error message if just a failed test name
            }
        // ));
            // }

            return []; // No `failed` or `errors` to process
        }).filter(Boolean);
        logString = JSON.stringify(flattenedLogs, null, 2);
    }
    catch (error) {
        console.error("Error processing logs:", error);
    }

    // console.log(logString);
    



    
    // let log123 = JSON.parse(data.log) || data.log;
    // let testCode = data.testCode
    // let lodString = JSON.stringify(log123.failed);


    // if(analysisType == "detailed"){
    // prompt += '\nAnalyze the provided solution file line by line based on the given description, and give failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
    // } else if (analysisType == "short"){
    // prompt += '\nGive analysis for the provided solution file based on the given description, even if the methods classes, properties spelling were wrong reporst in the analysis. The analysis should contains only 3 to 4 sentences.'
    // }
    if(analysisType == "detailed"){
    prompt += '\nAnalyze the provided solution file line by line based on the given description and logs that gives, what is excpeted to pass but the solutions what is providing, and give me the failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
    } else if (analysisType == "short"){
    prompt += '\nGive analysis for the provided solution file based on the given description, testcases, log, even if the methods classes, properties spelling were wrong report in the analysis. The analysis should contains only 3 to 4 sentences.'
    }

    const tokenCount = getTokenCount(prompt);
    const tokenLimit = 8192; // Adjust based on the model you're using (4,096 tokens for GPT-3)

    if (tokenCount > tokenLimit) {
        console.log(`Input size is too large! Tokens: ${tokenCount}`);
        return "Input is too large for the model. Please reduce the input size.";
    }
    
    try {
        // console.log(data.codeComponents);
        // return "null";
        // console.log("try block");
        if(data.codeComponents == [] || data.codeComponents == ""){
            return "No solution is fetched"
        }
        
        // Call OpenAI GPT-3 or GPT-4 API with the generated prompt
        const response = await grop.chat.completions.create({
            model: 'llama3-8b-8192', 
            // model: 'llama-3.3-70b-versatile', 
            // model: 'gemma2-9b-it',  // or 'gpt-4' if using GPT-4
            // prompt: prompt,
            messages: [
                        { role: "system", content: "You are Code analyzer, need to check line by line of the provided solution based on description & log for any syntax wise error, logical implementation error, funtionality wise error, runntime error, compile time error. etc" },
                        // { role: "system", content: systemPrompt }, // duestion data
                        // { role: "system", content: tcList }, // testcases list
                        // { role: "system", content: log123 }, // log in terminal
                        { role: "system", content: `
                                        Description: ${data.QuestionData}
                                        Logs: ${logString}`
                        }, // testcase file
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                // "model": "gemma2-9b-it",
                // "temperature": 1,
                // "max_completion_tokens": 8192,
                // "top_p": 1,
                // "stream": true,
                // "stop": null
        });

        // for await (const chunk of response) {
        //     process.stdout.write(chunk.choices[0]?.delta?.content || '');
        //   }
        // console.log(response.choices[0].message);
        
        return response.choices[0].message;
    } catch (error) {
        throw new Error('Error with GPT model text generation');
    }
}
