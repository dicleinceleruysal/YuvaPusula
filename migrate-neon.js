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

async function testAndMigrate() {
    console.log('Connecting to Neon Database...');
    let dbUrl = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '');
    if (!dbUrl) {
        console.error('DATABASE_URL not found!');
        return;
    }
    const sql = neon(dbUrl);
    
    // Create tables
    console.log('Creating tables if they do not exist...');
    await sql`
        CREATE TABLE IF NOT EXISTS families (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            invite_code TEXT UNIQUE NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE NOT NULL,
            family_id TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            avatar TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    console.log('Tables initialized successfully in Neon!');

    // Check if there is local data in database.json or database.sqlite to migrate
    const jsonPath = path.join(__dirname, 'database.json');
    if (fs.existsSync(jsonPath)) {
        try {
            const raw = fs.readFileSync(jsonPath, 'utf8');
            const data = JSON.parse(raw);
            if (data.families && data.families.length > 0) {
                console.log(`Found ${data.families.length} families in database.json, migrating...`);
                for (const fam of data.families) {
                    await sql`
                        INSERT INTO families (id, name, invite_code, data)
                        VALUES (${fam.id}, ${fam.name}, ${fam.inviteCode || 'UYS123'}, ${JSON.stringify(fam)})
                        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(fam)}, updated_at = NOW();
                    `;
                    if (fam.members && fam.members.length > 0) {
                        for (const m of fam.members) {
                            if (m.phone) {
                                await sql`
                                    INSERT INTO users (id, phone, family_id, name, role, avatar)
                                    VALUES (${m.id || ('usr_' + Date.now())}, ${m.phone}, ${fam.id}, ${m.name || 'Aile Üyesi'}, ${m.role || 'Birey'}, ${m.avatar || '👤'})
                                    ON CONFLICT (phone) DO UPDATE SET family_id = ${fam.id}, name = ${m.name}, role = ${m.role}, avatar = ${m.avatar};
                                `;
                            }
                        }
                    }
                }
                console.log('Migration of database.json completed!');
            }
        } catch (err) {
            console.warn('Migration warning:', err.message);
        }
    }

    // Check row counts
    const families = await sql`SELECT id, name, invite_code FROM families`;
    const users = await sql`SELECT id, phone, name, family_id FROM users`;
    console.log('Neon Database Status:');
    console.log(`- Families count: ${families.length}`);
    console.log(`- Users count: ${users.length}`);
    console.log('Done!');
}

testAndMigrate().catch(console.error);
