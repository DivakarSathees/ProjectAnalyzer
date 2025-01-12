const puppeteer = require('puppeteer');
require('dotenv').config();

exports.puplocalstorage = async () => {
    try {
        const data = await loginAndGetLocalStorage(
            process.env.LTI_ADMIN_URL, // Replace with the actual login URL
            process.env.LTI_USER_NAME,                 // Replace with your username
            process.env.LTI_PASSWORD                       // Replace with your password
        );
        return data; // Return the data here
    } catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow the error to handle it outside
    }

        async function loginAndGetLocalStorage(url, username, password) {
            //   // Launch a headless browser
            const browser = await puppeteer.launch({ 
                headless: false,
                args: [
                    '--no-sandbox',
                      '--disable-setuid-sandbox',
                      '--disable-dev-shm-usage',
                      '--remote-debugging-port=9222',
                      '--start-maximized',
                      '--ignore-certificate-errors'
                  ],
             }); // Set to false for debugging
            const page = await browser.newPage();
            await page.setViewport({
            width: 1920, // Full width for most screens
            height: 1080, // Full height
            });
            try {
            // Navigate to the login page
            await page.goto(url, { waitUntil: 'networkidle2' });
        
            // Enter the username
            await page.type('#emailAddress', username); // Replace '#username' with the actual selector for the username field
        
            // Enter the password
            await page.type('#password', password); // Replace '#password' with the actual selector for the password field
        
            // Click the login button
            await page.click('.form__button.ladda-button');
            // Replace '#loginButton' with the actual selector for the login button
        
            // Wait for the navigation to complete after login
            await page.waitForNavigation(
                // { waitUntil: 'networkidle2' }
            );
        
            // Extract local storage data
            const localStorageData = await page.evaluate(() => {
                const data = {};
                for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
                }
                return data;
            });
        
            // console.log('Local Storage Data:', localStorageData.token);
            const tokenRegex = /"token":"(.*?)"/;
        
            // Extract the token
            const match = localStorageData.token.match(tokenRegex);
            let token;
            // Check and log the token
            if (match && match[1]) {
                token = match[1];
                // console.log("Extracted Token:", token);
            } else {
                console.log("Token not found.");
            }
        
            // Return the extracted data
            return token;
            } catch (error) {
            console.error('Error during login or local storage extraction:', error);
            throw error;
            } finally {
            // Close the browser
            await browser.close();
            }
        }

}