const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const DB_PATH = isServerless ? path.join(os.tmpdir(), 'database.sqlite') : path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(DB_PATH);

// Veritabanı tablolarını oluştur (SQLite DDL)
function initDatabase() {
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

    // 4. Planlar Tablosu (Seyahat, Restoran, Etkinlik, Alışveriş)
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

    // 8. Mesajlaşma Tablosu (Aile Grubu & 1-e-1 Bireysel Sohbet)
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            family_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            sender_role TEXT NOT NULL,
            sender_avatar TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
        );
    `);

    // 9. Aylık Maaşlar Tablosu (Her kullanıcı kendi maaşını girer)
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
            updated_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
            UNIQUE(family_id, user_id)
        );
    `);

    // 10. Sabit Giderler Tablosu (Kira, Fatura, Aidat, Kredi, Sigorta vb.)
    db.exec(`
        CREATE TABLE IF NOT EXISTS fixed_expenses (
            id TEXT PRIMARY KEY,
            family_id TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT DEFAULT 'Fatura',
            due_day INTEGER DEFAULT 1,
            is_paid INTEGER DEFAULT 0,
            payer TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
        );
    `);

    // 11. Yatırımlar ve Birikim Tablosu (Altın, Döviz, Borsa, Fon, BES, Kripto)
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

    // 12. Yatırım Hareketleri (Ekleme / Bozdurma Geçmişi)
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
            FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
        );
    `);
}

// Tam Aile Veri Paketini Birleştirip Döndüren Fonksiyon
function getFullFamilyData(familyId) {
    const family = db.prepare('SELECT id, name, invite_code as inviteCode FROM families WHERE id = ?').get(familyId);
    if (!family) return null;

    const members = db.prepare('SELECT id, name, phone, role, avatar FROM users WHERE family_id = ?').all(familyId);
    const posts = db.prepare('SELECT id, title, content, tag, author, author_role as authorRole, author_avatar as authorAvatar, created_at as createdAt FROM posts WHERE family_id = ? ORDER BY id DESC').all(familyId);
    const rawPlans = db.prepare('SELECT * FROM plans WHERE family_id = ? ORDER BY id DESC').all(familyId);
    
    const plans = rawPlans.map(p => ({
        id: p.id,
        category: p.category,
        title: p.title,
        travelType: p.travel_type,
        travelDate: p.travel_date,
        travelTransport: p.travel_transport,
        travelBudget: p.travel_budget,
        travelNotes: p.travel_notes,
        location: p.location,
        dish: p.dish,
        price: p.price,
        link: p.link,
        eventDate: p.event_date,
        eventVenue: p.event_venue,
        attendees: p.attendees,
        shopPrice: p.shop_price,
        priority: p.priority,
        shopNote: p.shop_note,
        completed: Boolean(p.completed),
        addedBy: p.added_by
    }));

    const rawShopping = db.prepare('SELECT * FROM shopping_items WHERE family_id = ? ORDER BY id DESC').all(familyId);
    const shoppingList = rawShopping.map(s => ({
        id: s.id,
        title: s.title,
        quantity: s.quantity,
        category: s.category,
        completed: Boolean(s.completed),
        addedBy: s.added_by
    }));

    const rawTasks = db.prepare('SELECT * FROM tasks WHERE family_id = ? ORDER BY id DESC').all(familyId);
    const tasks = rawTasks.map(t => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
        dueDate: t.due_date,
        completed: Boolean(t.completed),
        addedBy: t.added_by
    }));

    const rawExpenses = db.prepare('SELECT * FROM expenses WHERE family_id = ? ORDER BY id DESC').all(familyId);
    const expenses = rawExpenses.map(e => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        payer: e.payer,
        date: e.date
    }));

    const rawMessages = db.prepare('SELECT id, family_id as familyId, sender_id as senderId, sender_name as senderName, sender_role as senderRole, sender_avatar as senderAvatar, receiver_id as receiverId, content, message_type as messageType, is_read as isRead, created_at as createdAt FROM messages WHERE family_id = ? ORDER BY id ASC').all(familyId);
    const messages = rawMessages.map(m => ({
        id: m.id,
        familyId: m.familyId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        senderAvatar: m.senderAvatar,
        receiverId: m.receiverId,
        content: m.content,
        messageType: m.messageType,
        isRead: Boolean(m.isRead),
        createdAt: m.createdAt
    }));

    // Maaşlar
    const rawSalaries = db.prepare('SELECT id, family_id as familyId, user_id as userId, user_name as userName, user_role as userRole, user_avatar as userAvatar, amount, note, pay_day as payDay, updated_at as updatedAt FROM salaries WHERE family_id = ? ORDER BY amount DESC').all(familyId);
    const salaries = rawSalaries.map(s => ({
        id: s.id,
        familyId: s.familyId,
        userId: s.userId,
        userName: s.userName,
        userRole: s.userRole,
        userAvatar: s.userAvatar,
        amount: Number(s.amount) || 0,
        note: s.note,
        payDay: s.payDay || 1,
        updatedAt: s.updatedAt
    }));

    // Sabit Giderler
    const rawFixed = db.prepare('SELECT id, family_id as familyId, title, amount, category, due_day as dueDay, is_paid as isPaid, payer, notes, created_at as createdAt FROM fixed_expenses WHERE family_id = ? ORDER BY due_day ASC, id DESC').all(familyId);
    const fixedExpenses = rawFixed.map(f => ({
        id: f.id,
        familyId: f.familyId,
        title: f.title,
        amount: Number(f.amount) || 0,
        category: f.category || 'Fatura',
        dueDay: f.dueDay || 1,
        isPaid: Boolean(f.isPaid),
        payer: f.payer,
        notes: f.notes,
        createdAt: f.createdAt
    }));

    // Yatırımlar / Portföy
    const rawInvestments = db.prepare('SELECT id, family_id as familyId, title, category, amount, unit, current_value_tl as currentValueTl, notes, created_at as createdAt, updated_at as updatedAt FROM investments WHERE family_id = ? ORDER BY current_value_tl DESC, id DESC').all(familyId);
    const investments = rawInvestments.map(i => ({
        id: i.id,
        familyId: i.familyId,
        title: i.title,
        category: i.category,
        amount: Number(i.amount) || 0,
        unit: i.unit || 'Adet',
        currentValueTl: Number(i.currentValueTl) || 0,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
    }));

    // Yatırım Geçmiş Hareketleri
    const rawInvTx = db.prepare('SELECT id, family_id as familyId, investment_id as investmentId, type, amount_delta as amountDelta, value_tl_delta as valueTlDelta, user_name as userName, note, created_at as createdAt FROM investment_transactions WHERE family_id = ? ORDER BY id DESC LIMIT 50').all(familyId);
    const investmentTransactions = rawInvTx.map(t => ({
        id: t.id,
        familyId: t.familyId,
        investmentId: t.investmentId,
        type: t.type,
        amountDelta: Number(t.amountDelta) || 0,
        valueTlDelta: Number(t.valueTlDelta) || 0,
        userName: t.userName,
        note: t.note,
        createdAt: t.createdAt
    }));

    return {
        id: family.id,
        name: family.name,
        inviteCode: family.inviteCode,
        members: members || [],
        posts: posts || [],
        plans: plans || [],
        shoppingList: shoppingList || [],
        tasks: tasks || [],
        expenses: expenses || [],
        messages: messages || [],
        salaries: salaries || [],
        fixedExpenses: fixedExpenses || [],
        investments: investments || [],
        investmentTransactions: investmentTransactions || []
    };
}

// Telefonla Giriş Sorgusu
function findUserAndFamilyByPhone(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const user = db.prepare("SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', '') = ?").get(cleanPhone);
    if (!user) return null;

    const familyData = getFullFamilyData(user.family_id);
    return {
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar
        },
        family: familyData
    };
}

// Davet Kodu ile Aile Sorgusu
function findFamilyByCode(code) {
    const cleanCode = code.trim().toUpperCase();
    const fam = db.prepare('SELECT id FROM families WHERE UPPER(invite_code) = ?').get(cleanCode);
    if (!fam) return null;
    return getFullFamilyData(fam.id);
}

// Yeni Aile Oluşturma
function createFamily(familyName, inviteCode, user) {
    const famId = 'fam_' + Date.now();
    db.prepare('INSERT INTO families (id, name, invite_code) VALUES (?, ?, ?)').run(famId, familyName, inviteCode);
    
    // Kullanıcıyı Ekle
    db.prepare('INSERT INTO users (id, phone, name, role, avatar, family_id) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, user.phone, user.name, user.role, user.avatar, famId);

    // İlk Hoş Geldin Duyurusu
    db.prepare('INSERT INTO posts (id, family_id, title, content, tag, author, author_role, author_avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        'post_' + Date.now(),
        famId,
        'Aile Uygulamamıza Hoş Geldiniz! 🎉',
        `Merhaba sevgili ailemiz! ${familyName} olarak ortak listelerimizi, görevlerimizi ve duyurularımızı buradan kolayca yöneteceğiz.`,
        'Duyuru',
        user.name,
        user.role,
        user.avatar
    );

    return getFullFamilyData(famId);
}

// Aileye Üye Ekleme
function addUserToFamily(familyId, user) {
    db.prepare('INSERT OR REPLACE INTO users (id, phone, name, role, avatar, family_id) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, user.phone, user.name, user.role, user.avatar, familyId);
    return getFullFamilyData(familyId);
}

// İşlem Fonksiyonları (CRUD)
function addPost(familyId, post) {
    db.prepare('INSERT INTO posts (id, family_id, title, content, tag, author, author_role, author_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        post.id, familyId, post.title, post.content, post.tag || 'Duyuru', post.author, post.authorRole, post.authorAvatar, post.createdAt || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    );
    return getFullFamilyData(familyId);
}

function deletePost(familyId, postId) {
    db.prepare('DELETE FROM posts WHERE id = ? AND family_id = ?').run(postId, familyId);
    return getFullFamilyData(familyId);
}

function addPlan(familyId, plan) {
    db.prepare(`
        INSERT INTO plans (id, family_id, category, title, travel_type, travel_date, travel_transport, travel_budget, travel_notes, location, dish, price, link, event_date, event_venue, attendees, shop_price, priority, shop_note, completed, added_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        plan.id, familyId, plan.category, plan.title, plan.travelType || null, plan.travelDate || null, plan.travelTransport || null, plan.travelBudget || null, plan.travelNotes || null, plan.location || null, plan.dish || null, plan.price || null, plan.link || null, plan.eventDate || null, plan.eventVenue || null, plan.attendees || null, plan.shopPrice || null, plan.priority || null, plan.shopNote || null, plan.completed ? 1 : 0, plan.addedBy
    );
    return getFullFamilyData(familyId);
}

function togglePlan(familyId, planId) {
    const cur = db.prepare('SELECT completed FROM plans WHERE id = ? AND family_id = ?').get(planId, familyId);
    if (cur) {
        const next = cur.completed ? 0 : 1;
        db.prepare('UPDATE plans SET completed = ? WHERE id = ? AND family_id = ?').run(next, planId, familyId);
    }
    return getFullFamilyData(familyId);
}

function deletePlan(familyId, planId) {
    db.prepare('DELETE FROM plans WHERE id = ? AND family_id = ?').run(planId, familyId);
    return getFullFamilyData(familyId);
}

function addShoppingItem(familyId, item) {
    db.prepare('INSERT INTO shopping_items (id, family_id, title, quantity, category, completed, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        item.id, familyId, item.title, item.quantity, item.category, item.completed ? 1 : 0, item.addedBy
    );
    return getFullFamilyData(familyId);
}

function toggleShoppingItem(familyId, itemId) {
    const cur = db.prepare('SELECT completed FROM shopping_items WHERE id = ? AND family_id = ?').get(itemId, familyId);
    if (cur) {
        const next = cur.completed ? 0 : 1;
        db.prepare('UPDATE shopping_items SET completed = ? WHERE id = ? AND family_id = ?').run(next, itemId, familyId);
    }
    return getFullFamilyData(familyId);
}

function deleteShoppingItem(familyId, itemId) {
    db.prepare('DELETE FROM shopping_items WHERE id = ? AND family_id = ?').run(itemId, familyId);
    return getFullFamilyData(familyId);
}

function addTask(familyId, task) {
    db.prepare('INSERT INTO tasks (id, family_id, title, assignee, due_date, completed, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        task.id, familyId, task.title, task.assignee, task.dueDate, task.completed ? 1 : 0, task.addedBy
    );
    return getFullFamilyData(familyId);
}

function toggleTask(familyId, taskId) {
    const cur = db.prepare('SELECT completed FROM tasks WHERE id = ? AND family_id = ?').get(taskId, familyId);
    if (cur) {
        const next = cur.completed ? 0 : 1;
        db.prepare('UPDATE tasks SET completed = ? WHERE id = ? AND family_id = ?').run(next, taskId, familyId);
    }
    return getFullFamilyData(familyId);
}

function deleteTask(familyId, taskId) {
    db.prepare('DELETE FROM tasks WHERE id = ? AND family_id = ?').run(taskId, familyId);
    return getFullFamilyData(familyId);
}

function addExpense(familyId, expense) {
    db.prepare('INSERT INTO expenses (id, family_id, title, amount, category, payer, date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        expense.id, familyId, expense.title, expense.amount, expense.category, expense.payer, expense.date
    );
    return getFullFamilyData(familyId);
}

function deleteExpense(familyId, expenseId) {
    db.prepare('DELETE FROM expenses WHERE id = ? AND family_id = ?').run(expenseId, familyId);
    return getFullFamilyData(familyId);
}

// Maaş İşlemleri
function setSalary(familyId, salary) {
    const id = salary.id || 'sal_' + Date.now();
    db.prepare(`
        INSERT INTO salaries (id, family_id, user_id, user_name, user_role, user_avatar, amount, note, pay_day, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(family_id, user_id) DO UPDATE SET
            amount = excluded.amount,
            note = excluded.note,
            pay_day = excluded.pay_day,
            user_name = excluded.user_name,
            user_role = excluded.user_role,
            user_avatar = excluded.user_avatar,
            updated_at = datetime('now', 'localtime')
    `).run(
        id, familyId, salary.userId, salary.userName, salary.userRole || '', salary.userAvatar || '👤', salary.amount, salary.note || '', salary.payDay || 1
    );
    return getFullFamilyData(familyId);
}

function deleteSalary(familyId, salaryId) {
    db.prepare('DELETE FROM salaries WHERE id = ? AND family_id = ?').run(salaryId, familyId);
    return getFullFamilyData(familyId);
}

// Sabit Gider İşlemleri
function addFixedExpense(familyId, fixed) {
    db.prepare(`
        INSERT INTO fixed_expenses (id, family_id, title, amount, category, due_day, is_paid, payer, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        fixed.id, familyId, fixed.title, fixed.amount, fixed.category || 'Fatura', fixed.dueDay || 1, fixed.isPaid ? 1 : 0, fixed.payer || '', fixed.notes || ''
    );
    return getFullFamilyData(familyId);
}

function toggleFixedExpense(familyId, id) {
    const cur = db.prepare('SELECT is_paid FROM fixed_expenses WHERE id = ? AND family_id = ?').get(id, familyId);
    if (cur) {
        const next = cur.is_paid ? 0 : 1;
        db.prepare('UPDATE fixed_expenses SET is_paid = ? WHERE id = ? AND family_id = ?').run(next, id, familyId);
    }
    return getFullFamilyData(familyId);
}

function deleteFixedExpense(familyId, id) {
    db.prepare('DELETE FROM fixed_expenses WHERE id = ? AND family_id = ?').run(id, familyId);
    return getFullFamilyData(familyId);
}

// Yatırım & Birikim İşlemleri
function addInvestment(familyId, inv) {
    db.prepare(`
        INSERT INTO investments (id, family_id, title, category, amount, unit, current_value_tl, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        inv.id, familyId, inv.title, inv.category, inv.amount, inv.unit || 'Adet', inv.currentValueTl, inv.notes || ''
    );
    // İlk alış transaction'ı kaydet
    db.prepare(`
        INSERT INTO investment_transactions (id, family_id, investment_id, type, amount_delta, value_tl_delta, user_name, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        'tx_' + Date.now(), familyId, inv.id, 'buy', inv.amount, inv.currentValueTl, inv.userName || 'Aile', 'İlk Yatırım / Başlangıç'
    );
    return getFullFamilyData(familyId);
}

function adjustInvestment(familyId, invId, adj) {
    const inv = db.prepare('SELECT * FROM investments WHERE id = ? AND family_id = ?').get(invId, familyId);
    if (!inv) return getFullFamilyData(familyId);

    const type = adj.type || 'buy'; // 'buy' (ekleme/satın alma) or 'sell' (bozdurma/satış)
    const amountDelta = Number(adj.amountDelta) || 0;
    const valueDelta = Number(adj.valueDelta) || 0;

    const newAmount = type === 'sell' ? Math.max(0, inv.amount - amountDelta) : inv.amount + amountDelta;
    const newValueTl = type === 'sell' ? Math.max(0, inv.current_value_tl - valueDelta) : inv.current_value_tl + valueDelta;

    db.prepare(`
        UPDATE investments 
        SET amount = ?, current_value_tl = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ? AND family_id = ?
    `).run(newAmount, newValueTl, invId, familyId);

    db.prepare(`
        INSERT INTO investment_transactions (id, family_id, investment_id, type, amount_delta, value_tl_delta, user_name, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        'tx_' + Date.now(), familyId, invId, type, (type === 'sell' ? -amountDelta : amountDelta), (type === 'sell' ? -valueDelta : valueDelta), adj.userName || 'Aile', adj.note || ''
    );

    return getFullFamilyData(familyId);
}

function deleteInvestment(familyId, invId) {
    db.prepare('DELETE FROM investment_transactions WHERE investment_id = ? AND family_id = ?').run(invId, familyId);
    db.prepare('DELETE FROM investments WHERE id = ? AND family_id = ?').run(invId, familyId);
    return getFullFamilyData(familyId);
}

// Mesajlaşma İşlemleri
function addMessage(familyId, msg) {
    db.prepare(`
        INSERT INTO messages (id, family_id, sender_id, sender_name, sender_role, sender_avatar, receiver_id, content, message_type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        msg.id,
        familyId,
        msg.senderId,
        msg.senderName,
        msg.senderRole,
        msg.senderAvatar,
        msg.receiverId,
        msg.content,
        msg.messageType || 'text',
        0,
        msg.createdAt || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    );
    return getFullFamilyData(familyId);
}

function markMessagesAsRead(familyId, currentUserId, chatPartnerId) {
    if (chatPartnerId === 'group') {
        db.prepare("UPDATE messages SET is_read = 1 WHERE family_id = ? AND receiver_id = 'group' AND sender_id != ?").run(familyId, currentUserId);
    } else {
        db.prepare("UPDATE messages SET is_read = 1 WHERE family_id = ? AND receiver_id = ? AND sender_id = ?").run(familyId, currentUserId, chatPartnerId);
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
