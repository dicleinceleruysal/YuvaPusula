/**
 * AİLEM PWA - Uygulama Mantığı ve Durum Yönetimi (app.js)
 */

// Rol bazlı avatar emojileri
const ROLE_AVATARS = {
    'Baba': '👨',
    'Anne': '👩',
    'Oğul': '👦',
    'Kız': '👧',
    'Dede': '👴',
    'Büyükanne': '👵',
    'Diğer': '🌟'
};

const EXPENSE_ICONS = {
    'Mutfak': '🛒',
    'Fatura': '⚡',
    'Kira': '🏠',
    'Eğitim': '🎒',
    'Sağlık': '💊',
    'Eğlence': '🍿',
    'Diğer': '📦'
};

const SHOPPING_ICONS = {
    'Market': '🥛',
    'Manav': '🍏',
    'Kasap': '🥩',
    'Giyim': '👗',
    'Eşya': '🛋️',
    'Çocuk': '🧸',
    'Kozmetik': '💄',
    'Eczane': '💊',
    'Ev': '🧼',
    'Diğer': '📦'
};

// Global Uygulama Durumu (State)
let appState = {
    currentUser: null,
    familyData: null,
    currentTab: 'tabPano',
    activeBudgetSubTab: 'expenses', // 'expenses', 'fixed', 'investments'
    fixedStatusFilter: 'ALL',       // 'ALL', 'UNPAID', 'PAID'
    currentAdjustType: 'buy',       // 'buy', 'sell'
    currentAdjustInvestmentId: null,
    marketRates: null,              // Altınkaynak canlı kurları
    lastMarketRatesFetch: 0,
    chatChannel: 'group', // 'group' veya 'direct'
    chatTargetMemberId: null,
    notificationsEnabled: false,
    activePlanHub: 'Seyahat',
    plansSubFilter: 'ALL',
    plansStatusFilter: 'ALL',
    shoppingFilter: 'ALL',
    taskFilter: 'ALL',
    deferredPrompt: null
};

// ==========================================================
// 0. VERİTABANI MOTORU (INDEXEDDB & LOCALSTORAGE DUAL-SYNC)
// ==========================================================
const AilemDB = {
    dbName: 'AilemFamilyDB',
    version: 1,
    db: null,

    // IndexedDB Başlatma
    async init() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB desteklenmiyor, LocalStorage kullanılacak.');
                this.initFallbackSeed();
                resolve(false);
                return;
            }

            const request = window.indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('families')) {
                    const famStore = db.createObjectStore('families', { keyPath: 'id' });
                    famStore.createIndex('inviteCode', 'inviteCode', { unique: false });
                }
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'phone' });
                    userStore.createIndex('id', 'id', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(true);
            };

            request.onerror = (event) => {
                console.warn('IndexedDB erişim hatası, LocalStorage aktif:', event.target.error);
                resolve(false);
            };
        });
    },

    // Aile Kaydetme (IndexedDB + LocalStorage)
    async saveFamily(family) {
        if (!family || !family.id) return;

        // LocalStorage Yedekleme
        try {
            let families = JSON.parse(localStorage.getItem('ailem_db_families') || '[]');
            const idx = families.findIndex(f => f.id === family.id);
            if (idx >= 0) {
                families[idx] = family;
            } else {
                families.push(family);
            }
            localStorage.setItem('ailem_db_families', JSON.stringify(families));
        } catch (e) {
            console.error('LocalStorage saveFamily hatası:', e);
        }

        // IndexedDB Kaydı
        if (!this.db) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('families', 'readwrite');
                const store = tx.objectStore('families');
                store.put(family);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    },

    // Kullanıcı Kaydetme
    async saveUser(user) {
        if (!user || !user.phone) return;

        // LocalStorage
        try {
            let users = JSON.parse(localStorage.getItem('ailem_db_users') || '[]');
            const idx = users.findIndex(u => u.phone === user.phone);
            if (idx >= 0) {
                users[idx] = user;
            } else {
                users.push(user);
            }
            localStorage.setItem('ailem_db_users', JSON.stringify(users));
        } catch (e) {
            console.error('LocalStorage saveUser hatası:', e);
        }

        // IndexedDB
        if (!this.db) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('users', 'readwrite');
                const store = tx.objectStore('users');
                store.put(user);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    },

    // Tüm Aileleri Getir
    async getAllFamilies() {
        if (this.db) {
            try {
                return await new Promise((resolve) => {
                    const tx = this.db.transaction('families', 'readonly');
                    const store = tx.objectStore('families');
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
            } catch (e) {
                // fallback
            }
        }
        try {
            return JSON.parse(localStorage.getItem('ailem_db_families') || '[]');
        } catch (e) {
            return [];
        }
    },

    // Telefon Numarası ile Aile ve Kullanıcı Bul
    async findByPhone(phone) {
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        const allFamilies = await this.getAllFamilies();
        
        for (const fam of allFamilies) {
            if (fam && fam.members) {
                const member = fam.members.find(m => m.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone);
                if (member) {
                    return { family: fam, user: member };
                }
            }
        }
        return null;
    },

    // Davet Kodu ile Aile Bul
    async findByCode(code) {
        const cleanCode = code.trim().toUpperCase();
        const allFamilies = await this.getAllFamilies();
        return allFamilies.find(f => f.inviteCode && f.inviteCode.toUpperCase() === cleanCode) || null;
    }
};

// ==========================================================
// 0. REST API & SQLITE SUNUCU BAĞLANTISI (AilemAPI)
// ==========================================================
const AilemAPI = {
    async login(phone) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('API login hatası, çevrimdışı mod:', e);
        }
        return null;
    },

    async createFamily(familyName, phone, name, role, avatar) {
        try {
            const res = await fetch('/api/auth/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyName, phone, name, role, avatar })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('API createFamily hatası:', e);
        }
        return null;
    },

    async joinFamily(inviteCode, phone, name, role, avatar) {
        try {
            const res = await fetch('/api/auth/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode, phone, name, role, avatar })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('API joinFamily hatası:', e);
        }
        return null;
    },

    async fetchFamily(familyId) {
        try {
            const res = await fetch(`/api/family/${familyId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.family) return data.family;
            }
        } catch (e) {}
        return null;
    },

    async addPost(familyId, post) {
        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, post })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deletePost(familyId, postId) {
        try {
            const res = await fetch('/api/posts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, postId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async addPlan(familyId, plan) {
        try {
            const res = await fetch('/api/plans/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, plan })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async togglePlan(familyId, planId) {
        try {
            const res = await fetch('/api/plans/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deletePlan(familyId, planId) {
        try {
            const res = await fetch('/api/plans/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async addShoppingItem(familyId, item) {
        try {
            const res = await fetch('/api/shopping/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, item })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async toggleShoppingItem(familyId, itemId) {
        try {
            const res = await fetch('/api/shopping/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, itemId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteShoppingItem(familyId, itemId) {
        try {
            const res = await fetch('/api/shopping/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, itemId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async addTask(familyId, task) {
        try {
            const res = await fetch('/api/tasks/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, task })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async toggleTask(familyId, taskId) {
        try {
            const res = await fetch('/api/tasks/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, taskId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteTask(familyId, taskId) {
        try {
            const res = await fetch('/api/tasks/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, taskId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async addExpense(familyId, expense) {
        try {
            const res = await fetch('/api/expenses/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, expense })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteExpense(familyId, expenseId) {
        try {
            const res = await fetch('/api/expenses/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, expenseId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    // Maaş İşlemleri
    async setSalary(familyId, salary) {
        try {
            const res = await fetch('/api/salaries/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, salary })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteSalary(familyId, salaryId) {
        try {
            const res = await fetch('/api/salaries/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, salaryId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    // Sabit Gider İşlemleri
    async addFixedExpense(familyId, fixed) {
        try {
            const res = await fetch('/api/fixed-expenses/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, fixed })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async toggleFixedExpense(familyId, id) {
        try {
            const res = await fetch('/api/fixed-expenses/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, id })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteFixedExpense(familyId, id) {
        try {
            const res = await fetch('/api/fixed-expenses/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, id })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    // Yatırım ve Portföy İşlemleri
    async addInvestment(familyId, investment) {
        try {
            const res = await fetch('/api/investments/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, investment })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async adjustInvestment(familyId, investmentId, adjustment) {
        try {
            const res = await fetch('/api/investments/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, investmentId, adjustment })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteInvestment(familyId, investmentId) {
        try {
            const res = await fetch('/api/investments/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, investmentId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async sendMessage(familyId, message) {
        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, message })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async markMessagesAsRead(familyId, currentUserId, chatPartnerId) {
        try {
            const res = await fetch('/api/messages/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, currentUserId, chatPartnerId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    // Altınkaynak Canlı Döviz ve Altın Kurları
    async getMarketRates(forceRefresh = false) {
        try {
            const url = forceRefresh ? '/api/market/rates?refresh=true' : '/api/market/rates';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.rates) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Canlı kur alma hatası:', e);
        }
        return null;
    }
};

// ==========================================================
// 1. BAŞLANGIÇ & PWA SERVİSİ
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
    await AilemDB.init();
    loadStateFromStorage();
    initPWA();
    if (!appState.currentUser) {
        switchAuthMode('login');
    } else {
        // Canlı sunucudan en güncel veriyi çek
        await syncWithServer(false);
    }
    renderApp();
    checkMonthStartNotification();

    // Altınkaynak canlı piyasa kurlarını ilk kez yükle
    fetchLiveMarketRates(false);

    // 4 saniyede bir ailedeki ve mesajlaşmadaki güncellemeleri otomatik senkronize et
    setInterval(() => {
        if (appState.currentUser && appState.familyData) {
            syncWithServer(true);
        }
    }, 4000);

    // 30 saniyede bir Altınkaynak canlı kurlarını otomatik güncelle
    setInterval(() => {
        fetchLiveMarketRates(false);
    }, 30000);
});

// Ayın ilk günü veya yeni ay bildirimi kontrolü
function checkMonthStartNotification() {
    if (!appState.currentUser || !appState.familyData) return;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const lastNotifiedMonth = localStorage.getItem('ailem_last_month_notified');

    // Eğer ayın 1'i ise veya yeni aya geçildiyse ve henüz bildirilmediyse
    if (now.getDate() === 1 && lastNotifiedMonth !== currentMonthKey) {
        localStorage.setItem('ailem_last_month_notified', currentMonthKey);
        setTimeout(() => {
            triggerHapticAndSound();
            showToast('🗓️ Yeni ay başladı! Aylık maaşlar ve bütçe güncellendi. Sabit giderlerinizi kontrol etmeyi unutmayın! 💰');
            if (appState.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('YuvaPusula - Yeni Ay & Bütçe', {
                        body: '🗓️ Yeni ay başladı! Aylık maaşlar ve bütçe güncellendi. Sabit giderlerinizi kontrol etmeyi unutmayın!',
                        icon: 'icons/icon.svg'
                    });
                } catch (e) {}
            }
        }, 1200);
    }
}

async function syncWithServer(silent = false) {
    if (!appState.familyData || !appState.familyData.id) return;
    const fresh = await AilemAPI.fetchFamily(appState.familyData.id);
    if (fresh) {
        const prevMessages = appState.familyData.messages || [];
        const newMessages = fresh.messages || [];

        // Yeni gelen mesaj kontrolü (Başkası mesaj attığında anlık bildirim ver)
        if (newMessages.length > prevMessages.length) {
            const latestMsg = newMessages[newMessages.length - 1];
            if (appState.currentUser && latestMsg.senderId !== appState.currentUser.id) {
                // Sesli uyarı & titreşim
                triggerHapticAndSound();

                // Web Bildirimi (PWA / Tarayıcı)
                if (appState.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(`${latestMsg.senderName} (${latestMsg.senderRole})`, {
                            body: latestMsg.content,
                            icon: 'icons/icon.svg',
                            badge: 'icons/icon.svg'
                        });
                    } catch (err) {}
                }

                // Uygulama İçi Yüzen Bildirim Kartı (Eğer o an o sohbette değilsek)
                const isViewingActiveChat = (appState.currentTab === 'tabChat' && 
                    ((latestMsg.receiverId === 'group' && appState.chatChannel === 'group') ||
                     (latestMsg.senderId === appState.chatTargetMemberId && appState.chatChannel === 'direct')));

                if (!isViewingActiveChat) {
                    showInAppMessageBanner(latestMsg);
                }
            }
        }

        appState.familyData = fresh;
        saveStateToStorage();
        renderApp();
    } else {
        // Sunucuda bu aile verisi yoksa veya oturum geçersizse
        if (!silent) {
            localStorage.removeItem('ailem_current_user');
            localStorage.removeItem('ailem_family_data');
            appState.currentUser = null;
            appState.familyData = null;
            renderApp();
        }
    }
}

// PWA Service Worker, Çevrimdışı Mod & Yükleme İşleyicisi
function isIosDevice() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function triggerPWAInstall() {
    if (isStandaloneMode()) {
        showToast('YuvaPusula zaten cihazınızda yüklü ve tam ekran çalışıyor! ✨');
        return;
    }

    if (appState.deferredPrompt) {
        appState.deferredPrompt.prompt();
        appState.deferredPrompt.userChoice.then(({ outcome }) => {
            if (outcome === 'accepted') {
                showToast('YuvaPusula başarıyla yükleniyor! 🎉');
            }
            appState.deferredPrompt = null;
            const banner = document.getElementById('pwaInstallBanner');
            if (banner) banner.classList.add('hidden');
            const headerBtn = document.getElementById('headerInstallBtn');
            if (headerBtn) headerBtn.classList.add('hidden');
        });
    } else if (isIosDevice()) {
        openModal('modalIosInstall');
    } else {
        showToast('Tarayıcı menünüzden "Ana Ekrana Ekle" veya "Uygulamayı Yükle" seçeneğini seçebilirsiniz 📲');
    }
}

function initPWA() {
    // 1. Service Worker Kaydı
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('YuvaPusula PWA Service Worker hazır:', reg.scope);
                })
                .catch(err => {
                    console.log('Service Worker kayıt hatası:', err);
                });
        });
    }

    // 2. Çevrimdışı / Çevrimiçi Dinleyicileri
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            if (offlineIndicator) offlineIndicator.classList.remove('hidden');
            showToast('📡 Çevrimdışı moddasınız. Verileriniz yerel bellekte korunmaktadır.');
        } else {
            if (offlineIndicator) offlineIndicator.classList.add('hidden');
            showToast('🟢 İnternet bağlantısı sağlandı. Veriler güncelleniyor.');
            syncWithServer(true);
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    if (!navigator.onLine && offlineIndicator) {
        offlineIndicator.classList.remove('hidden');
    }

    // 3. Standalone Mod Kontrolü
    const headerInstallBtn = document.getElementById('headerInstallBtn');
    const pwaBanner = document.getElementById('pwaInstallBanner');

    if (isStandaloneMode()) {
        console.log('YuvaPusula Standalone PWA modunda çalışıyor 🚀');
        if (pwaBanner) pwaBanner.classList.add('hidden');
        if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
    } else {
        if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');
        if (isIosDevice() && !localStorage.getItem('yuvapusula_pwa_dismissed')) {
            // iOS için ilk girişte banner'ı göster
            setTimeout(() => {
                if (pwaBanner && !isStandaloneMode()) pwaBanner.classList.remove('hidden');
            }, 3000);
        }
    }

    // 4. Android / Chrome beforeinstallprompt Yakalama
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        appState.deferredPrompt = e;
        if (!isStandaloneMode() && !localStorage.getItem('yuvapusula_pwa_dismissed')) {
            if (pwaBanner) pwaBanner.classList.remove('hidden');
        }
        if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
        appState.deferredPrompt = null;
        if (pwaBanner) pwaBanner.classList.add('hidden');
        if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
        showToast('YuvaPusula başarıyla kuruldu! Hoş geldiniz 🧭');
    });

    const btnInstall = document.getElementById('btnInstallPwa');
    if (btnInstall) {
        btnInstall.addEventListener('click', triggerPWAInstall);
    }

    const btnCloseBanner = document.getElementById('btnClosePwaBanner');
    if (btnCloseBanner) {
        btnCloseBanner.addEventListener('click', () => {
            if (pwaBanner) pwaBanner.classList.add('hidden');
            localStorage.setItem('yuvapusula_pwa_dismissed', '1');
        });
    }

    // 5. PWA Shortcut URL Parametrelerini Dinleme
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetTab = urlParams.get('tab');
        if (targetTab) {
            setTimeout(() => {
                if (targetTab === 'finance') switchTab('tabFinance');
                else if (targetTab === 'shopping') switchTab('tabShopping');
                else if (targetTab === 'messages' || targetTab === 'chat') switchTab('tabChat');
                else if (targetTab === 'plans') switchTab('tabPlans');
                else if (targetTab === 'tasks') switchTab('tabTasks');
            }, 500);
        }
    } catch (e) {}
}

// LocalStorage'dan Durum Yükleme
function loadStateFromStorage() {
    try {
        const storedUser = localStorage.getItem('ailem_current_user');
        const storedFamily = localStorage.getItem('ailem_family_data');

        if (storedUser && storedFamily) {
            appState.currentUser = JSON.parse(storedUser);
            appState.familyData = JSON.parse(storedFamily);
            if (!appState.familyData.plans) {
                appState.familyData.plans = [];
            }
            if (!appState.familyData.messages) {
                appState.familyData.messages = [];
            }
        }
    } catch (e) {
        console.error('State yükleme hatası:', e);
    }
}

function saveStateToStorage() {
    if (appState.currentUser) {
        localStorage.setItem('ailem_current_user', JSON.stringify(appState.currentUser));
        AilemDB.saveUser(appState.currentUser);
    } else {
        localStorage.removeItem('ailem_current_user');
    }

    if (appState.familyData) {
        localStorage.setItem('ailem_family_data', JSON.stringify(appState.familyData));
        AilemDB.saveFamily(appState.familyData);
    } else {
        localStorage.removeItem('ailem_family_data');
    }
}

// ==========================================================
// 2. KAYIT / GİRİŞ & AİLE OLUŞTURMA İŞLEMLERİ
// ==========================================================
let currentAuthMode = 'login'; // 'login', 'create' veya 'join'

function switchAuthMode(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tabLogin');
    const tabCreate = document.getElementById('tabNewFamily');
    const tabJoin = document.getElementById('tabJoinFamily');

    const authNameField = document.getElementById('authNameField');
    const authRoleField = document.getElementById('authRoleField');
    const createFields = document.getElementById('createFamilyFields');
    const joinFields = document.getElementById('joinFamilyFields');
    const btnSubmit = document.getElementById('btnAuthSubmit');

    const userName = document.getElementById('userName');
    const familyNameInput = document.getElementById('familyNameInput');
    const familyCodeInput = document.getElementById('familyCodeInput');

    // Tab butonlarını güncelle
    if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
    if (tabCreate) tabCreate.classList.toggle('active', mode === 'create');
    if (tabJoin) tabJoin.classList.toggle('active', mode === 'join');

    if (mode === 'login') {
        if (authNameField) authNameField.classList.add('hidden');
        if (authRoleField) authRoleField.classList.add('hidden');
        if (createFields) createFields.classList.add('hidden');
        if (joinFields) joinFields.classList.add('hidden');

        if (userName) userName.required = false;
        if (familyNameInput) familyNameInput.required = false;
        if (familyCodeInput) familyCodeInput.required = false;

        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Giriş Yap';
    } else if (mode === 'create') {
        if (authNameField) authNameField.classList.remove('hidden');
        if (authRoleField) authRoleField.classList.remove('hidden');
        if (createFields) createFields.classList.remove('hidden');
        if (joinFields) joinFields.classList.add('hidden');

        if (userName) userName.required = true;
        if (familyNameInput) familyNameInput.required = true;
        if (familyCodeInput) familyCodeInput.required = false;

        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Yeni Ailemi Oluştur';
    } else if (mode === 'join') {
        if (authNameField) authNameField.classList.remove('hidden');
        if (authRoleField) authRoleField.classList.remove('hidden');
        if (createFields) createFields.classList.add('hidden');
        if (joinFields) joinFields.classList.remove('hidden');

        if (userName) userName.required = true;
        if (familyNameInput) familyNameInput.required = false;
        if (familyCodeInput) familyCodeInput.required = true;

        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-key"></i> Aileye Katıl';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const phone = document.getElementById('userPhone').value.trim();

    if (!phone) {
        showToast('Lütfen telefon numaranızı girin.');
        return;
    }

    if (currentAuthMode === 'login') {
        // 1. SQLite API üzerinden giriş yap
        const apiRes = await AilemAPI.login(phone);
        if (apiRes && apiRes.success && apiRes.user && apiRes.family) {
            appState.currentUser = apiRes.user;
            appState.familyData = apiRes.family;
            saveStateToStorage();
            renderApp();
            showToast(`Hoş geldiniz, ${apiRes.user.name}! 🏠`);
            return;
        }

        // 2. Çevrimdışı / LocalStorage yedek kontrolü
        const result = await AilemDB.findByPhone(phone);
        if (result) {
            appState.currentUser = result.user;
            appState.familyData = result.family;
            saveStateToStorage();
            renderApp();
            showToast(`Hoş geldiniz, ${result.user.name}! 🏠`);
            return;
        }

        // Bulunamazsa yönlendir
        showToast('Bu telefon ile kayıtlı aile bulunamadı. Lütfen "Yeni Aile Kur" seçeneğini doldurun.');
        switchAuthMode('create');
        return;
    }

    const name = document.getElementById('userName').value.trim();
    const role = document.getElementById('userRole').value;

    if (!name) {
        showToast('Lütfen adınızı ve soyadınızı girin.');
        return;
    }

    const avatar = ROLE_AVATARS[role] || '👤';

    if (currentAuthMode === 'create') {
        let rawFamilyName = document.getElementById('familyNameInput').value.trim();
        if (!rawFamilyName) rawFamilyName = name.split(' ').pop() || 'Bizim';

        // 1. SQLite Sunucusu üzerinden oluştur
        const apiRes = await AilemAPI.createFamily(rawFamilyName, phone, name, role, avatar);
        if (apiRes && apiRes.success) {
            appState.currentUser = apiRes.user;
            appState.familyData = apiRes.family;
            saveStateToStorage();
            renderApp();
            showToast(`${apiRes.family.name} veritabanına kaydedildi ve kuruldu! 🏠`);
            return;
        }

        // Çevrimdışı fallback
        const formattedFamilyName = rawFamilyName.toLowerCase().includes('aile') ? rawFamilyName : `${rawFamilyName} Ailesi`;
        const inviteCode = (rawFamilyName.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)).replace(/[^A-Z0-9]/g, 'AIL');
        const newUser = { id: 'usr_' + Date.now(), name, phone, role, avatar };
        const newFamily = {
            id: 'fam_' + Date.now(),
            name: formattedFamilyName,
            inviteCode,
            members: [newUser],
            posts: [],
            plans: [],
            shoppingList: [],
            tasks: [],
            expenses: []
        };
        appState.currentUser = newUser;
        appState.familyData = newFamily;
        saveStateToStorage();
        renderApp();
        showToast(`${formattedFamilyName} kuruldu! 🏠`);
    } else {
        // Aileye Katılma Modu
        const inputCode = document.getElementById('familyCodeInput').value.trim().toUpperCase();

        const apiRes = await AilemAPI.joinFamily(inputCode, phone, name, role, avatar);
        if (apiRes && apiRes.success) {
            appState.currentUser = apiRes.user;
            appState.familyData = apiRes.family;
            saveStateToStorage();
            renderApp();
            showToast(`${apiRes.family.name} ailesine başarıyla katıldınız! 👋`);
            return;
        }

        // Çevrimdışı fallback
        let family = await AilemDB.findByCode(inputCode);
        const newUser = { id: 'usr_' + Date.now(), name, phone, role, avatar };
        if (!family) {
            family = {
                id: 'fam_' + Date.now(),
                name: `${name.split(' ').pop()} Ailesi`,
                inviteCode: inputCode,
                members: [newUser],
                posts: [],
                plans: [],
                shoppingList: [],
                tasks: [],
                expenses: []
            };
        } else {
            if (!family.members.find(m => m.phone === phone)) family.members.push(newUser);
        }

        appState.currentUser = newUser;
        appState.familyData = family;
        saveStateToStorage();
        renderApp();
        showToast(`${family.name} ailesine katıldınız! 👋`);
    }
}

async function handleQuickDemoLogin() {
    // Önce SQLite sunucusundan dene
    const apiRes = await AilemAPI.quickDemo();
    if (apiRes && apiRes.success && apiRes.family && apiRes.user) {
        appState.currentUser = apiRes.user;
        appState.familyData = apiRes.family;
        saveStateToStorage();
        renderApp();
        showToast('Uysal Ailesi veritabanı hesabıyla giriş yapıldı! 🎉');
        return;
    }

    // Çevrimdışı fallback
    const demoFamily = AilemDB.getDemoSeed();
    const demoUser = demoFamily.members[0];
    appState.currentUser = demoUser;
    appState.familyData = demoFamily;
    saveStateToStorage();
    renderApp();
    showToast('Uysal Ailesi demo girişi yapıldı! 🎉');
}

// ==========================================================
// 3. EKRAN VE GÖRÜNÜM YÖNETİMİ (RENDER)
// ==========================================================
function renderApp() {
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    if (!appState.currentUser || !appState.familyData) {
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
        document.title = 'YuvaPusula - Giriş Yap';
        return;
    }

    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    const family = appState.familyData;
    const user = appState.currentUser;

    // Dinamik Başlık ve Logo Güncelleme
    const dynamicTitleText = `${family.name} - YuvaPusula`;
    document.title = dynamicTitleText;
    
    const dynamicTitleEl = document.getElementById('dynamicAppTitle');
    if (dynamicTitleEl) dynamicTitleEl.textContent = `${family.name}`;

    // Header ve Karşılama Bilgileri
    document.getElementById('headerUserAvatar').textContent = user.avatar;
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserRole').textContent = user.role;
    
    // Desktop Sidebar Bilgileri
    const sidebarTitleEl = document.getElementById('sidebarFamilyTitle');
    if (sidebarTitleEl) sidebarTitleEl.textContent = `${family.name} Ailesi`;
    const sidebarAvatarEl = document.getElementById('sidebarUserAvatar');
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = user.avatar;
    const sidebarUserEl = document.getElementById('sidebarUserName');
    if (sidebarUserEl) sidebarUserEl.textContent = user.name;
    const sidebarRoleEl = document.getElementById('sidebarUserRole');
    if (sidebarRoleEl) sidebarRoleEl.textContent = user.role;

    document.getElementById('welcomeUserName').textContent = user.name.split(' ')[0];
    document.getElementById('welcomeFamilyText').textContent = `${family.name} panosunda bugün ${family.posts.length} duyuru ve ${family.tasks.filter(t=>!t.completed).length} aktif görev var.`;

    // Ayarlar & Kimlik Kartı
    document.getElementById('settingsFamilyName').textContent = family.name;
    document.getElementById('settingsInviteCode').textContent = family.inviteCode;

    // Formlardaki Üye Seçim Listelerini Güncelle
    updateMemberSelectDropdowns();

    // Modülleri Render Et
    renderPano();
    renderChat();
    switchPlansHub(appState.activePlanHub || 'Seyahat');
    renderShopping();
    renderTasks();
    renderBudget();
    renderMembers();
    updateQuickStats();
    switchTab(appState.currentTab || 'tabPano');
}

function updateQuickStats() {
    const family = appState.familyData;
    if (!family) return;

    if (!family.plans) family.plans = [];
    const allPlans = family.plans;
    const pendingPlans = allPlans.filter(p => !p.completed).length;
    const pendingShop = family.shoppingList.filter(s => !s.completed).length;
    const pendingTask = family.tasks.filter(t => !t.completed).length;

    const quickPlansEl = document.getElementById('quickPendingPlans');
    if (quickPlansEl) quickPlansEl.textContent = pendingPlans;

    document.getElementById('quickPendingShopping').textContent = pendingShop;
    document.getElementById('quickPendingTasks').textContent = pendingTask;
    document.getElementById('quickMemberCount').textContent = family.members.length;

    // Hub Kategori Sayaçları
    const countSeyahat = allPlans.filter(p => p.category === 'Seyahat').length;
    const countRestoran = allPlans.filter(p => p.category === 'Restoran').length;
    const countEtkinlik = allPlans.filter(p => p.category === 'Etkinlik').length;
    const countAlisveris = allPlans.filter(p => p.category === 'Alisveris').length;

    const elCountSeyahat = document.getElementById('countHubSeyahat');
    if (elCountSeyahat) elCountSeyahat.textContent = `${countSeyahat} Rota`;
    const elCountRestoran = document.getElementById('countHubRestoran');
    if (elCountRestoran) elCountRestoran.textContent = `${countRestoran} Mekan`;
    const elCountEtkinlik = document.getElementById('countHubEtkinlik');
    if (elCountEtkinlik) elCountEtkinlik.textContent = `${countEtkinlik} Bilet`;
    const elCountAlisveris = document.getElementById('countHubAlisveris');
    if (elCountAlisveris) elCountAlisveris.textContent = `${countAlisveris} İstek`;

    // Navigasyon Rozetleri (Mobil & Masaüstü Sidebar)
    const plansBadge = document.getElementById('navPlansBadge');
    const sidePlansBadge = document.getElementById('sidebarPlansBadge');
    if (pendingPlans > 0) {
        if (plansBadge) { plansBadge.textContent = pendingPlans; plansBadge.classList.remove('hidden'); }
        if (sidePlansBadge) { sidePlansBadge.textContent = pendingPlans; sidePlansBadge.classList.remove('hidden'); }
    } else {
        if (plansBadge) plansBadge.classList.add('hidden');
        if (sidePlansBadge) sidePlansBadge.classList.add('hidden');
    }

    const shopBadge = document.getElementById('navShoppingBadge');
    const sideShopBadge = document.getElementById('sidebarShoppingBadge');
    if (pendingShop > 0) {
        if (shopBadge) { shopBadge.textContent = pendingShop; shopBadge.classList.remove('hidden'); }
        if (sideShopBadge) { sideShopBadge.textContent = pendingShop; sideShopBadge.classList.remove('hidden'); }
    } else {
        if (shopBadge) shopBadge.classList.add('hidden');
        if (sideShopBadge) sideShopBadge.classList.add('hidden');
    }

    const taskBadge = document.getElementById('navTasksBadge');
    const sideTaskBadge = document.getElementById('sidebarTasksBadge');
    if (pendingTask > 0) {
        if (taskBadge) { taskBadge.textContent = pendingTask; taskBadge.classList.remove('hidden'); }
        if (sideTaskBadge) { sideTaskBadge.textContent = pendingTask; sideTaskBadge.classList.remove('hidden'); }
    } else {
        if (taskBadge) taskBadge.classList.add('hidden');
        if (sideTaskBadge) sideTaskBadge.classList.add('hidden');
    }
}

// ==========================================================
// 4. MODÜLLERİN RENDER EDİLMESİ
// ==========================================================

// Pano / Duyurular
function renderPano() {
    const container = document.getElementById('postsList');
    const posts = appState.familyData.posts || [];
    document.getElementById('postCountBadge').textContent = `${posts.length} Not`;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-comments"></i>
                <p>Henüz aile panosuna bir not veya duyuru eklenmedi.<br>İlk mesajı siz paylaşın!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-author-box">
                    <span class="author-avatar">${post.authorAvatar || '👤'}</span>
                    <div>
                        <div class="author-name">${post.author}</div>
                        <div class="author-role">${post.authorRole || 'Aile Üyesi'}</div>
                    </div>
                </div>
                <span class="post-tag">${post.tag || 'Duyuru'}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <div class="post-content">${post.content}</div>
            <div class="post-footer">
                <span><i class="fa-regular fa-clock"></i> ${post.createdAt}</span>
                <button class="btn-delete-item" onclick="deletePost('${post.id}')" title="Notu Sil">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).reverse().join('');
}

// ==========================================================
// AİLE PLANLARI KATEGORİ HUB MANTIĞI
// ==========================================================
const HUB_META = {
    'Seyahat': {
        title: '✈️ Seyahat Rotalarımız',
        subtitle: 'Yurt içi ve yurt dışı tatil, gezi & keşif rotalarımız',
        btnText: '<i class="fa-solid fa-plus"></i> Seyahat Ekle',
        subFilters: [
            { label: 'Tüm Rotalar', value: 'ALL' },
            { label: '🇹🇷 Yurt İçi', value: 'Yurtici' },
            { label: '🌍 Yurt Dışı', value: 'Yurtdisi' }
        ]
    },
    'Restoran': {
        title: '🍽️ Restoran & Kafe Duraklarımız',
        subtitle: 'Denenecek özel lezzetler, kahveciler ve gurme mekanlar',
        btnText: '<i class="fa-solid fa-plus"></i> Restoran Ekle',
        subFilters: [
            { label: 'Tüm Mekanlar', value: 'ALL' },
            { label: '₺ Uygun', value: '₺ Uygun' },
            { label: '₺₺ Orta', value: '₺₺ Orta' },
            { label: '₺₺₺ Özel Gün', value: '₺₺₺ Özel Gün / Gurme' }
        ]
    },
    'Etkinlik': {
        title: '🎭 Etkinlik & Gösteri Takvimimiz',
        subtitle: 'Konserler, tiyatrolar, sinema ve aile etkinlikleri',
        btnText: '<i class="fa-solid fa-plus"></i> Etkinlik Ekle',
        subFilters: [
            { label: 'Tüm Etkinlikler', value: 'ALL' }
        ]
    },
    'Alisveris': {
        title: '🛍️ Alışveriş & Hayal Listemiz (Wishlist)',
        subtitle: 'Alınması planlanan büyük istekler, teknoloji ve ev eşyaları',
        btnText: '<i class="fa-solid fa-plus"></i> İstek Ekle',
        subFilters: [
            { label: 'Tüm İstekler', value: 'ALL' },
            { label: '⭐ Yüksek Öncelik', value: '⭐ Yüksek / Acil' },
            { label: '⏳ Yakında', value: '⏳ Yakında' },
            { label: '💭 Hayal', value: '💭 Hayal / Gelecek' }
        ]
    }
};

function switchPlansHub(category) {
    appState.activePlanHub = category;
    appState.plansSubFilter = 'ALL';

    // Hub kartlarını aktif yap
    document.querySelectorAll('.plans-category-hub .hub-card').forEach(c => c.classList.remove('active'));
    const activeBtn = document.getElementById(`hubBtn${category}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Başlık ve Açıklamayı Güncelle
    const meta = HUB_META[category] || HUB_META['Seyahat'];
    const titleEl = document.getElementById('activeHubTitle');
    const descEl = document.getElementById('activeHubSubtitle');
    const addBtnEl = document.getElementById('btnHubAddCategory');

    if (titleEl) titleEl.innerHTML = meta.title;
    if (descEl) descEl.textContent = meta.subtitle;
    if (addBtnEl) addBtnEl.innerHTML = meta.btnText;

    // Alt Filtreleri Oluştur
    const subFilterContainer = document.getElementById('plansSubFilters');
    if (subFilterContainer) {
        if (meta.subFilters && meta.subFilters.length > 1) {
            subFilterContainer.innerHTML = meta.subFilters.map((sf, idx) => `
                <button class="chip ${idx === 0 ? 'active' : ''}" onclick="filterPlansSub('${sf.value}', this)">
                    ${sf.label}
                </button>
            `).join('');
            subFilterContainer.classList.remove('hidden');
        } else {
            subFilterContainer.innerHTML = '';
            subFilterContainer.classList.add('hidden');
        }
    }

    renderPlans();
}

function filterPlansSub(subValue, btn) {
    appState.plansSubFilter = subValue;
    if (btn) {
        btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    }
    renderPlans();
}

function filterPlansStatus(status, btn) {
    appState.plansStatusFilter = status;
    const parent = btn.parentElement;
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderPlans();
}

function openPlanCategoryPicker() {
    openModal('modalPlanCategoryPicker');
}

function openPlanFormWithCategory(category) {
    closeModal('modalPlanCategoryPicker');
    const catSelect = document.getElementById('planCategorySelect');
    if (catSelect) {
        catSelect.value = category;
        onPlanCategoryChange(category);
    }
    openModal('modalNewPlan');
}

function openAddPlanModalForCurrentCategory() {
    openPlanFormWithCategory(appState.activePlanHub);
}

// Aile Planları & Keşifler Render
function renderPlans() {
    const container = document.getElementById('plansList');
    if (!container) return;

    let plans = appState.familyData.plans || [];

    // Seçili Hub Kategorisine Göre Filtrele
    const activeCategory = appState.activePlanHub;
    plans = plans.filter(p => p.category === activeCategory);

    // Kategori İçi Alt Filtre
    if (appState.plansSubFilter !== 'ALL') {
        if (activeCategory === 'Seyahat') {
            plans = plans.filter(p => p.travelType === appState.plansSubFilter);
        } else if (activeCategory === 'Restoran') {
            plans = plans.filter(p => p.price === appState.plansSubFilter);
        } else if (activeCategory === 'Alisveris') {
            plans = plans.filter(p => p.priority === appState.plansSubFilter);
        }
    }

    // Durum Filtresi
    if (appState.plansStatusFilter === 'PENDING') {
        plans = plans.filter(p => !p.completed);
    } else if (appState.plansStatusFilter === 'COMPLETED') {
        plans = plans.filter(p => p.completed);
    }

    if (plans.length === 0) {
        const emptyLabels = {
            'Seyahat': 'Kayıtlı seyahat rotası bulunmuyor. Bir sonraki tatili planlayın! ✈️',
            'Restoran': 'Henüz denenecek bir restoran/kafe eklenmedi. Lezzetli bir mekan ekleyin! 🍽️',
            'Etkinlik': 'Yaklaşan etkinlik veya konser kaydı yok. Eğlenceli bir plan ekleyin! 🎭',
            'Alisveris': 'Alışveriş veya hayal listeniz henüz boş. İstediğiniz bir ürünü kaydedin! 🛍️'
        };

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-compass"></i>
                <p>${emptyLabels[activeCategory] || 'Bu filtrede plan bulunamadı.'}</p>
            </div>
        `;
        return;
    }

    const CAT_ICONS = {
        'Seyahat': '✈️ Seyahat',
        'Restoran': '🍽️ Restoran / Kafe',
        'Etkinlik': '🎭 Etkinlik',
        'Alisveris': '🛍️ Alışveriş'
    };

    container.innerHTML = plans.map(plan => {
        let detailsHtml = '';

        if (plan.category === 'Seyahat') {
            const scopeLabel = plan.travelType === 'Yurtdisi' ? '🌍 Yurt Dışı' : '🇹🇷 Yurt İçi';
            detailsHtml = `
                <div class="plan-details-box">
                    <div class="plan-detail-row"><i class="fa-solid fa-earth-americas"></i> <b>Kapsam:</b> <span>${scopeLabel}</span></div>
                    ${plan.travelDate ? `<div class="plan-detail-row"><i class="fa-regular fa-calendar"></i> <b>Zaman:</b> <span>${plan.travelDate}</span></div>` : ''}
                    ${plan.travelTransport ? `<div class="plan-detail-row"><i class="fa-solid fa-plane-departure"></i> <b>Ulaşım:</b> <span>${plan.travelTransport}</span></div>` : ''}
                    ${plan.travelBudget ? `<div class="plan-detail-row"><i class="fa-solid fa-coins"></i> <b>Tahmini Bütçe:</b> <span>${plan.travelBudget}</span></div>` : ''}
                    ${plan.travelNotes ? `<div class="plan-detail-row"><i class="fa-solid fa-map-pin"></i> <b>Gezilecek Yerler:</b> <span>${plan.travelNotes}</span></div>` : ''}
                </div>
            `;
        } else if (plan.category === 'Restoran') {
            detailsHtml = `
                <div class="plan-details-box">
                    ${plan.location ? `<div class="plan-detail-row"><i class="fa-solid fa-location-dot"></i> <b>Konum:</b> <span>${plan.location}</span></div>` : ''}
                    ${plan.dish ? `<div class="plan-detail-row"><i class="fa-solid fa-utensils"></i> <b>Denenecek Lezzet:</b> <span>${plan.dish}</span></div>` : ''}
                    ${plan.price ? `<div class="plan-detail-row"><i class="fa-solid fa-money-bill-wave"></i> <b>Fiyat:</b> <span>${plan.price}</span></div>` : ''}
                    ${plan.link ? `<a href="${plan.link}" target="_blank" class="plan-link-btn"><i class="fa-solid fa-map-location-dot"></i> Haritada / Menüde Aç</a>` : ''}
                </div>
            `;
        } else if (plan.category === 'Etkinlik') {
            detailsHtml = `
                <div class="plan-details-box">
                    ${plan.eventDate ? `<div class="plan-detail-row"><i class="fa-solid fa-calendar-check"></i> <b>Tarih & Saat:</b> <span>${plan.eventDate}</span></div>` : ''}
                    ${plan.eventVenue ? `<div class="plan-detail-row"><i class="fa-solid fa-building"></i> <b>Mekan:</b> <span>${plan.eventVenue}</span></div>` : ''}
                    ${plan.attendees ? `<div class="plan-detail-row"><i class="fa-solid fa-users"></i> <b>Katılımcılar:</b> <span>${plan.attendees}</span></div>` : ''}
                    ${plan.link ? `<a href="${plan.link}" target="_blank" class="plan-link-btn"><i class="fa-solid fa-ticket"></i> Bilet / Detay Sayfasına Git</a>` : ''}
                </div>
            `;
        } else if (plan.category === 'Alisveris') {
            detailsHtml = `
                <div class="plan-details-box">
                    ${plan.shopPrice ? `<div class="plan-detail-row"><i class="fa-solid fa-tag"></i> <b>Tahmini Fiyat:</b> <span>${plan.shopPrice}</span></div>` : ''}
                    ${plan.priority ? `<div class="plan-detail-row"><i class="fa-solid fa-star"></i> <b>Öncelik:</b> <span>${plan.priority}</span></div>` : ''}
                    ${plan.shopNote ? `<div class="plan-detail-row"><i class="fa-solid fa-note-sticky"></i> <b>Not / Amaç:</b> <span>${plan.shopNote}</span></div>` : ''}
                    ${plan.link ? `<a href="${plan.link}" target="_blank" class="plan-link-btn"><i class="fa-solid fa-bag-shopping"></i> Ürünü İncele / Satın Al</a>` : ''}
                </div>
            `;
        }

        const catClass = `cat-${plan.category}`;
        const badgeClass = `badge-${plan.category}`;

        return `
            <div class="plan-card ${catClass} ${plan.completed ? 'completed' : ''}">
                <div class="plan-top">
                    <div class="plan-badges">
                        <span class="plan-cat-badge ${badgeClass}">${CAT_ICONS[plan.category] || plan.category}</span>
                        ${plan.travelType ? `<span class="plan-cat-badge" style="background:#f1f5f9; color:#475569;">${plan.travelType === 'Yurtdisi' ? '🌍 Yurt Dışı' : '🇹🇷 Yurt İçi'}</span>` : ''}
                    </div>
                    <span class="plan-status-badge ${plan.completed ? 'status-completed' : 'status-pending'}">
                        ${plan.completed ? '⭐ Gerçekleşti' : '🎯 Hedef Plan'}
                    </span>
                </div>

                <div class="plan-title-text">${plan.title}</div>
                ${detailsHtml}

                <div class="plan-footer">
                    <span><i class="fa-regular fa-user"></i> Ekleyen: ${plan.addedBy}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn-toggle-plan ${plan.completed ? 'done' : 'pending'}" onclick="togglePlanStatus('${plan.id}')">
                            ${plan.completed ? '<i class="fa-solid fa-check"></i> Tamamlandı' : '<i class="fa-solid fa-circle-check"></i> Gerçekleşti Yap'}
                        </button>
                        <button class="btn-delete-item" onclick="deletePlan('${plan.id}')" title="Planı Sil">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Alışveriş Listesi
function renderShopping() {
    const container = document.getElementById('shoppingItemsList');
    let items = appState.familyData.shoppingList || [];

    if (appState.shoppingFilter !== 'ALL') {
        items = items.filter(item => item.category === appState.shoppingFilter);
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Bu kategoride alınacak bir şey kalmadı. Harika! ✨</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="shopping-card ${item.completed ? 'completed' : ''}">
            <div class="custom-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleShoppingItem('${item.id}')">
                ${item.completed ? '<i class="fa-solid fa-check"></i>' : ''}
            </div>
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                <div class="item-meta">
                    <span><i class="fa-solid fa-box"></i> ${item.quantity}</span>
                    <span>• ${(SHOPPING_ICONS[item.category] || '📦')} ${item.category}</span>
                    <span>• Ekleyen: ${item.addedBy}</span>
                </div>
            </div>
            <button class="btn-delete-item" onclick="deleteShoppingItem('${item.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

// Görevler
function renderTasks() {
    const container = document.getElementById('tasksList');
    let tasks = appState.familyData.tasks || [];

    if (appState.taskFilter === 'PENDING') {
        tasks = tasks.filter(t => !t.completed);
    } else if (appState.taskFilter === 'DONE') {
        tasks = tasks.filter(t => t.completed);
    }

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-check"></i>
                <p>Bekleyen görev bulunmuyor. Dinlenme vakti! 🛋️</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-card ${task.completed ? 'completed' : ''}">
            <div class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
            </div>
            <div class="task-details">
                <div class="task-title ${task.completed ? 'completed-text' : ''}">${task.title}</div>
                <div class="task-meta">
                    <span class="assignee-badge"><i class="fa-solid fa-user"></i> ${task.assignee}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>
                </div>
            </div>
            <button class="btn-delete-item" onclick="deleteTask('${task.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

const FIXED_EXPENSE_ICONS = {
    'Kira': '🏠',
    'Fatura': '⚡',
    'Aidat': '🏢',
    'Kredi': '💳',
    'İnternet': '📶',
    'Sigorta': '🛡️',
    'Eğitim': '🎒',
    'Abonelik': '📺',
    'Diğer': '📦'
};

const INVESTMENT_ICONS = {
    'Altın': '🪙',
    'Dolar': '💵',
    'Euro': '💶',
    'TL': '₺',
    'Döviz': '💵',
    'Borsa': '📈',
    'Fon': '🏦',
    'Kripto': '⚡',
    'Nakit': '💰'
};

function formatTL(num) {
    return (Number(num) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

// ==========================================================
// 4. BÜTÇE, MAAŞLAR, SABİT GİDERLER VE YATIRIMLAR (RENDER)
// ==========================================================
function renderBudget() {
    const family = appState.familyData;
    if (!family) return;

    if (!family.salaries) family.salaries = [];
    if (!family.fixedExpenses) family.fixedExpenses = [];
    if (!family.expenses) family.expenses = [];
    if (!family.investments) family.investments = [];
    if (!family.investmentTransactions) family.investmentTransactions = [];

    const salaries = family.salaries;
    const fixedExpenses = family.fixedExpenses;
    const expenses = family.expenses;
    const investments = family.investments;

    // 1. Hesaplamalar
    const totalSalaries = salaries.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalFixed = fixedExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const paidCount = fixedExpenses.filter(x => x.isPaid).length;
    const unpaidCount = fixedExpenses.filter(x => !x.isPaid).length;
    const totalVariable = expenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const netRemaining = totalSalaries - totalFixed - totalVariable;
    const totalPortfolio = investments.reduce((s, x) => s + (Number(x.currentValueTl) || 0), 0);

    // 2. Master 4'lü Kart Güncellemeleri
    const elStatSalaries = document.getElementById('statTotalSalaries');
    if (elStatSalaries) elStatSalaries.textContent = formatTL(totalSalaries);

    const elSalaryCount = document.getElementById('statSalaryCount');
    if (elSalaryCount) elSalaryCount.textContent = `${salaries.length} aile geliri`;

    const elStatFixed = document.getElementById('statTotalFixedExpenses');
    if (elStatFixed) elStatFixed.textContent = formatTL(totalFixed);

    const elFixedStatus = document.getElementById('statFixedStatus');
    if (elFixedStatus) elFixedStatus.textContent = `${paidCount} / ${fixedExpenses.length} Ödendi`;

    const elTotalExpenseAmount = document.getElementById('totalExpenseAmount');
    if (elTotalExpenseAmount) elTotalExpenseAmount.textContent = formatTL(totalVariable);

    const elTotalExpenseCount = document.getElementById('totalExpenseCount');
    if (elTotalExpenseCount) elTotalExpenseCount.textContent = `${expenses.length} adet harcama`;

    const elNetRemaining = document.getElementById('statNetRemaining');
    if (elNetRemaining) elNetRemaining.textContent = formatTL(netRemaining);

    const elNetDesc = document.getElementById('statNetDesc');
    if (elNetDesc) {
        if (netRemaining >= 0) {
            elNetDesc.textContent = '✅ Bütçe Dengede (+ Kalan)';
        } else {
            elNetDesc.textContent = '⚠️ Bütçe Açığı (- Aşım)';
        }
    }

    const cardNet = document.getElementById('cardNetBudget');
    if (cardNet) {
        cardNet.classList.toggle('net-positive', netRemaining >= 0);
        cardNet.classList.toggle('net-negative', netRemaining < 0);
    }

    // 3. Sub-tab rozetleri
    const fixedBadge = document.getElementById('fixedUnpaidBadge');
    if (fixedBadge) {
        fixedBadge.textContent = unpaidCount;
        fixedBadge.classList.toggle('hidden', unpaidCount === 0);
    }

    const invBadge = document.getElementById('investmentTotalBadge');
    if (invBadge) invBadge.textContent = formatTL(totalPortfolio);

    const heroPortfolio = document.getElementById('heroPortfolioTotal');
    if (heroPortfolio) heroPortfolio.textContent = formatTL(totalPortfolio);

    // 4. Aile Fertleri Maaş Dağılımı Listesi
    const salariesContainer = document.getElementById('salariesListContainer');
    if (salariesContainer) {
        const members = family.members || [];
        if (members.length === 0) {
            salariesContainer.innerHTML = `<div class="empty-state"><p>Henüz aile üyesi bulunmuyor.</p></div>`;
        } else {
            salariesContainer.innerHTML = members.map(m => {
                const sal = salaries.find(s => s.userId === m.id);
                const isMe = appState.currentUser && appState.currentUser.id === m.id;
                if (sal) {
                    return `
                        <div class="salary-card" ${isMe ? 'onclick="openMySalaryModal()" style="cursor:pointer;" title="Maaşımı Güncelle"' : ''}>
                            <div class="salary-card-avatar">${m.avatar || '👤'}</div>
                            <div class="salary-card-info">
                                <div class="salary-card-name">${m.name} ${isMe ? '<b style="color:var(--primary); font-size:0.7rem;">(Siz)</b>' : ''}</div>
                                <div class="salary-card-amount">${formatTL(sal.amount)}</div>
                                <div class="salary-card-payday">📅 Ayın ${sal.payDay || 1}'i ${sal.note ? '• ' + sal.note : ''}</div>
                            </div>
                            ${isMe ? '<i class="fa-solid fa-pen-to-square" style="color:var(--primary); font-size:13px;"></i>' : ''}
                        </div>
                    `;
                } else {
                    return `
                        <div class="salary-card" style="border-left-color: #cbd5e1; opacity:0.85;" ${isMe ? 'onclick="openMySalaryModal()" style="cursor:pointer; border-left-color: var(--primary);" title="Maaşımı Ekle"' : ''}>
                            <div class="salary-card-avatar" style="background:#f1f5f9;">${m.avatar || '👤'}</div>
                            <div class="salary-card-info">
                                <div class="salary-card-name">${m.name} ${isMe ? '<b style="color:var(--primary); font-size:0.7rem;">(Siz)</b>' : ''}</div>
                                <div class="salary-card-payday" style="color:#94a3b8;">${isMe ? '+ Maaşımı Belirle' : 'Maaş girilmedi'}</div>
                            </div>
                            ${isMe ? '<i class="fa-solid fa-plus-circle" style="color:var(--primary); font-size:14px;"></i>' : ''}
                        </div>
                    `;
                }
            }).join('');
        }
    }

    // 5. Değişken Harcamalar Listesi
    const expensesContainer = document.getElementById('expensesList');
    if (expensesContainer) {
        if (expenses.length === 0) {
            expensesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>Bu ay için henüz harcama kaydı girilmedi.</p>
                </div>
            `;
        } else {
            expensesContainer.innerHTML = expenses.map(exp => `
                <div class="expense-card">
                    <div class="expense-left">
                        <div class="expense-cat-icon">
                            ${EXPENSE_ICONS[exp.category] || '📦'}
                        </div>
                        <div>
                            <div class="expense-title">${exp.title}</div>
                            <div class="expense-meta">
                                <span>Ödeyen: <b>${exp.payer}</b></span> • <span>${exp.category}</span> • <span>${exp.date || ''}</span>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                        <span class="expense-amount-val">-${parseFloat(exp.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                        <button class="btn-delete-item" onclick="deleteExpense('${exp.id}')" title="Harcamayı Sil">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).reverse().join('');
        }
    }

    // 6. Sabit Giderler ve Yatırımları Render Et
    renderFixedExpenses();
    renderInvestments();
}

function renderFixedExpenses() {
    const container = document.getElementById('fixedExpensesList');
    if (!container) return;

    const family = appState.familyData;
    if (!family) return;

    let list = family.fixedExpenses || [];
    if (appState.fixedStatusFilter === 'UNPAID') {
        list = list.filter(f => !f.isPaid);
    } else if (appState.fixedStatusFilter === 'PAID') {
        list = list.filter(f => f.isPaid);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-file-invoice-dollar"></i>
                <p>Gösterilecek sabit gider kaydı bulunamadı.<br>Kira, aidat veya faturalarınızı ekleyin.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(item => `
        <div class="fixed-card ${item.isPaid ? 'paid' : 'unpaid'}">
            <div class="fixed-card-left">
                <div class="fixed-cat-icon">
                    ${FIXED_EXPENSE_ICONS[item.category] || '📑'}
                </div>
                <div>
                    <div class="fixed-card-title">${item.title}</div>
                    <div class="fixed-card-meta">
                        <span class="fixed-due-badge">📅 Her Ayın ${item.dueDay}. Günü</span>
                        ${item.payer ? `<span>👤 ${item.payer}</span>` : ''}
                        ${item.notes ? `<span>• ${item.notes}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="fixed-card-right">
                <div class="fixed-amount-val">${formatTL(item.amount)}</div>
                <button class="btn-toggle-fixed ${item.isPaid ? 'paid' : 'unpaid'}" onclick="handleToggleFixedExpense('${item.id}')">
                    ${item.isPaid ? '<i class="fa-solid fa-check"></i> Ödendi' : '<i class="fa-solid fa-clock"></i> Öde'}
                </button>
                <button class="btn-delete-item" onclick="handleDeleteFixedExpense('${item.id}')" title="Sabit Gideri Sil">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderInvestments() {
    const container = document.getElementById('investmentsList');
    const historyContainer = document.getElementById('investmentHistoryList');
    if (!container) return;

    const family = appState.familyData;
    if (!family) return;

    const investments = family.investments || [];
    const history = family.investmentTransactions || [];

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-vault"></i>
                <p>Henüz bir yatırım / birikim kalemi eklenmedi.<br>Altın, döviz, borsa veya fon portföyünüzü kaydedin!</p>
            </div>
        `;
    } else {
        container.innerHTML = investments.map(inv => `
            <div class="investment-card">
                <div class="inv-top-row">
                    <span class="inv-badge-cat inv-cat-${inv.category}">
                        ${INVESTMENT_ICONS[inv.category] || '💎'} ${inv.category}
                    </span>
                    <button class="btn-delete-item" onclick="handleDeleteInvestment('${inv.id}')" title="Yatırımı Sil" style="padding:0;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="inv-title">${inv.title}</div>
                <div class="inv-amount-row">
                    <span>Miktar:</span>
                    <b>${inv.amount} ${inv.unit || 'Adet'}</b>
                </div>
                <div class="inv-value-tl">${formatTL(inv.currentValueTl)}</div>
                ${inv.notes ? `<p style="font-size:0.7rem; color:var(--text-muted); margin-bottom:6px;">${inv.notes}</p>` : ''}
                <div class="inv-actions-row">
                    <button class="btn-inv-action btn-inv-buy" onclick="openAdjustInvestmentModal('${inv.id}', 'buy')">
                        <i class="fa-solid fa-plus"></i> Ekle
                    </button>
                    <button class="btn-inv-action btn-inv-sell" onclick="openAdjustInvestmentModal('${inv.id}', 'sell')">
                        <i class="fa-solid fa-minus"></i> Bozdur
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Geçmiş Hareketler
    if (historyContainer) {
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state" style="padding: 14px;">
                    <p style="font-size:0.75rem; color:#94a3b8;">Henüz yatırım hareketi bulunmuyor.</p>
                </div>
            `;
        } else {
            historyContainer.innerHTML = history.slice(0, 15).map(tx => {
                const isBuy = tx.type === 'buy';
                return `
                    <div class="inv-history-card">
                        <div class="inv-history-left">
                            <span class="inv-tx-badge ${isBuy ? 'inv-tx-buy' : 'inv-tx-sell'}">
                                ${isBuy ? '+' : '-'}
                            </span>
                            <div>
                                <strong>${isBuy ? 'Yatırım Eklendi' : 'Bozduruldu / Satıldı'}</strong>
                                <div style="font-size:0.7rem; color:var(--text-muted);">
                                    <span>${tx.userName || 'Aile'}</span> • <span>${tx.note || ''}</span> • <span>${tx.createdAt || ''}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <b style="color: ${isBuy ? 'var(--success)' : 'var(--danger)'}; font-size:0.85rem;">
                                ${isBuy ? '+' : ''}${formatTL(tx.valueTlDelta)}
                            </b>
                            <div style="font-size:0.7rem; color:var(--text-muted);">
                                ${isBuy ? '+' : ''}${tx.amountDelta} adet/gr
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderExpenses() {
    renderBudget();
}

// Aile Üyeleri
function renderMembers() {
    const container = document.getElementById('membersList');
    const members = appState.familyData.members || [];
    document.getElementById('memberCountBadge').textContent = members.length;

    container.innerHTML = members.map(m => {
        const isMe = appState.currentUser && m.id === appState.currentUser.id;
        return `
            <div class="member-card">
                <div class="member-avatar">${m.avatar || '👤'}</div>
                <div class="member-info">
                    <strong>${m.name} ${isMe ? '<span style="font-size: 0.7rem; color: var(--primary); font-weight: 700;">(Siz)</span>' : ''}</strong>
                    <small>${m.role}</small>
                    <span class="member-phone"><i class="fa-solid fa-phone"></i> ${m.phone}</span>
                </div>
                ${!isMe ? `
                    <button class="btn-member-msg" onclick="openDirectChat('${m.id}')" title="Özel Mesaj Gönder">
                        <i class="fa-solid fa-comment-dots"></i> Mesaj
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateMemberSelectDropdowns() {
    const members = appState.familyData ? appState.familyData.members : [];
    const taskSelect = document.getElementById('taskAssignee');
    const expenseSelect = document.getElementById('expensePayer');
    const fixedSelect = document.getElementById('fixedPayer');

    const options = members.map(m => `<option value="${m.name}">${m.avatar} ${m.name} (${m.role})</option>`).join('');

    if (taskSelect) taskSelect.innerHTML = options;
    if (expenseSelect) expenseSelect.innerHTML = options;
    if (fixedSelect) fixedSelect.innerHTML = options;
}

// ==========================================================
// 5. ETKİLEŞİM & EKLEME/SİLME FONKSİYONLARI
// ==========================================================

// Plan Kategorisi Değişimi
function onPlanCategoryChange(category) {
    const secSeyahat = document.getElementById('sectionSeyahatFields');
    const secRestoran = document.getElementById('sectionRestoranFields');
    const secEtkinlik = document.getElementById('sectionEtkinlikFields');
    const secAlisveris = document.getElementById('sectionAlisverisFields');
    const titleLabel = document.getElementById('planTitleLabel');
    const titleInput = document.getElementById('planTitleInput');

    // Hepsini gizle
    secSeyahat.classList.add('hidden');
    secRestoran.classList.add('hidden');
    secEtkinlik.classList.add('hidden');
    secAlisveris.classList.add('hidden');

    if (category === 'Seyahat') {
        secSeyahat.classList.remove('hidden');
        titleLabel.innerHTML = '<i class="fa-solid fa-heading"></i> Seyahat / Tatil Başlığı';
        titleInput.placeholder = 'Örn: Kapadokya Balon Turu veya Roma Gezisi';
    } else if (category === 'Restoran') {
        secRestoran.classList.remove('hidden');
        titleLabel.innerHTML = '<i class="fa-solid fa-store"></i> Mekan / Restoran / Kafe Adı';
        titleInput.placeholder = 'Örn: Tarihi Çınaraltı Çay Bahçesi';
    } else if (category === 'Etkinlik') {
        secEtkinlik.classList.remove('hidden');
        titleLabel.innerHTML = '<i class="fa-solid fa-masks-theater"></i> Etkinlik / Gösteri Adı';
        titleInput.placeholder = 'Örn: Fazıl Say & Serenad Bağcan Konseri';
    } else if (category === 'Alisveris') {
        secAlisveris.classList.remove('hidden');
        titleLabel.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> Ürün / İstek / Hayal Adı';
        titleInput.placeholder = 'Örn: Tam Otomatik Espresso Kahve Makinesi';
    }
}

// Plan Ekleme
async function handleAddPlan(e) {
    e.preventDefault();
    const category = document.getElementById('planCategorySelect').value;
    const title = document.getElementById('planTitleInput').value.trim();

    if (!title) {
        showToast('Lütfen plan başlığını girin.');
        return;
    }

    const newPlan = {
        id: 'plan_' + Date.now(),
        category: category,
        title: title,
        completed: false,
        addedBy: appState.currentUser.name,
        createdAt: new Date().toLocaleDateString('tr-TR')
    };

    if (category === 'Seyahat') {
        newPlan.travelType = document.getElementById('planTravelType').value;
        newPlan.travelDate = document.getElementById('planTravelDate').value.trim();
        newPlan.travelTransport = document.getElementById('planTravelTransport').value;
        const budget = document.getElementById('planTravelBudget').value.trim();
        newPlan.travelBudget = budget ? `${parseFloat(budget).toLocaleString('tr-TR')} ₺` : '';
        newPlan.travelNotes = document.getElementById('planTravelNotes').value.trim();
    } else if (category === 'Restoran') {
        newPlan.location = document.getElementById('planRestLocation').value.trim();
        newPlan.dish = document.getElementById('planRestDish').value.trim();
        newPlan.price = document.getElementById('planRestPrice').value;
        newPlan.link = document.getElementById('planRestLink').value.trim();
    } else if (category === 'Etkinlik') {
        newPlan.eventDate = document.getElementById('planEventDate').value.trim();
        newPlan.eventVenue = document.getElementById('planEventVenue').value.trim();
        newPlan.link = document.getElementById('planEventLink').value.trim();
        newPlan.attendees = document.getElementById('planEventAttendees').value.trim();
    } else if (category === 'Alisveris') {
        newPlan.link = document.getElementById('planShopLink').value.trim();
        const price = document.getElementById('planShopPrice').value.trim();
        newPlan.shopPrice = price ? `${parseFloat(price).toLocaleString('tr-TR')} ₺` : '';
        newPlan.priority = document.getElementById('planShopPriority').value;
        newPlan.shopNote = document.getElementById('planShopNote').value.trim();
    }

    // 1. SQLite API Çağrısı
    const updatedFamily = await AilemAPI.addPlan(appState.familyData.id, newPlan);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        if (!appState.familyData.plans) appState.familyData.plans = [];
        appState.familyData.plans.push(newPlan);
    }

    saveStateToStorage();
    closeModal('modalNewPlan');
    renderPlans();
    updateQuickStats();

    // Formu temizle
    document.getElementById('planTitleInput').value = '';
    showToast('Yeni aile planı kaydedildi! 🗺️');
}

async function togglePlanStatus(id) {
    const updatedFamily = await AilemAPI.togglePlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        const plan = appState.familyData.plans.find(p => p.id === id);
        if (plan) plan.completed = !plan.completed;
    }

    saveStateToStorage();
    renderPlans();
    updateQuickStats();
    showToast('Plan durumu güncellendi! ⭐');
}

async function deletePlan(id) {
    const updatedFamily = await AilemAPI.deletePlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.plans = appState.familyData.plans.filter(p => p.id !== id);
    }

    saveStateToStorage();
    renderPlans();
    updateQuickStats();
    showToast('Plan silindi.');
}

// Pano Notu Ekle / Sil
async function handleNewPost(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const tag = document.getElementById('postTag').value;

    const newPost = {
        id: 'post_' + Date.now(),
        title,
        content,
        tag,
        author: appState.currentUser.name,
        authorRole: appState.currentUser.role,
        authorAvatar: appState.currentUser.avatar,
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedFamily = await AilemAPI.addPost(appState.familyData.id, newPost);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.posts.push(newPost);
    }

    saveStateToStorage();
    closeModal('modalNewPost');
    renderPano();
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    showToast('Duyuru aile panosunda paylaşıldı! 📢');
}

async function deletePost(id) {
    const updatedFamily = await AilemAPI.deletePost(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.posts = appState.familyData.posts.filter(p => p.id !== id);
    }
    saveStateToStorage();
    renderPano();
    showToast('Not silindi.');
}

// Alışveriş Ekle / Güncelle / Sil
async function handleAddShoppingItem(e) {
    e.preventDefault();
    const title = document.getElementById('shoppingTitle').value.trim();
    const quantity = document.getElementById('shoppingQuantity').value.trim() || '1 Adet';
    const category = document.getElementById('shoppingCategory').value;

    const newItem = {
        id: 'shop_' + Date.now(),
        title,
        quantity,
        category,
        completed: false,
        addedBy: appState.currentUser.name
    };

    const updatedFamily = await AilemAPI.addShoppingItem(appState.familyData.id, newItem);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.shoppingList.push(newItem);
    }

    saveStateToStorage();
    closeModal('modalNewShopping');
    renderShopping();
    updateQuickStats();
    document.getElementById('shoppingTitle').value = '';
    showToast('Ürün listeye eklendi! 🛒');
}

async function toggleShoppingItem(id) {
    const updatedFamily = await AilemAPI.toggleShoppingItem(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        const item = appState.familyData.shoppingList.find(i => i.id === id);
        if (item) item.completed = !item.completed;
    }

    saveStateToStorage();
    renderShopping();
    updateQuickStats();
}

async function deleteShoppingItem(id) {
    const updatedFamily = await AilemAPI.deleteShoppingItem(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.shoppingList = appState.familyData.shoppingList.filter(i => i.id !== id);
    }

    saveStateToStorage();
    renderShopping();
    updateQuickStats();
    showToast('Ürün silindi.');
}

function filterShopping(category, btn) {
    appState.shoppingFilter = category;
    document.querySelectorAll('#shoppingCategoryFilter .chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderShopping();
}

// Görev Ekle / Güncelle / Sil
async function handleAddTask(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const assignee = document.getElementById('taskAssignee').value;
    const dueDate = document.getElementById('taskDueDate').value;

    const newTask = {
        id: 'task_' + Date.now(),
        title,
        assignee,
        dueDate,
        completed: false,
        addedBy: appState.currentUser.name
    };

    const updatedFamily = await AilemAPI.addTask(appState.familyData.id, newTask);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.tasks.push(newTask);
    }

    saveStateToStorage();
    closeModal('modalNewTask');
    renderTasks();
    updateQuickStats();
    document.getElementById('taskTitle').value = '';
    showToast('Görev aile üyesine atandı! ✅');
}

async function toggleTask(id) {
    const updatedFamily = await AilemAPI.toggleTask(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        const task = appState.familyData.tasks.find(t => t.id === id);
        if (task) task.completed = !task.completed;
    }

    saveStateToStorage();
    renderTasks();
    updateQuickStats();
    showToast('Görev durumu güncellendi! 🌟');
}

async function deleteTask(id) {
    const updatedFamily = await AilemAPI.deleteTask(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.tasks = appState.familyData.tasks.filter(t => t.id !== id);
    }

    saveStateToStorage();
    renderTasks();
    updateQuickStats();
    showToast('Görev silindi.');
}

function filterTasks(status, btn) {
    appState.taskFilter = status;
    const parent = btn.parentElement;
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
}

// ==========================================================
// BÜTÇE, MAAŞ, SABİT GİDER VE YATIRIM ETKİLEŞİMLERİ
// ==========================================================

// Alt Sekme Geçişi (Harcamalar, Sabit Giderler, Yatırımlar)
function switchBudgetSubTab(tabKey) {
    appState.activeBudgetSubTab = tabKey;

    // Subtab butonları aktifliği
    document.querySelectorAll('.budget-subtab-btn').forEach(btn => btn.classList.remove('active'));
    const activeSubBtn = document.getElementById(tabKey === 'expenses' ? 'subtabBtnExpenses' : (tabKey === 'fixed' ? 'subtabBtnFixed' : 'subtabBtnInvestments'));
    if (activeSubBtn) activeSubBtn.classList.add('active');

    // Subview panellerini göster/gizle
    const viewExp = document.getElementById('budgetViewExpenses');
    const viewFixed = document.getElementById('budgetViewFixed');
    const viewInv = document.getElementById('budgetViewInvestments');

    if (viewExp) viewExp.classList.toggle('hidden', tabKey !== 'expenses');
    if (viewFixed) viewFixed.classList.toggle('hidden', tabKey !== 'fixed');
    if (viewInv) viewInv.classList.toggle('hidden', tabKey !== 'investments');

    // Header Ekle Buton Metnini Güncelle
    const btnActionText = document.getElementById('budgetActionBtnText');
    if (btnActionText) {
        if (tabKey === 'expenses') btnActionText.textContent = 'Harcama Ekle';
        else if (tabKey === 'fixed') btnActionText.textContent = 'Sabit Gider Ekle';
        else if (tabKey === 'investments') btnActionText.textContent = 'Yatırım Ekle';
    }
}

function openCurrentBudgetActionModal() {
    if (appState.activeBudgetSubTab === 'expenses') {
        openModal('modalNewExpense');
    } else if (appState.activeBudgetSubTab === 'fixed') {
        openModal('modalNewFixedExpense');
    } else if (appState.activeBudgetSubTab === 'investments') {
        openModal('modalNewInvestment');
    }
}

// 1. Aylık Maaş Modalını Aç ve Kaydet
function openMySalaryModal() {
    const user = appState.currentUser;
    const family = appState.familyData;
    if (!user || !family) return;

    const userDisplay = document.getElementById('salaryUserNameDisplay');
    if (userDisplay) userDisplay.value = `${user.avatar} ${user.name} (${user.role})`;

    const sal = (family.salaries || []).find(s => s.userId === user.id);
    const amountInput = document.getElementById('salaryAmountInput');
    const payDayInput = document.getElementById('salaryPayDayInput');
    const noteInput = document.getElementById('salaryNoteInput');

    if (sal) {
        if (amountInput) amountInput.value = sal.amount;
        if (payDayInput) payDayInput.value = sal.payDay || 1;
        if (noteInput) noteInput.value = sal.note || '';
    } else {
        if (amountInput) amountInput.value = '';
        if (payDayInput) payDayInput.value = '1';
        if (noteInput) noteInput.value = '';
    }

    openModal('modalMySalary');
}

async function handleSaveSalary(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const family = appState.familyData;
    if (!user || !family) return;

    const amount = parseFloat(document.getElementById('salaryAmountInput').value);
    const payDay = parseInt(document.getElementById('salaryPayDayInput').value, 10) || 1;
    const note = document.getElementById('salaryNoteInput').value.trim();

    if (!amount || amount <= 0) {
        showToast('Lütfen geçerli bir maaş tutarı girin.');
        return;
    }

    const salaryData = {
        id: 'sal_' + Date.now(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userAvatar: user.avatar,
        amount: amount,
        note: note,
        payDay: payDay
    };

    const updatedFamily = await AilemAPI.setSalary(family.id, salaryData);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        if (!appState.familyData.salaries) appState.familyData.salaries = [];
        const idx = appState.familyData.salaries.findIndex(s => s.userId === user.id);
        if (idx >= 0) {
            appState.familyData.salaries[idx] = salaryData;
        } else {
            appState.familyData.salaries.push(salaryData);
        }
    }

    saveStateToStorage();
    closeModal('modalMySalary');
    renderBudget();
    showToast('Aylık maaşınız başarıyla kaydedildi! 💵');
}

// 2. Harcama Ekle / Sil
async function handleAddExpense(e) {
    e.preventDefault();
    const title = document.getElementById('expenseTitle').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const payer = document.getElementById('expensePayer').value;

    if (!amount || amount <= 0) {
        showToast('Lütfen geçerli bir tutar girin.');
        return;
    }

    const newExpense = {
        id: 'exp_' + Date.now(),
        title,
        amount,
        category,
        payer,
        date: new Date().toLocaleDateString('tr-TR')
    };

    const updatedFamily = await AilemAPI.addExpense(appState.familyData.id, newExpense);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.expenses.push(newExpense);
    }

    saveStateToStorage();
    closeModal('modalNewExpense');
    renderBudget();
    document.getElementById('expenseTitle').value = '';
    document.getElementById('expenseAmount').value = '';
    showToast('Harcama kaydedildi! 💰');
}

async function deleteExpense(id) {
    if (!confirm('Bu harcamayı silmek istediğinize emin misiniz?')) return;
    const updatedFamily = await AilemAPI.deleteExpense(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.expenses = appState.familyData.expenses.filter(e => e.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Harcama silindi.');
}

// 3. Sabit Gider Ekle / Ödendi İşaretle / Sil
async function handleAddFixedExpense(e) {
    e.preventDefault();
    const title = document.getElementById('fixedTitle').value.trim();
    const amount = parseFloat(document.getElementById('fixedAmount').value);
    const category = document.getElementById('fixedCategory').value;
    const dueDay = parseInt(document.getElementById('fixedDueDay').value, 10) || 1;
    const payer = document.getElementById('fixedPayer').value;
    const notes = document.getElementById('fixedNotes').value.trim();

    if (!title || !amount || amount <= 0) {
        showToast('Lütfen sabit gider tanımı ve tutarını girin.');
        return;
    }

    const newFixed = {
        id: 'fix_' + Date.now(),
        title,
        amount,
        category,
        dueDay,
        isPaid: false,
        payer,
        notes
    };

    const updatedFamily = await AilemAPI.addFixedExpense(appState.familyData.id, newFixed);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        if (!appState.familyData.fixedExpenses) appState.familyData.fixedExpenses = [];
        appState.familyData.fixedExpenses.push(newFixed);
    }

    saveStateToStorage();
    closeModal('modalNewFixedExpense');
    renderBudget();
    document.getElementById('fixedTitle').value = '';
    document.getElementById('fixedAmount').value = '';
    document.getElementById('fixedNotes').value = '';
    showToast('Sabit gider kaydedildi! 📑');
}

async function handleToggleFixedExpense(id) {
    const updatedFamily = await AilemAPI.toggleFixedExpense(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        const item = (appState.familyData.fixedExpenses || []).find(f => f.id === id);
        if (item) item.isPaid = !item.isPaid;
    }

    saveStateToStorage();
    renderBudget();
    showToast('Sabit gider ödeme durumu güncellendi! ✅');
}

async function handleDeleteFixedExpense(id) {
    if (!confirm('Bu sabit gideri silmek istediğinize emin misiniz?')) return;
    const updatedFamily = await AilemAPI.deleteFixedExpense(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.fixedExpenses = (appState.familyData.fixedExpenses || []).filter(f => f.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Sabit gider silindi.');
}

function filterFixedExpenses(status, btn) {
    appState.fixedStatusFilter = status;
    const parent = btn.parentElement;
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderFixedExpenses();
}

// 4. Altınkaynak Canlı Piyasa ve Yatırımlar Portföy Yönetimi
async function fetchLiveMarketRates(forceRefresh = false) {
    const btnRefresh = document.getElementById('btnRefreshRates');
    if (btnRefresh) btnRefresh.classList.add('spinning');

    const result = await AilemAPI.getMarketRates(forceRefresh);
    if (btnRefresh) {
        setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
    }

    if (result && result.rates) {
        appState.marketRates = result.rates;
        appState.lastMarketRatesFetch = Date.now();

        // Ticker UI güncelle
        const elGold = document.getElementById('tickerGramGold');
        const elUsd = document.getElementById('tickerUsd');
        const elEur = document.getElementById('tickerEur');
        const elCeyrek = document.getElementById('tickerCeyrek');
        const elTime = document.getElementById('ratesLastUpdated');

        if (elGold && result.rates.ALTIN) {
            elGold.textContent = (result.rates.ALTIN.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        }
        if (elUsd && result.rates.USD) {
            elUsd.textContent = (result.rates.USD.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        }
        if (elEur && result.rates.EUR) {
            elEur.textContent = (result.rates.EUR.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        }
        if (elCeyrek && result.rates.CEYREK) {
            elCeyrek.textContent = (result.rates.CEYREK.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        }
        if (elTime) {
            elTime.textContent = result.lastUpdated ? `${result.lastUpdated}` : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }

        // Portföydeki yatırım kalemlerinin TL karşılıklarını anlık kura göre güncelle
        if (appState.familyData) {
            recalculateInvestmentsWithLiveRates();
            renderBudget();
        }
    }
}

function recalculateInvestmentsWithLiveRates() {
    if (!appState.familyData || !appState.familyData.investments || !appState.marketRates) return;
    const rates = appState.marketRates;

    appState.familyData.investments.forEach(inv => {
        let unitRate = null;
        if (inv.category === 'Altın') {
            const isCeyrek = (inv.unit && inv.unit.toLowerCase().includes('çeyrek')) || (inv.title && inv.title.toLowerCase().includes('çeyrek'));
            unitRate = (isCeyrek && rates.CEYREK) ? rates.CEYREK.sell : (rates.ALTIN ? rates.ALTIN.sell : null);
        } else if (inv.category === 'Dolar') {
            unitRate = rates.USD ? rates.USD.sell : null;
        } else if (inv.category === 'Euro') {
            unitRate = rates.EUR ? rates.EUR.sell : null;
        } else if (inv.category === 'TL') {
            unitRate = 1;
        }

        if (unitRate && inv.amount) {
            inv.currentValueTl = inv.amount * unitRate;
            inv.liveRate = unitRate;
        }
    });
}

function onInvestmentCategoryChange(cat) {
    const unitInput = document.getElementById('invUnit');
    const titleInput = document.getElementById('invTitle');

    if (unitInput) {
        if (cat === 'Altın') {
            unitInput.value = 'Gram';
            if (titleInput && (!titleInput.value || titleInput.value.includes('Dolar') || titleInput.value.includes('Euro') || titleInput.value.includes('TL'))) {
                titleInput.value = 'Gram Altın';
            }
        } else if (cat === 'Dolar') {
            unitInput.value = 'USD';
            if (titleInput && (!titleInput.value || titleInput.value.includes('Altın') || titleInput.value.includes('Euro') || titleInput.value.includes('TL'))) {
                titleInput.value = 'Amerikan Doları (USD)';
            }
        } else if (cat === 'Euro') {
            unitInput.value = 'EUR';
            if (titleInput && (!titleInput.value || titleInput.value.includes('Altın') || titleInput.value.includes('Dolar') || titleInput.value.includes('TL'))) {
                titleInput.value = 'Euro (EUR)';
            }
        } else if (cat === 'TL') {
            unitInput.value = 'TL';
            if (titleInput && (!titleInput.value || titleInput.value.includes('Altın') || titleInput.value.includes('Dolar') || titleInput.value.includes('Euro'))) {
                titleInput.value = 'Nakit / Mevduat (TL)';
            }
        }
    }
    autoCalculateInvestmentTL();
}

function autoCalculateInvestmentTL() {
    const cat = document.getElementById('invCategory')?.value || 'Altın';
    const amount = parseFloat(document.getElementById('invAmount')?.value) || 0;
    const valueInput = document.getElementById('invValueTl');
    const badge = document.getElementById('invLiveRateBadge');
    const infoText = document.getElementById('invLiveRateInfo') || document.getElementById('invLiveRateText');

    const rates = appState.marketRates || {
        ALTIN: { sell: 3500 },
        USD: { sell: 38.5 },
        EUR: { sell: 42.0 },
        CEYREK: { sell: 5750 },
        TL: { sell: 1 }
    };

    let unitRate = 1;
    let rateLabel = '';

    if (cat === 'Altın') {
        const unit = document.getElementById('invUnit')?.value || 'Gram';
        if (unit.toLowerCase().includes('çeyrek') || unit.toLowerCase().includes('ceyrek')) {
            unitRate = (rates.CEYREK && rates.CEYREK.sell) ? rates.CEYREK.sell : 5700;
            rateLabel = `1 Çeyrek Altın = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
        } else {
            unitRate = (rates.ALTIN && rates.ALTIN.sell) ? rates.ALTIN.sell : 3500;
            rateLabel = `1 Gram Altın = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
        }
    } else if (cat === 'Dolar') {
        unitRate = (rates.USD && rates.USD.sell) ? rates.USD.sell : 38.5;
        rateLabel = `1 Dolar (USD) = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
    } else if (cat === 'Euro') {
        unitRate = (rates.EUR && rates.EUR.sell) ? rates.EUR.sell : 42.0;
        rateLabel = `1 Euro (EUR) = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
    } else if (cat === 'TL') {
        unitRate = 1;
        rateLabel = `1 TL = 1.00 ₺ (Türk Lirası)`;
    }

    const totalTl = (amount * unitRate);
    if (valueInput && amount > 0) {
        valueInput.value = totalTl.toFixed(2);
    }

    if (badge && infoText) {
        badge.classList.remove('hidden');
        if (amount > 0) {
            infoText.innerHTML = `<strong>${rateLabel}</strong><br>Toplam Portföy Değeri: <b>${totalTl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</b>`;
        } else {
            infoText.innerHTML = `<strong>${rateLabel}</strong>`;
        }
    }
}

async function handleAddInvestment(e) {
    e.preventDefault();
    const title = document.getElementById('invTitle').value.trim();
    const category = document.getElementById('invCategory').value;
    const amount = parseFloat(document.getElementById('invAmount').value);
    const unit = document.getElementById('invUnit').value.trim() || 'Adet';
    const currentValueTl = parseFloat(document.getElementById('invValueTl').value);
    const notes = document.getElementById('invNotes').value.trim();

    if (!title || isNaN(amount) || isNaN(currentValueTl)) {
        showToast('Lütfen tüm yatırım bilgilerini eksiksiz doldurun.');
        return;
    }

    const newInv = {
        id: 'inv_' + Date.now(),
        title,
        category,
        amount,
        unit,
        currentValueTl,
        notes,
        userName: appState.currentUser.name
    };

    const updatedFamily = await AilemAPI.addInvestment(appState.familyData.id, newInv);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        if (!appState.familyData.investments) appState.familyData.investments = [];
        appState.familyData.investments.push(newInv);
    }

    saveStateToStorage();
    closeModal('modalNewInvestment');
    renderBudget();
    document.getElementById('invTitle').value = '';
    document.getElementById('invAmount').value = '';
    document.getElementById('invValueTl').value = '';
    document.getElementById('invNotes').value = '';
    showToast('Yeni yatırım portföye eklendi! 💎');
}

function openAdjustInvestmentModal(invId, type = 'buy') {
    const family = appState.familyData;
    if (!family) return;

    const inv = (family.investments || []).find(i => i.id === invId);
    if (!inv) return;

    appState.currentAdjustInvestmentId = invId;
    document.getElementById('adjustInvId').value = invId;
    document.getElementById('adjustInvName').textContent = `${INVESTMENT_ICONS[inv.category] || '💎'} ${inv.title}`;
    document.getElementById('adjustInvCurrentStats').textContent = `Mevcut: ${inv.amount} ${inv.unit} (${formatTL(inv.currentValueTl)})`;
    
    document.getElementById('adjustAmountDelta').value = '';
    document.getElementById('adjustValueDelta').value = '';
    document.getElementById('adjustNote').value = '';

    setAdjustType(type);
    openModal('modalInvestmentAdjust');
}

function setAdjustType(type) {
    appState.currentAdjustType = type;
    const btnBuy = document.getElementById('btnTypeBuy');
    const btnSell = document.getElementById('btnTypeSell');
    const modalTitle = document.getElementById('adjustModalTitle');
    const lblAmount = document.getElementById('lblAdjustAmount');
    const lblValue = document.getElementById('lblAdjustValue');
    const btnSubmit = document.getElementById('btnSubmitAdjust');

    if (btnBuy) btnBuy.classList.toggle('active', type === 'buy');
    if (btnSell) btnSell.classList.toggle('active', type === 'sell');

    if (type === 'buy') {
        if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-circle-plus" style="color:var(--success);"></i> Yatırım Ekle / Satın Al';
        if (lblAmount) lblAmount.innerHTML = '<i class="fa-solid fa-calculator"></i> Eklenecek Miktar';
        if (lblValue) lblValue.innerHTML = '<i class="fa-solid fa-turkish-lira-sign"></i> Eklenecek TL Değeri (₺)';
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Ekle / Portföyü Büyüt';
    } else {
        if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-circle-minus" style="color:var(--danger);"></i> Yatırım Bozdur / Sat';
        if (lblAmount) lblAmount.innerHTML = '<i class="fa-solid fa-calculator"></i> Bozdurulacak Miktar';
        if (lblValue) lblValue.innerHTML = '<i class="fa-solid fa-turkish-lira-sign"></i> Çekilen TL Tutarı (₺)';
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-minus-circle"></i> Bozdur / Tutarı Çıkar';
    }
}

function autoCalculateAdjustTL() {
    const invId = document.getElementById('adjustInvId')?.value || appState.currentAdjustInvestmentId;
    const family = appState.familyData;
    if (!family || !invId) return;

    const inv = (family.investments || []).find(i => i.id === invId);
    if (!inv) return;

    const amountDelta = parseFloat(document.getElementById('adjustAmountDelta')?.value) || 0;
    const valueDeltaInput = document.getElementById('adjustValueDelta');
    if (!valueDeltaInput || amountDelta <= 0) return;

    const rates = appState.marketRates || {};
    let unitRate = 1;

    if (inv.category === 'Altın') {
        const isCeyrek = (inv.unit && inv.unit.toLowerCase().includes('çeyrek')) || (inv.title && inv.title.toLowerCase().includes('çeyrek'));
        unitRate = isCeyrek && rates.CEYREK ? rates.CEYREK.sell : (rates.ALTIN ? rates.ALTIN.sell : (inv.currentValueTl / (inv.amount || 1)));
    } else if (inv.category === 'Dolar') {
        unitRate = rates.USD ? rates.USD.sell : (inv.currentValueTl / (inv.amount || 1));
    } else if (inv.category === 'Euro') {
        unitRate = rates.EUR ? rates.EUR.sell : (inv.currentValueTl / (inv.amount || 1));
    } else if (inv.category === 'TL') {
        unitRate = 1;
    } else {
        unitRate = (inv.currentValueTl / (inv.amount || 1));
    }

    valueDeltaInput.value = (amountDelta * unitRate).toFixed(2);
}

async function handleAdjustInvestment(e) {
    e.preventDefault();
    const invId = document.getElementById('adjustInvId').value || appState.currentAdjustInvestmentId;
    const type = appState.currentAdjustType || 'buy';
    const amountDelta = parseFloat(document.getElementById('adjustAmountDelta').value);
    const valueDelta = parseFloat(document.getElementById('adjustValueDelta').value);
    const note = document.getElementById('adjustNote').value.trim();

    if (isNaN(amountDelta) || amountDelta <= 0 || isNaN(valueDelta) || valueDelta <= 0) {
        showToast('Lütfen geçerli bir miktar ve TL tutarı girin.');
        return;
    }

    const adjustment = {
        type,
        amountDelta,
        valueDelta,
        note,
        userName: appState.currentUser ? appState.currentUser.name : 'Aile'
    };

    const updatedFamily = await AilemAPI.adjustInvestment(appState.familyData.id, invId, adjustment);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        const inv = (appState.familyData.investments || []).find(i => i.id === invId);
        if (inv) {
            if (type === 'sell') {
                inv.amount = Math.max(0, inv.amount - amountDelta);
                inv.currentValueTl = Math.max(0, inv.currentValueTl - valueDelta);
            } else {
                inv.amount = inv.amount + amountDelta;
                inv.currentValueTl = inv.currentValueTl + valueDelta;
            }
        }
    }

    saveStateToStorage();
    closeModal('modalInvestmentAdjust');
    renderBudget();
    showToast(type === 'buy' ? 'Portföye yatırım eklendi! 📈' : 'Yatırım bozduruldu / güncellendi! 💰');
}

async function handleDeleteInvestment(id) {
    if (!confirm('Bu yatırım kalemini ve geçmişini silmek istediğinize emin misiniz?')) return;
    const updatedFamily = await AilemAPI.deleteInvestment(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        appState.familyData.investments = (appState.familyData.investments || []).filter(i => i.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Yatırım kalemi silindi.');
}

// Yeni Üye Ekle
function handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('newMemberName').value.trim();
    const phone = document.getElementById('newMemberPhone').value.trim();
    const role = document.getElementById('newMemberRole').value;

    const newMember = {
        id: 'usr_' + Date.now(),
        name,
        phone,
        role,
        avatar: ROLE_AVATARS[role] || '👤'
    };

    appState.familyData.members.push(newMember);
    saveStateToStorage();
    closeModal('modalAddMember');
    renderMembers();
    updateMemberSelectDropdowns();
    updateQuickStats();
    document.getElementById('newMemberName').value = '';
    document.getElementById('newMemberPhone').value = '';
    showToast(`${name} aileye eklendi! 🎉`);
}

// ==========================================================
// 6. KULLANICI DEĞİŞTİRME & ÇIKIŞ
// ==========================================================
function openSwitchUserModal() {
    const container = document.getElementById('switchUserListContainer');
    const members = appState.familyData.members || [];

    container.innerHTML = members.map(m => `
        <div class="switch-user-btn ${m.id === appState.currentUser.id ? 'active' : ''}" onclick="switchActiveUser('${m.id}')">
            <div class="switch-user-left">
                <span style="font-size: 24px;">${m.avatar}</span>
                <div>
                    <b>${m.name}</b>
                    <small style="display:block; color:#64748b;">${m.role} • ${m.phone}</small>
                </div>
            </div>
            ${m.id === appState.currentUser.id ? '<span style="color:var(--primary); font-weight:bold;"><i class="fa-solid fa-check"></i> Aktif</span>' : ''}
        </div>
    `).join('');

    openModal('modalSwitchUser');
}

function switchActiveUser(userId) {
    const member = appState.familyData.members.find(m => m.id === userId);
    if (member) {
        appState.currentUser = member;
        saveStateToStorage();
        closeModal('modalSwitchUser');
        renderApp();
        showToast(`Profil değiştirildi: ${member.name} (${member.role})`);
    }
}

function openProfileModal() {
    openSwitchUserModal();
}

function logout() {
    if (confirm('Uygulamadan çıkış yapmak istediğinize emin misiniz?')) {
        localStorage.removeItem('ailem_current_user');
        appState.currentUser = null;
        switchAuthMode('login');
        renderApp();
        showToast('Çıkış yapıldı.');
    }
}

// ==========================================================
// 7. PAYLAŞIM VE DAVET İŞLEMLERİ
// ==========================================================
function copyInviteCode() {
    const code = appState.familyData.inviteCode;
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Davet Kodu Kopyalandı: ${code} 📋`);
    });
}

function shareInviteCode() {
    const family = appState.familyData;
    const msg = encodeURIComponent(`Selam! ${family.name} uygulamamıza katılmak için davet kodumuz: *${family.inviteCode}*\nUygulamayı açıp 'Aileye Katıl' butonuna bu kodu girebilirsin! 🏠`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
}

function shareFamilyWhatsApp() {
    const family = appState.familyData;
    const msg = encodeURIComponent(`Merhaba ${family.name}! Aile uygulamamızda yeni bildirimler ve alışveriş listesi güncellendi. 🌟`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
}

// ==========================================================
// 7.5 AİLE MESAJLAŞMA, SOHBET & BİLDİRİM SİSTEMİ
// ==========================================================

// Web Audio API ile 2 Tonlu Tatlı Bildirim Sesi (Melodi)
function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // 1. Ton (587.33 Hz - Re/D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain1.gain.setValueAtTime(0.18, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.16);

        // 2. Ton (880 Hz - La/A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.38);
    } catch (e) {
        console.log('Ses oynatma atlandı:', e);
    }
}

// Titreşim ve Sesli Uyarı
function triggerHapticAndSound() {
    playNotificationSound();
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate([80, 40, 100]);
        } catch (e) {}
    }
}

// Web Bildirimi Açma / Kapatma
async function requestAndToggleNotifications() {
    if (!('Notification' in window)) {
        showToast('Tarayıcınız Web Bildirimlerini desteklemiyor.');
        return;
    }

    if (Notification.permission === 'granted') {
        appState.notificationsEnabled = !appState.notificationsEnabled;
        const btn = document.getElementById('btnToggleNotifications');
        if (btn) btn.classList.toggle('active', appState.notificationsEnabled);
        showToast(appState.notificationsEnabled ? 'Anlık bildirimler devrede! 🔔' : 'Bildirimler kapatıldı.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        appState.notificationsEnabled = true;
        const btn = document.getElementById('btnToggleNotifications');
        if (btn) btn.classList.add('active');
        showToast('Bildirim izni verildi! Anlık mesaj bildirimleri açık. 🔔');
    } else {
        showToast('Bildirim izni verilmedi.');
    }
}

// Uygulama İçi Yüzen Mesaj Bildirim Kartı
let inAppMsgTimeout = null;
function showInAppMessageBanner(msg) {
    const banner = document.getElementById('inAppMsgBanner');
    const avatar = document.getElementById('inAppMsgAvatar');
    const sender = document.getElementById('inAppMsgSender');
    const text = document.getElementById('inAppMsgText');

    if (!banner || !sender || !text) return;

    if (avatar) avatar.textContent = msg.senderAvatar || '💬';
    sender.textContent = `${msg.senderName} (${msg.senderRole || ''})`;
    text.textContent = msg.content;

    banner.classList.remove('hidden');

    banner.dataset.targetSenderId = msg.senderId;
    banner.dataset.isGroup = (msg.receiverId === 'group' || msg.receiver_id === 'group') ? 'true' : 'false';

    if (inAppMsgTimeout) clearTimeout(inAppMsgTimeout);
    inAppMsgTimeout = setTimeout(() => {
        banner.classList.add('hidden');
    }, 4500);
}

function closeInAppMsgBanner(e) {
    if (e) e.stopPropagation();
    const banner = document.getElementById('inAppMsgBanner');
    if (banner) banner.classList.add('hidden');
}

function openActiveChatFromBanner() {
    const banner = document.getElementById('inAppMsgBanner');
    if (!banner) return;
    const isGroup = banner.dataset.isGroup === 'true';
    const targetSenderId = banner.dataset.targetSenderId;
    banner.classList.add('hidden');

    if (isGroup) {
        openFamilyGroupChat();
    } else if (targetSenderId) {
        openDirectChat(targetSenderId);
    }
}

// Sohbet Arayüzünü Render Et
function renderChat() {
    const family = appState.familyData;
    const currentUser = appState.currentUser;
    if (!family || !currentUser) return;

    if (!family.messages) family.messages = [];
    const messages = family.messages;
    const members = family.members || [];
    const otherMembers = members.filter(m => m.id !== currentUser.id);

    // Bireysel hedef üye seçimi varsayılanı
    if (appState.chatChannel === 'direct' && !appState.chatTargetMemberId && otherMembers.length > 0) {
        appState.chatTargetMemberId = otherMembers[0].id;
    }

    // 1. Kanal Butonları
    const btnGroup = document.getElementById('btnChannelGroup');
    const btnDirect = document.getElementById('btnChannelDirect');
    const directMembersContainer = document.getElementById('directChatMemberList');

    if (btnGroup) btnGroup.classList.toggle('active', appState.chatChannel === 'group');
    if (btnDirect) btnDirect.classList.toggle('active', appState.chatChannel === 'direct');

    // 2. Bireysel Üye Seçim Barı
    if (directMembersContainer) {
        if (appState.chatChannel === 'direct') {
            directMembersContainer.classList.remove('hidden');
            directMembersContainer.innerHTML = otherMembers.map(m => {
                const isSelected = m.id === appState.chatTargetMemberId;
                const unreadFromMember = messages.filter(msg => 
                    msg.senderId === m.id && 
                    msg.receiverId === currentUser.id && 
                    !msg.isRead
                ).length;

                return `
                    <div class="direct-member-chip ${isSelected ? 'active' : ''}" onclick="switchDirectMember('${m.id}')">
                        <span class="chip-avatar">${m.avatar || '👤'}</span>
                        <span class="chip-name">${m.name.split(' ')[0]}</span>
                        ${unreadFromMember > 0 ? `<span class="chip-unread-badge">${unreadFromMember}</span>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            directMembersContainer.classList.add('hidden');
        }
    }

    // 3. Aktif Sohbet Başlığı ve Durumu
    const activeAvatar = document.getElementById('activeChatAvatar');
    const activeTitle = document.getElementById('activeChatTitle');
    const activeSubtitle = document.getElementById('activeChatSubtitle');

    let currentChatMessages = [];
    let chatPartnerName = '';

    if (appState.chatChannel === 'group') {
        if (activeAvatar) activeAvatar.textContent = '👨‍👩‍👧‍👦';
        if (activeTitle) activeTitle.textContent = `${family.name} Grubu`;
        if (activeSubtitle) activeSubtitle.textContent = `🟢 ${members.length} Aile Bireyi • Çevrim İçi`;
        currentChatMessages = messages.filter(m => m.receiverId === 'group' || m.receiver_id === 'group');
    } else {
        const partner = members.find(m => m.id === appState.chatTargetMemberId);
        chatPartnerName = partner ? partner.name : 'Aile Bireyi';
        if (activeAvatar) activeAvatar.textContent = partner ? partner.avatar : '👤';
        if (activeTitle) activeTitle.textContent = partner ? `${partner.name} (${partner.role})` : 'Özel Sohbet';
        if (activeSubtitle) activeSubtitle.textContent = `🔒 Bireysel Özel Mesajlaşma • ${partner ? partner.phone : ''}`;

        if (partner) {
            currentChatMessages = messages.filter(m => 
                (m.senderId === currentUser.id && m.receiverId === partner.id) ||
                (m.senderId === partner.id && m.receiverId === currentUser.id)
            );
        }
    }

    // 4. Mesaj Baloncuklarını Render Et
    const msgContainer = document.getElementById('chatMessagesContainer');
    if (msgContainer) {
        if (currentChatMessages.length === 0) {
            msgContainer.innerHTML = `
                <div class="empty-state" style="padding: 40px 10px;">
                    <i class="fa-solid fa-comments" style="font-size: 32px; color: #cbd5e1;"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: #64748b;">
                        ${appState.chatChannel === 'group' ? 'Aile grubunda henüz mesaj yok. İlk mesajı siz yazın! 🎉' : `${chatPartnerName} ile ilk özel mesajınızı başlatın! 💬`}
                    </p>
                </div>
            `;
        } else {
            msgContainer.innerHTML = currentChatMessages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return `
                    <div class="chat-bubble-row ${isMe ? 'sent' : 'received'}">
                        <div class="chat-bubble">
                            ${!isMe ? `
                                <div class="chat-sender-header">
                                    <span>${msg.senderAvatar || '👤'}</span>
                                    <span>${msg.senderName} (${msg.senderRole || ''})</span>
                                </div>
                            ` : ''}
                            <div class="chat-bubble-text">${escapeHtml(msg.content)}</div>
                            <div class="chat-meta-footer">
                                <span>${msg.createdAt || ''}</span>
                                ${isMe ? `<i class="fa-solid fa-check-double" style="font-size: 10px; color: ${msg.isRead ? '#60a5fa' : 'rgba(255,255,255,0.7)'};"></i>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Otomatik en alta kaydır
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    }

    // 5. Okunmamış Mesajları Okundu Yap
    if (appState.currentTab === 'tabChat') {
        const partnerId = appState.chatChannel === 'group' ? 'group' : appState.chatTargetMemberId;
        if (partnerId) {
            markMessagesRead(partnerId);
        }
    }

    // 6. Rozetleri Güncelle
    updateChatUnreadCounts();
}

function updateChatUnreadCounts() {
    const family = appState.familyData;
    const currentUser = appState.currentUser;
    if (!family || !currentUser) return;

    const messages = family.messages || [];

    // Grup okunmamış sayısı (kendi gönderdiklerimiz hariç)
    const unreadGroup = messages.filter(m => 
        (m.receiverId === 'group' || m.receiver_id === 'group') && 
        m.senderId !== currentUser.id && 
        !m.isRead
    ).length;

    // Özel mesajlar okunmamış sayısı (bize gelenler)
    const unreadDirect = messages.filter(m => 
        m.receiverId === currentUser.id && 
        !m.isRead
    ).length;

    const totalUnread = unreadGroup + unreadDirect;

    // Header rozeti
    const headerBadge = document.getElementById('headerChatBadge');
    if (headerBadge) {
        headerBadge.textContent = totalUnread;
        headerBadge.classList.toggle('hidden', totalUnread === 0);
    }

    // Quick info pill
    const quickUnread = document.getElementById('quickUnreadMessages');
    if (quickUnread) {
        quickUnread.textContent = totalUnread;
    }

    // Alt navigasyon rozeti
    const navChatBadge = document.getElementById('navChatBadge');
    if (navChatBadge) {
        navChatBadge.textContent = totalUnread;
        navChatBadge.classList.toggle('hidden', totalUnread === 0);
    }

    // Kanal rozetleri
    const groupBadge = document.getElementById('groupUnreadBadge');
    if (groupBadge) {
        groupBadge.textContent = unreadGroup;
        groupBadge.classList.toggle('hidden', unreadGroup === 0);
    }

    const directBadge = document.getElementById('directUnreadBadge');
    if (directBadge) {
        directBadge.textContent = unreadDirect;
        directBadge.classList.toggle('hidden', unreadDirect === 0);
    }
}

async function markMessagesRead(chatPartnerId) {
    if (!appState.familyData || !appState.currentUser) return;
    const familyId = appState.familyData.id;
    const currentUserId = appState.currentUser.id;

    let changed = false;
    (appState.familyData.messages || []).forEach(m => {
        if (chatPartnerId === 'group') {
            if ((m.receiverId === 'group' || m.receiver_id === 'group') && m.senderId !== currentUserId && !m.isRead) {
                m.isRead = 1;
                changed = true;
            }
        } else {
            if (m.senderId === chatPartnerId && m.receiverId === currentUserId && !m.isRead) {
                m.isRead = 1;
                changed = true;
            }
        }
    });

    if (changed) {
        saveStateToStorage();
        updateChatUnreadCounts();
        // SQLite Sunucusuna bildir
        await AilemAPI.markMessagesAsRead(familyId, currentUserId, chatPartnerId);
    }
}

function switchChatChannel(channel) {
    appState.chatChannel = channel;
    renderChat();
}

function switchDirectMember(memberId) {
    appState.chatTargetMemberId = memberId;
    renderChat();
}

function openFamilyGroupChat() {
    appState.chatChannel = 'group';
    switchTab('tabChat');
    renderChat();
}

function openDirectChat(memberId) {
    appState.chatChannel = 'direct';
    appState.chatTargetMemberId = memberId;
    switchTab('tabChat');
    renderChat();
}

async function handleSendChatMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('chatTextInput');
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    const currentUser = appState.currentUser;
    const family = appState.familyData;
    if (!currentUser || !family) return;

    const receiverId = (appState.chatChannel === 'group') ? 'group' : (appState.chatTargetMemberId || 'group');

    const newMsg = {
        id: 'msg_' + Date.now(),
        familyId: family.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatar,
        receiverId: receiverId,
        content: content,
        messageType: 'text',
        isRead: 0,
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    input.value = '';

    // Sunucuya gönder
    const updatedFamily = await AilemAPI.sendMessage(family.id, newMsg);
    if (updatedFamily) {
        appState.familyData = updatedFamily;
    } else {
        if (!appState.familyData.messages) appState.familyData.messages = [];
        appState.familyData.messages.push(newMsg);
    }

    saveStateToStorage();
    renderChat();
    updateChatUnreadCounts();
}

function sendQuickReply(text) {
    const input = document.getElementById('chatTextInput');
    if (input) {
        input.value = text;
        handleSendChatMessage(new Event('submit', { cancelable: true }));
    }
}

function appendChatEmoji(emoji) {
    const input = document.getElementById('chatTextInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ==========================================================
// 8. NAVİGASYON & TAB GEÇİŞLERİ
// ==========================================================
function switchTab(tabId, navBtn) {
    appState.currentTab = tabId;

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) targetPanel.classList.add('active');

    if (tabId === 'tabChat') {
        renderChat();
    }

    // Hem Mobil Bottom Nav hem de Masaüstü Sidebar Öğelerini Senkronize Et
    document.querySelectorAll('[data-tab-target]').forEach(el => {
        if (el.getAttribute('data-tab-target') === tabId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Scroll başa al
    const mainWrapper = document.querySelector('.app-main-wrapper');
    if (mainWrapper) mainWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================
// 9. MODAL & TOAST YARDIMCILARI
// ==========================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2800);
}
