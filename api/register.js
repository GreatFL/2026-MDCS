import { google } from 'googleapis';

// Vercel only supports the 'key' property in the service account object.
// We must build the credentials object manually.
const key = {
  client_email: process.env.CLIENT_EMAIL,
  // CRITICAL FIX: The private key is stored in Vercel with literal \n characters.
  // We must explicitly replace the literal '\n' string with actual newline characters
  // before the Google API can parse it correctly.
  private_key: process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n') : '',
};

const SHEET_ID = process.env.SHEET_ID;

// Initialize the Google Sheets API client
const sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
});

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { firstName, lastName, year, make, isVeteran, vehicleTribute } = req.body;

        // Simple validation
        if (!firstName || !lastName || !year || !make) {
            return res.status(400).json({ error: 'Missing required registration fields.' });
        }

        const currentTimestamp = new Date().toLocaleString();
        
        // Data to be appended to the spreadsheet
        const values = [
            [
                firstName,
                lastName,
                year,
                make,
                currentTimestamp,
                isVeteran ? 'Yes' : 'No', // Convert boolean to string for the sheet
                vehicleTribute
            ]
        ];

        const resource = {
            values,
        };

        // Append the data to the spreadsheet
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:G', // Adjust the range to include columns A through G
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        // Check if the append operation was successful
        if (result.data.updates.updatedRows && result.data.updates.updatedRows > 0) {
            return res.status(200).json({ message: 'Registration successful!' });
        } else {
            // This case should ideally not happen if the request went through
            return res.status(500).json({ error: 'Failed to add registration data to sheet.' });
        }

    } catch (error) {
        // Log the detailed error from the Google API to Vercel logs
        console.error('Google Sheets API Error:', error.message || error);

        // Return a generic error to the client
        return res.status(500).json({ 
            error: 'Server Error: Failed to process registration.', 
            details: error.message || 'Check server logs for details' 
        });
    }
}
