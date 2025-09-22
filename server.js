const express = require('express');
const app = express();
const port = 8081;
const axios = require("axios");
const he = require("he");
const { aianalyzer } = require('./aianalyzer');
const { puplocalstorage } = require('./puplocalstorage');
const { extractTestID } = require('./extractTestID');
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const FormData = require('form-data'); // Import the form-data package
const e = require('express');
require('dotenv').config();


const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let conn = mongoose.connection;
conn.once('open', () => {
  console.log('MongoDB connection established.');
});

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: ['https://forntend-weightagesplit-1.onrender.com','http://localhost:4200'] }));


// let keyString;

// let testCodeData;

async function TestCodeSplitter(element, keyString, testCodeData) {
  if (element.name.includes("appsettings") || 
      // element.name.includes("UnitTest") || 
      element.name.includes("HomeController") || 
      element.name.includes("ErrorViewModel") || 
      element.name.includes("Using") || 
      element.name.includes("WeatherForecast") || 
      element.name.includes("csproj") || 
      element.name.includes("sln")) {
    console.log(`Skipping directory: ${element.name}`);
    return null;
  }
  const url = `https://sonarcloud.io/api/sources/lines?key=iamneo-production_${keyString}%3A${element.path}&from=1&to=502`;

  const response = await axios.get(url);

  if (!response.data.sources) {
    throw new Error(`No sources found for file: ${element.name}`);
  }

  const codeLines = response.data.sources
    .map((source) =>
      source.code
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\\u003C/g, "<")
        .replace(/\\u003E/g, ">")
        // .replace(/&gt;/g, ">")
    )
    .join("\n");
  
    testCodeData[element.name] = codeLines;
  }


async function CodeSplitter(element, keyString ) {
  if (element.name.includes("appsettings") || 
      element.name.includes("UnitTest") || 
      element.name.includes("HomeController") || 
      element.name.includes("ErrorViewModel") || 
      element.name.includes("Using") || 
      element.name.includes("WeatherForecast") || 
      element.name.includes("csproj") || 
      element.name.includes("sln") ||
      element.name.includes("angular.json") || 
      element.name.includes("conf.") || 
      element.name.includes("package") || 
      // element.name.includes("index.html") || 
      element.name.includes("main.ts") || 
      element.name.includes("polyfills.ts") || 
      // element.name.includes("styles.css") || 
      element.name.includes("test.ts") || 
      element.name.includes("tsconfig") || 
      element.name.includes("environment") || 
      element.name.includes("app.component.css") || 
      element.name.includes("app.component.html") || 
      element.name.includes("app.e2e-spec") || 
      element.name.includes("app.po") || 
      element.name.includes("spec.ts") || 
      element.name.includes("tslint") || 
      element.name.includes("component.css") ||
      element.name.includes("appdb") ||
      element.name.includes("server.js") ||
      (element.path.includes('.cs') && element.qualifier === "UTS")
    ) {
    console.log(`Skipping directory: ${element.name}`);
    return null;
  }

  // if(element.qualifier === "UTS"){
  //   TestCodeSplitter(element, keyString, testCodeData);
  //   return null;
  // }
  
  const url = `https://sonarcloud.io/api/sources/lines?key=iamneo-production_${keyString}%3A${element.path}&from=1&to=502`;

  const response = await axios.get(url);

  if (!response.data.sources) {
    throw new Error(`No sources found for file: ${element.name}`);
  }


  let codeLines = response.data.sources
    .map((source) =>
      source.code
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\\u003C/g, "<")
        .replace(/\\u003E/g, ">")
        // .replace(/&gt;/g, ">")
    )
    .join("\n");
  codeLines = codeLines.replace(/&gt;/g, '>');
  codeLines = codeLines.replace(/&lt;/g, '<');

  return { type: "file", name: element.name, code: codeLines };
}

async function ISTtimeconverter(dateTime) {
  const utSDate = new Date(dateTime);
  const istDate = new Date(utSDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const formattedDate = istDate.toISOString().slice(0, 19).replace("T", " ");

  let hour24 = istDate.getHours();
  let min = istDate.getMinutes();
  let sec = istDate.getSeconds();
  const yr = istDate.getFullYear();
  let month = istDate.getMonth() + 1;
  let date = istDate.getDate();
  month = month < 10 ? `0${month}` : month;
  date = date < 10 ? `0${date}` : date;
  sec = sec < 10 ? `0${sec}` : sec;
  min = min < 10 ? `0${min}` : min;

  let hour12 = hour24 % 12 || 12;
  hour12 = hour12 < 10 ? `0${hour12}` : hour12;

  const amPm = hour24 >= 12 ? "PM" : "AM";
  const dateSubmitted = yr+"-"+month+"-"+date+" | "+hour12+":"+min+":"+sec+" "+amPm;
  // console.log("DateTime (12-hour format):",dateSubmitted);
  // return dateSubmitted;
  return {yr, month, date, hour12, min, sec, amPm, dateSubmitted, istDate};
}

async function DirHandler(element, keyString, testCodeData) {
  if (element.name.toLowerCase() === "migrations".toLowerCase() ||
  element.name.toLowerCase() === "properties".toLowerCase() ||
  element.name.toLowerCase() === "testproject".toLowerCase() ||
  element.name.toLowerCase() === "e2e".toLowerCase() ||
  element.name.toLowerCase() === "resources".toLowerCase() ||
    element.name.toLowerCase() === "views".toLowerCase() ||
    element.name.toLowerCase() === "wwwroot".toLowerCase() ||
    element.name.toLowerCase() === "environments".toLowerCase() ||
    element.path.includes('appdb')
    // (element.path.includes('.cs') && element.qualifier === "UTS")
  ) {
    console.log(`Skipping directory: ${element.name}`);
    return null;
  }

  

  const dirUrl = `https://sonarcloud.io/api/measures/component_tree?ps=100&s=qualifier%2Cname&component=iamneo-production_${keyString}%3A${element.path}&metricKeys=ncloc%2Cvulnerabilities%2Cbugs%2Ccode_smells%2Csecurity_hotspots%2Ccoverage%2Cduplicated_lines_density&strategy=children`;
  const dirResponse = await axios.get(dirUrl);

  if (!dirResponse.data.components) {
    throw new Error(`No components found for directory: ${element.name}`);
  }

  const children = await Promise.all(
    dirResponse.data.components.map(async (child) => {

      
      if (child.name === "Migrations" || child.name === "Properties"
          || child.name === "TestProject"
          || child.name === "e2e"
          || child.name === "resources" || (child.path.includes('.cs') && child.qualifier === "UTS")
          ) {
        console.log(`Skipping: ${child.name}`);
        return null; // Skip this child
      }

      if (child.qualifier === "FIL" || child.qualifier === "UTS") {
        try {
          // if (child.qualifier === "UTS") {
          //   // Process UTS files separately
          //   await TestCodeSplitter(child, keyString, testCodeData);
          //   return null;
          // }
          return await CodeSplitter(child, keyString);
        } catch (error) {
          console.error(`Error processing file ${child.name}:`, error.message);
          return { type: "file", name: child.name, error: error.message };
        }
      } else if (child.qualifier === "DIR") {
        try {
          return await DirHandler(child, keyString, testCodeData); // Recursive call for subdirectories
        } catch (error) {
          console.error(`Error processing directory ${child.name}:`, error.message);
          return { type: "directory", name: child.name, error: error.message };
        }
      }
    })
  );

  const filteredChildren = children.filter((child) => child !== null);

  return { type: "directory", name: element.name, contents: filteredChildren };
}

app.post("/get-analysis", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }
    let { analysisType, token, USEREMAIL, PASSWORD, LOGIN_URL, COURSE, MODULE, TESTNAME } = req.body;
  
    if(!token && (!USEREMAIL || !PASSWORD)){
      return res.status(400).send({ error: "Credentials were not provided." });
    }

    if (!analysisType) {
      return res.status(400).send({ error: "Analysis type not provided." });
    }
    
    console.log("Analysis Type:", analysisType);
    let testIds = [];
    if(!COURSE){

    // Read and parse the Excel file
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Process each row in the sheet
    testIds = sheetData.map((row) => {
      return {
        testId: row["Test ID"],
        url: row["URL"], // Assuming "URL" is a column name in the Excel sheet
      };
    });
    // console.log("Test IDs:", testIds);
    

    fs.unlinkSync(filePath);
  } else{ 
    // make a post request to the API http://localhost:3000/visit to get the test IDs with body file, Login URL, USEREMAIL, PASSWORD, course
    // pass the file, Login URL, USEREMAIL, PASSWORD, course to the API
    const filePath = req.file.path; // Path to the uploaded file
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath)); // Attach the file
    formData.append("LOGIN_URL", LOGIN_URL); // Add Login URL
    formData.append("USEREMAIL", USEREMAIL); // Add User Email
    formData.append("PASSWORD", PASSWORD); // Add Password
    formData.append("COURSE", COURSE); // Add Course
    formData.append("MODULE", MODULE); // Add Course
    formData.append("TESTNAME", TESTNAME); // Add Course

    try {
    // Make the POST request to the API
    // const apiResponse = await axios.post("http://localhost:3000/visit", formData, {
    const apiResponse = await axios.post(process.env.BACKEND_TESTID_URL, formData, {
      headers: {
        headers: formData.getHeaders(), // Use formData.getHeaders() from the form-data package
      },
    });
    // console.log("API Response:", apiResponse.data);
    
    // testIds = apiResponse.data; 
    const { testIds: ids, token: extractedToken } = apiResponse.data;
    // const { testIds: ids, token: extractedToken } = await extractTestID(
    //   filePath,
    //   LOGIN_URL,
    //   USEREMAIL,
    //   PASSWORD,
    //   COURSE,
    //   MODULE,
    //   TESTNAME
    // );

    // testIds = ids;
    // token = token || extractedToken;
    testIds = ids;
    token = extractedToken || token;
    console.log("Test IDs:", testIds);
  
    
    
    } catch (error) {
    console.error("Error making POST request to /visit API:", error.message);
    res.status(500).send({ error: "Failed to fetch test IDs from the API." });
    return;
    } 
    // finally {
    // // Clean up the uploaded file
    // fs.unlinkSync(filePath);
    // }


  }

    var asd;
    if(!token){
      asd = await puplocalstorage(USEREMAIL, PASSWORD);
    } else {
      asd = token
    }
    
    // Example token; replace it with the actual authorization token
    const authToken = asd;
    // const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vyc19kb21haW5faWQiOjQzMTY0NzUsInVzZXJfaWQiOiJiZDNjMmY0ZC1iNTNkLTRkZTYtODJjOS0wMDQxM2I3MDc1NmMiLCJzY2hvb2xfaWQiOiJmZTY1MDJmMC1kZmU1LTRlYzMtYjE4MS0zZThlMzRiMTk4OTQiLCJlbWFpbCI6ImRpdmFrYXIuc0BpYW1uZW8uYWkiLCJlbWFpbF92ZXJpZmllZCI6MSwibmFtZSI6IkRpdmFrYXIkUyIsInBob25lIjoiOTg5NDE1NzYxOSIsInBob25lX3ZlcmlmaWVkIjowLCJwcm9maWxlX3BpYyI6bnVsbCwiZ2VuZGVyIjoiTWFsZSIsInJvbGxfbm8iOm51bGwsInBvcnRhbF9hY2Nlc3Nfc3RhdHVzIjpudWxsLCJlbWFpbF9yZXF1ZXN0ZWRfaGlzdG9yeSI6bnVsbCwiZW1haWxfcmVxdWVzdGVkIjpudWxsLCJwcmltYXJ5X2VtYWlsIjoiZGl2YWthci5zQGlhbW5lby5haSIsInBhcmVudF9jb250YWN0IjpudWxsLCJwaG9uZV9udW1iZXIiOnsiY29kZSI6Iis5MSIsIm51bWJlciI6OTg5NDE1NzYxOX0sImlzX2ZvbGxvd2luZ19wdWJsaWNfZmVlZCI6ZmFsc2UsImJhZGdlIjowLCJzdXBlcmJhZGdlIjowLCJjb25zdW1lZF9iYWRnZSI6MCwiY29uc3VtZWRfc3VwZXJiYWRnZSI6MCwibWFubnVhbGJhZGdlcyI6bnVsbCwic3RhdHVzIjoiSW52aXRlZCIsImRvYiI6bnVsbCwic3RhZmZfdHlwZSI6IkludGVybmFsIiwidmVyaWZpZWRfcGljIjpudWxsLCJhcHBsaWNhdGlvbl9ubyI6bnVsbCwiaGFzaF9pZCI6IjczOWM0Y2ZmNTc0OWQ2YTIzYzIzMTU2N2FmMmY3ODliZjM1ZmE5MTEiLCJyZXNldF9wYXNzd29yZCI6ZmFsc2UsImNyZWF0ZWRBdCI6IjIwMjMtMDctMjBUMTg6MTQ6NDIuMDAwWiIsInVwZGF0ZWRBdCI6IjIwMjQtMTItMTlUMTM6MTA6MzAuMDAwWiIsImRlbGV0ZWRBdCI6bnVsbCwicmVkaXNSb2xlIjoiU3RhZmYiLCJzZXNzaW9uSUQiOiJkdFo2S3BSSUhTRnZDcEVOVElQY2FnPT0iLCJlbmFibGVUd29GYWN0b3JBdXRoZW50aWNhdGlvbiI6ZmFsc2UsImlhdCI6MTczNjQwNjIxNywiZXhwIjoxNzM2NDQ5NDE3fQ.6_xyqPX54Cxqm_jNeiFoLp7Yh-0RIixvca0lio1KlJ4";

    // Extract request body to forward
    // const requestBody = req.body.id;
    const responsesToExcel = [];
    const responseinJson = [];
    for (const test of testIds) {      
    const params = new URLSearchParams(new URL(test.testId).search);
    const testId = params.get("testId");
    console.log("Request Body:", {"id": testId});
    

    // Make the POST request to the external API
    const response = await axios.post(
      "https://api.examly.io/api/v2/test/student/resultanalysis",
      {"id": testId},
      {
        headers: {
          "Cache-Control": "no-cache",
          "Postman-Token": "<calculated when request is sent>",
          "Content-Type": "application/json",
          // "Content-Length": "<calculated when request is sent>",
          "User-Agent": "PostmanRuntime/7.42.0",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Accept": "application/json, text/plain, */*",
          Authorization: authToken,

        },
      }
    );

    for (let i = 0; i < response.data.frozen_test_data.length; i++) {
    const frozenItem = response.data.frozen_test_data[i];
    const QuestionData = frozenItem.questions[0].question_data;
    const responseString1 = frozenItem.questions[0].student_questions.answer;
    const answer = frozenItem.questions[0].student_questions.student_questions_events;

    // const QuestionData = response.data.frozen_test_data[0].questions[0].question_data;
    // // console.log(response.data.frozen_test_data[0].questions[0].project_questions.boilerPlate.url);
    // // console.log(response.data.frozen_test_data[0].questions[0].student_questions.answer);
    // const responseString1 = response.data.frozen_test_data[0].questions[0].student_questions.answer;
    // // const responseString = response.data.frozen_test_data[0].questions[0].student_questions.student_questions_events[0].event_data.answer;
    // const answer = response.data.frozen_test_data[0].questions[0].student_questions.student_questions_events;

    let responseString = null;

    // Find the event where event_data is "test_submited" and get its answer
    await answer.forEach(event => {
      if (event.event_type.includes('test-submitted')) {
        responseString = event.event_data.answer;
      } else {
        responseString = response.data.frozen_test_data[i].questions[0].student_questions.student_questions_events[0].event_data.answer;
      }
    });
    
    const testSubmitedTimeUTS = response.data.frozen_test_data[i].questions[0].student_questions.updatedAt;
    const testSubmitedTimeIST = await ISTtimeconverter(testSubmitedTimeUTS);

    

    
    const extractKey = (responseString) => {
      try {
          const jsonObject = JSON.parse(responseString);
          const jsonObject1 = JSON.parse(responseString1);  
          const resultString = jsonObject.resultList.length > 0 ? jsonObject.resultList[0].result : jsonObject1.resultList[0].result;
          const keyMatch = resultString.match(/"key":"(.*?)"/);
          return keyMatch ? keyMatch[1] : null;
      } catch (error) {
          console.error("Error parsing the response string:", error);
          return null;
      }
  };
  
  const key = extractKey(responseString);
  // console.log("Extracted Key:", key);

  const extractTcList = (responseString) => {
    try {
        const jsonObject = JSON.parse(responseString);
        const jsonObject1 = JSON.parse(responseString1);        
        return (jsonObject.tc_list && jsonObject.tc_list.length > 0) ? jsonObject.tc_list : jsonObject1.tc_list || [];
    } catch (error) {
        console.error("Error parsing the response string:", error);
        return [];
    }
  };
  // const logMessage = {};
  // const extractResultLog = (parsedData) => {
  //   try {
  //     // console.log(parsedData);
  
  //     // Iterate over the list and extract the desired information
  //     for (const item of parsedData) {
  //       console.log("Testcase Path:", item.testcase_path);
  //       console.log("Evaluation Type:", item.evaluation_type);
  //       console.log("Run Command:", item.testcase_run_command);
  
  //       // Parse the result field if it's a stringified JSON
  //       if (item.result) {
  //         try {
  //           const resultObject = JSON.parse(item.result);
  //           console.log("Result Key:", resultObject.output);
  //           return resultObject.output; // Return the output
  //         } catch (innerError) {
  //           console.error("Error parsing the result field:", innerError);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error processing parsed data:", error);
  //   }
  //   return null; // Return null if no output is found
  // };

  function extractErrors(log, limit = 5) {
    const errorRegex = /^.*error.*$/gim; // Match lines with "error" (case-insensitive)
    const puppeteerfailureRegex = /TESTCASE:([^:]+):failure/g;
    const puppeteersuccessRegex = /TESTCASE:([^:]+):success/g;
    const errors = log.match(errorRegex); // Extract matching lines
    let match;
    const results = {
      passed: [],
      failed: [],
      errors:[]
    };
    if(errors){
      // return JSON.stringify(errors, null, 2);
      results.errors.push(errors);
    }

    while ((match = puppeteerfailureRegex.exec(log)) !== null) {
      results.failed.push(match[1]); // Push the captured test case name into the results array
    }

    while ((match = puppeteersuccessRegex.exec(log)) !== null) {
      results.passed.push(match[1]); // Push the captured test case name into the results array
    }
    return JSON.stringify(results, null, 2); // Return the first 'limit' matches or an empty array
  }


  function extractPassFail(inputString) {
    // console.log("divakar log:");
    const nunitpassedRegex = /Passed\s+([\w_]+)\s+\[.*?\]/g;
    const nunitfailedRegex = /Failed\s+([\w_]+)\s+\[.*?\]\r\n\s+Error Message:\r\n\s+(.*?)\r\n\s+Stack Trace:/gs;
    const angsuccessRegex = /SUCCESS-([\w_]+)(?=\s|$)/g;
    const angfailedRegex = /FAILED-([\w_]+)\s*[\s\S]*?Error: (.*?)\s*$/gm;
    const junitpassedRegex = /Passed\s+(\S+)/g;
    const errorRegex = /ERROR.*/g;
    const junitfailureRegex = /(\w+)\.(\w+)\.(\w+)(?:\.(\w+))?(?:\.(\w+))?\s+Time elapsed: (.+?) <<< (FAILURE|ERROR)!(.+?)(?=\.java)/sg;
    const puppeteerfailureRegex = /TESTCASE:([^:]+):failure/g;
    const puppeteersuccessRegex = /TESTCASE:([^:]+):success/g;

    const results = {
      passed: [],
      failed: [],
      // logs:[]
    };
    
    const regex = /ERROR.*/g;
    const failedDetails = [];
    let match1;        
    
    while ((match1 = junitfailureRegex.exec(inputString)) !== null) {
      if(!match1.includes('Skipped')){
        failedDetails.push(match1[0].trim());
        if(!match1[5] && match1[4]){
          results.failed.push({
            testName: match1[4],
            errorMessage: match1[8].trim()
          });
        } else if(!match1[4] && !match1[5]){
          results.failed.push({
            testName: match1[3],
            errorMessage: match1[8].trim()
          });
        }        
        else{
        results.failed.push({
          testName: match1[5],
          errorMessage: match1[8].trim()
        });
      }
    }
      
    }

    let match;

    while ((match = puppeteerfailureRegex.exec(inputString)) !== null) {
      results.failed.push(match[1]); // Push the captured test case name into the results array
    }

    while ((match = puppeteersuccessRegex.exec(inputString)) !== null) {
      results.passed.push(match[1]); // Push the captured test case name into the results array
    }

    while ((match = nunitpassedRegex.exec(inputString)) !== null) {
      results.passed.push(match[1]);
    }

    // Extract failed tests and their error messages
    while ((match = nunitfailedRegex.exec(inputString)) !== null) {
      
      results.failed.push({
        testName: match[1],
        errorMessage: match[2].trim()
      });
    }
  while ((match = angsuccessRegex.exec(inputString)) !== null) {
    results.passed.push(match[1]);
  }

  // Extract failed tests and their error messages
  while ((match = angfailedRegex.exec(inputString)) !== null) {
    results.failed.push({
      testName: match[1],
      errorMessage: match[2].trim()
    });
  }

  // while ((match = junitpassedRegex.exec(inputString)) !== null) {
  //   if(!match[1].includes('Tests:')){
  //     results.passed.push(match[1]);
  //   }
  // }

  // console.log("match[0]");
  
  // while ((match = failureRegex.exec(inputString)) !== null) {
  //   console.log("match[0]");
  //   console.log(match[0]);
  //   if(!match[1].includes('Skipped:')){
  //     results.logs.push({
  //       testCase: match[1].trim(), // Test case name
  //       reason: match[4].trim()   // Failure reason
  //     });
  //   }
  // }

  // while ((match = junitfailedRegex.exec(inputString)) !== null) {
  //   results.failed.push({
  //       testName: match[1],
  //   });
  // }

    // Output the results
    return JSON.stringify(results, null, 2);
  }

  const testCodeData = {};
  
  const codeData = await getCode(key, testCodeData);

const extractResultList = async (responseString) => {
  try {
    const jsonObject = JSON.parse(responseString); // Parse the response string
    const hasCompilationError = jsonObject.tc_list.some(tc => tc.result === 'Compilation Error');
  
    let allResultLogs = []; // Collect all result logs from all items
  
    const objectArray = Array.isArray(jsonObject) ? jsonObject : [jsonObject];
  
    objectArray.forEach((item) => {
      if (item.resultList && Array.isArray(item.resultList)) {
        item.resultList.forEach(async (resultItem) => {
          if (resultItem.result) {
            try {
              const resultObject = JSON.parse(resultItem.result); 
              if(hasCompilationError){
              const errorlog =  extractErrors(resultObject.output.stderr || resultObject.output.stdout)
              if(errorlog == [] || errorlog == null || errorlog == ''){
                allResultLogs.push(resultObject.output); 
              } else{
                // console.log("errorlog");
                // console.log(errorlog);
                
              allResultLogs.push(errorlog); 
              }
            }else{
              const PassFailList = extractPassFail(resultObject.output.stderr || resultObject.output.stdout)
              allResultLogs.push(PassFailList); 
            }
            } catch (innerError) {
              console.error("Error parsing resultItem.result:", innerError);
            }
          }
        });
      }
    });
  
    return allResultLogs; // Return all collected results
  } catch (error) {
    console.error("Error parsing the response string or processing resultList:", error);
    return [];
  }
  
};
// const extractFailedTests = (codeObject, failedTestDetails) => {
//   const testRegex = /\[Test(?:,\s*Order\(\d+\))?\]\s+public\s+(?:async\s+)?(?:Task|void)\s+([a-zA-Z0-9_]+)\(\)\s*\{/g;
  
//   const failedTests = [];

//   // Iterate through each file in the codeObject
//   for (const [fileName, fileContent] of Object.entries(codeObject)) {
//     let match;
//     let testStartIndex = 0;
//     while ((match = testRegex.exec(fileContent)) !== null) {
//       const testName = match[1];  // Extracted test method name
//       let testContent = '{';
//       let braceCount = 1;  // We have already encountered the first opening brace {
//       let index = testRegex.lastIndex; // Start from the position after the opening brace

//       // Keep reading characters until we find the closing brace for the method
//       while (braceCount > 0 && index < fileContent.length) {
//         const char = fileContent[index];
//         testContent += char;
        
//         if (char === '{') {
//           braceCount++;
//         } else if (char === '}') {
//           braceCount--;
//         }
        
//         index++;
//       }

//       // Find the corresponding failed test detail
//       const failedTestDetail = failedTestDetails.find((test) => test.testName === testName);

//       // If a failed test detail is found, push the required information
//       if (failedTestDetail) {
//         failedTests.push({
//           testName: testName,
//           testContent: testContent.trim(),  // Trim any extra leading/trailing spaces
//           errorMessage: failedTestDetail.errorMessage
//         });
//       }
//     }
//   }

//   return failedTests;
// };

const extractFailedTestsAndSetups = async (codeObject, failedTestDetails) => {
  // Regex patterns for [Test] and [SetUp] methods
  const testRegex = /\[Test(?:,\s*Order\(\d+\))?\]\s+public\s+(?:async\s+)?(?:Task|void)\s+([a-zA-Z0-9_]+)\(\)\s*\{/g;
  const setupRegex = /\[SetUp\]\s+public\s+(?:async\s+)?(?:Task|void)\s+([a-zA-Z0-9_]+)\(\)\s*\{/g;
  
  const failedTests = [];

  // Iterate through each file in the codeObject
  for (const [fileName, fileContent] of Object.entries(codeObject)) {
    let match;
    let testStartIndex = 0;
    
    // Extract [Test] methods
    while ((match = testRegex.exec(fileContent)) !== null) {
      const testName = match[1];  // Extracted test method name
      let testContent = '{';
      let braceCount = 1;  // We have already encountered the first opening brace {
      let index = testRegex.lastIndex; // Start from the position after the opening brace

      // Keep reading characters until we find the closing brace for the method
      while (braceCount > 0 && index < fileContent.length) {
        const char = fileContent[index];
        testContent += char;
        
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
        
        index++;
      }

      // Find the corresponding failed test detail
      const failedTestDetail = failedTestDetails.find((test) => test.testName === testName);

      // If a failed test detail is found, push the required information
      if (failedTestDetail) {
        failedTests.push({
          testType: 'Test',
          testName: testName,
          testContent: testContent.trim(),  // Trim any extra leading/trailing spaces
          errorMessage: failedTestDetail.errorMessage
        });
      }
    }

    // Extract [SetUp] methods
    while ((match = setupRegex.exec(fileContent)) !== null) {
      const setupName = match[1];  // Extracted setup method name
      let setupContent = '{';
      let braceCount = 1;  // We have already encountered the first opening brace {
      let index = setupRegex.lastIndex; // Start from the position after the opening brace

      // Keep reading characters until we find the closing brace for the method
      while (braceCount > 0 && index < fileContent.length) {
        const char = fileContent[index];
        setupContent += char;
        
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
        
        index++;
      }

      // Push the setup method information (not associated with failure details)
      failedTests.push({
        testType: 'SetUp',
        testName: setupName,
        testContent: setupContent.trim()  // Trim any extra leading/trailing spaces
      });
    }
  }

  return failedTests || null;
};

const extractFailedTestCases = (logs) => {
  try {
    // Parse the logs string into an object
    // const parsedLogs = JSON.parse(logs);
    const wrappedLogs = `[${logs}]`;

    // console.log("log +"+logs);
    const parsedLogs = JSON.parse(wrappedLogs);


    // Extract the full details of failed test cases
    const failedTestCases = parsedLogs.failed;
    if(failedTestCases){
    return failedTestCases;
    } else{
      return null;
    }

  } catch (error) {
    console.error("Error parsing logs or extracting failed test cases:", error);
    return [];
  }
};

let resultList = []; // Initialize the variable globally

const failedTestcaseMessage = await processTestCases(responseString);
const FailedtestcaseswithTestcase = await extractFailedTestsAndSetups(testCodeData, failedTestcaseMessage);


async function processTestCases(responseString) {
  resultList = await extractResultList(responseString);


  
  const failedTestCases = await extractFailedTestCases(resultList);

//   if(failedTestCases == null || failedTestCases == []){  
//     // resultList = failedTestCases
//     console.log("sssssssss");

//     const Failedtestcases = await extractFailedTestsAndSetups(testCodeData, failedTestCases);
//     console.log("Failedtestcases:");
//     console.log(Failedtestcases);
//     if(Failedtestcases == [] || Failedtestcases ===" " || Failedtestcases ===null){
//       // resultList = Failedtestcases;
//     } else{
//     resultList = Failedtestcases;
//     }
//   }else {
//     return resultList;

// }



  return resultList;

}

// extractResultList(responseString).then(async (result) => {
//   resultList = result;
//   const failedTestCases = await extractFailedTestCases(resultList);

//   // Log the result
//   console.log("faaaaaaa "+failedTestCases);
//   const Failedtestcases= await extractFailedTestsAndSetups(testCodeData, failedTestCases);
//   console.log("Failedtestcases");
//   console.log(Failedtestcases);
//   resultList = Failedtestcases;
// });

  const tcList = extractTcList(responseString);

  // console.log(key);

  
 
  var data = {
    // 'key': key,
    key,
    'tcList': JSON.stringify(tcList, null, 2),
    QuestionData,
    codeComponents: codeData,
    log: failedTestcaseMessage,
    testCode: testCodeData
  }
  
  let sonarAddedDateIST;
  // const sonarAddedDate = await axios.get(
  //   `https://sonarcloud.io/api/project_branches/list?project=iamneo-production_${key}`);

    // const sonarAddedDate = await axios.get(`https://sonarcloud.io/api/project_branches/list?project=iamneo-production_${key}`, {
    //   validateStatus: (status) => status === 200 || status === 404,
    // });
    let differenceInTimeSubmission;

    try {
      const sonarAddedDate = await axios.get(
          `https://sonarcloud.io/api/project_branches/list?project=iamneo-production_${key}`,
          { validateStatus: (status) => status === 200 || status === 404 }
      );
      console.log("Sonar response:", sonarAddedDate.data);
      if (sonarAddedDate.status === 404 || sonarAddedDate.status === 403) {
        console.warn("Endpoint not found. Returning an empty array.");
        // return [];
      }
  
      var testid1 = ''
    // let differenceInTimeSubmission;
  
      if (sonarAddedDate.status != 404) {
  
    const sonardate = sonarAddedDate?.data?.branches[0]?.commit?.date || "null date";
    if(sonardate != "null date"){
      sonarAddedDateIST = await ISTtimeconverter(sonardate);
    } else {
      sonarAddedDateIST = "Not recorded"
    }
    const diffInMillis = Math.abs(testSubmitedTimeIST.istDate - sonarAddedDateIST.istDate);
    // Convert to hours, minutes, and seconds
    const diffInHours = Math.floor(diffInMillis / (1000 * 60 * 60)); // Whole hours
    const diffInMinutes = Math.floor((diffInMillis % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes
    const diffInSeconds = Math.floor((diffInMillis % (1000 * 60)) / 1000); // Remaining seconds
    const formattedHours = diffInHours.toString().padStart(2, "0");
    const formattedMinutes = diffInMinutes.toString().padStart(2, "0");
    const formattedSeconds = diffInSeconds.toString().padStart(2, "0");
    if (formattedMinutes <= 5) {
      differenceInTimeSubmission = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      testid1 = test.testId
      // console.log("The difference is more than 5 minutes.");
      differenceInTimeSubmission = `The difference is more than 5 minutes or not recorded on submission of test. Check manually for Latest Code`;
    }
  }
  else {
    testid1 = test.testId
    sonarAddedDateIST = "Not Recorded"
    // console.log("The difference is more than 5 minutes.");
    differenceInTimeSubmission = `The difference is more than 5 minutes or not recorded on submission of test. Check manually for Latest Code`;
  }
  } catch (error) {
      if (error.response && error.response.status === 403) {
          console.warn("Access forbidden (403) - Continuing execution...");
      } else {
          console.error("Unexpected error:", error.message);
      }
  }

//     if (sonarAddedDate.status === 404) {
//       console.warn("Endpoint not found. Returning an empty array.");
//       // return [];
//     }


//     var testid1 = ''
//   let differenceInTimeSubmission;



//     if (sonarAddedDate.status != 404) {

//   const sonardate = sonarAddedDate?.data?.branches[0]?.commit?.date || "null date";
//   if(sonardate != "null date"){
//     sonarAddedDateIST = await ISTtimeconverter(sonardate);
//   } else {
//     sonarAddedDateIST = "Not recorded"
//   }
//   const diffInMillis = Math.abs(testSubmitedTimeIST.istDate - sonarAddedDateIST.istDate);
//   // Convert to hours, minutes, and seconds
//   const diffInHours = Math.floor(diffInMillis / (1000 * 60 * 60)); // Whole hours
//   const diffInMinutes = Math.floor((diffInMillis % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes
//   const diffInSeconds = Math.floor((diffInMillis % (1000 * 60)) / 1000); // Remaining seconds
//   const formattedHours = diffInHours.toString().padStart(2, "0");
//   const formattedMinutes = diffInMinutes.toString().padStart(2, "0");
//   const formattedSeconds = diffInSeconds.toString().padStart(2, "0");
//   if (formattedMinutes <= 5) {
//     differenceInTimeSubmission = `${formattedHours}:${formattedMinutes}:${formattedSeconds} mins`;
//   } else {
//     testid1 = test.testId
//     // console.log("The difference is more than 5 minutes.");
//     differenceInTimeSubmission = `The difference is more than 5 minutes or not recorded on submission of test. Check manually for Latest Code`;
//   }
// }
// else {
//   testid1 = test.testId
//   sonarAddedDateIST = "Not Recorded"
//   // console.log("The difference is more than 5 minutes.");
//   differenceInTimeSubmission = `The difference is more than 5 minutes or not recorded on submission of test. Check manually for Latest Code`;
// }
    



  let ai;
  try {
    ai = await aianalyzer(data, analysisType);
  } catch (error) {
    console.error("AI Analyzer Error:", error);
    ai = { content: "AI analysis could not be generated due to an error." };
  }
  const responsePayload = {
    key,
    token: authToken,
    tcList: JSON.stringify(tcList, null, 2),
    QuestionData,
    codeComponents: codeData,
    aiAnalysis: ai.content || ai,
  };
  const rawName = response.data.users_domain.name;
  const formattedName = rawName.replace(/\$/g, " ");
  // if(ai == "No solution is fetched"){
    testid1 = test.testId
  // }
  responsesToExcel.push({
    Name: formattedName,
    Email: response.data.users_domain.email,
    Section_Name: response.data.frozen_test_data[i].name,
    Secured_Mark: response.data.frozen_test_data[i].questions[0].student_questions.marks,
    Total_Mark: response.data.frozen_test_data[i].questions[0].marks,
    Test_Submitted_Time: testSubmitedTimeIST.dateSubmitted,
    SonarAddedTime: sonarAddedDateIST?.dateSubmitted || null,
    Differnce_In_Submission: differenceInTimeSubmission,
    // token: authToken,
    // tcList: JSON.stringify(tcList, null, 2),
    // QuestionData,
    // codeComponents: codeData,
    aiAnalysis: ai.content || ai,
    ResultLink: testid1,

  });
  responseinJson.push({
    key,
    test_Id: testid1,
    name: formattedName,
    // token: authToken,
    Section_Name: response.data.frozen_test_data[i].name,
    tcList: JSON.stringify(tcList, null, 2),
    QuestionData,
    codeComponents: codeData,
    aiAnalysis: ai.content || ai,
    Test_Submitted_Time: testSubmitedTimeIST.dateSubmitted,
    SonarAddedTime: sonarAddedDateIST?.dateSubmitted || null,
    Differnce_In_Submission: differenceInTimeSubmission,
    // log: resultList,
    log: failedTestcaseMessage,
    TestCode: testCodeData
  });
}
}
    // // res.status(200).send(responsesToExcel);
    // const worksheet = xlsx.utils.json_to_sheet(responsesToExcel);

    // // Create a new workbook and append the worksheet
    // const workbook1 = xlsx.utils.book_new();
    // xlsx.utils.book_append_sheet(workbook1, worksheet, "Analysis");

    // // Save the Excel file
    // const filePath1 = "./response-analysis.xlsx";

    // xlsx.writeFile(workbook1, filePath1);
    // const conn = mongoose.connection;

    // conn.once('open', async () => {
    //   console.log('MongoDB connection established.');
    
    //   const gridfsBucket = new GridFSBucket(conn.db, {
    //     bucketName: 'uploads', // Name of the bucket
    //   });
    
    //   // const filePath = './response-analysis.xlsx';
    //   const uploadStream = gridfsBucket.openUploadStream(path.basename(filePath1), {
    //     contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //   });
    
    //   fs.createReadStream(filePath1)
    //     .pipe(uploadStream)
    //     .on('error', (err) => {
    //       console.error('Error uploading file:', err);
    //     })
    //     .on('finish', () => {
    //       console.log('Excel file uploaded successfully to MongoDB.');
    //     });
    // });

    // console.log(`Excel file saved to ${filePath1}`);

    const worksheet = xlsx.utils.json_to_sheet(responsesToExcel);
    const workbook1 = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook1, worksheet, "Analysis");

    const filePath1 = path.resolve('./response-analysis.xlsx');
    xlsx.writeFile(workbook1, filePath1);
    console.log(`Excel file saved to ${filePath1}`);

    // const conn = mongoose.connection;
    if (!fs.existsSync(filePath1)) {
      console.error('File not found:', filePath1);
      return res.status(500).send({ message: 'File not found on server.' });
    }

    
    console.log(`Excel file saved to ${filePath1}`);

    // Upload file to MongoDB GridFS
    conn.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    try {
      const gridfsBucket = new GridFSBucket(conn.db, {
        bucketName: 'uploads',
      });
    
      const uploadStream = gridfsBucket.openUploadStream(path.basename(filePath1), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fileId = uploadStream.id;

      fs.createReadStream(filePath1)
        .pipe(uploadStream)
        .on('error', (err) => {
          console.error('Error uploading file:', err);
          res.status(500).send({ message: 'Error uploading file to MongoDB.', error: err });
        })
        .on('finish', () => {
          console.log(`Excel file uploaded successfully to MongoDB with ID: ${fileId}`);
          res.status(200).send({
            message: 'File uploaded successfully to MongoDB.',
            fileId: fileId,
            downloadLink: `/download/${fileId}`,
            responseinJson
          });
        });
    } catch (err) {
      console.error('Unexpected error:', err);
      res.status(500).send({ message: 'Unexpected server error.', error: err });
    }
    
    // res.status(200).send({

    //   message: "Analysis completed and Excel file generated.",
    //   downloadLink: filePath1,
    //   responseinJson
    // });
  } catch (error) {
    // Handle errors
    if (error.response) {
      // The request was made, and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error response:", error.response.data);
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      // The request was made, but no response was received
      console.error("No response received:", error.request);
      res.status(500).send({ error: "No response received from the API" });
    } else {
      // Something else happened in setting up the request
      console.error("Error:", error.message);
      res.status(500).send({ error: error.message });
    }
  }
});

app.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;

    if (!ObjectId.isValid(fileId)) {
      return res.status(400).send({ message: 'Invalid file ID' });
    }

    const gridfsBucket = new GridFSBucket(conn.db, {
      bucketName: 'uploads', // Use the same bucket name as used during upload
    });

    const downloadStream = gridfsBucket.openDownloadStream(new ObjectId(fileId));

    // Set headers for file download
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="response-analysis.xlsx"`,
    });

    downloadStream
      .on('error', (err) => {
        console.error('Error downloading file:', err);
        res.status(500).send({ message: 'Error downloading file', error: err });
      })
      .on('file', (file) => {
        console.log('Downloading file:', file.filename);
      })
      .pipe(res)
      .on('finish', () => {
        console.log('File download completed.');
      });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send({ message: 'Unexpected server error', error: err });
  }
});



// app.get("/get-code", async (req, res) => {
const getCode = async (keyString, testCodeData) => {
  try {
    console.log(keyString);
    
    const files = `https://sonarcloud.io/api/measures/component_tree?ps=100&s=qualifier%2Cname&component=iamneo-production_${keyString}&metricKeys=ncloc%2Cvulnerabilities%2Cbugs%2Ccode_smells%2Csecurity_hotspots%2Ccoverage%2Cduplicated_lines_density&strategy=children`;
    // const filesResponse = await axios.get(files);
    const filesResponse = await axios.get(files, {
      validateStatus: (status) => status === 200 || status === 404,
    });

    if (filesResponse.status === 404) {
      console.warn("Endpoint not found. Returning an empty array.");
      return [];
    }

    if (!filesResponse.data.components) {
      // return res.status(404).json({ error: "No components found in the response." });
      throw new Error("No components found in the response.");
    }

    const componentPromises = filesResponse.data.components.map(async (element) => {
      if (element.name === "Migrations" || element.name === "Properties"
        // || element.name === "TestProject"
        || element.name === "resources"
        ) {
        console.log(`Skipping: ${element.name}`);
        return null;
      }

      if (element.qualifier === "FIL" || element.qualifier === "UTS") {
        try {
          // if (element.qualifier === "UTS") {
          //   // Process UTS files separately
          //   await TestCodeSplitter(element, keyString, testCodeData);
          //   return null;
          // }
          return await CodeSplitter(element, keyString);
        } catch (error) {
          console.error(`Error processing file ${element.name}:`, error.message);
          return { type: "file", name: element.name, error: error.message };
        }
      } else if (element.qualifier === "DIR") {
        try {
          
          return await DirHandler(element, keyString, testCodeData);
        } catch (error) {
          console.error(`Error processing directory ${element.name}:`, error.message);
          return { type: "directory", name: element.name, error: error.message };
        }
      }
    });

    const results = await Promise.all(componentPromises);
    return results.filter((result) => result !== null);

    // const filteredResults = results.filter((result) => result !== null);

    // res.json({ components: filteredResults });
  } catch (error) {
    console.error("Error fetching data1 from sonarQube:", error.message);
    return [];
    // throw new Error("Failed to fetch and process data.");
    // res.status(500).json({ error: "Failed to fetch data from the URL." });
  }
}
// );

app.delete('/delete-all-files', async (req, res) => {
  try {
    const result = await conn.db.collection('uploads.chunks').deleteMany({});
    const result1 = await conn.db.collection('uploads.files').deleteMany({});
    res
      .status(200)
      .send(`All records in 'uploads.chunks and uploads.files' deleted successfully. Count: ${result.deletedCount + result1.deletedCount}`);
  } catch (error) {
    res.status(500).send('Error deleting records: ' + error.message);
  }
});

app.get('/screenshot', (req, res) => {
  res.sendFile(__dirname + '/screenshot_course_search.png');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});



