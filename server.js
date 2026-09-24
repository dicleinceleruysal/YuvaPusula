const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dbManager = require('./database.js');

// Veritabanını başlat
dbManager.initDatabase();

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

// ==========================================================
// ALTINKAYNAK CANLI KUR VE ALTIN FİYAT SERVİSİ
// ==========================================================
let cachedRates = null;
let lastRatesFetchTime = 0;
const RATES_CACHE_DURATION_MS = 25000; // 25 saniye önbellek

function parseTrNumber(str) {
    if (!str) return 0;
    const clean = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function fetchHttpsJson(url) {
    return new Promise((resolve) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
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
        }).on('error', () => resolve([]));
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
                TL: { code: 'TL', name: 'Türk Lirası (₺)', symbol: '₺', buy: 1, sell: 1 }
            }
        };
    }
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
}

// JSON İstek Gövdesini Okuma Yardımcısı
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

// JSON Yanıt Gönderme Yardımcısı
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    const urlParts = req.url.split('?');
    const pathname = urlParts[0];

    // ==========================================================
    // API ENDPOINT'LERİ (SQLITE VERİTABANI İŞLEMLERİ)
    // ==========================================================
    if (pathname.startsWith('/api/')) {
        try {
            // 1. Giriş Yap (Telefon No ile)
            if (pathname === '/api/auth/login' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const found = dbManager.findUserAndFamilyByPhone(body.phone || '');
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

                const family = dbManager.createFamily(formattedName, inviteCode, user);
                return sendJson(res, 200, { success: true, user, family });
            }

            // 3. Aileye Katıl (Davet Kodu ile)
            if (pathname === '/api/auth/join' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const family = dbManager.findFamilyByCode(body.inviteCode || '');
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

                const updatedFamily = dbManager.addUserToFamily(family.id, user);
                return sendJson(res, 200, { success: true, user, family: updatedFamily });
            }

            // 4. Güncel Aile Verilerini Getir
            if (pathname.startsWith('/api/family/') && req.method === 'GET') {
                const familyId = pathname.replace('/api/family/', '');
                const family = dbManager.getFullFamilyData(familyId);
                if (family) {
                    return sendJson(res, 200, { success: true, family });
                }
                return sendJson(res, 404, { success: false, message: 'Aile bulunamadı.' });
            }

            // 5. Pano Gönderisi Ekle / Sil
            if (pathname === '/api/posts' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addPost(body.familyId, body.post);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/posts/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deletePost(body.familyId, body.postId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 7. Plan İşlemleri
            if (pathname === '/api/plans/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addPlan(body.familyId, body.plan);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/plans/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.togglePlan(body.familyId, body.planId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/plans/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deletePlan(body.familyId, body.planId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 8. Alışveriş Listesi İşlemleri
            if (pathname === '/api/shopping/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addShoppingItem(body.familyId, body.item);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/shopping/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.toggleShoppingItem(body.familyId, body.itemId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/shopping/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteShoppingItem(body.familyId, body.itemId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 9. Görev İşlemleri
            if (pathname === '/api/tasks/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addTask(body.familyId, body.task);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/tasks/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.toggleTask(body.familyId, body.taskId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/tasks/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteTask(body.familyId, body.taskId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 10. Harcama İşlemleri
            if (pathname === '/api/expenses/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addExpense(body.familyId, body.expense);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/expenses/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteExpense(body.familyId, body.expenseId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 11. Maaş İşlemleri
            if (pathname === '/api/salaries/set' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.setSalary(body.familyId, body.salary);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/salaries/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteSalary(body.familyId, body.salaryId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 12. Sabit Gider İşlemleri
            if (pathname === '/api/fixed-expenses/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addFixedExpense(body.familyId, body.fixed);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/fixed-expenses/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.toggleFixedExpense(body.familyId, body.id);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/fixed-expenses/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteFixedExpense(body.familyId, body.id);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 13. Yatırım ve Birikim İşlemleri
            if (pathname === '/api/investments/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addInvestment(body.familyId, body.investment);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/investments/adjust' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.adjustInvestment(body.familyId, body.investmentId, body.adjustment);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/investments/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.deleteInvestment(body.familyId, body.investmentId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 14. Mesajlaşma İşlemleri (Aile Grubu & Bireysel)
            if (pathname === '/api/messages/send' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.addMessage(body.familyId, body.message);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/messages/read' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = dbManager.markMessagesAsRead(body.familyId, body.currentUserId, body.chatPartnerId);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 15. Altınkaynak Canlı Piyasa & Kur Verileri
            if (pathname === '/api/market/rates' && req.method === 'GET') {
                const forceRefresh = req.url.includes('refresh=true');
                const ratesData = await getAltinkaynakLiveRates(forceRefresh);
                return sendJson(res, 200, ratesData);
            }

            return sendJson(res, 404, { success: false, message: 'Bilinmeyen API rotası.' });
        } catch (apiErr) {
            console.error('API Hatası:', apiErr);
            return sendJson(res, 500, { success: false, error: apiErr.message });
        }
    }

    // ==========================================================
    // STATİK DOSYA SUNUCUSU (PWA)
    // ==========================================================
    let reqUrl = pathname;
    if (reqUrl === '/') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(BASE_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Sayfa veya Dosya Bulunamadı');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        const headers = {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Service-Worker-Allowed': '/',
            'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json') ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600'
        };

        res.writeHead(200, headers);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('🚀 AİLEM PWA & SQLITE VERİTABANI SUNUCUSU ÇALIŞIYOR');
    console.log('====================================================');
    console.log(`💾 Veritabanı:                  ${path.join(BASE_DIR, 'database.sqlite')}`);
    console.log(`💻 Bilgisayardan erişim:        http://localhost:${PORT}`);
    
    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`📱 Telefondan erişim (Aynı Wi-Fi): http://${ip}:${PORT}`);
        });
        console.log('----------------------------------------------------');
        console.log('✨ Tüm aile üyeleri aynı veritabanını ortaklaşa kullanır!');
    }
    console.log('====================================================');
});
