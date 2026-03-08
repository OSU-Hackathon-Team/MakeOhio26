import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manually load .env if not already loaded
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

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearPacketReports() {
    console.log('Clearing all packet reports from Supabase...');

    // Deleting all rows (this requires Row Level Security to allow 'delete' 
    // or for you to be using a service role key if RLS is on)
    const { error } = await supabase
        .from('packet_reports')
        .delete()
        .neq('id', 0); // .delete() requires a filter in Supabase JS

    if (error) {
        console.error('Error clearing reports:', error.message);
    } else {
        console.log('Successfully cleared packet_reports table.');

        // Also clear the local JSON file
        const localPath = './src/data/packet_reports.json';
        if (fs.existsSync(localPath)) {
            fs.writeFileSync(localPath, JSON.stringify([], null, 2));
            console.log('Cleared local src/data/packet_reports.json');
        }
    }
}

clearPacketReports();
