const express = require('express');
const app = express();
const port = 8081;
const axios = require("axios");
const he = require("he");
const { aianalyzer } = require('./aianalyzer');
const { puplocalstorage } = require('./puplocalstorage');
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
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


let keyString;

async function CodeSplitter(element, keyString) {
  if (element.name.includes("appsettings") || element.name.includes("UnitTest") || element.name.includes("WeatherForecast") || element.name.includes("csproj") || element.name.includes("sln")) {
    console.log(`Skipping directory: ${element.name}`);
    return null;
  }
  console.log(element.path);
  
  const url = `https://sonarcloud.io/api/sources/lines?key=iamneo-production_${keyString}%3A${element.path}&from=1&to=502`;
console.log(url);

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

  return { type: "file", name: element.name, code: codeLines };
}

async function ISTtimeconverter(dateTime) {
  const utcDate = new Date(dateTime);
  const istDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
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
  console.log("DateTime (12-hour format):",dateSubmitted);
  // return dateSubmitted;
  return {yr, month, date, hour12, min, sec, amPm, dateSubmitted, istDate};
}

async function DirHandler(element, keyString) {
  if (element.name.toLowerCase() === "migrations".toLowerCase() ||
  element.name.toLowerCase() === "properties".toLowerCase() ||
  element.name.toLowerCase() === "testproject".toLowerCase() ||
    element.name.toLowerCase() === "views".toLowerCase() ||
    element.name.toLowerCase() === "wwwroot".toLowerCase()) {
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
      if (child.name === "Migrations" || element.name === "Properties"  || element.name === "TestProject") {
        console.log(`Skipping: ${child.name}`);
        return null; // Skip this child
      }

      if (child.qualifier === "FIL") {
        try {
          return await CodeSplitter(child, keyString);
        } catch (error) {
          console.error(`Error processing file ${child.name}:`, error.message);
          return { type: "file", name: child.name, error: error.message };
        }
      } else if (child.qualifier === "DIR") {
        try {
          return await DirHandler(child, keyString); // Recursive call for subdirectories
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
    const { analysisType } = req.body;

    if (!analysisType) {
      return res.status(400).send({ error: "Analysis type not provided." });
    }
    
    console.log("Analysis Type:", analysisType);

    // Read and parse the Excel file
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Process each row in the sheet
    const testIds = sheetData.map((row) => {
      return {
        testId: row["Test ID"],
        url: row["URL"], // Assuming "URL" is a column name in the Excel sheet
      };
    });

    console.log(testIds);
    fs.unlinkSync(filePath);
    


    var asd;
    if(!req.body.token){
      asd = await puplocalstorage();
      console.log(asd);
    } else {
      asd = req.body.token 
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
    const QuestionData = response.data.frozen_test_data[0].questions[0].question_data;
    // console.log(response.data.frozen_test_data[0].questions[0].project_questions.boilerPlate.url);
    // console.log(response.data.frozen_test_data[0].questions[0].student_questions.answer);
    const responseString = response.data.frozen_test_data[0].questions[0].student_questions.answer;
    const testSubmitedTimeUTC = response.data.frozen_test_data[0].questions[0].student_questions.updatedAt;
    const testSubmitedTimeIST = await ISTtimeconverter(testSubmitedTimeUTC);

    
    const extractKey = (responseString) => {
      try {
          const jsonObject = JSON.parse(responseString);
          const resultString = jsonObject.resultList[0].result;
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
        return jsonObject.tc_list || [];
    } catch (error) {
        console.error("Error parsing the response string:", error);
        return [];
    }
  };

  const tcList = extractTcList(responseString);
  // console.log("Extracted tc_list:", tcList);
  console.log(key);
  
  const codeData = await getCode(key);
  var data = {
    // 'key': key,
    key,
    'tcList': JSON.stringify(tcList, null, 2),
    // question_data: QuestionData
    QuestionData,
    codeComponents: codeData,
  }
  let sonarAddedDateIST;
  const sonarAddedDate = await axios.get(
    `https://sonarcloud.io/api/project_branches/list?project=iamneo-production_${key}`);
  const sonardate = sonarAddedDate?.data?.branches[0]?.commit?.date || "null date";
  if(sonardate != "null date"){
    sonarAddedDateIST = await ISTtimeconverter(sonardate);
  } else {
    sonarAddedDateIST = "Not recorded"
  }
  var testid1 = ''
  const differenceInMs = testSubmitedTimeIST.istDate - sonarAddedDateIST.istDate; // Time difference in milliseconds
  const differenceInMinutes = Math.abs(differenceInMs / (1000 * 60)); // Convert ms to minutes
  let differenceInTimeSubmission;
  if (differenceInMinutes <= 5) {
    differenceInTimeSubmission = `${differenceInMinutes.toFixed(2)} mins`;
  } else {
    testid1 = test.testId
    // console.log("The difference is more than 5 minutes.");
    differenceInTimeSubmission = `The difference is more than 5 minutes or not recorded on submission of test. Check manually for Latest Code`;
  }
    



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
  if(ai == "No solution is fetched"){
    testid1 = test.testId
  }
  responsesToExcel.push({
    Name: formattedName,
    Email: response.data.users_domain.email,
    Secured_Mark: response.data.t_marks,
    Total_Mark: response.data.t_total_marks,
    Test_Submitted_Time: testSubmitedTimeIST.dateSubmitted,
    SonarAddedTime: sonarAddedDateIST.dateSubmitted,
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
    tcList: JSON.stringify(tcList, null, 2),
    QuestionData,
    codeComponents: codeData,
    aiAnalysis: ai.content || ai,
    Test_Submitted_Time: testSubmitedTimeIST.dateSubmitted,
    SonarAddedTime: sonarAddedDateIST.dateSubmitted,
    Differnce_In_Submission: differenceInTimeSubmission,
  });
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
const getCode = async (keyString) => {
  try {
    const files = `https://sonarcloud.io/api/measures/component_tree?ps=100&s=qualifier%2Cname&component=iamneo-production_${keyString}&metricKeys=ncloc%2Cvulnerabilities%2Cbugs%2Ccode_smells%2Csecurity_hotspots%2Ccoverage%2Cduplicated_lines_density&strategy=children`;
    const filesResponse = await axios.get(files);

    if (!filesResponse.data.components) {
      // return res.status(404).json({ error: "No components found in the response." });
      throw new Error("No components found in the response.");
    }

    const componentPromises = filesResponse.data.components.map(async (element) => {
      if (element.name === "Migrations" || element.name === "Properties"  || element.name === "TestProject") {
        console.log(`Skipping: ${element.name}`);
        return null;
      }

      if (element.qualifier === "FIL") {
        try {
          return await CodeSplitter(element, keyString);
        } catch (error) {
          console.error(`Error processing file ${element.name}:`, error.message);
          return { type: "file", name: element.name, error: error.message };
        }
      } else if (element.qualifier === "DIR") {
        try {
          return await DirHandler(element, keyString);
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
    console.error("Error fetching data:", error.message);
    throw new Error("Failed to fetch and process data.");
    // res.status(500).json({ error: "Failed to fetch data from the URL." });
  }
}
// );

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
