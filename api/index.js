const https = require('https');
const dbManager = require('./database.js');

// Veritabanını başlat
try {
    dbManager.initDatabase();
} catch (e) {
    console.warn('DB başlatma uyarısı:', e);
}

let cachedRates = null;
let lastRatesFetchTime = 0;
const RATES_CACHE_DURATION_MS = 25000;

function parseTrNumber(str) {
    if (!str) return 0;
    const clean = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function fetchHttpsJson(url, timeoutMs = 8000) {
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: timeoutMs
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve([]);
        });
        req.on('error', () => resolve([]));
    });
}

async function getAltinkaynakLiveRates(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedRates && (now - lastRatesFetchTime < RATES_CACHE_DURATION_MS)) {
        return cachedRates;
    }

    try {
        const [currencyList, goldList] = await Promise.all([
            fetchHttpsJson('https://static.altinkaynak.com/public/Currency'),
            fetchHttpsJson('https://static.altinkaynak.com/public/Gold')
        ]);

        const usd = (Array.isArray(currencyList) ? currencyList.find(c => c.Kod === 'USD') : null) || {};
        const eur = (Array.isArray(currencyList) ? currencyList.find(c => c.Kod === 'EUR') : null) || {};
        const gramGold = (Array.isArray(goldList) ? (goldList.find(g => g.Kod === 'GA') || goldList.find(g => g.Kod === 'HH_T') || goldList.find(g => g.Kod === 'CH_T')) : null) || {};
        const ceyrekGold = (Array.isArray(goldList) ? (goldList.find(g => g.Kod === 'PC') || goldList.find(g => g.Kod === 'EC')) : null) || {};

        const rates = {
            USD: {
                code: 'USD',
                name: 'Dolar ($)',
                symbol: '$',
                buy: parseTrNumber(usd.Alis) || 48.75,
                sell: parseTrNumber(usd.Satis) || 48.95,
                updatedAt: usd.GuncellenmeZamani || new Date().toLocaleTimeString('tr-TR')
            },
            EUR: {
                code: 'EUR',
                name: 'Euro (€)',
                symbol: '€',
                buy: parseTrNumber(eur.Alis) || 55.40,
                sell: parseTrNumber(eur.Satis) || 55.75,
                updatedAt: eur.GuncellenmeZamani || new Date().toLocaleTimeString('tr-TR')
            },
            ALTIN: {
                code: 'ALTIN',
                name: 'Gram Altın',
                symbol: 'Gr',
                buy: parseTrNumber(gramGold.Alis) || 6620,
                sell: parseTrNumber(gramGold.Satis) || 6760,
                updatedAt: gramGold.GuncellenmeZamani || new Date().toLocaleTimeString('tr-TR')
            },
            ALTIN_CEYREK: {
                code: 'ALTIN_CEYREK',
                name: 'Çeyrek Altın',
                symbol: 'Adet',
                buy: parseTrNumber(ceyrekGold.Alis) || 10650,
                sell: parseTrNumber(ceyrekGold.Satis) || 11340,
                updatedAt: ceyrekGold.GuncellenmeZamani || new Date().toLocaleTimeString('tr-TR')
            },
            CEYREK: {
                code: 'CEYREK',
                name: 'Çeyrek Altın',
                symbol: 'Adet',
                buy: parseTrNumber(ceyrekGold.Alis) || 10650,
                sell: parseTrNumber(ceyrekGold.Satis) || 11340,
                updatedAt: ceyrekGold.GuncellenmeZamani || new Date().toLocaleTimeString('tr-TR')
            },
            TL: {
                code: 'TL',
                name: 'Türk Lirası (₺)',
                symbol: '₺',
                buy: 1.0,
                sell: 1.0,
                updatedAt: new Date().toLocaleTimeString('tr-TR')
            }
        };

        cachedRates = {
            success: true,
            source: 'altinkaynak.com',
            timestamp: new Date().toISOString(),
            rates
        };
        lastRatesFetchTime = now;
        return cachedRates;
    } catch (err) {
        console.error('Altınkaynak kur çekme hatası:', err);
        if (cachedRates) return cachedRates;
        return {
            success: true,
            source: 'fallback',
            timestamp: new Date().toISOString(),
            rates: {
                USD: { code: 'USD', name: 'Dolar ($)', symbol: '$', buy: 48.75, sell: 48.95 },
                EUR: { code: 'EUR', name: 'Euro (€)', symbol: '€', buy: 55.40, sell: 55.75 },
                ALTIN: { code: 'ALTIN', name: 'Gram Altın', symbol: 'Gr', buy: 6620, sell: 6760 },
                ALTIN_CEYREK: { code: 'ALTIN_CEYREK', name: 'Çeyrek Altın', symbol: 'Adet', buy: 10650, sell: 11340 },
                CEYREK: { code: 'CEYREK', name: 'Çeyrek Altın', symbol: 'Adet', buy: 10650, sell: 11340 },
                TL: { code: 'TL', name: 'Türk Lirası (₺)', symbol: '₺', buy: 1, sell: 1 }
            }
        };
    }
}

function parseJsonBody(req) {
    if (req.body) {
        if (typeof req.body === 'object') return Promise.resolve(req.body);
        if (typeof req.body === 'string') {
            try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); }
        }
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}

function sendJson(res, statusCode, data) {
    if (res.status && typeof res.status === 'function') {
        return res.status(statusCode).json(data);
    }
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
    try {
        // Veritabanı başlatma kontrolü
        try {
            dbManager.initDatabase();
        } catch (e) {}

        // CORS Preflight
        if (req.method === 'OPTIONS') {
            if (res.status && typeof res.status === 'function') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                return res.status(204).end();
            }
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end();
            return;
        }

        // Pathname çözümleme (Vercel Serverless, Standalone & Rewrite desteği)
        let rawUrl = req.url || '';
        let pathname = rawUrl.split('?')[0];

        if (req.query && req.query.all) {
            const allPath = Array.isArray(req.query.all) ? req.query.all.join('/') : req.query.all;
            pathname = '/api/' + allPath;
        } else if (pathname === '/' || pathname === '/api' || pathname === '/api/' || pathname === '/api/index.js' || pathname === '/api/index') {
            if (req.headers && req.headers['x-matched-path'] && req.headers['x-matched-path'].startsWith('/api') && !req.headers['x-matched-path'].endsWith('/index.js') && !req.headers['x-matched-path'].endsWith('/index')) {
                pathname = req.headers['x-matched-path'];
            }
        }

        if (!pathname.startsWith('/api')) {
            pathname = '/api' + (pathname.startsWith('/') ? pathname : '/' + pathname);
        }

        // 1. Giriş Yap (Telefon No ile)
        if (pathname === '/api/auth/login' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const found = await dbManager.findUserAndFamilyByPhone(body.phone || '');
            if (found) {
                return sendJson(res, 200, { success: true, user: found.user, family: found.family });
            } else {
                return sendJson(res, 404, { success: false, message: 'Bu telefon numarasına ait kayıt bulunamadı.' });
            }
        }

        // 2. Yeni Aile Kur
        if (pathname === '/api/auth/create' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const rawFamilyName = (body.familyName || 'Bizim').trim();
            const formattedName = rawFamilyName.toLowerCase().includes('aile') ? rawFamilyName : `${rawFamilyName} Ailesi`;
            const inviteCode = (rawFamilyName.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)).replace(/[^A-Z0-9]/g, 'AIL');
            
            const user = {
                id: 'usr_' + Date.now(),
                phone: body.phone,
                name: body.name,
                role: body.role,
                avatar: body.avatar || '👤'
            };

            const family = await dbManager.createFamily(formattedName, inviteCode, user);
            return sendJson(res, 200, { success: true, user, family });
        }

        // 3. Aileye Katıl (Davet Kodu ile)
        if (pathname === '/api/auth/join' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const family = await dbManager.findFamilyByCode(body.inviteCode || '');
            if (!family) {
                return sendJson(res, 404, { success: false, message: 'Geçersiz davet kodu.' });
            }

            const user = {
                id: 'usr_' + Date.now(),
                phone: body.phone,
                name: body.name,
                role: body.role,
                avatar: body.avatar || '👤'
            };

            const updatedFamily = await dbManager.addUserToFamily(family.id, user);
            return sendJson(res, 200, { success: true, user, family: updatedFamily });
        }

        // 3.1 Aile Üyesi Ekle (Hesap İçinden)
        if (pathname === '/api/members/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const user = {
                id: (body.user && body.user.id) || ('usr_' + Date.now()),
                phone: body.user ? body.user.phone : '',
                name: body.user ? body.user.name : 'Yeni Üye',
                role: body.user ? body.user.role : 'Birey',
                avatar: (body.user && body.user.avatar) || '👤'
            };
            const updatedFamily = await dbManager.addUserToFamily(body.familyId, user, body.familyData || null);
            return sendJson(res, 200, { success: true, user, family: updatedFamily });
        }

        // 3.11 Aileyi Tam Senkronize Et (İstemci Verisi ile)
        if (pathname === '/api/family/sync' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const synced = await dbManager.syncFamily(body.family);
            return sendJson(res, 200, { success: true, family: synced });
        }

        // 3.2 Aile Üyesi Sil / Çıkar
        if (pathname === '/api/members/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteMember(body.familyId, body.memberId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 4. Güncel Aile Verilerini Getir
        if (pathname.startsWith('/api/family/') && req.method === 'GET') {
            const familyId = pathname.replace('/api/family/', '');
            const family = await dbManager.getFullFamilyData(familyId);
            if (family) {
                return sendJson(res, 200, { success: true, family });
            }
            return sendJson(res, 404, { success: false, message: 'Aile bulunamadı.' });
        }

        // 5. Pano Gönderisi Ekle / Sil
        if (pathname === '/api/posts' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addPost(body.familyId, body.post);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/posts/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deletePost(body.familyId, body.postId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 7. Plan İşlemleri
        if (pathname === '/api/plans/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addPlan(body.familyId, body.plan);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/plans/toggle' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.togglePlan(body.familyId, body.planId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/plans/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deletePlan(body.familyId, body.planId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 8. Alışveriş Listesi İşlemleri
        if (pathname === '/api/shopping/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addShoppingItem(body.familyId, body.item);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/shopping/toggle' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.toggleShoppingItem(body.familyId, body.itemId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/shopping/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteShoppingItem(body.familyId, body.itemId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 9. Görev İşlemleri
        if (pathname === '/api/tasks/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addTask(body.familyId, body.task);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/tasks/toggle' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.toggleTask(body.familyId, body.taskId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/tasks/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteTask(body.familyId, body.taskId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 10. Harcama İşlemleri
        if (pathname === '/api/expenses/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addExpense(body.familyId, body.expense);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/expenses/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteExpense(body.familyId, body.expenseId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 11. Maaş İşlemleri
        if (pathname === '/api/salaries/set' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.setSalary(body.familyId, body.salary);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/salaries/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteSalary(body.familyId, body.salaryId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 11.1 Ek Gelir İşlemleri (Prim, İkramiye, Kira vb.)
        if (pathname === '/api/extra-incomes/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addExtraIncome(body.familyId, body.income);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/extra-incomes/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteExtraIncome(body.familyId, body.incomeId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 12. Sabit Gider İşlemleri
        if (pathname === '/api/fixed-expenses/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addFixedExpense(body.familyId, body.fixed);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/fixed-expenses/update' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.updateFixedExpense(body.familyId, body.id, body.fixed);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/fixed-expenses/toggle' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.toggleFixedExpense(body.familyId, body.id);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/fixed-expenses/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteFixedExpense(body.familyId, body.id);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 13. Yatırım ve Birikim İşlemleri
        if (pathname === '/api/investments/add' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addInvestment(body.familyId, body.investment);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/investments/adjust' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.adjustInvestment(body.familyId, body.investmentId, body.adjustment);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/investments/delete' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.deleteInvestment(body.familyId, body.investmentId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 14. Mesajlaşma İşlemleri (Aile Grubu & Bireysel)
        if (pathname === '/api/messages/send' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.addMessage(body.familyId, body.message);
            
            // Arka plan Web Push Bildirimi Gönder (Uygulama kapalıyken de gelsin)
            const senderName = (body.message && body.message.senderName) || 'Aile Üyesi';
            const isGroup = !body.message.receiverId || body.message.receiverId === 'group';
            const notifTitle = isGroup ? `💬 ${senderName}` : `🔒 ${senderName} (Özel Mesaj)`;
            const notifBody = (body.message && body.message.content) ? body.message.content : 'Yeni bir mesajınız var.';
            
            dbManager.sendPushToFamily(body.familyId, {
                title: notifTitle,
                body: notifBody,
                icon: './icons/icon-192.png',
                url: './index.html?tab=chat'
            }, body.message ? body.message.senderId : null).catch(err => console.error('Push bildirim hatası:', err));

            return sendJson(res, 200, { success: true, family: updatedFamily });
        }
        if (pathname === '/api/messages/read' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            const updatedFamily = await dbManager.markMessagesAsRead(body.familyId, body.currentUserId, body.chatPartnerId);
            return sendJson(res, 200, { success: true, family: updatedFamily });
        }

        // 14.1 Web Push Abonelik Kaydı
        if (pathname === '/api/push/subscribe' && req.method === 'POST') {
            const body = await parseJsonBody(req);
            if (body.familyId && body.userId && body.subscription) {
                await dbManager.savePushSubscription(body.familyId, body.userId, body.subscription);
                return sendJson(res, 200, { success: true, message: 'Web push aboneliği kaydedildi.' });
            }
            return sendJson(res, 400, { success: false, message: 'Eksik abonelik parametreleri.' });
        }

        // 14.2 VAPID Genel Anahtarını Getir
        if (pathname === '/api/push/vapid-key' && req.method === 'GET') {
            return sendJson(res, 200, { publicKey: dbManager.VAPID_PUBLIC_KEY });
        }

        // 15. Altınkaynak Canlı Piyasa & Kur Verileri
        if (pathname === '/api/market/rates' && req.method === 'GET') {
            const forceRefresh = (req.url || '').includes('refresh=true');
            const ratesData = await getAltinkaynakLiveRates(forceRefresh);
            return sendJson(res, 200, ratesData);
        }

        return sendJson(res, 404, { success: false, message: 'Bilinmeyen API rotası: ' + pathname });
    } catch (apiErr) {
        console.error('API Hatası:', apiErr);
        return sendJson(res, 500, { success: false, error: apiErr.message });
    }
};
