require('dotenv').config();
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
    if(analysisType == "detailed"){
    prompt += '\nAnalyze the provided solution file line by line based on the given description, and give failure analysis where code went wrong based on description in 3 to 4 sentences. & provide final analysis in 3 sentences'
    } else if (analysisType == "short"){
    prompt += '\nGive analysis for the provided solution file based on the given description, even if the methods classes, properties spelling were wrong reporst in the analysis. The analysis should contains only 3 to 4 sentences.'
    // console.log(prompt);
    }
    
    try {
        // console.log(data.codeComponents);
        
        // console.log("try block");
        if(data.codeComponents == [] || data.codeComponents == ""){
            return "No solution is fetched"
        }
        
        // Call OpenAI GPT-3 or GPT-4 API with the generated prompt
        const response = await grop.chat.completions.create({
            model: 'llama3-8b-8192',  // or 'gpt-4' if using GPT-4
            // prompt: prompt,
            messages: [
                        { role: "system", content: "You are Code analyzer, need to check line by line of the provided solution based on description for any syntax wise error, logical implementation error, funtionality wise error, runntime error, compile time error." },
                        { role: "system", content: systemPrompt },
                        { role: "system", content: tcList },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
            // max_tokens: 2720,
            // temperature: 1,
            // "top_p": 1,
            // "stream": true,
            // "stop": null
        });
        console.log(response.choices[0].message);
        
        return response.choices[0].message;
    } catch (error) {
        throw new Error('Error with GPT model text generation');
    }
}