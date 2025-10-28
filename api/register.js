// This file acts as a secure Vercel/Node.js serverless function.
// It uses environment variables (or hardcoded secrets temporarily) to securely
// access the Google Sheets API and log the form data.

// The googleapis library is required for this function to work.
// NOTE: On Vercel, this dependency would be automatically handled if you use
// a package.json file, but for this context, we assume the environment supports it.

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// --- IMPORTANT CONFIGURATION ---

// 1. Get this value from the URL of your Google Sheet.
const SPREADSHEET_ID = '1M3SHDItMIstsQ97v4N3o5EGNx4jAmxYDIozRlSz6Tek';

// 2. These values MUST be set as environment variables (e.g., in Vercel/Netlify settings)
// For testing in a development environment, you can paste the JSON content here,
// but for production, **ALWAYS use environment variables** to protect your key.
const credentials = {
    // Service Account Credentials (Replaced with your JSON content)
    "type": "service_account",
    "project_id": "memorial-day-car-show-476515",
    "private_key_id": "815f95170e61fe01a68f2b70efcf65dadf274484",
    // NOTE: The \n characters in the private key are critical and must be preserved!
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEdO6y4LHX6qrt\nwv6m4AziNYT5PO3HQx1DHdCk7bwfZOvAyBG08kct10dBfJgLHsNOXuElYgEc51UM\nJ+yQP9Fv7nYwZtLKTmlO+7Z2Xm8uOtvwkiRJCPuT1/LQvOv5Nkr+S896/MhWGhPx\nzkpikA6EsujcXhmgwPAkzAyvecX4otx64uPaRaGRpiiF2Mtpt3UJFCxVgIJ6dKnB\nwawiKbigH/aM4eH4EUqp7BJx2NIgXXO1UUhMsL0jtfYDtVMPaMzWCk8q37IeHNV7\nsRKNu7Zxid4jdbcflha8iC5MCFc4pOqQNDkfXmqp4gSrgSwRy6buZFyqddcJ4uh/\naEPMcB3LAgMBAAECggEAAziyUVdDPfnTI7hML2BX1b3FmHCvVX0m6wV/eQo3niws\nJtUhCok5MZSTeTdvJtTc+a6vR8r7nwW2wfma9M1BxJwcbrQWRiBTCcCG6sSm/hMT\nrYuNR2/7mskHv58uyhS3K28Cz/l6hNmYn3Z1Mc3lmbd1VL0WSSngxjmyW45GTiAW\nLh2rJ5EiJCVRakPhhjC7C7TvNHKa43CPCm6OqCiwJAHgEwbNXzjNRYzpuboDFfX8\nSt1rVbf5Av2H/s/4Dq6JkEcm+zf56NN+eacRsB5GAoj9d5uld760Hs0/DD5nMS0U\nMfsp+fWEFvh90YvtaxQlzVZdyS5UfB9jQn+3yIITQQKBgQDwTmJx0lyskvUuthvx\nDyqD7oyS3CvCtlmZrbTTfUkxfvJOB6czDdVwev4ws0/WaYF0PTOywmGsAMQKO4G3\nX83642sG1G9BKiFOICJzVP1S2jU/c+7GrooJJZejywfHQtby45POuMDt7KtjAjaw\nLfaAzmImyjivLYcAToT59wcYPQKBgQDRSXDlqseEkjHf3bjGKwGH3i/g7SXmWJCg\nMx0aYRAZYsM8ohUcAs7KsecRE2bN+9hI9DbJhHBmG0p3+cIws11L64pIee4f+a2Pf\nsytdWcj/qqA2XVEBa5tUse3gioCyXPc/rgy7wthkzUYBu0wAQXl3FNoU85YCbs+q\nwkhh6zNmpwKBgHb2lw26El7ssaxaQyLnWyjNI5JgpNlT5K+LqwU39NAoBFRUvZUs\nuAlGguJ+XAv8wJUeg9441l/V42pP+JD73jQtN9As4MTFEHU7rkhzfcCR3IONprt\nNTCqB5PyovsmP7smprmkBP7EN2RgaCp31pyVj0mcusseQsMIHBSTElQRAoGAaEcd\nd3GmQ8nMC+0fua2H77inRn0i2yjZttiA8bnXGa759GYV+oTzoE8QAJQYLx4C4Ca+\nfZ39m13p1vMhBN6su9DUWVfXpM7BTp6pRrQL0Eel2DCawghptsOI8M5R3Y0wrIv+\nUDd/NoqJDSfTcHUvHkRHfRT5c3DfDAgNpKxaShUCgYBWY/5YOuc+fRTZiXk+FimB\nxA9u/U37JoAk/KKBohkQx7LZoKZyWme1nzsKuvkCQa228zcSHW9N6AynyzhMxsX6\nyOBPRfZuUc0Jfh6oy2DU4zxrm/PPaC3LkTLc9FBYgRP1cYx61vgUtIJqYpt7oyNi\ns1AJ6gZHnxJZeQM7588/Ig==\n-----END PRIVATE KEY-----\n", 
    "client_email": "carshow2026@memorial-day-car-show-476515.iam.gserviceaccount.com",
    "client_id": "108042433802182342260",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/carshow2026%40memorial-day-car-show-476515.iam.gserviceaccount.com"
};

// --- END CONFIGURATION ---

/**
 * Initializes the Google Sheets API client using service account credentials.
 * @returns {object} An initialized Google Sheets service client.
 */
async function getSheetsClient() {
    try {
        // Use GoogleAuth to create a client with the correct scopes
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        return sheets;
    } catch (error) {
        console.error('Error initializing Google Sheets client:', error);
        throw new Error('Failed to authenticate with Google Sheets.');
    }
}

/**
 * Processes the incoming request, validates data, and appends rows to Google Sheets.
 * @param {object} req - The request object (containing the array of vehicle rows in the body).
 * @param {object} res - The response object.
 */
module.exports = async (req, res) => {
    // Set CORS headers for security and access control
    res.setHeader('Access-Control-Allow-Origin', '*'); // Should be restricted in production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle pre-flight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).send('ok');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const rows = req.body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Invalid payload: expected an array of vehicle rows.' });
        }

        const sheets = await getSheetsClient();
        const sheetName = 'Registrations'; // Ensure your sheet has this tab name
        const range = `${sheetName}!A:G`; // Columns A-G

        const registrationTime = new Date().toISOString();
        const values = rows.map(row => [
            row.firstName,
            row.lastName,
            row.year,
            row.make,
            row.model,
            row.isVeteran ? 'Yes' : 'No',
            row.isTribute ? 'Yes' : 'No',
            registrationTime // Timestamp for when the submission was processed
        ]);

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: values,
            },
        });

        // Calculate the first row number added. 
        // Example: updatedRange = 'Registrations!A10:H11' -> start row is 10.
        const updatedRange = response.data.updates.updatedRange;
        const startRowMatch = updatedRange.match(/!A(\d+):/);
        const firstRowAdded = startRowMatch ? parseInt(startRowMatch[1], 10) : 'N/A';

        // Success response
        return res.status(200).json({
            message: 'Registration successful',
            registrationNumber: firstRowAdded,
            numVehicles: values.length,
        });

    } catch (error) {
        console.error('API Handler Error:', error.message);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
};

// Helper function to decode environment variables for Vercel/Netlify
// Note: This is typically unnecessary if you set the variables correctly, 
// but is good practice if using Base64 encoding for long secrets.
function decodeBase64(base64) {
    return Buffer.from(base64, 'base64').toString('utf8');
}
