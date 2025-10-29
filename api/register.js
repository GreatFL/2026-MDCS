import { google } from 'googleapis';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        // Only allow POST requests
        return res.status(405).send('Method Not Allowed');
    }

    // 1. Load Environment Variables
    // The PRIVATE_KEY needs its escaped newlines (\n) converted back to actual newlines
    const private_key = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n') : null;
    const client_email = process.env.CLIENT_EMAIL;
    const sheet_id = process.env.SHEET_ID;

    // Basic validation
    if (!private_key || !client_email || !sheet_id) {
        console.error("Missing required environment variables.");
        return res.status(500).json({ error: 'Server configuration error: Missing credentials.' });
    }

    // 2. Extract Data from Request Body
    const { name, email, phone, car_make, car_model, car_year } = req.body;

    // Data validation (basic check to prevent empty submissions)
    if (!name || !email || !car_make) {
        return res.status(400).json({ error: 'Missing required form fields.' });
    }

    // The new row data we are preparing to insert (includes timestamp)
    const values = [
        [name, email, phone, car_make, car_model, car_year, new Date().toLocaleString()]
    ];

    try {
        // 3. Authorize Google Service Account (for writing)
        const auth = new google.auth.JWT({
            email: client_email,
            key: private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // Acquire the authenticated client (needed before initializing sheets)
        const authClient = await auth.authorize();

        // 4. Initialize Google Sheets client with the authorized client
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // 5. Append data to the sheet
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheet_id,
            // Range where data will be appended. Using 'A1' means it will find the next empty row.
            range: 'A:G', 
            valueInputOption: 'USER_ENTERED', // Formats data as if typed by a user
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: values,
            },
        });

        console.log(`Successfully appended ${response.data.updates.updatedCells} cells.`);
        
        // 6. Return success response
        return res.status(200).json({ message: 'Registration successful! Thank you for signing up.' });

    } catch (error) {
        console.error('Google Sheets API Error:', error.response ? error.response.data : error.message);

        // Check for specific permission errors
        if (error.response && error.response.status === 403) {
            return res.status(403).json({ error: 'Permission denied. Ensure the service account has Editor access to the sheet.' });
        }
        
        // General 400 error catch-all
        return res.status(400).json({ error: 'An unknown error occurred with the Google Sheets API. Check console logs for details.' });
    }
}
