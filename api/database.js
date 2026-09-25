const path = require('path');
const os = require('os');
const fs = require('fs');

let neonClient = null;
function getNeon() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
    if (!dbUrl) return null;
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

// 1. Kullanıcı ve Aile Bul (Giriş Yap)
async function findUserAndFamilyByPhone(phone) {
    const sql = getNeon();
    if (sql) {
        try {
            const users = await sql`SELECT * FROM users WHERE phone = ${phone} LIMIT 1`;
            if (!users || users.length === 0) return null;
            const u = users[0];
            const families = await sql`SELECT data FROM families WHERE id = ${u.family_id} LIMIT 1`;
            if (!families || families.length === 0) return null;
            return {
                user: { id: u.id, phone: u.phone, name: u.name, role: u.role, avatar: u.avatar },
                family: families[0].data
            };
        } catch (e) {
            console.error('Neon findUser error:', e);
        }
    }

    loadJsonStore();
    const user = jsonStore.users.find(u => u.phone === phone);
    if (!user) return null;
    const family = await getFullFamilyData(user.family_id);
    return { user, family };
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
        shopping: [],
        tasks: [],
        expenses: [],
        salaries: [],
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
async function addUserToFamily(familyId, user) {
    const sql = getNeon();
    if (sql) {
        try {
            const res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (res && res.length > 0) {
                const family = res[0].data;
                if (!family.members) family.members = [];
                const idx = family.members.findIndex(m => m.phone === user.phone);
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
    const family = jsonStore.families.find(f => f.id === familyId);
    if (family) {
        if (!family.members) family.members = [];
        const idx = family.members.findIndex(m => m.phone === user.phone);
        if (idx >= 0) family.members[idx] = user;
        else family.members.push(user);
        
        const uIdx = jsonStore.users.findIndex(u => u.phone === user.phone);
        if (uIdx >= 0) jsonStore.users[uIdx] = { ...user, family_id: familyId };
        else jsonStore.users.push({ ...user, family_id: familyId });
        saveJsonStore();
        return family;
    }
    return null;
}

// 5. Güncel Aile Verilerini Getir
async function getFullFamilyData(familyId) {
    const sql = getNeon();
    if (sql) {
        try {
            const res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (res && res.length > 0) return res[0].data;
            return null;
        } catch (e) {
            console.error('Neon getFullFamilyData error:', e);
        }
    }

    loadJsonStore();
    return jsonStore.families.find(f => f.id === familyId) || null;
}

// Ortak Aile Güncelleme Yardımcısı
async function updateFamilyHelper(familyId, mutator) {
    const sql = getNeon();
    if (sql) {
        try {
            const res = await sql`SELECT data FROM families WHERE id = ${familyId} LIMIT 1`;
            if (res && res.length > 0) {
                let family = res[0].data;
                family = mutator(family);
                await sql`UPDATE families SET data = ${JSON.stringify(family)}, updated_at = NOW() WHERE id = ${familyId}`;
                return family;
            }
        } catch (e) {
            console.error('Neon updateFamily error:', e);
        }
    }

    loadJsonStore();
    const family = jsonStore.families.find(f => f.id === familyId);
    if (family) {
        const updated = mutator(family);
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
            status: plan.status || 'PENDING',
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
            item.status = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
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

// Alışveriş Listesi
async function addShoppingItem(familyId, item) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shopping) fam.shopping = [];
        fam.shopping.unshift({
            id: 'shop_' + Date.now(),
            ...item,
            completed: false,
            createdAt: new Date().toISOString()
        });
        return fam;
    });
}

async function toggleShoppingItem(familyId, itemId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shopping) fam.shopping = [];
        const item = fam.shopping.find(s => s.id === itemId);
        if (item) {
            item.completed = !item.completed;
        }
        return fam;
    });
}

async function deleteShoppingItem(familyId, itemId) {
    return await updateFamilyHelper(familyId, (fam) => {
        if (!fam.shopping) fam.shopping = [];
        fam.shopping = fam.shopping.filter(s => s.id !== itemId);
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
        fam.expenses.unshift({
            id: 'exp_' + Date.now(),
            ...expense,
            amount: parseFloat(expense.amount) || 0,
            date: expense.date || new Date().toISOString().split('T')[0]
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

module.exports = {
    initDatabase,
    findUserAndFamilyByPhone,
    createFamily,
    findFamilyByCode,
    addUserToFamily,
    getFullFamilyData,
    addPost,
    deletePost,
    addPlan,
    togglePlan,
    deletePlan,
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
    addFixedExpense,
    toggleFixedExpense,
    deleteFixedExpense,
    addInvestment,
    adjustInvestment,
    deleteInvestment,
    addMessage,
    markMessagesAsRead
};
