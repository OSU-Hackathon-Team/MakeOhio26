import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manually load .env if not already loaded (e.g. by --env-file)
if (!process.env.VITE_SUPABASE_URL) {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
    } catch (e) {
        console.warn('Could not manually load .env file:', e.message);
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fetchPacketReports() {
    console.log('Fetching packet reports from Supabase...');
    const { data, error } = await supabase
        .from('packet_reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching packet reports:', error);
        return;
    }

    // Ensure the data directory exists
    if (!fs.existsSync('./src/data')) {
        fs.mkdirSync('./src/data', { recursive: true });
    }

    console.log(`Fetched ${data.length} reports.`);
    fs.writeFileSync('./src/data/packet_reports.json', JSON.stringify(data, null, 2));
    console.log('Saved to ./src/data/packet_reports.json');
}

fetchPacketReports();
