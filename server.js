

const express = require('express');
const app = express();
const port = 8081;
const axios = require("axios");
const he = require("he");
const { aianalyzer } = require('./aianalyzer');
const { puplocalstorage } = require('./puplocalstorage');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


let keyString;

async function CodeSplitter(element, keyString) {
  if (element.name.includes("appsettings") || element.name.includes("UnitTest") || element.name.includes("WeatherForecast")) {
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

async function DirHandler(element, keyString) {
  if (element.name === "Migrations" || element.name === "Properties" || element.name === "TestProject") {
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

app.post("/get-keystring", async (req, res) => {
  try {
    var asd = await puplocalstorage();
    console.log(asd);
    
    // Example token; replace it with the actual authorization token
    const authToken = asd;
    // const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vyc19kb21haW5faWQiOjQzMTY0NzUsInVzZXJfaWQiOiJiZDNjMmY0ZC1iNTNkLTRkZTYtODJjOS0wMDQxM2I3MDc1NmMiLCJzY2hvb2xfaWQiOiJmZTY1MDJmMC1kZmU1LTRlYzMtYjE4MS0zZThlMzRiMTk4OTQiLCJlbWFpbCI6ImRpdmFrYXIuc0BpYW1uZW8uYWkiLCJlbWFpbF92ZXJpZmllZCI6MSwibmFtZSI6IkRpdmFrYXIkUyIsInBob25lIjoiOTg5NDE1NzYxOSIsInBob25lX3ZlcmlmaWVkIjowLCJwcm9maWxlX3BpYyI6bnVsbCwiZ2VuZGVyIjoiTWFsZSIsInJvbGxfbm8iOm51bGwsInBvcnRhbF9hY2Nlc3Nfc3RhdHVzIjpudWxsLCJlbWFpbF9yZXF1ZXN0ZWRfaGlzdG9yeSI6bnVsbCwiZW1haWxfcmVxdWVzdGVkIjpudWxsLCJwcmltYXJ5X2VtYWlsIjoiZGl2YWthci5zQGlhbW5lby5haSIsInBhcmVudF9jb250YWN0IjpudWxsLCJwaG9uZV9udW1iZXIiOnsiY29kZSI6Iis5MSIsIm51bWJlciI6OTg5NDE1NzYxOX0sImlzX2ZvbGxvd2luZ19wdWJsaWNfZmVlZCI6ZmFsc2UsImJhZGdlIjowLCJzdXBlcmJhZGdlIjowLCJjb25zdW1lZF9iYWRnZSI6MCwiY29uc3VtZWRfc3VwZXJiYWRnZSI6MCwibWFubnVhbGJhZGdlcyI6bnVsbCwic3RhdHVzIjoiSW52aXRlZCIsImRvYiI6bnVsbCwic3RhZmZfdHlwZSI6IkludGVybmFsIiwidmVyaWZpZWRfcGljIjpudWxsLCJhcHBsaWNhdGlvbl9ubyI6bnVsbCwiaGFzaF9pZCI6IjczOWM0Y2ZmNTc0OWQ2YTIzYzIzMTU2N2FmMmY3ODliZjM1ZmE5MTEiLCJyZXNldF9wYXNzd29yZCI6ZmFsc2UsImNyZWF0ZWRBdCI6IjIwMjMtMDctMjBUMTg6MTQ6NDIuMDAwWiIsInVwZGF0ZWRBdCI6IjIwMjQtMTItMTlUMTM6MTA6MzAuMDAwWiIsImRlbGV0ZWRBdCI6bnVsbCwicmVkaXNSb2xlIjoiU3RhZmYiLCJzZXNzaW9uSUQiOiJkdFo2S3BSSUhTRnZDcEVOVElQY2FnPT0iLCJlbmFibGVUd29GYWN0b3JBdXRoZW50aWNhdGlvbiI6ZmFsc2UsImlhdCI6MTczNjQwNjIxNywiZXhwIjoxNzM2NDQ5NDE3fQ.6_xyqPX54Cxqm_jNeiFoLp7Yh-0RIixvca0lio1KlJ4";

    // Extract request body to forward
    const requestBody = req.body.id;
    console.log("Request Body:", {"id": requestBody});
    

    // Make the POST request to the external API
    const response = await axios.post(
      "https://api.examly.io/api/v2/test/student/resultanalysis",
      {"id": requestBody},
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



  let ai;
  try {
    ai = await aianalyzer(data);
  } catch (error) {
    console.error("AI Analyzer Error:", error);
    ai = { content: "AI analysis could not be generated due to an error." };
  }
  // https://s3.amazonaws.com/exams-media-content/project_starters/fe6502f0-dfe5-4ec3-b181-3e8e34b19894/79d767bd-dca8-4580-b475-98f07d749548/medicinescaff.zip
  const responsePayload = {
    key,
    tcList: JSON.stringify(tcList, null, 2),
    QuestionData,
    codeComponents: codeData,
    aiAnalysis: ai.content,
  };
  
    // res.status(response.status).send(response.data);
    // res.status(response.status).send(response.data.frozen_test_data[0].questions[0].student_questions.answer);
    res.status(response.status).send(responsePayload);
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
