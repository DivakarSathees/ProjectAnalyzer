

const express = require('express');
const app = express();
const port = 8081;
const axios = require("axios");
const he = require("he");


const keyString = "adefbaabce319698352febccdcbedcefone";

async function CodeSplitter(element) {
  if (element.name.includes("appsettings") || element.name.includes("UnitTest") || element.name.includes("WeatherForecast")) {
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

  return { type: "file", name: element.name, code: codeLines };
}

async function DirHandler(element) {
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
          return await CodeSplitter(child);
        } catch (error) {
          console.error(`Error processing file ${child.name}:`, error.message);
          return { type: "file", name: child.name, error: error.message };
        }
      } else if (child.qualifier === "DIR") {
        try {
          return await DirHandler(child); // Recursive call for subdirectories
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

app.get("/get-keystring", async(req,res) => {
  
})

app.get("/get-code", async (req, res) => {
  try {
    const files = `https://sonarcloud.io/api/measures/component_tree?ps=100&s=qualifier%2Cname&component=iamneo-production_${keyString}&metricKeys=ncloc%2Cvulnerabilities%2Cbugs%2Ccode_smells%2Csecurity_hotspots%2Ccoverage%2Cduplicated_lines_density&strategy=children`;
    const filesResponse = await axios.get(files);

    if (!filesResponse.data.components) {
      return res.status(404).json({ error: "No components found in the response." });
    }

    const componentPromises = filesResponse.data.components.map(async (element) => {
      if (element.name === "Migrations" || element.name === "Properties"  || element.name === "TestProject") {
        console.log(`Skipping: ${element.name}`);
        return null;
      }

      if (element.qualifier === "FIL") {
        try {
          return await CodeSplitter(element);
        } catch (error) {
          console.error(`Error processing file ${element.name}:`, error.message);
          return { type: "file", name: element.name, error: error.message };
        }
      } else if (element.qualifier === "DIR") {
        try {
          return await DirHandler(element);
        } catch (error) {
          console.error(`Error processing directory ${element.name}:`, error.message);
          return { type: "directory", name: element.name, error: error.message };
        }
      }
    });

    const results = await Promise.all(componentPromises);

    const filteredResults = results.filter((result) => result !== null);

    res.json({ components: filteredResults });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Failed to fetch data from the URL." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
