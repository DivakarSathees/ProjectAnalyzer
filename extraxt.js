const axios = require('axios');
const fs = require('fs');
const AdmZip = require('adm-zip');

// URL of the ZIP file
const zipUrl = 'https://s3.amazonaws.com/exams-media-content/project_starters/fe6502f0-dfe5-4ec3-b181-3e8e34b19894/79d767bd-dca8-4580-b475-98f07d749548/medicinescaff.zip';

// Path where you want to save the ZIP file
const zipFilePath = './medicinescaff.zip';

// Path to extract the contents
const extractPath = './extracted/';

// Function to download and extract the ZIP file
async function downloadAndExtractZip() {
  try {
    // Step 1: Download the ZIP file
    const response = await axios({
      url: zipUrl,
      method: 'GET',headers: {
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vyc19kb21haW5faWQiOjQzMTY0NzUsInVzZXJfaWQiOiJiZDNjMmY0ZC1iNTNkLTRkZTYtODJjOS0wMDQxM2I3MDc1NmMiLCJzY2hvb2xfaWQiOiJmZTY1MDJmMC1kZmU1LTRlYzMtYjE4MS0zZThlMzRiMTk4OTQiLCJlbWFpbCI6ImRpdmFrYXIuc0BpYW1uZW8uYWkiLCJlbWFpbF92ZXJpZmllZCI6MSwibmFtZSI6IkRpdmFrYXIkUyIsInBob25lIjoiOTg5NDE1NzYxOSIsInBob25lX3ZlcmlmaWVkIjowLCJwcm9maWxlX3BpYyI6bnVsbCwiZ2VuZGVyIjoiTWFsZSIsInJvbGxfbm8iOm51bGwsInBvcnRhbF9hY2Nlc3Nfc3RhdHVzIjpudWxsLCJlbWFpbF9yZXF1ZXN0ZWRfaGlzdG9yeSI6bnVsbCwiZW1haWxfcmVxdWVzdGVkIjpudWxsLCJwcmltYXJ5X2VtYWlsIjoiZGl2YWthci5zQGlhbW5lby5haSIsInBhcmVudF9jb250YWN0IjpudWxsLCJwaG9uZV9udW1iZXIiOnsiY29kZSI6Iis5MSIsIm51bWJlciI6OTg5NDE1NzYxOX0sImlzX2ZvbGxvd2luZ19wdWJsaWNfZmVlZCI6ZmFsc2UsImJhZGdlIjowLCJzdXBlcmJhZGdlIjowLCJjb25zdW1lZF9iYWRnZSI6MCwiY29uc3VtZWRfc3VwZXJiYWRnZSI6MCwibWFubnVhbGJhZGdlcyI6bnVsbCwic3RhdHVzIjoiSW52aXRlZCIsImRvYiI6bnVsbCwic3RhZmZfdHlwZSI6IkludGVybmFsIiwidmVyaWZpZWRfcGljIjpudWxsLCJhcHBsaWNhdGlvbl9ubyI6bnVsbCwiaGFzaF9pZCI6IjczOWM0Y2ZmNTc0OWQ2YTIzYzIzMTU2N2FmMmY3ODliZjM1ZmE5MTEiLCJyZXNldF9wYXNzd29yZCI6ZmFsc2UsImNyZWF0ZWRBdCI6IjIwMjMtMDctMjBUMTg6MTQ6NDIuMDAwWiIsInVwZGF0ZWRBdCI6IjIwMjQtMTItMTlUMTM6MTA6MzAuMDAwWiIsImRlbGV0ZWRBdCI6bnVsbCwicmVkaXNSb2xlIjoiU3RhZmYiLCJzZXNzaW9uSUQiOiJkdFo2S3BSSUhTRnZDcEVOVElQY2FnPT0iLCJlbmFibGVUd29GYWN0b3JBdXRoZW50aWNhdGlvbiI6ZmFsc2UsImlhdCI6MTczNjQwNjIxNywiZXhwIjoxNzM2NDQ5NDE3fQ.6_xyqPX54Cxqm_jNeiFoLp7Yh-0RIixvca0lio1KlJ4'
      },
      responseType: 'stream'
    });

    // Save the ZIP file to disk
    const writer = fs.createWriteStream(zipFilePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log('ZIP file downloaded successfully.');
      
      // Step 2: Extract the contents of the ZIP file
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(extractPath, true);
      console.log(`ZIP file extracted to ${extractPath}`);
    });

    writer.on('error', (err) => {
      console.error('Error downloading the file:', err);
    });
  } catch (error) {
    console.error('Error fetching the ZIP file:', error);
  }
}

// Call the function
downloadAndExtractZip();
