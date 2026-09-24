const path = require('path');
const os = require('os');
const fs = require('fs');

const isServerless = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

let DatabaseSync = null;
if (!isServerless) {
    try {
        const sqlite = require('node:sqlite');
        DatabaseSync = sqlite.DatabaseSync;
    } catch (e) {
        // node:sqlite is not available (Node < 22)
        DatabaseSync = null;
    }
}

const DB_PATH = isServerless ? path.join(os.tmpdir(), 'database.sqlite') : path.join(__dirname, 'database.sqlite');
const JSON_DB_PATH = isServerless ? path.join(os.tmpdir(), 'database.json') : path.join(__dirname, 'database.json');

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

// Veritabanı tablolarını oluştur (SQLite DDL)
function initDatabase() {
    if (DatabaseSync && !isServerless) {
        try {
            if (!db) db = new DatabaseSync(DB_PATH);
            // 1. Aileler Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS families (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    invite_code TEXT UNIQUE NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime'))
                );
            `);

            // 2. Kullanıcılar / Aile Bireyleri Tablosu
            db.exec(`
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

            // 3. Pano / Duyurular Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tag TEXT DEFAULT 'Duyuru',
                    author TEXT,
                    author_role TEXT,
                    author_avatar TEXT,
                    created_at TEXT DEFAULT (time('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 4. Planlar Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS plans (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    travel_type TEXT,
                    travel_date TEXT,
                    travel_transport TEXT,
                    travel_budget TEXT,
                    travel_notes TEXT,
                    location TEXT,
                    dish TEXT,
                    price TEXT,
                    link TEXT,
                    event_date TEXT,
                    event_venue TEXT,
                    attendees TEXT,
                    shop_price TEXT,
                    priority TEXT,
                    shop_note TEXT,
                    completed INTEGER DEFAULT 0,
                    added_by TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 5. Alışveriş Listesi Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS shopping_items (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    quantity TEXT,
                    category TEXT,
                    completed INTEGER DEFAULT 0,
                    added_by TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 6. Görevler Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    assignee TEXT,
                    due_date TEXT,
                    completed INTEGER DEFAULT 0,
                    added_by TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 7. Bütçe ve Harcamalar Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS expenses (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT,
                    payer TEXT,
                    date TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 8. Aylık Maaşlar Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS salaries (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    user_role TEXT,
                    user_avatar TEXT,
                    amount REAL NOT NULL,
                    note TEXT,
                    pay_day INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
                    UNIQUE(family_id, user_id)
                );
            `);

            // 9. Düzenli Sabit Giderler Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS fixed_expenses (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT,
                    due_day INTEGER DEFAULT 1,
                    is_paid INTEGER DEFAULT 0,
                    payer TEXT,
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 10. Yatırımlar Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS investments (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    unit TEXT DEFAULT 'Adet',
                    current_value_tl REAL NOT NULL,
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);

            // 11. Yatırım İşlem Hareketleri Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS investment_transactions (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    investment_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    amount_delta REAL NOT NULL,
                    value_tl_delta REAL NOT NULL,
                    user_name TEXT,
                    note TEXT,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
                    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE
                );
            `);

            // 12. Mesajlar Tablosu
            db.exec(`
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    family_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    sender_name TEXT NOT NULL,
                    sender_role TEXT,
                    sender_avatar TEXT,
                    receiver_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    message_type TEXT DEFAULT 'text',
                    is_read INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
                );
            `);
            return;
        } catch (e) {
            console.warn('SQLite başlatılamadı, JSON motoruna geçiliyor:', e);
            db = null;
        }
    }
    loadJsonStore();
}

function getFullFamilyData(familyId) {
    if (db) {
        try {
            const familyRow = db.prepare('SELECT * FROM families WHERE id = ?').get(familyId);
            if (!familyRow) return null;

            const members = db.prepare('SELECT id, name, phone, role, avatar FROM users WHERE family_id = ?').all(familyId);
            const posts = db.prepare('SELECT id, title, content, tag, author, author_role as authorRole, author_avatar as authorAvatar, created_at as createdAt FROM posts WHERE family_id = ? ORDER BY id DESC').all(familyId);
            const plans = db.prepare('SELECT id, category, title, travel_type as travelType, travel_date as travelDate, travel_transport as travelTransport, travel_budget as travelBudget, travel_notes as travelNotes, location, dish, price, link, event_date as eventDate, event_venue as eventVenue, attendees, shop_price as shopPrice, priority, shop_note as shopNote, completed, added_by as addedBy, created_at as createdAt FROM plans WHERE family_id = ? ORDER BY id DESC').all(familyId).map(p => ({ ...p, completed: Boolean(p.completed) }));
            const shoppingList = db.prepare('SELECT id, title, quantity, category, completed, added_by as addedBy, created_at as createdAt FROM shopping_items WHERE family_id = ? ORDER BY id DESC').all(familyId).map(s => ({ ...s, completed: Boolean(s.completed) }));
            const tasks = db.prepare('SELECT id, title, assignee, due_date as dueDate, completed, added_by as addedBy, created_at as createdAt FROM tasks WHERE family_id = ? ORDER BY id DESC').all(familyId).map(t => ({ ...t, completed: Boolean(t.completed) }));
            const expenses = db.prepare('SELECT id, title, amount, category, payer, date, created_at as createdAt FROM expenses WHERE family_id = ? ORDER BY id DESC').all(familyId);
            const salaries = db.prepare('SELECT id, user_id as userId, user_name as userName, user_role as userRole, user_avatar as userAvatar, amount, note, pay_day as payDay FROM salaries WHERE family_id = ?').all(familyId);
            const fixedExpenses = db.prepare('SELECT id, title, amount, category, due_day as dueDay, is_paid as isPaid, payer, notes FROM fixed_expenses WHERE family_id = ?').all(familyId).map(f => ({ ...f, isPaid: Boolean(f.isPaid) }));
            const investments = db.prepare('SELECT id, title, category, amount, unit, current_value_tl as currentValueTl, notes FROM investments WHERE family_id = ?').all(familyId);
            const investmentTransactions = db.prepare('SELECT id, investment_id as investmentId, type, amount_delta as amountDelta, value_tl_delta as valueTlDelta, user_name as userName, note, created_at as createdAt FROM investment_transactions WHERE family_id = ? ORDER BY id DESC').all(familyId);
            const messages = db.prepare('SELECT id, sender_id as senderId, sender_name as senderName, sender_role as senderRole, sender_avatar as senderAvatar, receiver_id as receiverId, content, message_type as messageType, is_read as isRead, created_at as createdAt FROM messages WHERE family_id = ? ORDER BY id ASC').all(familyId);

            return {
                id: familyRow.id,
                name: familyRow.name,
                inviteCode: familyRow.invite_code,
                members,
                posts,
                plans,
                shoppingList,
                tasks,
                expenses,
                salaries,
                fixedExpenses,
                investments,
                investmentTransactions,
                messages
            };
        } catch (e) {
            console.error('SQLite getFullFamilyData hatası:', e);
        }
    }

    // JSON Fallback
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (!fam) return null;
    return fam;
}

function findUserAndFamilyByPhone(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (db) {
        try {
            const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
            if (user) {
                const family = getFullFamilyData(user.family_id);
                return { user: { id: user.id, phone: user.phone, name: user.name, role: user.role, avatar: user.avatar }, family };
            }
        } catch (e) {}
    }

    loadJsonStore();
    for (const fam of jsonStore.families) {
        const u = (fam.members || []).find(m => m.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone);
        if (u) return { user: u, family: fam };
    }
    return null;
}

function findFamilyByCode(code) {
    const cleanCode = code.trim().toUpperCase();
    if (db) {
        try {
            const row = db.prepare('SELECT id FROM families WHERE UPPER(invite_code) = ?').get(cleanCode);
            if (row) return getFullFamilyData(row.id);
        } catch (e) {}
    }

    loadJsonStore();
    return jsonStore.families.find(f => f.inviteCode && f.inviteCode.toUpperCase() === cleanCode) || null;
}

function createFamily(familyName, inviteCode, user) {
    const familyId = 'fam_' + Date.now();
    if (db) {
        try {
            db.prepare('INSERT INTO families (id, name, invite_code) VALUES (?, ?, ?)').run(familyId, familyName, inviteCode);
            db.prepare('INSERT INTO users (id, phone, name, role, avatar, family_id) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, user.phone, user.name, user.role, user.avatar, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }

    loadJsonStore();
    const newFam = {
        id: familyId,
        name: familyName,
        inviteCode,
        members: [user],
        posts: [],
        plans: [],
        shoppingList: [],
        tasks: [],
        expenses: [],
        salaries: [],
        fixedExpenses: [],
        investments: [],
        investmentTransactions: [],
        messages: []
    };
    jsonStore.families.push(newFam);
    saveJsonStore();
    return newFam;
}

function addUserToFamily(familyId, user) {
    if (db) {
        try {
            db.prepare('INSERT INTO users (id, phone, name, role, avatar, family_id) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, user.phone, user.name, user.role, user.avatar, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }

    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.members) fam.members = [];
        fam.members.push(user);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addPost(familyId, post) {
    if (db) {
        try {
            db.prepare('INSERT INTO posts (id, family_id, title, content, tag, author, author_role, author_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(post.id, familyId, post.title, post.content, post.tag, post.author, post.authorRole, post.authorAvatar, post.createdAt || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.posts) fam.posts = [];
        fam.posts.unshift(post);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deletePost(familyId, postId) {
    if (db) {
        try {
            db.prepare('DELETE FROM posts WHERE id = ? AND family_id = ?').run(postId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.posts) {
        fam.posts = fam.posts.filter(p => p.id !== postId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addPlan(familyId, plan) {
    if (db) {
        try {
            db.prepare(`
                INSERT INTO plans (id, family_id, category, title, travel_type, travel_date, travel_transport, travel_budget, travel_notes, location, dish, price, link, event_date, event_venue, attendees, shop_price, priority, shop_note, completed, added_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(plan.id, familyId, plan.category, plan.title, plan.travelType || null, plan.travelDate || null, plan.travelTransport || null, plan.travelBudget || null, plan.travelNotes || null, plan.location || null, plan.dish || null, plan.price || null, plan.link || null, plan.eventDate || null, plan.eventVenue || null, plan.attendees || null, plan.shopPrice || null, plan.priority || null, plan.shopNote || null, plan.completed ? 1 : 0, plan.addedBy || 'Aile');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.plans) fam.plans = [];
        fam.plans.unshift(plan);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function togglePlan(familyId, planId) {
    if (db) {
        try {
            const cur = db.prepare('SELECT completed FROM plans WHERE id = ? AND family_id = ?').get(planId, familyId);
            if (cur) {
                db.prepare('UPDATE plans SET completed = ? WHERE id = ? AND family_id = ?').run(cur.completed ? 0 : 1, planId, familyId);
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.plans) {
        const p = fam.plans.find(x => x.id === planId);
        if (p) p.completed = !p.completed;
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deletePlan(familyId, planId) {
    if (db) {
        try {
            db.prepare('DELETE FROM plans WHERE id = ? AND family_id = ?').run(planId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.plans) {
        fam.plans = fam.plans.filter(p => p.id !== planId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addShoppingItem(familyId, item) {
    if (db) {
        try {
            db.prepare('INSERT INTO shopping_items (id, family_id, title, quantity, category, completed, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(item.id, familyId, item.title, item.quantity, item.category, item.completed ? 1 : 0, item.addedBy || 'Aile');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.shoppingList) fam.shoppingList = [];
        fam.shoppingList.unshift(item);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function toggleShoppingItem(familyId, itemId) {
    if (db) {
        try {
            const cur = db.prepare('SELECT completed FROM shopping_items WHERE id = ? AND family_id = ?').get(itemId, familyId);
            if (cur) {
                db.prepare('UPDATE shopping_items SET completed = ? WHERE id = ? AND family_id = ?').run(cur.completed ? 0 : 1, itemId, familyId);
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.shoppingList) {
        const s = fam.shoppingList.find(x => x.id === itemId);
        if (s) s.completed = !s.completed;
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deleteShoppingItem(familyId, itemId) {
    if (db) {
        try {
            db.prepare('DELETE FROM shopping_items WHERE id = ? AND family_id = ?').run(itemId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.shoppingList) {
        fam.shoppingList = fam.shoppingList.filter(s => s.id !== itemId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addTask(familyId, task) {
    if (db) {
        try {
            db.prepare('INSERT INTO tasks (id, family_id, title, assignee, due_date, completed, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(task.id, familyId, task.title, task.assignee, task.dueDate, task.completed ? 1 : 0, task.addedBy || 'Aile');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.tasks) fam.tasks = [];
        fam.tasks.unshift(task);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function toggleTask(familyId, taskId) {
    if (db) {
        try {
            const cur = db.prepare('SELECT completed FROM tasks WHERE id = ? AND family_id = ?').get(taskId, familyId);
            if (cur) {
                db.prepare('UPDATE tasks SET completed = ? WHERE id = ? AND family_id = ?').run(cur.completed ? 0 : 1, taskId, familyId);
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.tasks) {
        const t = fam.tasks.find(x => x.id === taskId);
        if (t) t.completed = !t.completed;
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deleteTask(familyId, taskId) {
    if (db) {
        try {
            db.prepare('DELETE FROM tasks WHERE id = ? AND family_id = ?').run(taskId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.tasks) {
        fam.tasks = fam.tasks.filter(t => t.id !== taskId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addExpense(familyId, expense) {
    if (db) {
        try {
            db.prepare('INSERT INTO expenses (id, family_id, title, amount, category, payer, date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(expense.id, familyId, expense.title, expense.amount, expense.category, expense.payer, expense.date || '');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.expenses) fam.expenses = [];
        fam.expenses.unshift(expense);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deleteExpense(familyId, expenseId) {
    if (db) {
        try {
            db.prepare('DELETE FROM expenses WHERE id = ? AND family_id = ?').run(expenseId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.expenses) {
        fam.expenses = fam.expenses.filter(e => e.id !== expenseId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function setSalary(familyId, sal) {
    if (db) {
        try {
            db.prepare(`
                INSERT INTO salaries (id, family_id, user_id, user_name, user_role, user_avatar, amount, note, pay_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(family_id, user_id) DO UPDATE SET
                    user_name = excluded.user_name,
                    user_role = excluded.user_role,
                    user_avatar = excluded.user_avatar,
                    amount = excluded.amount,
                    note = excluded.note,
                    pay_day = excluded.pay_day,
                    updated_at = datetime('now', 'localtime')
            `).run(sal.id, familyId, sal.userId, sal.userName, sal.userRole || '', sal.userAvatar || '👤', sal.amount, sal.note || '', sal.payDay || 1);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.salaries) fam.salaries = [];
        const idx = fam.salaries.findIndex(s => s.userId === sal.userId);
        if (idx >= 0) fam.salaries[idx] = sal;
        else fam.salaries.push(sal);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deleteSalary(familyId, salaryId) {
    if (db) {
        try {
            db.prepare('DELETE FROM salaries WHERE id = ? AND family_id = ?').run(salaryId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.salaries) {
        fam.salaries = fam.salaries.filter(s => s.id !== salaryId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addFixedExpense(familyId, fixed) {
    if (db) {
        try {
            db.prepare(`
                INSERT INTO fixed_expenses (id, family_id, title, amount, category, due_day, is_paid, payer, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(fixed.id, familyId, fixed.title, fixed.amount, fixed.category, fixed.dueDay || 1, fixed.isPaid ? 1 : 0, fixed.payer || '', fixed.notes || '');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.fixedExpenses) fam.fixedExpenses = [];
        fam.fixedExpenses.unshift(fixed);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function toggleFixedExpense(familyId, id) {
    if (db) {
        try {
            const cur = db.prepare('SELECT is_paid FROM fixed_expenses WHERE id = ? AND family_id = ?').get(id, familyId);
            if (cur) {
                db.prepare('UPDATE fixed_expenses SET is_paid = ? WHERE id = ? AND family_id = ?').run(cur.is_paid ? 0 : 1, id, familyId);
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.fixedExpenses) {
        const f = fam.fixedExpenses.find(x => x.id === id);
        if (f) f.isPaid = !f.isPaid;
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function deleteFixedExpense(familyId, id) {
    if (db) {
        try {
            db.prepare('DELETE FROM fixed_expenses WHERE id = ? AND family_id = ?').run(id, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.fixedExpenses) {
        fam.fixedExpenses = fam.fixedExpenses.filter(f => f.id !== id);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addInvestment(familyId, inv) {
    if (db) {
        try {
            db.prepare('INSERT INTO investments (id, family_id, title, category, amount, unit, current_value_tl, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(inv.id, familyId, inv.title, inv.category, inv.amount, inv.unit || 'Adet', inv.currentValueTl, inv.notes || '');
            db.prepare('INSERT INTO investment_transactions (id, family_id, investment_id, type, amount_delta, value_tl_delta, user_name, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('tx_' + Date.now(), familyId, inv.id, 'buy', inv.amount, inv.currentValueTl, inv.userName || 'Aile', 'İlk Yatırım / Başlangıç');
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.investments) fam.investments = [];
        if (!fam.investmentTransactions) fam.investmentTransactions = [];
        fam.investments.unshift(inv);
        fam.investmentTransactions.unshift({
            id: 'tx_' + Date.now(),
            investmentId: inv.id,
            type: 'buy',
            amountDelta: inv.amount,
            valueTlDelta: inv.currentValueTl,
            userName: inv.userName || 'Aile',
            note: 'İlk Yatırım / Başlangıç',
            createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        });
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function adjustInvestment(familyId, invId, adj) {
    const type = adj.type || 'buy';
    const amountDelta = Number(adj.amountDelta) || 0;
    const valueDelta = Number(adj.valueDelta) || 0;

    if (db) {
        try {
            const inv = db.prepare('SELECT * FROM investments WHERE id = ? AND family_id = ?').get(invId, familyId);
            if (inv) {
                const newAmount = type === 'sell' ? Math.max(0, inv.amount - amountDelta) : inv.amount + amountDelta;
                const newValueTl = type === 'sell' ? Math.max(0, inv.current_value_tl - valueDelta) : inv.current_value_tl + valueDelta;
                db.prepare('UPDATE investments SET amount = ?, current_value_tl = ?, updated_at = datetime("now", "localtime") WHERE id = ? AND family_id = ?').run(newAmount, newValueTl, invId, familyId);
                db.prepare('INSERT INTO investment_transactions (id, family_id, investment_id, type, amount_delta, value_tl_delta, user_name, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('tx_' + Date.now(), familyId, invId, type, (type === 'sell' ? -amountDelta : amountDelta), (type === 'sell' ? -valueDelta : valueDelta), adj.userName || 'Aile', adj.note || '');
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }

    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.investments) {
        const inv = fam.investments.find(i => i.id === invId);
        if (inv) {
            inv.amount = type === 'sell' ? Math.max(0, inv.amount - amountDelta) : inv.amount + amountDelta;
            inv.currentValueTl = type === 'sell' ? Math.max(0, inv.currentValueTl - valueDelta) : inv.currentValueTl + valueDelta;
            if (!fam.investmentTransactions) fam.investmentTransactions = [];
            fam.investmentTransactions.unshift({
                id: 'tx_' + Date.now(),
                investmentId: invId,
                type,
                amountDelta: (type === 'sell' ? -amountDelta : amountDelta),
                valueTlDelta: (type === 'sell' ? -valueDelta : valueDelta),
                userName: adj.userName || 'Aile',
                note: adj.note || '',
                createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            });
            saveJsonStore();
        }
    }
    return getFullFamilyData(familyId);
}

function deleteInvestment(familyId, invId) {
    if (db) {
        try {
            db.prepare('DELETE FROM investment_transactions WHERE investment_id = ? AND family_id = ?').run(invId, familyId);
            db.prepare('DELETE FROM investments WHERE id = ? AND family_id = ?').run(invId, familyId);
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (fam.investments) fam.investments = fam.investments.filter(i => i.id !== invId);
        if (fam.investmentTransactions) fam.investmentTransactions = fam.investmentTransactions.filter(tx => tx.investmentId !== invId);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function addMessage(familyId, msg) {
    if (db) {
        try {
            db.prepare('INSERT INTO messages (id, family_id, sender_id, sender_name, sender_role, sender_avatar, receiver_id, content, message_type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(msg.id, familyId, msg.senderId, msg.senderName, msg.senderRole, msg.senderAvatar, msg.receiverId, msg.content, msg.messageType || 'text', 0, msg.createdAt || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam) {
        if (!fam.messages) fam.messages = [];
        fam.messages.push(msg);
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

function markMessagesAsRead(familyId, currentUserId, chatPartnerId) {
    if (db) {
        try {
            if (chatPartnerId === 'group') {
                db.prepare("UPDATE messages SET is_read = 1 WHERE family_id = ? AND receiver_id = 'group' AND sender_id != ?").run(familyId, currentUserId);
            } else {
                db.prepare("UPDATE messages SET is_read = 1 WHERE family_id = ? AND receiver_id = ? AND sender_id = ?").run(familyId, currentUserId, chatPartnerId);
            }
            return getFullFamilyData(familyId);
        } catch (e) {}
    }
    loadJsonStore();
    const fam = jsonStore.families.find(f => f.id === familyId);
    if (fam && fam.messages) {
        fam.messages.forEach(m => {
            if (chatPartnerId === 'group' && m.receiverId === 'group' && m.senderId !== currentUserId) m.isRead = 1;
            else if (m.receiverId === currentUserId && m.senderId === chatPartnerId) m.isRead = 1;
        });
        saveJsonStore();
    }
    return getFullFamilyData(familyId);
}

// Otomatik başlat
initDatabase();

module.exports = {
    db,
    initDatabase,
    getFullFamilyData,
    findUserAndFamilyByPhone,
    findFamilyByCode,
    createFamily,
    addUserToFamily,
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
