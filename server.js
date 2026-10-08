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

// SSE Canlı Bildirim ve Mesaj Dağıtım Yöneticisi
const sseFamilyClients = new Map(); // familyId -> Set of res

function broadcastToFamilyLive(familyId, eventType, data) {
    if (!familyId) return;
    const clientSet = sseFamilyClients.get(familyId);
    if (!clientSet || clientSet.size === 0) return;
    const payloadStr = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clientSet) {
        try {
            res.write(payloadStr);
        } catch (e) {
            clientSet.delete(res);
        }
    }
}

async function appHandler(req, res) {
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
            // 0. Canlı SSE Akışı (Anlık Mesaj & Bildirim)
            if (pathname === '/api/stream' && req.method === 'GET') {
                const params = new URLSearchParams(urlParts[1] || '');
                const familyId = params.get('familyId');
                if (!familyId) {
                    return sendJson(res, 400, { error: 'familyId zorunludur.' });
                }

                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });
                res.write('retry: 2000\n\n');
                res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

                if (!sseFamilyClients.has(familyId)) {
                    sseFamilyClients.set(familyId, new Set());
                }
                const set = sseFamilyClients.get(familyId);
                set.add(res);

                req.on('close', () => {
                    set.delete(res);
                    if (set.size === 0) sseFamilyClients.delete(familyId);
                });
                return;
            }

            // 1. Giriş Yap (Telefon No veya İsim + Şifre ile)
            if (pathname === '/api/auth/login' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const identifier = (body.phone || body.username || body.name || '').trim();
                const inputPassword = (body.password || '').trim();

                // 1. Önce telefon / isim ile ara
                let found = await dbManager.findUserAndFamilyByPhone(identifier);

                // Eğer telefonla bulunamadıysa, Uysal ailesi üyeleri arasında isimle ara
                if (!found) {
                    const uysalFamily = await dbManager.findFamilyByCode('UYSAL') || await dbManager.findFamilyByCode('UYS123');
                    if (uysalFamily && Array.isArray(uysalFamily.members)) {
                        const targetUser = uysalFamily.members.find(m => {
                            const n = (m.name || '').toLowerCase();
                            const idLower = identifier.toLowerCase();
                            return n === idLower || n.includes(idLower) || (m.phone && m.phone === identifier);
                        });
                        if (targetUser) {
                            found = { user: targetUser, family: uysalFamily };
                        }
                    }
                }

                // Dicle ve Fırat için doğrudan eşleşme (eğer DB'de henüz yoksa bile oluşturur)
                if (!found && (identifier.toLowerCase().includes('dicle') || inputPassword.toLowerCase() === 'dicle')) {
                    const uysalFamily = await dbManager.findFamilyByCode('UYSAL') || await dbManager.findFamilyByCode('UYS123');
                    if (uysalFamily) {
                        const dicleUser = { id: 'usr_dicle', name: 'Dicle', role: 'Anne', phone: '05551112233', avatar: '👩' };
                        const updated = await dbManager.addUserToFamily(uysalFamily.id, dicleUser);
                        found = { user: dicleUser, family: updated };
                    }
                } else if (!found && (identifier.toLowerCase().includes('fırat') || identifier.toLowerCase().includes('firat') || inputPassword.toLowerCase() === 'fırat' || inputPassword.toLowerCase() === 'firat')) {
                    const uysalFamily = await dbManager.findFamilyByCode('UYSAL') || await dbManager.findFamilyByCode('UYS123');
                    if (uysalFamily) {
                        const firatUser = { id: 'usr_firat', name: 'Fırat', role: 'Baba', phone: '05552223344', avatar: '👨' };
                        const updated = await dbManager.addUserToFamily(uysalFamily.id, firatUser);
                        found = { user: firatUser, family: updated };
                    }
                }

                if (!found) {
                    return sendJson(res, 404, { success: false, message: 'Bu kullanıcı bilgisine ait kayıt bulunamadı.' });
                }

                // Şifre Doğrulama Kontrolü (Dicle: dicle, Fırat: fırat veya firat)
                const userName = typeof found.user === 'string' ? found.user : ((found.user && found.user.name) || '');
                const userNameLower = userName.toLowerCase();
                const idLower = identifier.toLowerCase();
                const pwdLower = inputPassword.toLowerCase();
                let isPasswordCorrect = false;

                if (userNameLower.includes('dicle') || idLower.includes('dicle')) {
                    isPasswordCorrect = (pwdLower === 'dicle');
                } else if (userNameLower.includes('fırat') || userNameLower.includes('firat') || idLower.includes('fırat') || idLower.includes('firat')) {
                    isPasswordCorrect = (pwdLower === 'fırat' || pwdLower === 'firat');
                } else if (found.user && typeof found.user === 'object' && found.user.password) {
                    isPasswordCorrect = (found.user.password.toLowerCase() === pwdLower);
                } else {
                    isPasswordCorrect = (inputPassword.length > 0);
                }

                if (!isPasswordCorrect) {
                    return sendJson(res, 401, { success: false, message: 'Hatalı şifre! Lütfen şifrenizi kontrol edin.' });
                }

                let userObj = typeof found.user === 'string'
                    ? { id: 'usr_' + Date.now(), name: found.user, phone: identifier, role: 'Birey', avatar: '👤' }
                    : { ...found.user };

                if (idLower.includes('dicle') || userNameLower.includes('dicle')) {
                    userObj = {
                        ...userObj,
                        name: (!userObj.name || userObj.name === 'TestUser') ? 'Dicle' : userObj.name,
                        role: userObj.role || 'Anne',
                        avatar: userObj.avatar || '👩'
                    };
                } else if (idLower.includes('fırat') || idLower.includes('firat') || userNameLower.includes('fırat') || userNameLower.includes('firat')) {
                    userObj = {
                        ...userObj,
                        name: (!userObj.name || userObj.name === 'TestUser') ? 'Fırat' : userObj.name,
                        role: userObj.role || 'Baba',
                        avatar: userObj.avatar || '👨'
                    };
                }

                return sendJson(res, 200, { success: true, user: userObj, family: found.family });
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

            // 3. Aileye Katıl / Yeni Birey Kaydı (Uysal Ailesi)
            if (pathname === '/api/auth/join' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                let family = null;
                if (body.inviteCode) {
                    family = await dbManager.findFamilyByCode(body.inviteCode);
                }
                if (!family) {
                    family = await dbManager.findFamilyByCode('UYSAL') || await dbManager.findFamilyByCode('UYS123');
                }
                if (!family) {
                    const fallbackUser = await dbManager.findUserAndFamilyByPhone('05550000000') || await dbManager.findUserAndFamilyByPhone('');
                    if (fallbackUser) family = fallbackUser.family;
                }
                if (!family) {
                    return sendJson(res, 404, { success: false, message: 'Uysal Ailesi veritabanı kaydı bulunamadı.' });
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
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                dbManager.sendPushToFamily(body.familyId, {
                    title: '👋 Yeni Aile Bireyi',
                    body: `${user.name} (${user.role}) aileye katıldı!`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=members'
                }, user.id).catch(e => {});
                return sendJson(res, 200, { success: true, user, family: updatedFamily });
            }

            // 3.11 Aileyi Tam Senkronize Et (İstemci Verisi ile)
            if (pathname === '/api/family/sync' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const synced = await dbManager.syncFamily(body.family);
                broadcastToFamilyLive(body.family && body.family.id, 'update', { family: synced });
                return sendJson(res, 200, { success: true, family: synced });
            }

            // 3.2 Aile Üyesi Sil / Çıkar
            if (pathname === '/api/members/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deleteMember(body.familyId, body.memberId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
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
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const authorId = body.currentUserId || (body.post ? (body.post.authorId || body.post.userId) : null);
                dbManager.sendPushToFamily(body.familyId, {
                    title: '📢 Aile Panosu Notu',
                    body: `${(body.post && body.post.title) || 'Duyuru'}: ${(body.post && body.post.content) || ''}`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=pano'
                }, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/posts/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deletePost(body.familyId, body.postId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 7. Plan İşlemleri
            if (pathname === '/api/plans/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.addPlan(body.familyId, body.plan);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const authorId = body.currentUserId || (body.plan ? (body.plan.addedById || body.plan.userId) : null);
                dbManager.sendPushToFamily(body.familyId, {
                    title: '🗺️ Yeni Aile Planı',
                    body: `${(body.plan && body.plan.title) || 'Yeni plan'}: ${body.plan && body.plan.addedBy ? body.plan.addedBy : 'Aile'} tarafından eklendi.`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=plans'
                }, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/plans/update' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.updatePlan(body.familyId, body.planId, body.plan);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const authorId = body.currentUserId || (body.plan ? (body.plan.addedById || body.plan.userId) : null);
                dbManager.sendPushToFamily(body.familyId, {
                    title: '🗺️ Aile Planı Güncellendi',
                    body: `${(body.plan && body.plan.title) || 'Plan'} bilgileri güncellendi.`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=plans'
                }, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/plans/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.togglePlan(body.familyId, body.planId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/plans/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deletePlan(body.familyId, body.planId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 7.1 Günlük Planlama İşlemleri (Her Gün Sıfırlanır)
            if (pathname === '/api/daily-plans/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.addDailyPlan(body.familyId, body.plan);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const assignedTarget = body.plan ? body.plan.assignedTo : null;
                const authorId = body.currentUserId || (body.plan ? (body.plan.addedById || body.plan.userId) : null);
                const isAll = !assignedTarget || assignedTarget === 'Tüm Aile' || assignedTarget === 'Tum Aile';
                const titleStr = isAll ? '⏰ Yeni Günlük Plan (Tüm Aile)' : `⏰ Sana Yeni Günlük Plan Eklendi (${assignedTarget})`;
                dbManager.sendPushToTarget(body.familyId, {
                    title: titleStr,
                    body: `${(body.plan && body.plan.title) || 'Yeni günlük plan'} - Saat: ${(body.plan && body.plan.time) || 'Günün Akışı'}`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=pano'
                }, assignedTarget, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/daily-plans/update' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.updateDailyPlan(body.familyId, body.planId, body.plan);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const assignedTarget = body.plan ? body.plan.assignedTo : null;
                const authorId = body.currentUserId || (body.plan ? (body.plan.addedById || body.plan.userId) : null);
                const isAll = !assignedTarget || assignedTarget === 'Tüm Aile' || assignedTarget === 'Tum Aile';
                const titleStr = isAll ? '⏰ Günlük Plan Güncellendi (Tüm Aile)' : `⏰ Günlük Planın Güncellendi (${assignedTarget})`;
                dbManager.sendPushToTarget(body.familyId, {
                    title: titleStr,
                    body: `${(body.plan && body.plan.title) || 'Günlük plan'} düzenlendi - Saat: ${(body.plan && body.plan.time) || 'Günün Akışı'}`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=pano'
                }, assignedTarget, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/daily-plans/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.toggleDailyPlan(body.familyId, body.planId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/daily-plans/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deleteDailyPlan(body.familyId, body.planId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/daily-plans/reset' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.resetDailyPlans(body.familyId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 8. Alışveriş Listesi İşlemleri
            if (pathname === '/api/shopping/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.addShoppingItem(body.familyId, body.item);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const authorId = body.currentUserId || (body.item ? (body.item.addedById || body.item.userId) : null);
                dbManager.sendPushToFamily(body.familyId, {
                    title: '🛒 Alışveriş Listesi',
                    body: `${(body.item && body.item.title) || 'Yeni ürün'} eklendi.`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=shopping'
                }, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/shopping/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.toggleShoppingItem(body.familyId, body.itemId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/shopping/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deleteShoppingItem(body.familyId, body.itemId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }

            // 9. Görev İşlemleri
            if (pathname === '/api/tasks/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.addTask(body.familyId, body.task);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                const assignedTarget = body.task ? body.task.assignee : null;
                const authorId = body.currentUserId || (body.task ? (body.task.addedById || body.task.userId) : null);
                const isAll = !assignedTarget || assignedTarget === 'Tüm Aile' || assignedTarget === 'Tum Aile';
                const titleStr = isAll ? '✅ Aile İçin Yeni Görev' : `✅ Sana Yeni Bir Görev Atandı (${assignedTarget})`;
                dbManager.sendPushToTarget(body.familyId, {
                    title: titleStr,
                    body: `${(body.task && body.task.title) || 'Yeni görev atandı.'}`,
                    icon: './icons/icon-192.png',
                    url: './index.html?tab=tasks'
                }, assignedTarget, authorId).catch(e => {});
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/tasks/toggle' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.toggleTask(body.familyId, body.taskId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/tasks/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deleteTask(body.familyId, body.taskId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/tasks/reset-week' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.resetWeeklyTasks(body.familyId);
                broadcastToFamilyLive(body.familyId, 'update', { family: updatedFamily });
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

            // 11.2 Mesai İşlemleri (Fırat ve Kullanıcı İçin Saat/Tutar - Ayın 1'inde Sıfırlanır)
            if (pathname === '/api/overtimes/add' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.addOvertime(body.familyId, body.overtime);
                return sendJson(res, 200, { success: true, family: updatedFamily });
            }
            if (pathname === '/api/overtimes/delete' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                const updatedFamily = await dbManager.deleteOvertime(body.familyId, body.overtimeId);
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
                
                // 1. Anında Canlı SSE Yayını (Açık cihazlara 0 ms gecikmeyle ulaştır)
                broadcastToFamilyLive(body.familyId, 'message', { family: updatedFamily, message: body.message });

                // 2. Arka plan Web Push Bildirimi Gönder (Yalnızca ilgili kişiye veya gruba)
                const senderName = (body.message && body.message.senderName) || 'Aile Üyesi';
                const receiverId = body.message ? (body.message.receiverId || body.message.receiver_id) : null;
                const isGroup = !receiverId || receiverId === 'group';
                const notifTitle = isGroup ? `💬 ${senderName}` : `🔒 ${senderName} (Özel Mesaj)`;
                const notifBody = (body.message && body.message.content) ? body.message.content : 'Yeni bir mesajınız var.';
                
                if (isGroup) {
                    dbManager.sendPushToFamily(body.familyId, {
                        title: notifTitle,
                        body: notifBody,
                        icon: './icons/icon-192.png',
                        url: './index.html?tab=chat'
                    }, body.message ? body.message.senderId : null).catch(err => console.error('Grup mesaj push hatası:', err));
                } else {
                    dbManager.sendPushToUser(receiverId, {
                        title: notifTitle,
                        body: notifBody,
                        icon: './icons/icon-192.png',
                        url: `./index.html?tab=chat&direct=${body.message ? body.message.senderId : ''}`
                    }).catch(err => console.error('Özel mesaj push hatası:', err));
                }

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

            // 14.3 Web Push Test Bildirimi Gönder (Kendi Cihazına)
            if (pathname === '/api/push/test' && req.method === 'POST') {
                const body = await parseJsonBody(req);
                if (body.userId) {
                    const result = await dbManager.sendPushToUser(body.userId, {
                        title: '🔔 YuvaPusula Bildirim Testi',
                        body: 'Tebrikler! Telefon bildiriminiz başarıyla çalışıyor. Uygulama kapalıyken de bildirimler gelecektir.',
                        icon: './icons/icon-192.png',
                        url: './index.html?tab=chat'
                    });
                    return sendJson(res, 200, result);
                }
                return sendJson(res, 400, { success: false, message: 'Kullanıcı kimliği (userId) belirtilmedi.' });
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
    if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '').replace(/^[\\\/]/, '');
    let filePath = path.join(BASE_DIR, 'public', safePath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(BASE_DIR, safePath);
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(BASE_DIR, 'public', 'index.html');
        if (!fs.existsSync(filePath)) {
            filePath = path.join(BASE_DIR, 'index.html');
        }
    }

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
}

const server = http.createServer(appHandler);

if (require.main === module) {
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
}

module.exports = appHandler;
