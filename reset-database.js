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

async function resetDatabase() {
    console.log('--- VERİTABANI SIFIRLAMA BAŞLATILIYOR ---');
    
    // 1. Neon PostgreSQL Temizleme
    let dbUrl = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '').trim();
    if (dbUrl) {
        try {
            console.log('Neon PostgreSQL veritabanına bağlanılıyor...');
            const sql = neon(dbUrl);
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
            await sql`DELETE FROM users`;
            await sql`DELETE FROM families`;
            console.log('✅ Neon PostgreSQL (users & families tabloları) başarıyla sıfırlandı!');
        } catch (e) {
            console.error('Neon sıfırlama hatası:', e.message);
        }
    }

    // 2. Yerel JSON veritabanını temizle
    const jsonPath = path.join(__dirname, 'database.json');
    try {
        fs.writeFileSync(jsonPath, JSON.stringify({ families: [], users: [] }, null, 2), 'utf8');
        console.log('✅ Yerel database.json sıfırlandı.');
    } catch (e) {}

    // 3. Yerel SQLite veritabanını temizle
    const sqlitePath = path.join(__dirname, 'database.sqlite');
    if (fs.existsSync(sqlitePath)) {
        try {
            fs.unlinkSync(sqlitePath);
            console.log('✅ Yerel database.sqlite dosyası silindi (yeniden tertemiz oluşturulacak).');
        } catch (e) {
            console.warn('SQLite silinemedi:', e.message);
        }
    }

    console.log('--- TÜM VERİTABANLARI BAŞARIYLA SIFIRLANDI ---');
}

resetDatabase().catch(console.error);
