// --- Using official 'googleapis' library to resolve NPM dependency error ---

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis'); // Now using the official Google API Client

// Helper function to extract vehicle data
function extractVehicleData(data) {
    const vehicles = [];
    let i = 1;
    while (data[`vehicle_year_${i}`]) {
        vehicles.push({
            year: data[`vehicle_year_${i}`],
            make: data[`vehicle_make_${i}`],
            model: data[`vehicle_model_${i}`],
            class: data[`vehicle_class_${i}`],
            // Fees are $10 for show class, $0 for spectator class
            fee: data[`vehicle_fee_${i}`] === '10' ? '10' : '0' 
        });
        i++;
    }
    return vehicles;
}

// Helper function to calculate total fees
function calculateTotalFee(vehicles) {
    // Total is $10 for entry (if there's at least one vehicle) plus the sum of all fees (which are $10 or $0)
    // We assume the sum of individual vehicle fees is the total required payment.
    return vehicles.reduce((sum, v) => sum + parseInt(v.fee, 10), 0) + (vehicles.length > 0 ? 10 : 0);
}


// Vercel serverless function entry point
module.exports = async (req, res) => {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 2. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 3. Initialize Google Auth and Sheets Client
    try {
        const auth = new GoogleAuth({
            credentials: {
                client_email: process.env.CLIENT_EMAIL,
                private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle key formatting
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        
        const formData = req.body;
        const registrationDate = new Date().toISOString();

        // Extract and process vehicles
        const vehicles = extractVehicleData(formData);
        
        if (vehicles.length === 0) {
             return res.status(400).json({ error: 'No vehicle data submitted.' });
        }

        // Calculate total fee (Re-evaluating logic: $10/show car + $10 base entry fee)
        const totalFee = calculateTotalFee(vehicles);
        const feeStatus = formData.payment_status || 'Unpaid';

        // Prepare rows for sheet insertion
        const baseRow = [
            registrationDate,
            formData.first_name,
            formData.last_name,
            formData.phone,
            formData.email,
            vehicles[0].year,
            vehicles[0].make,
            vehicles[0].model,
            vehicles[0].class,
            vehicles[0].fee,
            totalFee, // Total Fee only on the first row
            feeStatus,
            formData.signature_name,
        ];

        const rowsToAdd = [baseRow];

        // Add rows for additional vehicles (only vehicle data)
        for (let i = 1; i < vehicles.length; i++) {
            rowsToAdd.push([
                '', '', '', '', '', // Empty fields for contact info
                vehicles[i].year,
                vehicles[i].make,
                vehicles[i].model,
                vehicles[i].class,
                vehicles[i].fee,
                '', // Total Fee
                '', // Fee Status
                '', // Signature
            ]);
        }

        // 4. Append data to Google Sheet using googleapis
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Registrations!A1', // Sheet Name and starting cell
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: rowsToAdd,
            }
        });

        // 5. Get the row number from the response
        const updatedRange = response.data.updates.updatedRange;
        const match = updatedRange.match(/(\d+):/);
        const registrationRowNumber = match ? match[1] : 'N/A';
        
        // 6. Respond with success
        res.status(200).json({ registrationNumber: registrationRowNumber });

    } catch (error) {
        console.error('Google Sheets API Error (Google APIs):', error);
        res.status(500).json({ error: 'Failed to write to Google Sheet.', details: error.message });
    }
};
