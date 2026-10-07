const path = require('path');
const os = require('os');
const fs = require('fs');

// Load .env in local development if present
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (m) {
                const k = m[1];
                let v = (m[2] || '').trim();
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
                if (!process.env[k]) process.env[k] = v;
            }
        });
    }
} catch (e) {}

const DEFAULT_DB_URL = 'postgresql://neondb_owner:npg_7JUsvmRGAjn2@ep-dawn-base-b54308pb-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

let neonClient = null;
function getNeon() {
    let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || DEFAULT_DB_URL;
    if (!dbUrl) return null;
    dbUrl = dbUrl.replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '').trim();
    if (!neonClient) {
        try {
            const { neon } = require('@neondatabase/serverless');
            neonClient = neon(dbUrl);
        } catch (err) {
            console.warn('Neon package not available, falling back to local store:', err.message);
            return null;
        }
    }
    return neonClient;
}

const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

let webpush = null;
try {
    webpush = require('web-push');
} catch (e) {}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAy8L7Fodzvl0ZARDLnnLt5Kc9E2mYVlcI6OXDAmKlq0zs9598HUlghuzmxz-bcL1G8wepKOSbAaLXm_dX45Xi4';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '1nv3rCQxHhTfM4tDSqSt90rBiaLmf6To3S3CDsFrutA';

if (webpush) {
    try {
        webpush.setVapidDetails(
            'mailto:destek@yuvapusula.app',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
    } catch (e) {
        console.warn('VAPID setup warning:', e.message);
    }
}

let DatabaseSync = null;
if (!isServerless) {
    try {
        const sqlite = require('node:sqlite');
        DatabaseSync = sqlite.DatabaseSync;
    } catch (e) {
        DatabaseSync = null;
    }
}

const DB_PATH = isServerless ? path.join(os.tmpdir(), 'database.sqlite') : path.join(__dirname, '..', 'database.sqlite');
const JSON_DB_PATH = isServerless ? path.join(os.tmpdir(), 'database.json') : path.join(__dirname, '..', 'database.json');

let db = null;
let jsonStore = { families: [], users: [] };

function loadJsonStore() {
    try {
        if (fs.existsSync(JSON_DB_PATH)) {
            const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
            jsonStore = JSON.parse(data);
        }
    } catch (e) {
        jsonStore = { families: [], users: [] };
    }
    if (!jsonStore.families) jsonStore.families = [];
    if (!jsonStore.users) jsonStore.users = [];
}

function saveJsonStore() {
    try {
        fs.writeFileSync(JSON_DB_PATH, JSON.stringify(jsonStore, null, 2), 'utf8');
    } catch (e) {}
}

let isInitialized = false;

async function initDatabase() {
    const sql = getNeon();
    if (sql) {
        try {
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
            await sql`
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    endpoint TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    subscription JSONB NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `;
            isInitialized = true;
            return;
        } catch (neonErr) {
            console.error('Neon DB init error:', neonErr);
        }
    }

    if (DatabaseSync && !isServerless) {
        try {
            if (!db) db = new DatabaseSync(DB_PATH);
            db.exec(`
                CREATE TABLE IF NOT EXISTS families (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    invite_code TEXT UNIQUE NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime'))
                );
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    phone TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    avatar TEXT NOT NULL,
                    family_id TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);
        } catch (err) {
            loadJsonStore();
        }
    } else {
        loadJsonStore();
    }
    isInitialized = true;
}

function normalizePhone(p) {
    if (!p) return '';
    let digits = String(p).replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) {
        digits = digits.substring(2);
    }
    if (digits.startsWith('0') && digits.length === 11) {
        digits = digits.substring(1);
    }
    return digits;
}

// 1. Kullanıcı ve Aile Bul (Giriş Yap)
async function findUserAndFamilyByPhone(phone) {
    const raw = (phone || '').trim();
    const norm = normalizePhone(raw);
    const withZero = '0' + norm;
    const with90 = '90' + norm;
    const withPlus90 = '+90' + norm;

    const sql = getNeon();
    if (sql) {
        try {
            // 1. users tablosunda ara
            const users = await sql`
                SELECT * FROM users 
                WHERE phone = ${raw} 
                   OR phone = ${norm} 
                   OR phone = ${withZero} 
                   OR phone = ${with90} 
                   OR phone = ${withPlus90}
                LIMIT 1
            `;
            if (users && users.length > 0) {
                const u = users[0];
                const families = await sql`SELECT data FROM families WHERE id = ${u.family_id} LIMIT 1`;
                if (families && families.length > 0) {
                    return {
                        user: { id: u.id, phone: u.phone, name: u.name, role: u.role, avatar: u.avatar },
                        family: families[0].data
                    };
                }
            }

            // 2. Eğer users tablosunda yoksa, families verisindeki members dizisini tara
            const allFam = await sql`SELECT id, data FROM families`;
            for (const f of allFam) {
                const famData = f.data;
                if (famData && Array.isArray(famData.members)) {
                    const foundMember = famData.members.find(m => normalizePhone(m.phone) === norm || (m.phone || '').trim() === raw);
                    if (foundMember) {
                        try {
                            await sql`
                                INSERT INTO users (id, phone, family_id, name, role, avatar)
                                VALUES (${foundMember.id || ('usr_' + Date.now())}, ${foundMember.phone}, ${f.id}, ${foundMember.name}, ${foundMember.role}, ${foundMember.avatar})
                                ON CONFLICT (phone) DO UPDATE SET family_id = ${f.id}, name = ${foundMember.name}, role = ${foundMember.role}, avatar = ${foundMember.avatar}
                            `;
                        } catch (insErr) {}
                        return { user: foundMember, family: famData };
                    }
                }
            }
        } catch (e) {
            console.error('Neon findUser error:', e);
        }
    }

    loadJsonStore();
    // 1. JSON users listesinde ara
    const user = jsonStore.users.find(u => normalizePhone(u.phone) === norm || (u.phone || '').trim() === raw);
    if (user) {
        const family = await getFullFamilyData(user.family_id);
        if (family) return { user, family };
    }

    // 2. JSON families members dizisinde ara
    for (const fam of jsonStore.families) {
        if (fam.members && Array.isArray(fam.members)) {
            const m = fam.members.find(mem => normalizePhone(mem.phone) === norm || (mem.phone || '').trim() === raw);
            if (m) {
                return { user: m, family: fam };
            }
        }
    }

    return null;
}

// 2. Yeni Aile Kur
async function createFamily(familyName, inviteCode, user) {
    const familyId = 'fam_' + Date.now();
    const initialData = {
        id: familyId,
        name: familyName,
        inviteCode: inviteCode,
        members: [user],
        posts: [],
        plans: [],
        dailyPlans: [],
        shopping: [],
        tasks: [],
        expenses: [],
        salaries: [],
        extraIncomes: [],
        fixedExpenses: [],
        investments: [],
        investmentHistory: [],
        messages: []
    };

    const sql = getNeon();
    if (sql) {
        try {
            await sql`INSERT INTO families (id, name, invite_code, data) VALUES (${familyId}, ${familyName}, ${inviteCode}, ${JSON.stringify(initialData)})`;
            await sql`INSERT INTO users (id, phone, family_id, name, role, avatar) VALUES (${user.id}, ${user.phone}, ${familyId}, ${user.name}, ${user.role}, ${user.avatar}) ON CONFLICT (phone) DO UPDATE SET family_id = ${familyId}, name = ${user.name}, role = ${user.role}, avatar = ${user.avatar}`;
            return initialData;
        } catch (e) {
            console.error('Neon createFamily error:', e);
        }
    }

    loadJsonStore();
    jsonStore.families.push(initialData);
    jsonStore.users.push({ ...user, family_id: familyId });
    saveJsonStore();
    return initialData;
}

// 3. Davet Kodu ile Aile Bul
async function findFamilyByCode(inviteCode) {
    const sql = getNeon();
    if (sql) {
        try {
            const res = await sql`SELECT data FROM families WHERE UPPER(invite_code) = UPPER(${inviteCode}) LIMIT 1`;
            if (res && res.length > 0) return res[0].data;
            return null;
        } catch (e) {
            console.error('Neon findFamilyByCode error:', e);
        }
    }

    loadJsonStore();
    const f = jsonStore.families.find(fam => (fam.inviteCode || '').toUpperCase() === inviteCode.toUpperCase());
    if (!f) return null;
    return await getFullFamilyData(f.id);
}

// 4. Aileye Yeni Kullanıcı Ekle
async function addUserToFamily(familyId, user, fallbackFamilyData = null) {
    const sql = getNeon();
    if (sql) {
        try {
            let res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (!res || res.length === 0) {
                const allFams = await sql`SELECT id, data FROM families`;
                if (allFams && allFams.length === 1) {
                    familyId = allFams[0].id;
                    res = allFams;
                } else if (fallbackFamilyData) {
                    await syncFamily(fallbackFamilyData);
                    res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
                }
            }

            if (res && res.length > 0) {
                const family = res[0].data;
                if (!family.members) family.members = [];
                const idx = family.members.findIndex(m => normalizePhone(m.phone) === normalizePhone(user.phone) || m.phone === user.phone);
                if (idx >= 0) {
                    family.members[idx] = user;
                } else {
                    family.members.push(user);
                }
                await sql`UPDATE families SET data = ${JSON.stringify(family)}, updated_at = NOW() WHERE id = ${familyId}`;
                await sql`INSERT INTO users (id, phone, family_id, name, role, avatar) VALUES (${user.id}, ${user.phone}, ${familyId}, ${user.name}, ${user.role}, ${user.avatar}) ON CONFLICT (phone) DO UPDATE SET family_id = ${familyId}, name = ${user.name}, role = ${user.role}, avatar = ${user.avatar}`;
                return family;
            }
        } catch (e) {
            console.error('Neon addUserToFamily error:', e);
        }
    }

    loadJsonStore();
    let family = jsonStore.families.find(f => f.id === familyId);
    if (!family && fallbackFamilyData) {
        await syncFamily(fallbackFamilyData);
        family = jsonStore.families.find(f => f.id === familyId);
    }
    if (family) {
        if (!family.members) family.members = [];
        const idx = family.members.findIndex(m => normalizePhone(m.phone) === normalizePhone(user.phone) || m.phone === user.phone);
        if (idx >= 0) family.members[idx] = user;
        else family.members.push(user);
        
        const uIdx = jsonStore.users.findIndex(u => normalizePhone(u.phone) === normalizePhone(user.phone) || u.phone === user.phone);
        if (uIdx >= 0) jsonStore.users[uIdx] = { ...user, family_id: familyId };
        else jsonStore.users.push({ ...user, family_id: familyId });
        saveJsonStore();
        return family;
    }
    return null;
}

// 4.0 Aile ve Üyelerini Tam Senkronize Et
async function syncFamily(familyData) {
    if (!familyData || !familyData.id) return null;
    const sql = getNeon();
    if (sql) {
        try {
            await sql`
                INSERT INTO families (id, name, invite_code, data)
                VALUES (${familyData.id}, ${familyData.name || 'Bizim Aile'}, ${familyData.inviteCode || 'UYS123'}, ${JSON.stringify(familyData)})
                ON CONFLICT (id) DO UPDATE SET name = ${familyData.name || 'Bizim Aile'}, invite_code = ${familyData.inviteCode || 'UYS123'}, data = ${JSON.stringify(familyData)}, updated_at = NOW();
            `;
            if (Array.isArray(familyData.members)) {
                for (const m of familyData.members) {
                    if (m && m.phone) {
                        await sql`
                            INSERT INTO users (id, phone, family_id, name, role, avatar)
                            VALUES (${m.id || ('usr_' + Date.now())}, ${m.phone}, ${familyData.id}, ${m.name || 'Aile Üyesi'}, ${m.role || 'Birey'}, ${m.avatar || '👤'})
                            ON CONFLICT (phone) DO UPDATE SET family_id = ${familyData.id}, name = ${m.name}, role = ${m.role}, avatar = ${m.avatar};
                        `;
                    }
                }
            }
            return familyData;
        } catch (e) {
            console.error('Neon syncFamily error:', e);
        }
    }

    loadJsonStore();
    const idx = jsonStore.families.findIndex(f => f.id === familyData.id);
    if (idx >= 0) jsonStore.families[idx] = familyData;
    else jsonStore.families.push(familyData);
    if (Array.isArray(familyData.members)) {
        familyData.members.forEach(m => {
            if (m && m.phone) {
                const uIdx = jsonStore.users.findIndex(u => normalizePhone(u.phone) === normalizePhone(m.phone) || u.phone === m.phone);
                if (uIdx >= 0) jsonStore.users[uIdx] = { ...m, family_id: familyData.id };
                else jsonStore.users.push({ ...m, family_id: familyData.id });
            }
        });
    }
    saveJsonStore();
    return familyData;
}

// 4.1 Aile Üyesi Sil / Çıkar
async function deleteMember(familyId, memberId) {
    const sql = getNeon();
    if (sql) {
        try {
            const res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (res && res.length > 0) {
                const family = res[0].data;
                const target = (family.members || []).find(m => m.id === memberId);
                family.members = (family.members || []).filter(m => m.id !== memberId);

                await sql`UPDATE families SET data = ${JSON.stringify(family)}, updated_at = NOW() WHERE id = ${familyId}`;

                if (target && target.phone) {
                    try {
                        await sql`DELETE FROM users WHERE (phone = ${target.phone} OR id = ${memberId}) AND family_id = ${familyId}`;
                    } catch (err) {}
                }
                return family;
            }
        } catch (e) {
            console.error('Neon deleteMember error:', e);
        }
    }

    loadJsonStore();
    const family = jsonStore.families.find(f => f.id === familyId);
    if (family) {
        const target = (family.members || []).find(m => m.id === memberId);
        family.members = (family.members || []).filter(m => m.id !== memberId);
        if (target && target.phone) {
            jsonStore.users = jsonStore.users.filter(u => !(u.phone === target.phone && u.family_id === familyId));
        }
        saveJsonStore();
        return family;
    }
    return null;
}

function normalizeFamily(fam) {
    if (!fam) return fam;
    if (!fam.members) fam.members = [];
    if (!fam.posts) fam.posts = [];
    if (!fam.plans) fam.plans = [];
    fam.plans = fam.plans.map(p => ({
        ...p,
        completed: p.completed !== undefined ? !!p.completed : (p.status === 'COMPLETED'),
        status: p.status || (p.completed ? 'COMPLETED' : 'PENDING')
    }));
    if (!fam.shoppingList) fam.shoppingList = fam.shopping || [];
    fam.shopping = fam.shoppingList;
    if (!fam.tasks) fam.tasks = [];
    if (!fam.expenses) fam.expenses = [];
    if (!fam.salaries) fam.salaries = [];
    if (!fam.extraIncomes) fam.extraIncomes = [];
    if (!fam.fixedExpenses) fam.fixedExpenses = [];
    if (!fam.investments) fam.investments = [];
    if (!fam.investmentHistory) fam.investmentHistory = [];
    if (!fam.dailyPlans) fam.dailyPlans = [];
    fam.dailyPlans = fam.dailyPlans.map(p => ({
        ...p,
        completed: !!p.completed,
        isRecurring: p.isRecurring !== undefined ? !!p.isRecurring : true
    }));
    return fam;
}

// 5. Güncel Aile Verilerini Getir
async function getFullFamilyData(familyId) {
    const sql = getNeon();
    if (sql) {
        try {
            let res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if ((!res || res.length === 0)) {
                const allFams = await sql`SELECT id, data FROM families`;
                if (allFams && allFams.length === 1) res = allFams;
            }
            if (res && res.length > 0) return normalizeFamily(res[0].data);
            return null;
        } catch (e) {
            console.error('Neon getFullFamilyData error:', e);
        }
    }

    loadJsonStore();
    let fam = jsonStore.families.find(f => f.id === familyId);
    if (!fam && jsonStore.families.length === 1) fam = jsonStore.families[0];
    return fam ? normalizeFamily(fam) : null;
}

// Ortak Aile Güncelleme Yardımcısı
async function updateFamilyHelper(familyId, mutator) {
    const sql = getNeon();
    if (sql) {
        try {
            let res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (!res || res.length === 0) {
                const allFams = await sql`SELECT id, data FROM families`;
                if (allFams && allFams.length === 1) {
                    familyId = allFams[0].id;
                    res = allFams;
                }
            }
            if (res && res.length > 0) {
                let family = normalizeFamily(res[0].data);
                family = mutator(family);
                family = normalizeFamily(family);
                await sql`UPDATE families SET data = ${JSON.stringify(family)}, updated_at = NOW() WHERE id = ${familyId}`;
                return family;
            }
        } catch (e) {
            console.error('Neon updateFamily error:', e);
        }
    }

    loadJsonStore();
    let family = jsonStore.families.find(f => f.id === familyId);
    if (!family && jsonStore.families.length === 1) {
        family = jsonStore.families[0];
        familyId = family.id;
    }
    if (family) {
        let updated = normalizeFamily(family);
        updated = mutator(updated);
        updated = normalizeFamily(updated);
        const idx = jsonStore.families.findIndex(f => f.id === familyId);
        if (idx >= 0) jsonStore.families[idx] = updated;
        saveJsonStore();
        return updated;
    }
    return null;
}

// Pano İşlemleri
async function addPost(familyId, post) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.posts) fam.posts = [];
        fam.posts.unshift({
            id: 'post_' + Date.now(),
            ...post,
            time: post.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        });
        return fam;
    });
}

async function deletePost(familyId, postId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.posts) fam.posts = [];
        fam.posts = fam.posts.filter(p => p.id !== postId);
        return fam;
    });
}

// Plan İşlemleri
async function addPlan(familyId, plan) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.plans) fam.plans = [];
        fam.plans.unshift({
            id: 'plan_' + Date.now(),
            ...plan,
            completed: !!plan.completed,
            status: plan.status || (plan.completed ? 'COMPLETED' : 'PENDING'),
            createdAt: new Date().toISOString()
        });
        return fam;
    });
}

async function togglePlan(familyId, planId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.plans) fam.plans = [];
        const item = fam.plans.find(p => p.id === planId);
        if (item) {
            item.completed = !item.completed;
            item.status = item.completed ? 'COMPLETED' : 'PENDING';
        }
        return fam;
    });
}

async function deletePlan(familyId, planId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.plans) fam.plans = [];
        fam.plans = fam.plans.filter(p => p.id !== planId);
        return fam;
    });
}

// Günlük Planlama İşlemleri (Her Gün Sıfırlanır)
async function addDailyPlan(familyId, plan) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.dailyPlans) fam.dailyPlans = [];
        fam.dailyPlans.push({
            id: plan.id || ('dplan_' + Date.now()),
            title: plan.title || 'Yeni Günlük Plan',
            time: plan.time || '09:00',
            icon: plan.icon || '⏰',
            category: plan.category || 'Genel',
            assignedTo: plan.assignedTo || 'Tüm Aile',
            isRecurring: plan.isRecurring !== undefined ? !!plan.isRecurring : true,
            completed: !!plan.completed,
            createdAt: plan.createdAt || new Date().toISOString()
        });
        fam.dailyPlans.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return fam;
    });
}

async function toggleDailyPlan(familyId, planId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.dailyPlans) fam.dailyPlans = [];
        const item = fam.dailyPlans.find(p => p.id === planId);
        if (item) {
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
        }
        return fam;
    });
}

async function deleteDailyPlan(familyId, planId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.dailyPlans) fam.dailyPlans = [];
        fam.dailyPlans = fam.dailyPlans.filter(p => p.id !== planId);
        return fam;
    });
}

async function resetDailyPlans(familyId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.dailyPlans) fam.dailyPlans = [];
        fam.dailyPlans = fam.dailyPlans
            .filter(p => p.isRecurring !== false)
            .map(p => ({
                ...p,
                completed: false,
                completedAt: null
            }));
        return fam;
    });
}

// Alışveriş Listesi
async function addShoppingItem(familyId, item) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shoppingList) fam.shoppingList = fam.shopping || [];
        const newItem = {
            id: 'shop_' + Date.now(),
            ...item,
            completed: false,
            createdAt: new Date().toISOString()
        };
        fam.shoppingList.unshift(newItem);
        fam.shopping = fam.shoppingList;
        return fam;
    });
}

async function toggleShoppingItem(familyId, itemId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shoppingList) fam.shoppingList = fam.shopping || [];
        const item = fam.shoppingList.find(s => s.id === itemId);
        if (item) {
            item.completed = !item.completed;
        }
        fam.shopping = fam.shoppingList;
        return fam;
    });
}

async function deleteShoppingItem(familyId, itemId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shoppingList) fam.shoppingList = fam.shopping || [];
        fam.shoppingList = fam.shoppingList.filter(s => s.id !== itemId);
        fam.shopping = fam.shoppingList;
        return fam;
    });
}

// Görev İşlemleri
async function addTask(familyId, task) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.tasks) fam.tasks = [];
        fam.tasks.unshift({
            id: 'task_' + Date.now(),
            ...task,
            completed: false,
            createdAt: new Date().toISOString()
        });
        return fam;
    });
}

async function toggleTask(familyId, taskId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.tasks) fam.tasks = [];
        const t = fam.tasks.find(tk => tk.id === taskId);
        if (t) {
            t.completed = !t.completed;
        }
        return fam;
    });
}

async function deleteTask(familyId, taskId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.tasks) fam.tasks = [];
        fam.tasks = fam.tasks.filter(t => t.id !== taskId);
        return fam;
    });
}

// Harcama İşlemleri
async function addExpense(familyId, expense) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.expenses) fam.expenses = [];
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        fam.expenses.unshift({
            id: 'exp_' + Date.now(),
            ...expense,
            amount: parseFloat(expense.amount) || 0,
            date: expense.date || new Date().toISOString().split('T')[0],
            month: expense.month || currentMonthKey,
            createdAt: new Date().toISOString()
        });
        return fam;
    });
}

async function deleteExpense(familyId, expenseId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.expenses) fam.expenses = [];
        fam.expenses = fam.expenses.filter(e => e.id !== expenseId);
        return fam;
    });
}

// Maaş İşlemleri
async function setSalary(familyId, salary) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.salaries) fam.salaries = [];
        const existingIdx = fam.salaries.findIndex(s => s.userId === salary.userId);
        const entry = {
            id: salary.id || ('sal_' + Date.now()),
            ...salary,
            amount: parseFloat(salary.amount) || 0,
            updatedAt: new Date().toISOString()
        };
        if (existingIdx >= 0) {
            fam.salaries[existingIdx] = entry;
        } else {
            fam.salaries.push(entry);
        }
        return fam;
    });
}

async function deleteSalary(familyId, salaryId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.salaries) fam.salaries = [];
        fam.salaries = fam.salaries.filter(s => s.id !== salaryId);
        return fam;
    });
}

// Sabit Gider İşlemleri
async function addFixedExpense(familyId, fixed) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.fixedExpenses) fam.fixedExpenses = [];
        fam.fixedExpenses.unshift({
            id: 'fix_' + Date.now(),
            ...fixed,
            amount: parseFloat(fixed.amount) || 0,
            isPaid: false
        });
        return fam;
    });
}

async function updateFixedExpense(familyId, id, updatedFixed) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.fixedExpenses) fam.fixedExpenses = [];
        const idx = fam.fixedExpenses.findIndex(f => f.id === id);
        if (idx >= 0) {
            fam.fixedExpenses[idx] = {
                ...fam.fixedExpenses[idx],
                ...updatedFixed,
                amount: parseFloat(updatedFixed.amount) !== undefined && !isNaN(parseFloat(updatedFixed.amount)) ? parseFloat(updatedFixed.amount) : fam.fixedExpenses[idx].amount,
                dueDay: parseInt(updatedFixed.dueDay) || fam.fixedExpenses[idx].dueDay || 1,
                title: updatedFixed.title || fam.fixedExpenses[idx].title,
                category: updatedFixed.category || fam.fixedExpenses[idx].category,
                payer: updatedFixed.payer !== undefined ? updatedFixed.payer : fam.fixedExpenses[idx].payer,
                notes: updatedFixed.notes !== undefined ? updatedFixed.notes : fam.fixedExpenses[idx].notes
            };
        }
        return fam;
    });
}

async function toggleFixedExpense(familyId, id) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.fixedExpenses) fam.fixedExpenses = [];
        const item = fam.fixedExpenses.find(f => f.id === id);
        if (item) {
            item.isPaid = !item.isPaid;
        }
        return fam;
    });
}

async function deleteFixedExpense(familyId, id) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.fixedExpenses) fam.fixedExpenses = [];
        fam.fixedExpenses = fam.fixedExpenses.filter(f => f.id !== id);
        return fam;
    });
}

// Yatırım ve Portföy İşlemleri
async function addInvestment(familyId, investment) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.investments) fam.investments = [];
        if (!fam.investmentHistory) fam.investmentHistory = [];
        
        const newInv = {
            id: 'inv_' + Date.now(),
            ...investment,
            amount: parseFloat(investment.amount) || 0,
            currentValueTl: parseFloat(investment.currentValueTl) || 0
        };
        fam.investments.push(newInv);
        fam.investmentHistory.unshift({
            id: 'hist_' + Date.now(),
            investmentId: newInv.id,
            name: newInv.name,
            type: 'BUY',
            amountDelta: newInv.amount,
            unit: newInv.unit,
            valueDeltaTl: newInv.currentValueTl,
            note: 'İlk Portföy Kaydı',
            date: new Date().toLocaleDateString('tr-TR')
        });
        return fam;
    });
}

async function adjustInvestment(familyId, investmentId, adjustment) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.investments) fam.investments = [];
        if (!fam.investmentHistory) fam.investmentHistory = [];
        
        const inv = fam.investments.find(i => i.id === investmentId);
        if (inv) {
            const deltaAmt = parseFloat(adjustment.amountDelta) || 0;
            const deltaVal = parseFloat(adjustment.valueDeltaTl) || 0;
            
            if (adjustment.type === 'buy') {
                inv.amount += deltaAmt;
                inv.currentValueTl += deltaVal;
            } else if (adjustment.type === 'sell') {
                inv.amount = Math.max(0, inv.amount - deltaAmt);
                inv.currentValueTl = Math.max(0, inv.currentValueTl - deltaVal);
            }
            
            fam.investmentHistory.unshift({
                id: 'hist_' + Date.now(),
                investmentId: inv.id,
                name: inv.name,
                type: adjustment.type.toUpperCase(),
                amountDelta: deltaAmt,
                unit: inv.unit,
                valueDeltaTl: deltaVal,
                note: adjustment.note || (adjustment.type === 'buy' ? 'Alım Yapıldı' : 'Satış / Bozdurma Yapıldı'),
                date: new Date().toLocaleDateString('tr-TR')
            });
        }
        return fam;
    });
}

async function deleteInvestment(familyId, investmentId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.investments) fam.investments = [];
        fam.investments = fam.investments.filter(i => i.id !== investmentId);
        return fam;
    });
}

// Mesajlaşma İşlemleri
async function addMessage(familyId, message) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.messages) fam.messages = [];
        fam.messages.push({
            id: 'msg_' + Date.now(),
            ...message,
            timestamp: new Date().toISOString(),
            readBy: [message.senderId]
        });
        return fam;
    });
}

async function markMessagesAsRead(familyId, currentUserId, chatPartnerId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.messages) fam.messages = [];
        fam.messages.forEach(msg => {
            if (!msg.readBy) msg.readBy = [msg.senderId];
            if (!chatPartnerId) {
                if (!msg.recipientId && !msg.readBy.includes(currentUserId)) {
                    msg.readBy.push(currentUserId);
                }
            } else {
                if (msg.senderId === chatPartnerId && msg.recipientId === currentUserId && !msg.readBy.includes(currentUserId)) {
                    msg.readBy.push(currentUserId);
                }
            }
        });
        return fam;
    });
}

// Ek Gelir İşlemleri (Prim, İkramiye, Kira, Freelance vb. - Ayın 1'inde Sıfırlanır)
async function addExtraIncome(familyId, income) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.extraIncomes) fam.extraIncomes = [];
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        fam.extraIncomes.unshift({
            id: 'inc_' + Date.now(),
            ...income,
            amount: parseFloat(income.amount) || 0,
            date: income.date || new Date().toLocaleDateString('tr-TR'),
            month: income.month || currentMonthKey,
            createdAt: new Date().toISOString()
        });
        return fam;
    });
}

async function deleteExtraIncome(familyId, incomeId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.extraIncomes) fam.extraIncomes = [];
        fam.extraIncomes = fam.extraIncomes.filter(inc => inc.id !== incomeId);
        return fam;
    });
}

// Push Subscription İşlemleri (Uygulama Kapalıyken Bildirim Gönderme)
async function savePushSubscription(familyId, userId, subscription) {
    if (!subscription || !subscription.endpoint) return false;
    const endpoint = subscription.endpoint;
    
    const sql = getNeon();
    if (sql) {
        try {
            await sql`
                INSERT INTO push_subscriptions (endpoint, family_id, user_id, subscription, updated_at)
                VALUES (${endpoint}, ${familyId}, ${userId}, ${JSON.stringify(subscription)}, NOW())
                ON CONFLICT (endpoint) DO UPDATE SET
                    family_id = ${familyId},
                    user_id = ${userId},
                    subscription = ${JSON.stringify(subscription)},
                    updated_at = NOW()
            `;
            return true;
        } catch (e) {
            console.error('Neon savePushSubscription error:', e);
        }
    }
    
    loadJsonStore();
    if (!jsonStore.pushSubscriptions) jsonStore.pushSubscriptions = [];
    const idx = jsonStore.pushSubscriptions.findIndex(s => s.endpoint === endpoint);
    const entry = { endpoint, familyId, userId, subscription, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
        jsonStore.pushSubscriptions[idx] = entry;
    } else {
        jsonStore.pushSubscriptions.push(entry);
    }
    saveJsonStore();
    return true;
}

async function sendPushToFamily(familyId, payload, excludeUserId) {
    if (!familyId || !webpush) return;
    
    let subs = [];
    const sql = getNeon();
    if (sql) {
        try {
            const rows = await sql`
                SELECT subscription, user_id, endpoint 
                FROM push_subscriptions 
                WHERE family_id = ${familyId}
            `;
            subs = rows
                .filter(r => !excludeUserId || r.user_id !== excludeUserId)
                .map(r => typeof r.subscription === 'string' ? JSON.parse(r.subscription) : r.subscription);
        } catch (e) {
            console.error('Neon getPushSubs error:', e);
        }
    }
    
    if (subs.length === 0) {
        loadJsonStore();
        if (jsonStore.pushSubscriptions) {
            subs = jsonStore.pushSubscriptions
                .filter(s => s.familyId === familyId && (!excludeUserId || s.userId !== excludeUserId))
                .map(s => s.subscription);
        }
    }
    
    if (!subs || subs.length === 0) return;
    
    const notificationPayload = JSON.stringify({
        title: payload.title || 'YuvaPusula',
        body: payload.body || 'Ailenizden yeni bir bildirim var!',
        icon: payload.icon || './icons/icon-192.png',
        badge: './icons/icon-192.png',
        url: payload.url || './index.html?tab=chat'
    });
    
    const pushOptions = {
        TTL: 86400,
        urgency: 'high',
        headers: {
            'Urgency': 'high',
            'Topic': 'chat'
        }
    };
    
    const sendPromises = subs.map(async (sub) => {
        try {
            await webpush.sendNotification(sub, notificationPayload, pushOptions);
        } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                // Abonelik geçersizleşmiş
                if (sql && sub.endpoint) {
                    try { await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`; } catch(e){}
                }
                if (jsonStore.pushSubscriptions && sub.endpoint) {
                    jsonStore.pushSubscriptions = jsonStore.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
                    saveJsonStore();
                }
            }
        }
    });
    
    await Promise.allSettled(sendPromises);
}

async function sendPushToUser(userId, payload) {
    if (!userId || !webpush) return { success: false, message: 'WebPush modülü veya kullanıcı kimliği eksik.' };
    
    let subs = [];
    const sql = getNeon();
    if (sql) {
        try {
            const rows = await sql`
                SELECT subscription, endpoint 
                FROM push_subscriptions 
                WHERE user_id = ${userId}
            `;
            subs = rows.map(r => typeof r.subscription === 'string' ? JSON.parse(r.subscription) : r.subscription);
        } catch (e) {
            console.error('Neon sendPushToUser error:', e);
        }
    }
    
    if (subs.length === 0) {
        loadJsonStore();
        if (jsonStore.pushSubscriptions) {
            subs = jsonStore.pushSubscriptions
                .filter(s => s.userId === userId)
                .map(s => s.subscription);
        }
    }
    
    if (!subs || subs.length === 0) {
        return { success: false, message: 'Bu kullanıcıya ait aktif bildirim aboneliği bulunamadı. Lütfen bildirim izni verin.' };
    }
    
    const notificationPayload = JSON.stringify({
        title: payload.title || 'YuvaPusula',
        body: payload.body || 'Test bildirimi!',
        icon: payload.icon || './icons/icon-192.png',
        badge: './icons/icon-192.png',
        url: payload.url || './index.html?tab=chat'
    });
    
    const pushOptions = {
        TTL: 86400,
        urgency: 'high',
        headers: {
            'Urgency': 'high',
            'Topic': 'test'
        }
    };
    
    let sentCount = 0;
    for (const sub of subs) {
        try {
            await webpush.sendNotification(sub, notificationPayload, pushOptions);
            sentCount++;
        } catch (err) {
            console.error('sendPushToUser error:', err.statusCode, err.message);
        }
    }
    return { success: sentCount > 0, count: sentCount, message: `${sentCount} cihaza test bildirimi iletildi.` };
}

module.exports = {
    initDatabase,
    findUserAndFamilyByPhone,
    createFamily,
    findFamilyByCode,
    addUserToFamily,
    syncFamily,
    deleteMember,
    getFullFamilyData,
    addPost,
    deletePost,
    addPlan,
    togglePlan,
    deletePlan,
    addDailyPlan,
    toggleDailyPlan,
    deleteDailyPlan,
    resetDailyPlans,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    addTask,
    toggleTask,
    deleteTask,
    addExpense,
    deleteExpense,
    setSalary,
    deleteSalary,
    addExtraIncome,
    deleteExtraIncome,
    addFixedExpense,
    updateFixedExpense,
    toggleFixedExpense,
    deleteFixedExpense,
    addInvestment,
    adjustInvestment,
    deleteInvestment,
    addMessage,
    markMessagesAsRead,
    savePushSubscription,
    sendPushToFamily,
    sendPushToUser,
    VAPID_PUBLIC_KEY
};
