const fs = require('fs');
const path = require('path');

// Load .env
if (fs.existsSync(path.join(__dirname, '.env'))) {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (!process.env[key]) process.env[key] = value;
        }
    });
}

const { neon } = require('@neondatabase/serverless');

async function checkNeon() {
    let dbUrl = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '').trim();
    if (!dbUrl) {
        console.log('No DATABASE_URL found!');
        return;
    }
    const sql = neon(dbUrl);
    const families = await sql`SELECT id, name, invite_code, data FROM families`;
    const users = await sql`SELECT id, phone, name, role, family_id FROM users`;
    console.log('=== NEON DB CURRENT STATE ===');
    console.log(`Families (${families.length}):`);
    families.forEach(f => console.log(` - [${f.id}] ${f.name} (Code: ${f.invite_code}) Members: ${f.data.members ? f.data.members.length : 0}`));
    console.log(`Users (${users.length}):`);
    users.forEach(u => console.log(` - [${u.id}] ${u.name} (${u.phone}) -> Family: ${u.family_id}`));
}

checkNeon().catch(console.error);
