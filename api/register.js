import { google } from 'googleapis';

// --- Environment Variables Setup ---
const clientEmail = process.env.CLIENT_EMAIL;
const sheetId = process.env.SHEET_ID;

// CRITICAL: Replace the literal '\n' string from Vercel environment variables 
// with actual newline characters for the private key to be valid.
const privateKey = process.env.PRIVATE_KEY 
    ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n') 
    : '';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Check for critical missing configuration before proceeding
    if (!clientEmail || !privateKey || !sheetId) {
        console.error('CRITICAL ERROR: Missing one or more required environment variables (CLIENT_EMAIL, PRIVATE_KEY, or SHEET_ID).');
        return res.status(500).json({ error: 'Server configuration error. Missing credentials.' });
    }

    // --- Authentication Setup ---
    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    try {
        await auth.authorize();
    } catch (authError) {
        console.error('Google Auth Error: Could not authorize JWT client.', authError.message);
        return res.status(500).json({ error: 'Authentication failed. Check environment variables and service account keys.' });
    }

    const sheets = google.sheets({
        version: 'v4',
        auth: auth,
    });
    // --- END Authentication Setup ---


    try {
        // 1. Destructure top-level fields (Driver info)
        // We use nullish coalescing (?? {}) to ensure req.body exists and is an object
        const { 
            firstName, 
            lastName, 
            isVeteran, 
            vehicles // This is an array from the client form
        } = req.body ?? {};

        // 2. ULTIMATE ROBUST FIX: Safely access the vehicle details
        // We ensure vehicles is an array and get the first item, defaulting to an empty object
        const firstVehicle = (Array.isArray(vehicles) && vehicles.length > 0) 
            ? vehicles[0] 
            : {};
        
        // 3. Destructure vehicle details from the first vehicle, using empty string defaults
        // This prevents the validation from failing if a required field is null/undefined
        const {
            year = '', // Default to empty string
            make = '', // Default to empty string
            model = '', // Default to empty string
            isTribute = false // Default to false
        } = firstVehicle;

        // 4. Basic validation - now we check the variables that were safely extracted
        if (!firstName || !lastName || !year || !make) {
            console.error('Validation Failed: Missing required fields in payload.', { 
                firstName: firstName || 'MISSING', 
                lastName: lastName || 'MISSING', 
                year: year || 'MISSING', 
                make: make || 'MISSING' 
            });
            // If the validation fails, this error is sent back to the client as the 400 response
            return res.status(400).json({ error: 'Missing required registration fields (First Name, Last Name, Year, or Make). Please ensure all required fields are filled.' });
        }

        const currentTimestamp = new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        // 5. Map values to 8 columns (A:H)
        const values = [
            [
                firstName,                  // A: First Name
                lastName,                   // B: Last Name
                year,                       // C: Year
                make,                       // D: Make
                model,                      // E: Model
                (isVeteran ? 'Yes' : 'No'), // F: Veteran?
                (isTribute ? 'Yes' : 'No'), // G: Tribute?
                currentTimestamp            // H: Timestamp
            ]
        ];

        const resource = {
            values,
        };

        const sheetName = 'Registrations'; 
        const range = `${sheetName}!A:H`;

        // Append the data to the spreadsheet
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range, 
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS', 
            resource,
        });

        // Check if the append operation was successful
        if (result.data.updates.updatedRows && result.data.updates.updatedRows > 0) {
            return res.status(200).json({ message: 'Registration successful!' });
        } else {
            console.warn('Append operation returned 0 updated rows.');
            return res.status(500).json({ error: 'Failed to confirm data write operation.' });
        }

    } catch (error) {
        // Log the detailed error from the Google API to Vercel logs
        console.error('Google Sheets API Error:', error.response?.data?.error?.message || error.message || error);

        return res.status(500).json({ 
            error: 'Server Error: Failed to process registration.', 
            details: 'A critical error occurred while communicating with the spreadsheet API. Check server logs.' 
        });
    }
}
