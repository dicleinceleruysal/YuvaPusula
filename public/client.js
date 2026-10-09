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

const EXTRA_INCOME_ICONS = {
    'Prim': '🎁',
    'Kira': '🏠',
    'Ek İş': '💼',
    'Yatırım': '📈',
    'Satış': '📦',
    'Hediye': '💝',
    'Diğer': '🌟'
};

function normalizeTr(str) {
    if (!str) return '';
    return str
        .toString()
        .trim()
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .toLowerCase();
}

// Global Uygulama Durumu (State)
let appState = {
    currentUser: null,
    familyData: null,
    currentTab: 'tabPano',
    activeBudgetSubTab: 'expenses', // 'expenses', 'fixed', 'investments', 'charity'
    fixedStatusFilter: 'ALL',       // 'ALL', 'UNPAID', 'PAID'
    charityCategoryFilter: 'ALL',   // 'ALL', 'MONTH', 'Sadaka', 'Zekat', ...
    charityMemberFilter: 'ALL',     // 'ALL', 'Dicle', 'Fırat', 'Tüm Aile'
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
    taskAssigneeFilter: 'MINE',     // 'MINE', 'ALL', 'DICLE', 'FIRAT', 'FAMILY'
    dailyPlannerFilter: 'MINE',     // 'MINE' (Bana Özel + Tüm Aile), 'ALL' (Tüm Aile Akışı)
    deferredPrompt: null
};

// ==========================================================
// 0. VERİTABANI MOTORU (INDEXEDDB & LOCALSTORAGE DUAL-SYNC)
// ==========================================================
const UYSAL_DEFAULT_FAMILY = {
  "id": "fam_1790599516960",
  "name": "UYSAL Ailesi",
  "plans": [
    {
      "id": "plan_1791371974445",
      "dish": "Et",
      "link": "https://maps.app.goo.gl/BzaWZth88yzXajX6A",
      "price": "₺₺ Orta",
      "title": "MisafirEt",
      "status": "PENDING",
      "addedBy": "Dicle UYSAL",
      "category": "Restoran",
      "location": "Etlik Gazze Cad.",
      "addedById": "usr_1790599516960",
      "completed": false,
      "createdAt": "2026-10-07T11:19:34.216Z",
      "updatedAt": "2026-10-07T11:20:09.673Z",
      "currentUserId": "usr_1790599516960"
    },
    {
      "id": "plan_1790881272329",
      "link": "https://app.hb.biz/IuT3my7Rgm8l",
      "title": "Yürüyüş bandı",
      "status": "PENDING",
      "addedBy": "Fırat UYSAL",
      "category": "Alisveris",
      "priority": "⭐ Yüksek / Acil",
      "shopNote": "Spor",
      "completed": false,
      "createdAt": "2026-10-01T19:01:12.536Z",
      "shopPrice": "5.400 ₺"
    },
    {
      "id": "plan_1790832233311",
      "link": "",
      "title": "Tuna Panduf",
      "status": "PENDING",
      "addedBy": "Dicle UYSAL",
      "category": "Alisveris",
      "priority": "⭐ Yüksek / Acil",
      "shopNote": "",
      "completed": false,
      "createdAt": "2026-10-01T05:23:54.300Z",
      "shopPrice": "500 ₺"
    },
    {
      "id": "plan_1790832195835",
      "link": "",
      "title": "Dicle Pantalon",
      "status": "PENDING",
      "addedBy": "Dicle UYSAL",
      "category": "Alisveris",
      "priority": "⭐ Yüksek / Acil",
      "shopNote": "",
      "completed": false,
      "createdAt": "2026-10-01T05:23:16.835Z",
      "shopPrice": "1.000 ₺"
    },
    {
      "id": "plan_1790832170504",
      "link": "",
      "title": "Dicle Kaban",
      "status": "PENDING",
      "addedBy": "Dicle UYSAL",
      "category": "Alisveris",
      "priority": "⭐ Yüksek / Acil",
      "shopNote": "",
      "completed": false,
      "createdAt": "2026-10-01T05:22:51.523Z",
      "shopPrice": "3.000 ₺"
    }
  ],
  "posts": [],
  "tasks": [
    {
      "id": "task_1791346494380",
      "title": "Yatak odası toz",
      "addedBy": "Dicle UYSAL",
      "dueDate": "Bugün",
      "assignee": "Dicle UYSAL",
      "completed": false,
      "createdAt": "2026-10-07T04:14:54.509Z"
    },
    {
      "id": "task_1791346474621",
      "title": "Börülce kışlık",
      "addedBy": "Dicle UYSAL",
      "dueDate": "Hafta Sonu",
      "assignee": "Dicle UYSAL",
      "completed": false,
      "createdAt": "2026-10-07T04:14:34.764Z"
    },
    {
      "id": "task_1791346450111",
      "title": "Tuna  banyo",
      "addedBy": "Dicle UYSAL",
      "dueDate": "Bugün",
      "assignee": "Dicle UYSAL",
      "completed": false,
      "createdAt": "2026-10-07T04:14:10.241Z"
    },
    {
      "id": "task_1791346421044",
      "title": "Cilt Diş Bakımı",
      "addedBy": "Dicle UYSAL",
      "dueDate": "Bugün",
      "assignee": "Dicle UYSAL",
      "completed": true,
      "createdAt": "2026-10-07T04:13:41.485Z"
    },
    {
      "id": "task_1791346401742",
      "title": "Banyo Tuvalet Temizliği",
      "addedBy": "Dicle UYSAL",
      "dueDate": "Bugün",
      "assignee": "Dicle UYSAL",
      "completed": true,
      "createdAt": "2026-10-07T04:13:21.912Z"
    }
  ],
  "members": [
    {
      "id": "usr_1790599516960",
      "name": "Dicle UYSAL",
      "role": "Anne",
      "phone": "5546448989",
      "avatar": "👩"
    },
    {
      "id": "usr_1790661005224",
      "name": "Fırat UYSAL",
      "role": "Baba",
      "phone": "5458030118",
      "avatar": "👨"
    },
    {
      "id": "usr_1790662017196",
      "name": "Tuna UYSAL",
      "role": "Oğul",
      "phone": "05546448989",
      "avatar": "👦"
    }
  ],
  "expenses": [
    {
      "id": "exp_1791365132858",
      "date": "07.10.2026",
      "month": "2026-10",
      "payer": "Dicle UYSAL",
      "title": "Dicle Alışveriş Soğuk Kahve",
      "amount": 390,
      "category": "Diğer",
      "createdAt": "2026-10-07T09:25:33.539Z"
    },
    {
      "id": "exp_1791365105918",
      "date": "07.10.2026",
      "month": "2026-10",
      "payer": "Dicle UYSAL",
      "title": "Yaren Hediye",
      "amount": 720,
      "category": "Diğer",
      "createdAt": "2026-10-07T09:25:06.580Z"
    },
    {
      "id": "exp_1790879497120",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Fırat UYSAL",
      "title": "Fırat kazak",
      "amount": 560,
      "category": "Diğer",
      "createdAt": "2026-10-01T18:31:37.327Z"
    },
    {
      "id": "exp_1790879485061",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Fırat UYSAL",
      "title": "Dicle kozmetik",
      "amount": 516,
      "category": "Diğer",
      "createdAt": "2026-10-01T18:31:25.372Z"
    },
    {
      "id": "exp_1790879458019",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Fırat UYSAL",
      "title": "Tuna mama",
      "amount": 525,
      "category": "Mutfak",
      "createdAt": "2026-10-01T18:30:58.207Z"
    },
    {
      "id": "exp_1790802843773",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Fırat UYSAL",
      "title": "Ek hesap",
      "amount": 12000,
      "category": "Diğer",
      "createdAt": "2026-09-30T21:14:03.979Z"
    },
    {
      "id": "exp_1790802804188",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Dicle UYSAL",
      "title": "Fırat İş",
      "amount": 16000,
      "category": "Diğer",
      "createdAt": "2026-09-30T21:13:24.378Z"
    },
    {
      "id": "exp_1790802660049",
      "date": "01.10.2026",
      "month": "2026-10",
      "payer": "Dicle UYSAL",
      "title": "Ziraat Kart",
      "amount": 16800,
      "category": "Diğer",
      "createdAt": "2026-09-30T21:11:00.276Z"
    },
    {
      "id": "exp_1790750226682",
      "date": "30.09.2026",
      "payer": "Dicle UYSAL",
      "title": "Dicle Kredi Kartı",
      "amount": 7500,
      "category": "Fatura"
    }
  ],
  "messages": [
    {
      "id": "msg_1790671169707",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "Seni seviyorum ❤️",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "11:39",
      "timestamp": "2026-09-29T08:39:30.965Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    },
    {
      "id": "msg_1790715146187",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Seni seviyorum ömrüm",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "23:52",
      "timestamp": "2026-09-29T20:52:26.403Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790762978369",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "❤️❤️",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "13:09",
      "timestamp": "2026-09-30T10:09:39.588Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    },
    {
      "id": "msg_1790764029217",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "babamı aspavaya götürelim",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "13:27",
      "timestamp": "2026-09-30T10:27:10.443Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    },
    {
      "id": "msg_1790766979506",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Seni seviyorum ❤️",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "14:16",
      "timestamp": "2026-09-30T11:16:20.782Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790768795008",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Marketten bir şey lazım mı? 🛒",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "14:46",
      "timestamp": "2026-09-30T11:46:36.321Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790768862332",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Görüşürüz 👋",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "14:47",
      "timestamp": "2026-09-30T11:47:43.648Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790768867126",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Akşam ne yiyoruz? 🍲",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "14:47",
      "timestamp": "2026-09-30T11:47:48.437Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790768909850",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "Seni seviyorum ❤️",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "14:48",
      "timestamp": "2026-09-30T11:48:31.159Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    },
    {
      "id": "msg_1790768934190",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Akşam ne yiyoruz? 🍲",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "14:48",
      "timestamp": "2026-09-30T11:48:55.516Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790776585456",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Marketten bir şey lazım mı? 🛒",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "16:56",
      "timestamp": "2026-09-30T13:56:26.911Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790795986548",
      "isRead": 1,
      "readBy": [
        "usr_1790661005224"
      ],
      "content": "Seni seviyorum ❤️",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790661005224",
      "createdAt": "22:19",
      "timestamp": "2026-09-30T19:19:46.754Z",
      "receiverId": "group",
      "senderName": "Fırat UYSAL",
      "senderRole": "Baba",
      "messageType": "text",
      "senderAvatar": "👨"
    },
    {
      "id": "msg_1790803495002",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "Selam",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "00:24",
      "timestamp": "2026-09-30T21:24:54.904Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    },
    {
      "id": "msg_1791377427847",
      "isRead": 0,
      "readBy": [
        "usr_1790599516960"
      ],
      "content": "Aşkımmmm",
      "familyId": "fam_1790599516960",
      "senderId": "usr_1790599516960",
      "createdAt": "15:50",
      "timestamp": "2026-10-07T12:50:28.006Z",
      "receiverId": "group",
      "senderName": "Dicle UYSAL",
      "senderRole": "Anne",
      "messageType": "text",
      "senderAvatar": "👩"
    }
  ],
  "salaries": [
    {
      "id": "sal_1790762897908",
      "note": "Kesintili Maaş",
      "amount": 36500,
      "payDay": 1,
      "userId": "usr_1790599516960",
      "userName": "Dicle UYSAL",
      "userRole": "Anne",
      "updatedAt": "2026-09-30T10:08:19.109Z",
      "userAvatar": "👩"
    }
  ],
  "shopping": [
    {
      "id": "shop_1791368782231",
      "title": "Yarenin nişanına elbise",
      "addedBy": "Dicle UYSAL",
      "category": "Giyim",
      "quantity": "1 Adet",
      "completed": false,
      "createdAt": "2026-10-07T10:26:21.929Z"
    },
    {
      "id": "shop_1790764992409",
      "title": "Panduf",
      "addedBy": "Dicle UYSAL",
      "category": "Çocuk",
      "quantity": "1 Adet",
      "completed": false,
      "createdAt": "2026-09-30T10:43:13.783Z"
    }
  ],
  "overtimes": [
    {
      "id": "ot_1791371787498",
      "date": "2026-10-07",
      "days": 1,
      "hours": 0,
      "month": "2026-10",
      "notes": "",
      "amount": 1041.67,
      "person": "Fırat",
      "addedBy": "Fırat UYSAL",
      "dayType": "weekday",
      "isHourly": false,
      "createdAt": "2026-10-07T11:16:27.245Z",
      "dailyRate": 1041.67,
      "hourlyRate": 296.875
    },
    {
      "id": "ot_1791371192127",
      "date": "2026-10-02",
      "hours": 2,
      "month": "2026-10",
      "notes": "Evden Mesai",
      "amount": 593.75,
      "person": "Dicle UYSAL",
      "addedBy": "Dicle UYSAL",
      "isHourly": true,
      "createdAt": "2026-10-07T11:06:31.867Z",
      "hourlyRate": 296.875
    }
  ],
  "dailyPlans": [
    {
      "id": "daily_1791358527613",
      "icon": "⏰",
      "time": "07:00",
      "title": "Cilt Bakımı",
      "category": "🌅 Sabah",
      "completed": false,
      "createdAt": "2026-10-07T07:35:27.613Z",
      "updatedAt": "2026-10-07T08:55:19.824Z",
      "assignedTo": "Tüm Aile",
      "completedAt": null,
      "isRecurring": true
    },
    {
      "id": "daily_1791358539796",
      "icon": "⏰",
      "time": "07:00",
      "title": "Diş Bakımı",
      "category": "🌅 Sabah",
      "completed": false,
      "createdAt": "2026-10-07T07:35:39.796Z",
      "assignedTo": "Dicle UYSAL",
      "completedAt": null,
      "isRecurring": true
    },
    {
      "id": "daily_1791358560338",
      "icon": "⏰",
      "time": "07:00",
      "title": "Lavabo / Tuvalet Temizliği",
      "category": "🧹 Temizlik",
      "completed": false,
      "createdAt": "2026-10-07T07:36:00.338Z",
      "updatedAt": "2026-10-07T09:24:05.074Z",
      "assignedTo": "Dicle UYSAL",
      "completedAt": null,
      "isRecurring": true
    },
    {
      "id": "daily_1791358599031",
      "icon": "⏰",
      "time": "19:30",
      "title": "Akşam Yemeği / Mutfak Toplama",
      "category": "🍽️ Yemek",
      "completed": false,
      "createdAt": "2026-10-07T07:36:39.031Z",
      "assignedTo": "Tüm Aile",
      "completedAt": null,
      "isRecurring": true
    },
    {
      "id": "daily_1791358672223",
      "icon": "⏰",
      "time": "22:00",
      "title": "Tuna Mama Yedirme",
      "category": "🍽️ Yemek",
      "completed": false,
      "createdAt": "2026-10-07T07:37:52.223Z",
      "updatedAt": "2026-10-07T09:24:29.271Z",
      "assignedTo": "Fırat UYSAL",
      "completedAt": null,
      "isRecurring": true
    }
  ],
  "inviteCode": "UYSAL",
  "investments": [
    {
      "id": "inv_1790665383818",
      "unit": "Gram",
      "notes": "Kasa",
      "title": "Bilezik",
      "amount": 110,
      "category": "Altın",
      "userName": "Dicle UYSAL",
      "currentValueTl": 725552.3
    },
    {
      "id": "inv_1790796064042",
      "unit": "TL",
      "notes": "",
      "title": "Bes Dicle",
      "amount": 3200,
      "category": "TL",
      "userName": "Fırat UYSAL",
      "currentValueTl": 3200
    }
  ],
  "extraIncomes": [
    {
      "id": "inc_1790875830963",
      "date": "01.10.2026",
      "month": "2026-10",
      "notes": "",
      "title": "Figen Abla Doğum Günü",
      "amount": 10000,
      "category": "Hediye",
      "createdAt": "2026-10-01T17:30:31.167Z",
      "receivedBy": "Fırat UYSAL"
    },
    {
      "id": "inc_1790802625610",
      "date": "01.10.2026",
      "month": "2026-10",
      "notes": "",
      "title": "Filiz Doğum Günü Hediyesi",
      "amount": 16500,
      "category": "Hediye",
      "createdAt": "2026-09-30T21:10:25.804Z",
      "receivedBy": "Fırat UYSAL"
    },
    {
      "id": "inc_1790795935970",
      "date": "01.10.2026",
      "month": "2026-09",
      "notes": "",
      "title": "Filiz Doğum Günü Hediyesi",
      "amount": 12500,
      "category": "Hediye",
      "createdAt": "2026-09-30T19:18:56.195Z",
      "receivedBy": "Fırat UYSAL"
    }
  ],
  "shoppingList": [
    {
      "id": "shop_1791368782231",
      "title": "Yarenin nişanına elbise",
      "addedBy": "Dicle UYSAL",
      "category": "Giyim",
      "quantity": "1 Adet",
      "completed": false,
      "createdAt": "2026-10-07T10:26:21.929Z"
    },
    {
      "id": "shop_1790764992409",
      "title": "Panduf",
      "addedBy": "Dicle UYSAL",
      "category": "Çocuk",
      "quantity": "1 Adet",
      "completed": false,
      "createdAt": "2026-09-30T10:43:13.783Z"
    }
  ],
  "fixedExpenses": [
    {
      "id": "fix_1790876416165",
      "notes": "",
      "payer": "Dicle UYSAL",
      "title": "Taksit",
      "amount": 5500,
      "dueDay": 1,
      "isPaid": false,
      "category": "Kredi"
    },
    {
      "id": "fix_1790708319826",
      "notes": "",
      "payer": "Dicle UYSAL",
      "title": "Taksit",
      "amount": 370,
      "dueDay": 20,
      "isPaid": false,
      "category": "Kredi"
    },
    {
      "id": "fix_1790708170308",
      "notes": "",
      "payer": "Dicle UYSAL",
      "title": "Dicle Tel Fatura",
      "amount": 580,
      "dueDay": 8,
      "isPaid": false,
      "category": "İnternet"
    },
    {
      "id": "fix_1790708124168",
      "notes": "",
      "payer": "Fırat UYSAL",
      "title": "İnternet",
      "amount": 970,
      "dueDay": 11,
      "isPaid": false,
      "category": "İnternet"
    },
    {
      "id": "fix_1790708068333",
      "notes": "",
      "payer": "Dicle UYSAL",
      "title": "Fırat Tel Fatura",
      "amount": 480,
      "dueDay": 22,
      "isPaid": false,
      "category": "Fatura"
    },
    {
      "id": "fix_1790691647559",
      "notes": "",
      "payer": "Dicle UYSAL",
      "title": "Netflix",
      "amount": 190,
      "dueDay": 1,
      "isPaid": false,
      "category": "Abonelik"
    },
    {
      "id": "fix_1790666150012",
      "notes": "Bu ay kombi kesintisi ile ödenecek tutar",
      "payer": "Dicle UYSAL",
      "title": "Ev Kirası",
      "amount": 27500,
      "dueDay": 1,
      "isPaid": false,
      "category": "Kira"
    }
  ],
  "investmentHistory": [
    {
      "id": "hist_1790796064267",
      "date": "30.09.2026",
      "note": "İlk Portföy Kaydı",
      "type": "BUY",
      "unit": "TL",
      "amountDelta": 3200,
      "investmentId": "inv_1790796064042",
      "valueDeltaTl": 3200
    },
    {
      "id": "hist_1790665383775",
      "date": "29.09.2026",
      "note": "İlk Portföy Kaydı",
      "type": "BUY",
      "unit": "Gram",
      "amountDelta": 110,
      "investmentId": "inv_1790665383818",
      "valueDeltaTl": 725552.3
    }
  ],
  "investmentTransactions": []
};

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
                const fams = await new Promise((resolve) => {
                    const tx = this.db.transaction('families', 'readonly');
                    const store = tx.objectStore('families');
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
                if (fams && fams.length > 0) return fams;
            } catch (e) {}
        }
        try {
            const stored = JSON.parse(localStorage.getItem('ailem_db_families') || '[]');
            if (stored && stored.length > 0) return stored;
        } catch (e) {}
        return [JSON.parse(JSON.stringify(UYSAL_DEFAULT_FAMILY))];
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
    async login(phone, password = '') {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            return await res.json();
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

    async joinFamily(inviteCode, phone, name, role, avatar, password = '') {
        try {
            const res = await fetch('/api/auth/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode, phone, name, role, avatar, password })
            });
            return await res.json();
        } catch (e) {
            console.warn('API joinFamily hatası:', e);
        }
        return null;
    },

    async addMember(familyId, user, familyData = null) {
        try {
            const res = await fetch('/api/members/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, user, familyData })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {
            console.warn('API addMember hatası:', e);
        }
        return null;
    },

    async syncFamily(family) {
        try {
            const res = await fetch('/api/family/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ family })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {
            console.warn('API syncFamily hatası:', e);
        }
        return null;
    },

    async deleteMember(familyId, memberId) {
        try {
            const res = await fetch('/api/members/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, memberId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {
            console.warn('API deleteMember hatası:', e);
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

    async updatePlan(familyId, planId, plan) {
        try {
            const res = await fetch('/api/plans/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId, plan })
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

    async checkPlanPrice(familyId, planId) {
        try {
            const res = await fetch('/api/plans/check-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId })
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('API checkPlanPrice hatası:', e);
        }
        return null;
    },

    async updatePlanPrice(familyId, planId, newPrice) {
        try {
            const res = await fetch('/api/plans/update-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId, newPrice })
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('API updatePlanPrice hatası:', e);
        }
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

    async resetWeeklyTasks(familyId) {
        try {
            const res = await fetch('/api/tasks/reset-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId })
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

    // Ek Gelir İşlemleri (Prim, İkramiye, Kira vb.)
    async addExtraIncome(familyId, income) {
        try {
            const res = await fetch('/api/extra-incomes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, income })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteExtraIncome(familyId, incomeId) {
        try {
            const res = await fetch('/api/extra-incomes/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, incomeId })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    // Mesai İşlemleri (Saatlik 296,875 TL veya Fırat - Ayın 1'inde Sıfırlanır)
    async addOvertime(familyId, overtime) {
        try {
            const res = await fetch('/api/overtimes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, overtime })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteOvertime(familyId, overtimeId) {
        try {
            const res = await fetch('/api/overtimes/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, overtimeId })
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

    async updateFixedExpense(familyId, id, fixed) {
        try {
            const res = await fetch('/api/fixed-expenses/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, id, fixed })
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

    // Hayır & Sadaka İşlemleri
    async addCharity(familyId, charity) {
        try {
            const res = await fetch('/api/charities/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, charity })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async deleteCharity(familyId, charityId) {
        try {
            const res = await fetch('/api/charities/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, charityId })
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

    // Günlük Plan & Rutin İşlemleri (Her Gün Sıfırlanır)
    async addDailyPlan(familyId, plan) {
        try {
            const res = await fetch('/api/daily-plans/add', {
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

    async updateDailyPlan(familyId, planId, plan) {
        try {
            const res = await fetch('/api/daily-plans/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId, planId, plan })
            });
            if (res.ok) {
                const data = await res.json();
                return data.family;
            }
        } catch (e) {}
        return null;
    },

    async toggleDailyPlan(familyId, planId) {
        try {
            const res = await fetch('/api/daily-plans/toggle', {
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

    async deleteDailyPlan(familyId, planId) {
        try {
            const res = await fetch('/api/daily-plans/delete', {
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

    async resetDailyPlans(familyId) {
        try {
            const res = await fetch('/api/daily-plans/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyId })
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

    // Ses Kilidini Açma (İlk Dokunuşta Web Audio Context Hazırlığı)
    window.addEventListener('click', () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                if (!window.__audioCtx) window.__audioCtx = new AudioCtx();
                if (window.__audioCtx.state === 'suspended') window.__audioCtx.resume();
            }
        } catch (e) {}
    }, { once: true });

    // Bildirim İzni Durumunu Otomatik Kontrol Et ve Web Push Aboneliğini Sağla
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            appState.notificationsEnabled = true;
            if (appState.currentUser && appState.familyData) {
                registerPushSubscription();
            }
        } else if (Notification.permission === 'default' && localStorage.getItem('ailem_notifications_enabled') !== 'false') {
            // İlk girişte nazik izin talebi
            setTimeout(() => {
                if (appState.currentUser) {
                    Notification.requestPermission().then(perm => {
                        if (perm === 'granted') {
                            appState.notificationsEnabled = true;
                            localStorage.setItem('ailem_notifications_enabled', 'true');
                            registerPushSubscription();
                            showToast('Sohbet bildirimleri aktif edildi! 🔔');
                        }
                    });
                }
            }, 2500);
        }
    }

    if (!appState.currentUser) {
        switchAuthMode('login');
    } else {
        // Canlı sunucudan en güncel veriyi çek
        await syncWithServer(false);
        registerPushSubscription();
        initRealtimeStream();
    }
    renderApp();
    checkMonthStartNotification();

    // Altınkaynak canlı piyasa kurlarını ilk kez yükle
    fetchLiveMarketRates(false);

    // 1.2 saniyede bir ailedeki ve mesajlaşmadaki güncellemeleri otomatik senkronize et (Ultra Hızlı Canlı Akış)
    setInterval(() => {
        if (appState.currentUser && appState.familyData) {
            syncWithServer(true);
        }
    }, 1200);

    // 30 saniyede bir Altınkaynak canlı kurlarını otomatik güncelle
    setInterval(() => {
        fetchLiveMarketRates(false);
    }, 30000);

    // Sekmeye dönüldüğünde veya ekran açıldığında anında senkronize et ve sekme başlığını düzelt
    window.addEventListener('focus', () => {
        if (appState.currentUser && appState.familyData) {
            syncWithServer(true);
            initRealtimeStream();
        }
        if (titleFlashInterval) {
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
            if (appState.familyData) document.title = `${appState.familyData.name} - YuvaPusula`;
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && appState.currentUser && appState.familyData) {
            syncWithServer(true);
            initRealtimeStream();
            if (titleFlashInterval) {
                clearInterval(titleFlashInterval);
                titleFlashInterval = null;
                document.title = `${appState.familyData.name} - YuvaPusula`;
            }
        }
    });

    // Service Worker Mesaj Dinleyicisi (Bildirime tıklandığında sohbete geçiş)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.action === 'openTab') {
                switchTab(event.data.tab || 'tabChat');
            }
        });
    }
});

// ==========================================================
// CANLI SSE (SERVER-SENT EVENTS) ANLIK AKIŞ VE BİLDİRİM MOTORU
// ==========================================================
let familyEventSource = null;
function initRealtimeStream() {
    if (!appState.currentUser || !appState.familyData) return;
    if (familyEventSource) {
        try { familyEventSource.close(); } catch (e) {}
        familyEventSource = null;
    }

    try {
        const streamUrl = `/api/stream?familyId=${encodeURIComponent(appState.familyData.id)}&userId=${encodeURIComponent(appState.currentUser.id)}`;
        familyEventSource = new EventSource(streamUrl);

        familyEventSource.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.message && appState.currentUser && data.message.senderId !== appState.currentUser.id) {
                    dispatchChatMessageNotification(data.message);
                }
                if (data && data.family) {
                    appState.familyData = normalizeFamilyData(data.family);
                    saveStateToStorage();
                    renderApp();
                }
            } catch (err) {
                console.warn('SSE mesaj ayrıştırma:', err);
            }
        });

        familyEventSource.addEventListener('update', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.family) {
                    appState.familyData = normalizeFamilyData(data.family);
                    saveStateToStorage();
                    renderApp();
                }
            } catch (err) {}
        });

        familyEventSource.addEventListener('price_drop', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.family) {
                    appState.familyData = normalizeFamilyData(data.family);
                    saveStateToStorage();
                    renderApp();
                }
                triggerHapticAndSound();
                showToast(`🔥 Fiyat İndirimi! "${data.title || 'Ürün'}" fiyatı düştü: ${data.newPrice || ''} (Eski: ${data.oldPrice || ''})`);
                if (appState.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification('🔥 Fiyat İndirimi Yakalandı!', {
                            body: `${data.title || 'Ürün'} fiyatı ${data.newPrice} seviyesine düştü! (Eski: ${data.oldPrice})`,
                            icon: 'icons/icon.svg'
                        });
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('SSE price_drop ayrıştırma:', err);
            }
        });

        familyEventSource.onerror = () => {
            // Otomatik yeniden bağlanma EventSource tarafından yönetilir
        };
    } catch (e) {
        console.warn('SSE başlatma hatası:', e);
    }
}

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
        const normFresh = normalizeFamilyData(fresh);
        const prevMessages = appState.familyData.messages || [];
        const newMessages = normFresh.messages || [];

        // Yeni gelen mesaj kontrolü (Başkası mesaj attığında anlık çok katmanlı bildirim gönder)
        if (newMessages.length > prevMessages.length) {
            const incomingMsgs = newMessages.slice(prevMessages.length);
            incomingMsgs.forEach(latestMsg => {
                if (appState.currentUser && latestMsg.senderId !== appState.currentUser.id) {
                    dispatchChatMessageNotification(latestMsg);
                }
            });
        }

        const isDifferent = JSON.stringify(appState.familyData) !== JSON.stringify(normFresh);
        if (isDifferent) {
            appState.familyData = normFresh;
            saveStateToStorage();

            const isAnyModalOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
            if (!isAnyModalOpen) {
                renderApp();
            } else {
                updateQuickStats();
                updateChatUnreadCounts();
            }
        }
    } else {
        // Eğer sunucu sıfırlanmış veya aile sunucuda yoksa, mevcut aileyi sunucuya otomatik senkronize et (Self-healing)!
        if (appState.familyData && appState.familyData.id && appState.familyData.members && appState.familyData.members.length > 0) {
            const synced = await AilemAPI.syncFamily(appState.familyData);
            if (synced) {
                console.log('✅ Aile ve üyeleri sunucuya başarıyla senkronize edildi.');
            }
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

function switchPwaGuideTab(platform) {
    const tabAndroid = document.getElementById('pwaTabBtnAndroid');
    const tabIos = document.getElementById('pwaTabBtnIos');
    const tabPc = document.getElementById('pwaTabBtnPc');

    const guideAndroid = document.getElementById('pwaGuideAndroid');
    const guideIos = document.getElementById('pwaGuideIos');
    const guidePc = document.getElementById('pwaGuidePc');

    if (tabAndroid) tabAndroid.classList.toggle('active', platform === 'android');
    if (tabIos) tabIos.classList.toggle('active', platform === 'ios');
    if (tabPc) tabPc.classList.toggle('active', platform === 'pc');

    if (guideAndroid) guideAndroid.classList.toggle('hidden', platform !== 'android');
    if (guideIos) guideIos.classList.toggle('hidden', platform !== 'ios');
    if (guidePc) guidePc.classList.toggle('hidden', platform !== 'pc');
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
        });
    } else {
        // Otomatik prompt tetiklenemeyen durumlarda (iOS Safari, masaüstü veya prompt henüz ateşlenmemiş Android) rehber modalını aç
        if (isIosDevice()) {
            switchPwaGuideTab('ios');
        } else if (/android/.test(navigator.userAgent.toLowerCase())) {
            switchPwaGuideTab('android');
        } else {
            switchPwaGuideTab('pc');
        }
        openModal('modalPwaGuide');
    }
}

function initPWA() {
    // 1. Service Worker Kaydı (Hızlı ve Doğrudan Kayıt)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('YuvaPusula PWA Service Worker hazır:', reg.scope);
                if (window.Notification && Notification.permission === 'granted' && appState.currentUser && appState.familyData) {
                    registerPushSubscription();
                }
                updatePushNotificationUI();
            })
            .catch(err => {
                console.warn('Service Worker kayıt hatası:', err);
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
    const sidebarInstallBtn = document.getElementById('sidebarInstallBtn');
    const pwaBanner = document.getElementById('pwaInstallBanner');

    if (isStandaloneMode()) {
        console.log('YuvaPusula Standalone PWA modunda çalışıyor 🚀');
        if (pwaBanner) pwaBanner.classList.add('hidden');
        if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
        if (sidebarInstallBtn) sidebarInstallBtn.classList.add('hidden');
    } else {
        if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');
        if (sidebarInstallBtn) sidebarInstallBtn.classList.remove('hidden');
        setTimeout(() => {
            if (pwaBanner && !isStandaloneMode() && !localStorage.getItem('yuvapusula_pwa_dismissed')) {
                pwaBanner.classList.remove('hidden');
            }
        }, 1500);
    }

    // 4. Android / Chrome beforeinstallprompt Yakalama
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        appState.deferredPrompt = e;
        if (!isStandaloneMode() && !localStorage.getItem('yuvapusula_pwa_dismissed')) {
            if (pwaBanner) pwaBanner.classList.remove('hidden');
        }
        if (headerInstallBtn) headerInstallBtn.classList.remove('hidden');
        if (sidebarInstallBtn) sidebarInstallBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
        appState.deferredPrompt = null;
        if (pwaBanner) pwaBanner.classList.add('hidden');
        if (headerInstallBtn) headerInstallBtn.classList.add('hidden');
        if (sidebarInstallBtn) sidebarInstallBtn.classList.add('hidden');
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

function deduplicateMembers(members = []) {
    const canonicalList = [];
    const seen = new Set();

    (members || []).forEach(m => {
        if (!m || !m.name) return;
        const norm = normalizeTr(m.name);
        let key = norm;
        if (norm.includes('dicle')) key = 'dicle';
        else if (norm.includes('firat')) key = 'firat';
        else if (norm.includes('tuna')) key = 'tuna';

        if (!seen.has(key)) {
            seen.add(key);
            let standardName = m.name;
            let standardRole = m.role || 'Birey';
            let standardAvatar = m.avatar || '👤';
            let standardPhone = m.phone || '';
            let standardId = m.id || ('usr_' + key);

            if (key === 'dicle') {
                standardName = 'Dicle UYSAL';
                standardRole = 'Anne';
                standardAvatar = '👩';
                standardPhone = '5546448989';
                standardId = 'usr_1790599516960';
            } else if (key === 'firat') {
                standardName = 'Fırat UYSAL';
                standardRole = 'Baba';
                standardAvatar = '👨';
                standardPhone = '5458030118';
                standardId = 'usr_1790661005224';
            } else if (key === 'tuna') {
                standardName = 'Tuna UYSAL';
                standardRole = 'Oğul';
                standardAvatar = '👶';
                standardPhone = '05546448989';
                standardId = 'usr_1790662017196';
            }

            canonicalList.push({
                id: standardId,
                name: standardName,
                role: standardRole,
                phone: standardPhone,
                avatar: standardAvatar
            });
        }
    });

    if (!seen.has('dicle')) {
        canonicalList.unshift({ id: 'usr_1790599516960', name: 'Dicle UYSAL', role: 'Anne', phone: '5546448989', avatar: '👩' });
    }
    if (!seen.has('firat')) {
        canonicalList.push({ id: 'usr_1790661005224', name: 'Fırat UYSAL', role: 'Baba', phone: '5458030118', avatar: '👨' });
    }
    if (!seen.has('tuna')) {
        canonicalList.push({ id: 'usr_1790662017196', name: 'Tuna UYSAL', role: 'Oğul', phone: '05546448989', avatar: '👶' });
    }

    return canonicalList;
}

function normalizeFamilyData(fam) {
    if (!fam) return fam;
    fam.members = deduplicateMembers(fam.members);
    if (!fam.posts) fam.posts = [];
    if (!fam.plans) fam.plans = [];
    fam.plans = fam.plans.map(p => ({
        ...p,
        completed: p.completed !== undefined ? !!p.completed : (p.status === 'COMPLETED'),
        status: p.status || (p.completed ? 'COMPLETED' : 'PENDING')
    }));
    if (!fam.dailyPlans) fam.dailyPlans = [];
    fam.dailyPlans = fam.dailyPlans.map(p => ({
        ...p,
        completed: !!p.completed,
        isRecurring: p.isRecurring !== undefined ? !!p.isRecurring : true
    }));
    if (!fam.shoppingList) fam.shoppingList = fam.shopping || [];
    fam.shopping = fam.shoppingList;
    if (!fam.tasks) fam.tasks = [];
    if (!fam.expenses) fam.expenses = [];
    if (!fam.salaries) fam.salaries = [];
    if (!fam.extraIncomes) fam.extraIncomes = [];
    if (!fam.overtimes) fam.overtimes = [];
    if (!fam.fixedExpenses) fam.fixedExpenses = [];
    if (!fam.investments) fam.investments = [];
    if (!fam.investmentHistory) fam.investmentHistory = [];
    if (!fam.charities) fam.charities = [];
    if (!fam.messages) fam.messages = [];
    return fam;
}

// LocalStorage'dan Durum Yükleme
function loadStateFromStorage() {
    try {
        const storedUser = localStorage.getItem('ailem_current_user');
        const storedFamily = localStorage.getItem('ailem_family_data');

        if (storedUser && storedFamily) {
            appState.currentUser = JSON.parse(storedUser);
            appState.familyData = normalizeFamilyData(JSON.parse(storedFamily));
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
// 2. KAYIT / GİRİŞ İŞLEMLERİ (UYSAL AİLESİ ÖZEL & ŞİFRELİ)
// ==========================================================
let currentAuthMode = 'login'; // 'login' veya 'register'

function selectAuthProfile(profileName, defaultPhone) {
    const userPhoneInput = document.getElementById('userPhone');
    const pwdInput = document.getElementById('userPassword');
    const chipDicle = document.getElementById('chipDicle');
    const chipFirat = document.getElementById('chipFirat');

    if (userPhoneInput) userPhoneInput.value = profileName;

    const norm = normalizeTr(profileName);
    if (chipDicle) chipDicle.classList.toggle('active', norm === 'dicle');
    if (chipFirat) chipFirat.classList.toggle('active', norm === 'firat');

    if (pwdInput) {
        pwdInput.value = '';
        pwdInput.focus();
    }
}

function toggleAuthPasswordVisibility() {
    const pwdInput = document.getElementById('userPassword');
    const eyeIcon = document.getElementById('pwdEyeIcon');
    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    } else {
        pwdInput.type = 'password';
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
}

function switchAuthMode(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    const quickSelector = document.getElementById('quickProfileSelector');
    const authNameField = document.getElementById('authNameField');
    const authRoleField = document.getElementById('authRoleField');
    const btnSubmit = document.getElementById('btnAuthSubmit');
    const userName = document.getElementById('userName');

    if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');

    if (mode === 'login') {
        if (quickSelector) quickSelector.classList.remove('hidden');
        if (authNameField) authNameField.classList.add('hidden');
        if (authRoleField) authRoleField.classList.add('hidden');
        if (userName) userName.required = false;
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Uysal Ailesi\'ne Giriş Yap';
    } else {
        if (quickSelector) quickSelector.classList.add('hidden');
        if (authNameField) authNameField.classList.remove('hidden');
        if (authRoleField) authRoleField.classList.remove('hidden');
        if (userName) userName.required = true;
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Uysal Ailesi\'ne Katıl';
    }
}

async function handleAuthSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    let identifier = (document.getElementById('userPhone')?.value || '').trim();
    const password = (document.getElementById('userPassword')?.value || '').trim();

    const pwdNorm = normalizeTr(password);

    // Eğer kullanıcı kişi adı girmeden sadece şifre girdiyse otomatik algıla
    if (!identifier) {
        if (pwdNorm === 'dicle') identifier = 'Dicle';
        else if (pwdNorm === 'firat') identifier = 'Fırat';
        else {
            identifier = 'Dicle'; // Varsayılan profil
        }
    }

    if (!password) {
        showToast('Lütfen şifrenizi girin.');
        return;
    }

    // Şifre kuralları kontrolü (Dicle -> dicle / Fırat -> fırat veya firat)
    const idNorm = normalizeTr(identifier);
    const cleanPhone = identifier.replace(/[\s\-\(\)\+]/g, '');

    const isDicle = idNorm.includes('dicle') || cleanPhone.includes('5546448989') || pwdNorm === 'dicle';
    const isFirat = idNorm.includes('firat') || cleanPhone.includes('5458030118') || pwdNorm === 'firat';

    if (isDicle && pwdNorm !== 'dicle') {
        showToast('❌ Hatalı şifre! (Dicle için şifre: dicle)');
        return;
    }
    if (isFirat && pwdNorm !== 'firat') {
        showToast('❌ Hatalı şifre! (Fırat için şifre: fırat)');
        return;
    }

    if (currentAuthMode === 'login') {
        // 1. API üzerinden giriş yapmayı dene
        try {
            const apiRes = await AilemAPI.login(identifier, password);
            if (apiRes && apiRes.success && apiRes.user && apiRes.family) {
                appState.currentUser = apiRes.user;
                appState.familyData = normalizeFamilyData(apiRes.family);
                saveStateToStorage();
                renderApp();
                registerPushSubscription();
                initRealtimeStream();
                showToast(`Hoş geldiniz, ${apiRes.user.name}! 🏠✨`);
                return;
            } else if (apiRes && apiRes.message && apiRes.message.includes('şifre')) {
                showToast(`❌ ${apiRes.message}`);
                return;
            }
        } catch (apiErr) {
            console.warn('API login hatası, yerel mod ile açılıyor:', apiErr);
        }

        // 2. Çevrimdışı / Statik GitHub Pages Modu (%100 Garantili Giriş)
        const allFams = await AilemDB.getAllFamilies();
        let uysalFamily = (allFams && allFams.length > 0) ? allFams[0] : JSON.parse(JSON.stringify(UYSAL_DEFAULT_FAMILY));

        let matchedUser = null;
        if (isDicle) {
            matchedUser = (uysalFamily.members || []).find(m => normalizeTr(m.name).includes('dicle') || (m.phone && m.phone.includes('5546448989'))) || {
                id: 'usr_1790599516960',
                name: 'Dicle UYSAL',
                role: 'Anne',
                phone: '5546448989',
                avatar: '👩'
            };
        } else if (isFirat) {
            matchedUser = (uysalFamily.members || []).find(m => normalizeTr(m.name).includes('firat') || (m.phone && m.phone.includes('5458030118'))) || {
                id: 'usr_1790661005224',
                name: 'Fırat UYSAL',
                role: 'Baba',
                phone: '5458030118',
                avatar: '👨'
            };
        } else {
            matchedUser = (uysalFamily.members || []).find(m => {
                const nNorm = normalizeTr(m.name);
                return nNorm === idNorm || nNorm.includes(idNorm) || (m.phone && m.phone === identifier);
            }) || {
                id: 'usr_' + Date.now(),
                name: identifier,
                role: 'Birey',
                phone: identifier,
                avatar: '👤'
            };
        }

        appState.currentUser = matchedUser;
        appState.familyData = normalizeFamilyData(uysalFamily);
        saveStateToStorage();
        renderApp();
        showToast(`Hoş geldiniz, ${matchedUser.name}! 🏠✨`);
        return;
    }

    // Yeni Birey Kaydı
    const name = document.getElementById('userName').value.trim();
    const role = document.getElementById('userRole').value;

    if (!name) {
        showToast('Lütfen adınızı ve soyadınızı girin.');
        return;
    }

    const avatar = ROLE_AVATARS[role] || '👤';

    // API üzerinden doğrudan Uysal ailesine dahil et
    const apiRes = await AilemAPI.joinFamily('UYS123', identifier, name, role, avatar, password);
    if (apiRes && apiRes.success) {
        appState.currentUser = apiRes.user;
        appState.familyData = normalizeFamilyData(apiRes.family);
        saveStateToStorage();
        renderApp();
        registerPushSubscription();
        initRealtimeStream();
        showToast(`Uysal Ailesi'ne hoş geldiniz, ${name}! 👋🏠`);
        return;
    }

    // Çevrimdışı fallback
    let family = await AilemDB.findByCode('UYS123') || await AilemDB.findByPhone('');
    const newUser = { id: 'usr_' + Date.now(), name, phone: identifier, role, avatar };
    if (!family) {
        family = {
            id: 'fam_1790764019415',
            name: 'Uysal Ailesi',
            inviteCode: 'UYS123',
            members: [newUser],
            posts: [],
            plans: [],
            dailyPlans: [],
            shoppingList: [],
            tasks: [],
            expenses: [],
            salaries: [],
            extraIncomes: [],
            overtimes: [],
            fixedExpenses: [],
            investments: [],
            investmentHistory: [],
            messages: []
        };
    } else {
        if (!family.members) family.members = [];
        const idx = family.members.findIndex(m => m.phone === identifier);
        if (idx >= 0) family.members[idx] = newUser;
        else family.members.push(newUser);
    }

    appState.currentUser = newUser;
    appState.familyData = normalizeFamilyData(family);
    saveStateToStorage();
    renderApp();
    AilemAPI.syncFamily(family);
    registerPushSubscription();
    showToast(`Uysal Ailesi'ne hoş geldiniz, ${name}! 👋🏠`);
}

async function handleQuickDemoLogin() {
    // Önce SQLite sunucusundan dene
    const apiRes = await AilemAPI.quickDemo();
    if (apiRes && apiRes.success && apiRes.family && apiRes.user) {
        appState.currentUser = apiRes.user;
        appState.familyData = apiRes.family;
        saveStateToStorage();
        renderApp();
        registerPushSubscription();
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
    registerPushSubscription();
    showToast('Uysal Ailesi demo girişi yapıldı! 🎉');
}

// ==========================================================
// 3. EKRAN VE GÖRÜNÜM YÖNETİMİ (RENDER)
// ==========================================================
function checkMonthStartRollover() {
    const family = appState.familyData;
    if (!family) return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastCheckedMonth = localStorage.getItem('yuvapusula_last_checked_month');

    if (lastCheckedMonth !== currentMonthKey) {
        // Yeni bir aya girildi! (Örn: Ayın 1'i)
        // Sabit giderlerin isPaid (ödendi) durumunu yeni ay ödeme takibi için sıfırla (sabit giderler silinmez)
        if (family.fixedExpenses && family.fixedExpenses.length > 0) {
            let hasPaid = false;
            family.fixedExpenses.forEach(f => {
                if (f.isPaid) {
                    f.isPaid = false;
                    hasPaid = true;
                }
            });
            if (hasPaid) {
                saveStateToStorage();
            }
        }
        localStorage.setItem('yuvapusula_last_checked_month', currentMonthKey);
    }
}

async function checkDayStartRollover() {
    const family = appState.familyData;
    if (!family) return;

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastCheckedDay = localStorage.getItem('yuvapusula_last_checked_day');

    if (lastCheckedDay && lastCheckedDay !== todayKey) {
        // Yeni bir güne girildi (Örn: Gece yarısı / sabah sıfırlanması)
        if (family.id) {
            const updatedFamily = await AilemAPI.resetDailyPlans(family.id);
            if (updatedFamily) {
                appState.familyData = normalizeFamilyData(updatedFamily);
                saveStateToStorage();
                renderDailyPlans();
            }
        } else if (family.dailyPlans && family.dailyPlans.length > 0) {
            // Çevrimdışı fallback: Tekrarlayan rutinler kalır (completed: false), tek günlük planlar temizlenir
            family.dailyPlans = family.dailyPlans
                .filter(p => p.isRecurring)
                .map(p => ({ ...p, completed: false }));
            saveStateToStorage();
            renderDailyPlans();
        }
    }
    localStorage.setItem('yuvapusula_last_checked_day', todayKey);
}

function getISOWeekKey(d = new Date()) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNr = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${String(weekNr).padStart(2, '0')}`;
}

async function checkWeekStartRollover() {
    const family = appState.familyData;
    if (!family) return;

    const currentWeekKey = getISOWeekKey();
    const lastCheckedWeek = localStorage.getItem('yuvapusula_last_checked_week');

    if (lastCheckedWeek && lastCheckedWeek !== currentWeekKey) {
        // Yeni bir haftaya girildi (Pazartesi haftalık görev sıfırlanması)
        if (family.id) {
            const updatedFamily = await AilemAPI.resetWeeklyTasks(family.id);
            if (updatedFamily) {
                appState.familyData = normalizeFamilyData(updatedFamily);
                saveStateToStorage();
                renderTasks();
                renderDailyPlans();
            }
        } else if (family.tasks && family.tasks.length > 0) {
            family.tasks = family.tasks.map(t => ({ ...t, completed: false }));
            saveStateToStorage();
            renderTasks();
            renderDailyPlans();
        }
    }
    localStorage.setItem('yuvapusula_last_checked_week', currentWeekKey);
}

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

    checkMonthStartRollover();
    checkWeekStartRollover();
    checkDayStartRollover();

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
    if (sidebarTitleEl) sidebarTitleEl.textContent = family.name.endsWith('Ailesi') ? family.name : `${family.name} Ailesi`;
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
    renderDailyPlans();
    renderChat();
    switchPlansHub(appState.activePlanHub || 'Seyahat');
    renderShopping();
    renderTasks();
    renderBudget();
    renderMembers();
    updateQuickStats();
    updatePushNotificationUI();
    switchTab(appState.currentTab || 'tabPano');
}

function updateQuickStats() {
    const family = appState.familyData;
    if (!family) return;

    const allPlans = family.plans || [];
    const pendingPlans = allPlans.filter(p => !p.completed).length;
    const shoppingItems = family.shoppingList || family.shopping || [];
    const pendingShop = shoppingItems.filter(s => !s.completed).length;
    const taskItems = family.tasks || [];
    const pendingTask = taskItems.filter(t => !t.completed).length;
    const memberItems = family.members || [];

    const quickPlansEl = document.getElementById('quickPendingPlans');
    if (quickPlansEl) quickPlansEl.textContent = pendingPlans;

    const quickShopEl = document.getElementById('quickPendingShopping');
    if (quickShopEl) quickShopEl.textContent = pendingShop;

    const quickTasksEl = document.getElementById('quickPendingTasks');
    if (quickTasksEl) quickTasksEl.textContent = pendingTask;

    const quickMemberEl = document.getElementById('quickMemberCount');
    if (quickMemberEl) quickMemberEl.textContent = memberItems.length;

    // Hub Kategori Sayaçları
    const countSeyahat = allPlans.filter(p => p.category === 'Seyahat').length;
    const countRestoran = allPlans.filter(p => p.category === 'Restoran').length;
    const countEtkinlik = allPlans.filter(p => p.category === 'Etkinlik').length;
    const countAlisveris = allPlans.filter(p => p.category === 'Alisveris').length;
    const countGunluk = (family.dailyPlans || []).length;

    const elCountSeyahat = document.getElementById('countHubSeyahat');
    if (elCountSeyahat) elCountSeyahat.textContent = `${countSeyahat} Rota`;
    const elCountRestoran = document.getElementById('countHubRestoran');
    if (elCountRestoran) elCountRestoran.textContent = `${countRestoran} Mekan`;
    const elCountEtkinlik = document.getElementById('countHubEtkinlik');
    if (elCountEtkinlik) elCountEtkinlik.textContent = `${countEtkinlik} Bilet`;
    const elCountAlisveris = document.getElementById('countHubAlisveris');
    if (elCountAlisveris) elCountAlisveris.textContent = `${countAlisveris} İstek`;
    const elCountGunluk = document.getElementById('countHubGunluk');
    if (elCountGunluk) elCountGunluk.textContent = `${countGunluk} Plan`;

    // Sadece Sohbet/Mesaj için okunmamış mesaj rozetlerini güncelle
    updateChatUnreadCounts();
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
// 3. AİLE PLANLARI & KEŞİF HUB'I (META & RENDER)
// ==========================================================
const DAILY_PLAN_ICONS = {
    'Banyo': '🛁',
    'Öğle': '☀️',
    'Ogle': '☀️',
    'Akşam': '🌙',
    'Aksam': '🌙',
    'Temizlik': '🧹',
    'Sabah': '🌅',
    'Okul': '🎒',
    'İş': '💼',
    'Is': '💼',
    'Spor': '🏃',
    'İlaç': '💊',
    'Ilac': '💊',
    'Yemek': '🍽️',
    'Ders': '📚',
    'Diğer': '⭐',
    'Diger': '⭐'
};

function getDailyPlanIcon(category) {
    if (!category) return '⭐';
    const firstPart = category.trim().split(' ')[0];
    if (firstPart && /\p{Extended_Pictographic}/u.test(firstPart)) {
        return firstPart;
    }
    for (const [key, icon] of Object.entries(DAILY_PLAN_ICONS)) {
        if (category.toLowerCase().includes(key.toLowerCase())) {
            return icon;
        }
    }
    return '⭐';
}

const HUB_META = {
    'Seyahat': {
        title: '✈️ Seyahat Rotalarımız & Tatil Keşifleri',
        subtitle: 'Yurt içi ve yurt dışı tatil rotalarımız, ulaşım & bütçe planları',
        btnText: '<i class="fa-solid fa-plus"></i> Rota Ekle',
        subFilters: [
            { label: 'Tüm Rotalar', value: 'ALL' },
            { label: '🇹🇷 Yurt İçi', value: 'Yurtici' },
            { label: '🌍 Yurt Dışı', value: 'Yurtdisi' }
        ]
    },
    'Restoran': {
        title: '🍽️ Restoran, Kafe & Lezzet Duraklarımız',
        subtitle: 'Ailece keşfetmek istediğimiz mekanlar, popüler kafeler ve menü notları',
        btnText: '<i class="fa-solid fa-plus"></i> Mekan Ekle',
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
    },
    'Gunluk': {
        title: '⏰ Günlük Planlama & Rutinlerimiz',
        subtitle: 'Her gün sabah, öğle, akşam, banyo, temizlik saatlik akış ve rutinler',
        btnText: '<i class="fa-solid fa-plus"></i> Günlük Plan Ekle',
        subFilters: [
            { label: 'Tüm Gün', value: 'ALL' },
            { label: '🌅 Sabah', value: 'Sabah' },
            { label: '☀️ Öğle', value: 'Ogle' },
            { label: '🌙 Akşam', value: 'Aksam' },
            { label: '🛁 Banyo', value: 'Banyo' },
            { label: '🧹 Temizlik', value: 'Temizlik' },
            { label: '🔁 Rutinler', value: 'Rutin' }
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
    if (category === 'Gunluk') {
        openModal('modalNewDailyPlan');
        return;
    }
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

function filterDailyPlanner(mode, btn) {
    appState.dailyPlannerFilter = mode;
    const chips = document.querySelectorAll('.daily-filter-row .chip');
    chips.forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDailyPlans();
}

async function toggleTaskFromDaily(taskId) {
    await toggleTask(taskId);
    renderDailyPlans();
    updateQuickStats();
}

function getTodayFormattedStrings() {
    const now = new Date();
    const iso = now.toISOString().split('T')[0];
    const tr = now.toLocaleDateString('tr-TR');
    const trPadded = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    return [iso, tr, trPadded, 'Bugün', 'bugün', 'Düzenli', 'düzenli'];
}

// Günlük Planları Render Et (Pano Widget & Gün Akışı)
function renderDailyPlans() {
    const family = appState.familyData;
    const container = document.getElementById('panoDailyPlansList');
    if (!container || !family) return;

    // Günün tarihi etiketi (Türkçe)
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    const dateLabel = document.getElementById('dailyPlannerDateLabel');
    if (dateLabel) dateLabel.textContent = dateStr;

    if (!family.dailyPlans) family.dailyPlans = [];
    if (!family.tasks) family.tasks = [];

    const curUser = appState.currentUser;
    const curNameLower = (curUser && curUser.name ? curUser.name : '').toLowerCase();
    const isDicle = curNameLower.includes('dicle');
    const isFirat = curNameLower.includes('fırat') || curNameLower.includes('firat');

    const todayMatchStrings = getTodayFormattedStrings();

    // 1. Günlük Rutinleri Al
    const dailyItems = family.dailyPlans.map(p => ({
        ...p,
        itemType: 'dailyPlan'
    }));

    // 2. Bugünün Görevlerini Al (Görevler tabından bugüne eklenenler)
    const todayTasks = family.tasks
        .filter(t => {
            if (!t.dueDate) return false;
            const due = t.dueDate.trim();
            return todayMatchStrings.some(s => due.includes(s) || due === s);
        })
        .map(t => ({
            id: t.id,
            title: t.title,
            time: 'Günün Görevi',
            icon: '✅',
            category: 'Görev',
            assignedTo: t.assignee || 'Tüm Aile',
            completed: !!t.completed,
            isTask: true,
            itemType: 'task',
            dueDate: t.dueDate
        }));

    // 3. Birleştir
    let combined = [...dailyItems, ...todayTasks];

    // 4. Kişi Filtreleme (Bana Özel vs Tüm Aile)
    if (appState.dailyPlannerFilter === 'MINE') {
        combined = combined.filter(item => {
            const assigned = (item.assignedTo || '').toLowerCase();
            const isAll = assigned.includes('tüm aile') || assigned.includes('tum aile') || assigned.includes('ortak') || !item.assignedTo;
            if (isAll) return true;
            if (isDicle && assigned.includes('dicle')) return true;
            if (isFirat && (assigned.includes('fırat') || assigned.includes('firat'))) return true;
            return false;
        });
    }

    // İlerleme Çubuğu ve Yüzdesi
    const totalCount = combined.length;
    const completedCount = combined.filter(p => p.completed).length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const progressFill = document.getElementById('dailyProgressFill');
    const progressText = document.getElementById('dailyProgressText');
    const progressPercentEl = document.getElementById('dailyProgressPercent');

    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) {
        progressText.textContent = totalCount > 0 
            ? `${completedCount}/${totalCount} Tamamlandı` 
            : '0/0 Plan';
    }
    if (progressPercentEl) {
        progressPercentEl.textContent = `%${progressPercent}`;
    }

    if (combined.length === 0) {
        container.innerHTML = `
            <div class="empty-daily-state">
                <i class="fa-solid fa-calendar-day"></i>
                <p>Bugün için size atanan aktif bir plan veya görev bulunmuyor.<br>Yeni bir rutin veya görev eklemek için yukarıdaki butonları kullanabilirsiniz.</p>
            </div>
        `;
        return;
    }

    // Sıralama
    combined.sort((a, b) => {
        if (a.isTask && !b.isTask) return 1;
        if (!a.isTask && b.isTask) return -1;
        if (a.time && b.time && a.time !== 'Günün Görevi' && b.time !== 'Günün Görevi') return a.time.localeCompare(b.time);
        return 0;
    });

    container.innerHTML = combined.map(item => {
        const assigned = item.assignedTo || 'Tüm Aile';
        const assignedLower = assigned.toLowerCase();
        let memberTag = `<span class="daily-member-tag tag-all"><i class="fa-solid fa-people-group"></i> Tüm Aile</span>`;
        if (assignedLower.includes('dicle')) {
            memberTag = `<span class="daily-member-tag tag-dicle">👩 Dicle</span>`;
        } else if (assignedLower.includes('fırat') || assignedLower.includes('firat')) {
            memberTag = `<span class="daily-member-tag tag-firat">👨 Fırat</span>`;
        }

        if (item.itemType === 'task') {
            return `
                <div class="daily-item ${item.completed ? 'completed' : ''}" style="border-left: 4px solid #2980B9;">
                    <div class="custom-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleTaskFromDaily('${item.id}')">
                        ${item.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                    <div class="daily-time-badge task-time-badge">
                        <i class="fa-solid fa-list-check"></i> Görev
                    </div>
                    <div class="daily-info">
                        <div class="daily-title ${item.completed ? 'completed-text' : ''}">
                            ${item.title}
                            <span class="daily-task-badge"><i class="fa-solid fa-calendar-day"></i> Bugünün Görevi</span>
                        </div>
                        <div class="daily-meta">
                            ${memberTag}
                            <span>• <i class="fa-regular fa-clock"></i> Bitiş: ${item.dueDate}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-delete-item" onclick="deleteTask('${item.id}')" title="Görevi Sil">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        const icon = getDailyPlanIcon(item.category);
        return `
            <div class="daily-item ${item.completed ? 'completed' : ''}">
                <div class="custom-checkbox ${item.completed ? 'checked' : ''}" onclick="handleToggleDailyPlan('${item.id}')">
                    ${item.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                <div class="daily-time-badge ${!item.time ? 'no-time' : ''}">
                    <i class="fa-regular fa-clock"></i> ${item.time || '--:--'}
                </div>
                <div class="daily-info">
                    <div class="daily-title ${item.completed ? 'completed-text' : ''}">
                        <span class="daily-category-icon">${icon}</span>
                        ${item.title}
                        ${item.isRecurring ? '<span class="daily-recurring-badge" title="Her gün tekrarlanan rutin"><i class="fa-solid fa-arrows-rotate"></i> Her Gün</span>' : ''}
                    </div>
                    <div class="daily-meta">
                        ${memberTag}
                        ${item.note ? `<span>• <i class="fa-regular fa-comment"></i> ${item.note}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn-delete-item" onclick="openEditDailyPlanModal('${item.id}')" title="Planı Düzenle" style="color: #0284c7; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2);">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-delete-item" onclick="handleDeleteDailyPlan('${item.id}')" title="Planı Sil">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Aile Planları & Keşifler Render
function renderPlans() {
    const container = document.getElementById('plansList');
    if (!container) return;

    // Günlük Plan Hub Seçiliyse Günlük Rutinleri Göster
    if (appState.activePlanHub === 'Gunluk') {
        let dailyItems = [...(appState.familyData.dailyPlans || [])];

        // Alt Filtre
        if (appState.plansSubFilter === 'Sabah') {
            dailyItems = dailyItems.filter(p => (p.category && (p.category.includes('Sabah') || p.category.includes('🌅'))) || (p.time && p.time >= '05:00' && p.time < '12:00'));
        } else if (appState.plansSubFilter === 'Ogle') {
            dailyItems = dailyItems.filter(p => (p.category && (p.category.includes('Öğle') || p.category.includes('Ogle') || p.category.includes('☀️') || ['Okul', 'İş', 'Yemek', 'Ders', 'Spor'].some(c => (p.category || '').includes(c)))) || (p.time && p.time >= '12:00' && p.time < '18:00'));
        } else if (appState.plansSubFilter === 'Aksam') {
            dailyItems = dailyItems.filter(p => (p.category && (p.category.includes('Akşam') || p.category.includes('Aksam') || p.category.includes('🌙') || p.category.includes('Dinlenme'))) || (p.time && (p.time >= '18:00' || p.time < '05:00')));
        } else if (appState.plansSubFilter === 'Banyo') {
            dailyItems = dailyItems.filter(p => p.category && (p.category.includes('Banyo') || p.category.includes('🛁') || p.category.includes('Duş')));
        } else if (appState.plansSubFilter === 'Temizlik') {
            dailyItems = dailyItems.filter(p => p.category && (p.category.includes('Temizlik') || p.category.includes('🧹') || p.category.includes('Düzen')));
        } else if (appState.plansSubFilter === 'Rutin') {
            dailyItems = dailyItems.filter(p => p.isRecurring);
        }

        // Durum Filtresi
        if (appState.plansStatusFilter === 'PENDING') {
            dailyItems = dailyItems.filter(p => !p.completed);
        } else if (appState.plansStatusFilter === 'COMPLETED') {
            dailyItems = dailyItems.filter(p => p.completed);
        }

        if (dailyItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-calendar-check"></i>
                    <p>Bu filtrede günlük plan veya rutin bulunmuyor. Yeni bir rutin ekleyin! ⏰</p>
                </div>
            `;
            return;
        }

        dailyItems.sort((a, b) => {
            if (a.time && b.time) return a.time.localeCompare(b.time);
            if (a.time) return -1;
            if (b.time) return 1;
            return 0;
        });

        container.innerHTML = dailyItems.map(p => {
            const icon = getDailyPlanIcon(p.category);
            return `
                <div class="daily-item ${p.completed ? 'completed' : ''}" style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 8px;">
                    <div class="custom-checkbox ${p.completed ? 'checked' : ''}" onclick="handleToggleDailyPlan('${p.id}')">
                        ${p.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                    <div class="daily-time-badge ${!p.time ? 'no-time' : ''}">
                        <i class="fa-regular fa-clock"></i> ${p.time || '--:--'}
                    </div>
                    <div class="daily-info">
                        <div class="daily-title ${p.completed ? 'completed-text' : ''}">
                            <span class="daily-category-icon">${icon}</span>
                            ${p.title}
                            ${p.isRecurring ? '<span class="daily-recurring-badge" title="Her gün tekrarlanan rutin"><i class="fa-solid fa-arrows-rotate"></i> Her Gün</span>' : ''}
                        </div>
                        <div class="daily-meta">
                            <span><i class="fa-solid fa-user"></i> ${p.assignedTo || 'Tüm Aile'}</span>
                            ${p.note ? `<span>• <i class="fa-regular fa-comment"></i> ${p.note}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-delete-item" onclick="openEditDailyPlanModal('${p.id}')" title="Planı Düzenle" style="color: #0284c7; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2);">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-delete-item" onclick="handleDeleteDailyPlan('${p.id}')" title="Planı Sil">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        return;
    }

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
            'Alisveris': 'Alışveriş veya hayal listeniz henüz boş. İstediğiniz bir ürünü kaydedin! 🛍️',
            'Gunluk': 'Kayıtlı günlük plan bulunmuyor. Günlük akışınızı ekleyin! ⏰'
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
            const hasDrop = !!plan.priceDropped && !!plan.oldPrice;
            const priceHtml = hasDrop ? `
                <div class="plan-detail-row plan-price-drop-row">
                    <i class="fa-solid fa-fire" style="color: #dc2626;"></i> 
                    <b>Fiyat:</b> 
                    <span class="price-drop-wrap">
                        <del class="old-price-del">${plan.oldPrice}</del>
                        <strong class="new-price-highlight">${plan.shopPrice || plan.currentPrice}</strong>
                        <span class="badge-price-drop"><i class="fa-solid fa-arrow-trend-down"></i> İndirim!</span>
                    </span>
                </div>
            ` : (plan.shopPrice ? `<div class="plan-detail-row"><i class="fa-solid fa-tag"></i> <b>Fiyat:</b> <span>${plan.shopPrice}</span></div>` : '');

            const hasHttpLink = plan.link && (plan.link.startsWith('http://') || plan.link.startsWith('https://'));
            const linkBtnsHtml = `
                <div class="plan-shop-actions">
                    ${hasHttpLink ? `<a href="${plan.link}" target="_blank" class="plan-link-btn" style="flex: 1;"><i class="fa-solid fa-bag-shopping"></i> Ürüne Git</a>` : ''}
                    ${hasHttpLink ? `
                        <button class="btn-check-price" onclick="checkPlanPrice('${plan.id}', event)" title="Canlı fiyatı web sitesinden tara ve kontrol et">
                            <i class="fa-solid fa-rotate"></i> Fiyatı Kontrol Et
                        </button>
                    ` : ''}
                    <button class="btn-check-price btn-quick-price" onclick="quickUpdatePlanPrice('${plan.id}')" title="Fiyatı güncelle ve indirimi aileye bildir">
                        <i class="fa-solid fa-pen"></i> Fiyatı Güncelle
                    </button>
                </div>
            `;

            let lastCheckStr = '';
            if (plan.lastPriceCheck) {
                try {
                    const checkDate = new Date(plan.lastPriceCheck);
                    lastCheckStr = `<div class="plan-detail-row plan-check-meta"><i class="fa-regular fa-clock"></i> <span>Son Kontrol: ${checkDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${checkDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
                } catch (e) {}
            }

            detailsHtml = `
                <div class="plan-details-box ${hasDrop ? 'has-price-drop-box' : ''}">
                    ${priceHtml}
                    ${plan.priority ? `<div class="plan-detail-row"><i class="fa-solid fa-star"></i> <b>Öncelik:</b> <span>${plan.priority}</span></div>` : ''}
                    ${plan.shopNote ? `<div class="plan-detail-row"><i class="fa-solid fa-note-sticky"></i> <b>Not / Amaç:</b> <span>${plan.shopNote}</span></div>` : ''}
                    ${lastCheckStr}
                    ${linkBtnsHtml}
                </div>
            `;
        }

        const catClass = `cat-${plan.category}`;
        const badgeClass = `badge-${plan.category}`;

        return `
            <div class="plan-card ${catClass} ${plan.completed ? 'completed' : ''} ${plan.priceDropped ? 'card-price-dropped' : ''}">
                <div class="plan-top">
                    <div class="plan-badges">
                        <span class="plan-cat-badge ${badgeClass}">${CAT_ICONS[plan.category] || plan.category}</span>
                        ${plan.travelType ? `<span class="plan-cat-badge" style="background:#f1f5f9; color:#475569;">${plan.travelType === 'Yurtdisi' ? '🌍 Yurt Dışı' : '🇹🇷 Yurt İçi'}</span>` : ''}
                        ${plan.priceDropped ? `<span class="plan-cat-badge badge-price-drop-glow"><i class="fa-solid fa-fire"></i> FİYAT DÜŞTÜ</span>` : ''}
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
                        <button class="btn-delete-item" onclick="openEditPlanModal('${plan.id}')" title="Planı Düzenle" style="color: #0284c7; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2);">
                            <i class="fa-solid fa-pen-to-square"></i>
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

// Alışveriş / Hayal Ürün Fiyatını Anlık Kontrol Et
async function checkPlanPrice(planId, evt) {
    if (!appState.familyData || !appState.familyData.id) return;
    const btn = evt ? evt.currentTarget : null;
    let oldBtnHtml = '';
    if (btn) {
        oldBtnHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Kontrol Ediliyor...`;
    }
    showToast('🔍 Ürün sayfası taranıyor ve güncel fiyat sorgulanıyor...');

    try {
        const result = await AilemAPI.checkPlanPrice(appState.familyData.id, planId);
        if (result && result.success) {
            if (result.family) {
                appState.familyData = normalizeFamilyData(result.family);
                saveStateToStorage();
                renderPlans();
            }
            if (result.priceDropped) {
                triggerHapticAndSound();
                showToast(`🔥 Müjde! Fiyat DÜŞTÜ: ${result.newPrice} (Önceki: ${result.oldPrice})`);
            } else if (result.foundPrice) {
                showToast(`✅ Güncel satış fiyatı: ${result.foundPrice} (Fiyat değişikliği yok)`);
            } else {
                showToast(result.message || 'Fiyat bilgisi güncellendi.');
            }
        } else {
            // Web sitesi bot koruması (Cloudflare/Akamai) uyguluyorsa hızlı fiyat girişi öner
            const plan = (appState.familyData.plans || []).find(p => p.id === planId);
            const currentPriceStr = plan ? (plan.shopPrice || plan.currentPrice || '') : '';
            
            const promptVal = prompt(
                `🤖 "${plan ? plan.title : 'Ürün'}" web sitesi otomatik robot koruması uyguladığı için fiyat doğrudan okunamadı.\n\nSitedeki güncel satış fiyatını girmek ister misiniz? (Örn: 4800 veya 4.800 ₺)\n\nEğer yeni fiyat eskisinden (${currentPriceStr || 'Kayıtlı fiyat'}) düşükse TÜM AİLEYE otomatik bildirim gidecektir:`,
                currentPriceStr.replace(/[^0-9]/g, '')
            );

            if (promptVal && promptVal.trim()) {
                await quickUpdatePlanPrice(planId, promptVal.trim());
            } else {
                showToast('Fiyat kontrolü tamamlandı.');
            }
        }
    } catch (e) {
        showToast('Fiyat kontrolü sırasında bir hata oluştu.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldBtnHtml || `<i class="fa-solid fa-rotate"></i> Fiyatı Kontrol Et`;
        }
    }
}

// Fiyatı Hızlıca Güncelle ve İndirimi Tüm Aileye Bildir
async function quickUpdatePlanPrice(planId, presetPrice = null) {
    if (!appState.familyData || !appState.familyData.id) return;
    const plan = (appState.familyData.plans || []).find(p => p.id === planId);
    if (!plan) return;

    let enteredPrice = presetPrice;
    if (!enteredPrice) {
        const currentPriceStr = plan.shopPrice || plan.currentPrice || '';
        enteredPrice = prompt(
            `💰 "${plan.title}" için güncel satış fiyatını girin:\n(Örn: 4800 veya 4.800 ₺)\n\nEğer yeni fiyat eskisinden (${currentPriceStr || '0 ₺'}) düşükse tüm aileye anında indirim bildirimi gönderilecektir!`,
            currentPriceStr.replace(/[^0-9]/g, '')
        );
    }

    if (!enteredPrice || !enteredPrice.trim()) return;

    showToast('💾 Fiyat güncelleniyor ve kontrol ediliyor...');
    try {
        const result = await AilemAPI.updatePlanPrice(appState.familyData.id, planId, enteredPrice.trim());
        if (result && result.success) {
            if (result.family) {
                appState.familyData = normalizeFamilyData(result.family);
                saveStateToStorage();
                renderPlans();
            }
            if (result.priceDropped) {
                triggerHapticAndSound();
                showToast(`🔥 Müjde! Fiyat DÜŞTÜ: ${result.newPrice} (Önceki: ${result.oldPrice}) - Tüm aileye bildirildi! 🔔`);
            } else {
                showToast(`✅ Güncel fiyat kaydedildi: ${result.newPrice}`);
            }
        } else {
            showToast(result?.message || 'Fiyat güncellenemedi.', 'warning');
        }
    } catch (e) {
        showToast('Fiyat güncellenirken bir hata oluştu.', 'error');
    }
}

// Alışveriş Listesi
function renderShopping() {
    const container = document.getElementById('shoppingItemsList');
    if (!container || !appState.familyData) return;
    let items = appState.familyData.shoppingList || appState.familyData.shopping || [];

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

function filterTaskAssignee(mode, btn) {
    appState.taskAssigneeFilter = mode;
    const chips = document.querySelectorAll('#taskAssigneeFilterRow .chip');
    chips.forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTasks();
}

async function handleResetWeeklyTasks() {
    if (confirm('Haftalık görevleri yeni hafta için sıfırlamak istediğinize emin misiniz?')) {
        if (appState.familyData && appState.familyData.id) {
            const updated = await AilemAPI.resetWeeklyTasks(appState.familyData.id);
            if (updated) {
                appState.familyData = normalizeFamilyData(updated);
            }
        } else if (appState.familyData && appState.familyData.tasks) {
            appState.familyData.tasks = appState.familyData.tasks.map(t => ({ ...t, completed: false }));
        }
        saveStateToStorage();
        renderTasks();
        renderDailyPlans();
        updateQuickStats();
        showToast('🗓️ Tüm haftalık görevler sıfırlandı! ✨');
    }
}

// Görevler
function renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container || !appState.familyData) return;
    let tasks = appState.familyData.tasks || [];

    // Durum Filtresi (ALL / PENDING / DONE)
    if (appState.taskFilter === 'PENDING') {
        tasks = tasks.filter(t => !t.completed);
    } else if (appState.taskFilter === 'DONE') {
        tasks = tasks.filter(t => t.completed);
    }

    const curUser = appState.currentUser;
    const curNameLower = (curUser && curUser.name ? curUser.name : '').toLowerCase();
    const isDicle = curNameLower.includes('dicle');
    const isFirat = curNameLower.includes('fırat') || curNameLower.includes('firat');

    // Kişi Filtresi (Bana Atananlar & Ortak / Tüm Görevler / Dicle / Fırat / Tüm Aile)
    if (appState.taskAssigneeFilter === 'MINE') {
        tasks = tasks.filter(t => {
            const assigned = (t.assignee || '').toLowerCase();
            const isAll = assigned.includes('tüm aile') || assigned.includes('tum aile') || assigned.includes('ortak') || !t.assignee;
            if (isAll) return true;
            if (isDicle && assigned.includes('dicle')) return true;
            if (isFirat && (assigned.includes('fırat') || assigned.includes('firat'))) return true;
            return false;
        });
    } else if (appState.taskAssigneeFilter === 'DICLE') {
        tasks = tasks.filter(t => (t.assignee || '').toLowerCase().includes('dicle'));
    } else if (appState.taskAssigneeFilter === 'FIRAT') {
        tasks = tasks.filter(t => (t.assignee || '').toLowerCase().includes('fırat') || (t.assignee || '').toLowerCase().includes('firat'));
    } else if (appState.taskAssigneeFilter === 'FAMILY') {
        tasks = tasks.filter(t => (t.assignee || '').toLowerCase().includes('aile') || (t.assignee || '').toLowerCase().includes('ortak') || !t.assignee);
    }

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-check"></i>
                <p>Bu filtreye uygun bekleyen görev bulunmuyor. Dinlenme vakti! 🛋️✨</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const assigned = task.assignee || 'Tüm Aile';
        const assignedLower = assigned.toLowerCase();
        let memberTag = `<span class="daily-member-tag tag-all"><i class="fa-solid fa-people-group"></i> Tüm Aile</span>`;
        if (assignedLower.includes('dicle')) {
            memberTag = `<span class="daily-member-tag tag-dicle">👩 Dicle</span>`;
        } else if (assignedLower.includes('fırat') || assignedLower.includes('firat')) {
            memberTag = `<span class="daily-member-tag tag-firat">👨 Fırat</span>`;
        }

        return `
            <div class="task-card ${task.completed ? 'completed' : ''}">
                <div class="custom-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                <div class="task-details">
                    <div class="task-title ${task.completed ? 'completed-text' : ''}">${task.title}</div>
                    <div class="task-meta">
                        ${memberTag}
                        <span>• <i class="fa-regular fa-calendar"></i> ${task.dueDate || 'Belirtilmedi'}</span>
                        ${task.addedBy ? `<span>• Ekleyen: ${task.addedBy}</span>` : ''}
                    </div>
                </div>
                <button class="btn-delete-item" onclick="deleteTask('${task.id}')" title="Görevi Sil">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');
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

const CHARITY_ICONS = {
    'Sadaka': '🤲',
    'Zekat': '🕊️',
    'Fitre': '📦',
    'Burs': '🎓',
    'Hayvanlar': '🐾',
    'Iftar': '🍲',
    'Saglik': '🏥',
    'Fidan': '🌳',
    'Diger': '✨'
};

const CHARITY_LABELS = {
    'Sadaka': 'Sadaka / İyilik',
    'Zekat': 'Zekat',
    'Fitre': 'Fitre / Fidye',
    'Burs': 'Öğrenci & Burs',
    'Hayvanlar': 'Sokak Hayvanları & Mama',
    'Iftar': 'İkram & Yemek',
    'Saglik': 'Şifa & Sağlık',
    'Fidan': 'Fidan & Çevre',
    'Diger': 'Diğer İyilik'
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
    if (!family.extraIncomes) family.extraIncomes = [];
    if (!family.overtimes) family.overtimes = [];
    if (!family.fixedExpenses) family.fixedExpenses = [];
    if (!family.expenses) family.expenses = [];
    if (!family.investments) family.investments = [];
    if (!family.investmentTransactions) family.investmentTransactions = [];

    const salaries = family.salaries;
    const extraIncomes = family.extraIncomes;
    const overtimes = family.overtimes;
    const fixedExpenses = family.fixedExpenses;
    const expenses = family.expenses;
    const investments = family.investments;

    // 1. Aktif Ay Hesaplaması (Her ayın 1'inde otomatik olarak sıfırlanır)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${currentYear}-${currentMonthNum}`;
    const monthNamesTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const currentMonthLabel = `${monthNamesTr[now.getMonth()]} ${currentYear}`;

    // Yalnızca aktif aya ait ek gelirleri topla
    const currentMonthExtraIncomes = extraIncomes.filter(inc => {
        if (inc.month) return inc.month === currentMonthKey;
        if (inc.createdAt) return inc.createdAt.startsWith(currentMonthKey);
        return true;
    });

    // Yalnızca aktif aya ait mesaileri topla (Her ayın 1'inde sıfırlanır)
    const currentMonthOvertimes = overtimes.filter(ot => {
        if (ot.month) return ot.month === currentMonthKey;
        if (ot.date && ot.date.startsWith(currentMonthKey)) return true;
        if (ot.createdAt) return ot.createdAt.startsWith(currentMonthKey);
        return true;
    });

    // Yalnızca aktif aya ait değişken harcamaları topla (Her ayın 1'inde sıfırlanır)
    const currentMonthExpenses = expenses.filter(exp => {
        if (exp.month) return exp.month === currentMonthKey;
        if (exp.date && exp.date.startsWith(currentMonthKey)) return true;
        if (exp.createdAt) return exp.createdAt.startsWith(currentMonthKey);
        return true;
    });

    const totalSalaries = salaries.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalExtraIncomes = currentMonthExtraIncomes.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalOvertimes = currentMonthOvertimes.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalIncome = totalSalaries + totalExtraIncomes + totalOvertimes;
    const totalFixed = fixedExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const paidCount = fixedExpenses.filter(x => x.isPaid).length;
    const unpaidCount = fixedExpenses.filter(x => !x.isPaid).length;
    const totalVariable = currentMonthExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const netRemaining = totalIncome - totalFixed - totalVariable;
    const totalPortfolio = investments.reduce((s, x) => s + (Number(x.currentValueTl) || 0), 0);

    // 2. Master 4'lü Kart Güncellemeleri
    const elStatSalaries = document.getElementById('statTotalSalaries');
    if (elStatSalaries) elStatSalaries.textContent = formatTL(totalIncome);

    const elSalaryCount = document.getElementById('statSalaryCount');
    if (elSalaryCount) {
        const parts = [];
        if (totalSalaries > 0) parts.push(`Maaş: ${formatTL(totalSalaries)}`);
        if (totalOvertimes > 0) parts.push(`Mesai: ${formatTL(totalOvertimes)}`);
        if (totalExtraIncomes > 0) parts.push(`Ek: ${formatTL(totalExtraIncomes)}`);
        elSalaryCount.textContent = parts.length > 0 ? parts.join(' • ') : `${salaries.length} maaş geliri (Ek/Mesai yok)`;
    }

    const elStatFixed = document.getElementById('statTotalFixedExpenses');
    if (elStatFixed) elStatFixed.textContent = formatTL(totalFixed);

    const elFixedStatus = document.getElementById('statFixedStatus');
    if (elFixedStatus) elFixedStatus.textContent = `${paidCount} / ${fixedExpenses.length} Ödendi`;

    const elTotalExpenseAmount = document.getElementById('totalExpenseAmount');
    if (elTotalExpenseAmount) elTotalExpenseAmount.textContent = formatTL(totalVariable);

    const elTotalExpenseCount = document.getElementById('totalExpenseCount');
    if (elTotalExpenseCount) elTotalExpenseCount.textContent = `${currentMonthExpenses.length} adet harcama (${currentMonthLabel})`;

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

    // Hayır & Sadaka Render
    renderCharities(currentMonthKey, currentMonthLabel, currentYear);

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

    // 4.0 Bu Ayki Mesai Takip Paneli Render (Saatlik 296,875 TL & Fırat - Ayın 1'inde Sıfırlanır)
    const otMonthBadgeEl = document.getElementById('overtimeMonthBadge');
    if (otMonthBadgeEl) {
        otMonthBadgeEl.innerHTML = `🟢 ${currentMonthLabel} • Ayın 1'inde Sıfırlanır`;
    }

    const curUserName = (appState.currentUser ? appState.currentUser.name : '').toLowerCase();

    // 1. Dicle Mesai (Saatlik 296,875 TL)
    const dicleOvertimes = currentMonthOvertimes.filter(ot => {
        const p = (ot.person || '').toLowerCase();
        return p.includes('dicle') || (!p.includes('fırat') && !p.includes('firat'));
    });
    const dicleTotalAmount = dicleOvertimes.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    const dicleTotalHours = dicleOvertimes.reduce((s, o) => s + (parseFloat(o.hours) || 0), 0);

    const elDicleOtAmount = document.getElementById('dicleOvertimeTotalAmount') || document.getElementById('myOvertimeTotalAmount');
    if (elDicleOtAmount) elDicleOtAmount.textContent = formatTL(dicleTotalAmount);

    const elDicleOtHours = document.getElementById('dicleOvertimeTotalHours') || document.getElementById('myOvertimeTotalHours');
    if (elDicleOtHours) elDicleOtHours.textContent = `${dicleTotalHours > 0 ? dicleTotalHours.toLocaleString('tr-TR') : 0} Saat İşlendi`;

    // 2. Fırat Mesai (Günlük: Hafta İçi 1.041,67 TL / Cumartesi 3.125,00 TL)
    const firatOvertimes = currentMonthOvertimes.filter(ot => {
        const p = (ot.person || '').toLowerCase();
        return p.includes('fırat') || p.includes('firat');
    });
    const firatTotalAmount = firatOvertimes.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    const firatTotalDays = firatOvertimes.reduce((s, o) => s + (parseFloat(o.days) || 1), 0);

    const elFiratOtAmount = document.getElementById('firatOvertimeTotalAmount');
    if (elFiratOtAmount) elFiratOtAmount.textContent = formatTL(firatTotalAmount);

    const elFiratOtDays = document.getElementById('firatOvertimeTotalDays') || document.getElementById('firatOvertimeTotalHours');
    if (elFiratOtDays) {
        elFiratOtDays.textContent = `${firatTotalDays > 0 ? firatTotalDays.toLocaleString('tr-TR') : 0} Gün Mesai`;
    }

    const overtimesContainer = document.getElementById('overtimesListContainer');
    if (overtimesContainer) {
        if (currentMonthOvertimes.length === 0) {
            overtimesContainer.innerHTML = `
                <div class="empty-state" style="padding: 16px; grid-column: 1 / -1;">
                    <i class="fa-solid fa-clock-rotate-left" style="color: var(--primary); font-size: 24px; margin-bottom: 6px;"></i>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Bu ay (${currentMonthLabel}) henüz mesai girişi yapılmadı.<br>Dicle veya Fırat için mesai ekleyebilirsiniz.</p>
                </div>
            `;
        } else {
            overtimesContainer.innerHTML = currentMonthOvertimes.map(ot => {
                const isFirat = (ot.person || '').toLowerCase().includes('fırat') || (ot.person || '').toLowerCase().includes('firat');
                let personDisplay = isFirat ? '👨 Fırat Mesai' : '👩 Dicle Mesai';
                let iconDisplay = isFirat ? '👨' : '👩';
                let calcDetail = '';

                if (isFirat) {
                    const dayLabel = (ot.dayType === 'saturday' || (ot.amount && ot.amount % 3125 === 0)) ? '🏖️ Cumartesi' : '📅 Hafta İçi';
                    const daysVal = parseFloat(ot.days || 1);
                    calcDetail = `${dayLabel} (${daysVal.toLocaleString('tr-TR')} Gün)`;
                } else {
                    const hoursVal = parseFloat(ot.hours || 0);
                    const rateVal = parseFloat(ot.hourlyRate || DICLE_HOURLY_OVERTIME_RATE);
                    calcDetail = `⏱️ <b>${hoursVal.toLocaleString('tr-TR')} Saat</b> × ${rateVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ₺`;
                }

                return `
                    <div class="overtime-card">
                        <div class="overtime-card-left">
                            <div class="overtime-card-icon" style="background: ${isFirat ? '#F4F8F6' : '#FEF7EC'};">
                                ${iconDisplay}
                            </div>
                            <div class="overtime-card-info">
                                <div class="overtime-card-title">${personDisplay}</div>
                                <div class="overtime-card-meta">
                                    <span>${calcDetail}</span>
                                    <span>• 📅 ${ot.date || ''}</span>
                                </div>
                                ${ot.notes || ot.note ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">💬 ${ot.notes || ot.note}</div>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                            <span class="overtime-amount-val" style="color: #10B981; font-weight: 800;">+${parseFloat(ot.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            <button class="btn-delete-item" onclick="handleDeleteOvertime('${ot.id}')" title="Mesaiyi Sil">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 4.1 Bu Ayki Ek Gelirler Listesi
    const monthBadgeEl = document.getElementById('extraIncomeMonthBadge');
    if (monthBadgeEl) {
        monthBadgeEl.innerHTML = `🟢 ${currentMonthLabel} • Ayın 1'inde Sıfırlanır`;
    }

    const extraIncomesContainer = document.getElementById('extraIncomesListContainer');
    if (extraIncomesContainer) {
        if (currentMonthExtraIncomes.length === 0) {
            extraIncomesContainer.innerHTML = `
                <div class="empty-state" style="padding: 16px; grid-column: 1 / -1;">
                    <i class="fa-solid fa-hand-holding-dollar" style="color: #10b981; font-size: 24px; margin-bottom: 6px;"></i>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Bu ay (${currentMonthLabel}) henüz ek gelir kaydedilmedi.<br>Prim, ikramiye, kira veya freelance gelirlerinizi ekleyebilirsiniz.</p>
                </div>
            `;
        } else {
            extraIncomesContainer.innerHTML = currentMonthExtraIncomes.map(inc => `
                <div class="extra-income-card">
                    <div class="extra-income-left">
                        <div class="extra-income-icon">
                            ${EXTRA_INCOME_ICONS[inc.category] || '🎁'}
                        </div>
                        <div class="extra-income-info">
                            <div class="extra-income-title">${inc.title}</div>
                            <div class="extra-income-meta">
                                <span>👤 <b>${inc.receivedBy || 'Birey'}</b></span>
                                <span>• ${inc.category || 'Ek Gelir'}</span>
                                <span>• 📅 ${inc.date || ''}</span>
                            </div>
                            ${inc.notes ? `<div style="font-size:0.65rem; color:#065f46; opacity:0.8; margin-top:2px;">${inc.notes}</div>` : ''}
                        </div>
                    </div>
                    <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                        <span class="extra-income-amount-val">+${parseFloat(inc.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                        <button class="btn-delete-item" onclick="handleDeleteExtraIncome('${inc.id}')" title="Ek Geliri Sil">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 5. Değişken Harcamalar Listesi (Ayın 1'inde Sıfırlanır)
    const expMonthBadgeEl = document.getElementById('expensesMonthBadge');
    if (expMonthBadgeEl) {
        expMonthBadgeEl.innerHTML = `🟢 ${currentMonthLabel} • Ayın 1'inde Sıfırlanır`;
    }

    const expensesContainer = document.getElementById('expensesList');
    if (expensesContainer) {
        if (currentMonthExpenses.length === 0) {
            expensesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>Bu ay (${currentMonthLabel}) için henüz harcama kaydı girilmedi.<br>Günlük ve değişken harcamalarınızı ekleyebilirsiniz.</p>
                </div>
            `;
        } else {
            expensesContainer.innerHTML = currentMonthExpenses.map(exp => `
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
                <button class="btn-delete-item" onclick="openEditFixedExpenseModal('${item.id}')" title="Sabit Gideri Düzenle" style="color: #0284c7; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2);">
                    <i class="fa-solid fa-pen-to-square"></i>
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

function renderCharities(monthKey, monthLabel, yearNum) {
    const container = document.getElementById('charitiesListContainer');
    const family = appState.familyData;
    if (!family) return;

    if (!family.charities) family.charities = [];
    const charities = family.charities;

    const now = new Date();
    const curYear = String(yearNum || now.getFullYear());
    const curMonthKey = monthKey || `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthNamesTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const curMonthLabel = monthLabel || `${monthNamesTr[now.getMonth()]} ${curYear}`;

    // 1. Ay / Yıl / Zekat İstatistikleri
    const monthCharities = charities.filter(c => {
        if (c.month) return c.month === curMonthKey;
        if (c.date && c.date.startsWith(curMonthKey)) return true;
        if (c.createdAt && c.createdAt.startsWith(curMonthKey)) return true;
        return false;
    });
    const monthTotal = monthCharities.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

    const yearCharities = charities.filter(c => {
        if (c.date && c.date.startsWith(curYear)) return true;
        if (c.month && c.month.startsWith(curYear)) return true;
        if (c.createdAt && c.createdAt.startsWith(curYear)) return true;
        return true;
    });
    const yearTotal = yearCharities.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

    const zakatCharities = charities.filter(c => c.category === 'Zekat' || c.category === 'Fitre');
    const zakatTotal = zakatCharities.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

    // Rozet & Kart Güncellemeleri
    const charityBadge = document.getElementById('charityTotalBadge');
    if (charityBadge) charityBadge.textContent = formatTL(monthTotal);

    const elMonthTotal = document.getElementById('statCharityMonthTotal');
    if (elMonthTotal) elMonthTotal.textContent = formatTL(monthTotal);

    const elMonthCount = document.getElementById('statCharityMonthCount');
    if (elMonthCount) elMonthCount.textContent = `${monthCharities.length} hayır kaydı`;

    const elMonthLabel = document.getElementById('charityMonthLabel');
    if (elMonthLabel) elMonthLabel.textContent = curMonthLabel;

    const elYearTotal = document.getElementById('statCharityYearTotal');
    if (elYearTotal) elYearTotal.textContent = formatTL(yearTotal);

    const elYearCount = document.getElementById('statCharityYearCount');
    if (elYearCount) elYearCount.textContent = `${yearCharities.length} toplam bağış`;

    const elYearLabel = document.getElementById('charityYearLabel');
    if (elYearLabel) elYearLabel.textContent = `${curYear} Yılı`;

    const elZakatTotal = document.getElementById('statCharityZakatTotal');
    if (elZakatTotal) elZakatTotal.textContent = formatTL(zakatTotal);

    const elZakatCount = document.getElementById('statCharityZakatCount');
    if (elZakatCount) elZakatCount.textContent = `${zakatCharities.length} zekat/fitre kaydı`;

    if (!container) return;

    // 2. Filtrelere göre liste
    let filteredList = charities;

    const catFilter = appState.charityCategoryFilter || 'ALL';
    if (catFilter === 'MONTH') {
        filteredList = monthCharities;
    } else if (catFilter !== 'ALL') {
        filteredList = filteredList.filter(c => c.category === catFilter);
    }

    const memFilter = appState.charityMemberFilter || 'ALL';
    if (memFilter !== 'ALL') {
        filteredList = filteredList.filter(c => (c.payer || '').toLowerCase().includes(memFilter.toLowerCase()));
    }

    if (filteredList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <i class="fa-solid fa-hand-holding-heart" style="font-size: 36px; color: #a7f3d0; margin-bottom: 8px;"></i>
                <p style="font-size: 0.88rem; color: #64748b;">
                    Henüz hayır / sadaka kaydı bulunmuyor.<br>
                    <small style="color: #94a3b8;">Verilen sadaka, zekat veya bursları kaydederek aile bereketinizi takip edebilirsiniz.</small>
                </p>
                <button class="btn-primary-sm" onclick="openAddCharityModal()" style="margin-top: 10px; background: linear-gradient(135deg, #059669, #047857);">
                    <i class="fa-solid fa-plus"></i> İlk Hayrı Ekle
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredList.map(item => {
        const catIcon = CHARITY_ICONS[item.category] || '🤲';
        const catLabel = CHARITY_LABELS[item.category] || item.category || 'Sadaka';
        const isDicle = (item.payer || '').toLowerCase().includes('dicle');
        const isFirat = (item.payer || '').toLowerCase().includes('fırat') || (item.payer || '').toLowerCase().includes('firat');
        const payerEmoji = isDicle ? '👩 ' : (isFirat ? '👨 ' : '👨‍👩‍👧‍👦 ');

        return `
            <div class="charity-item-card">
                <div class="charity-item-left">
                    <div class="charity-item-icon">
                        ${catIcon}
                    </div>
                    <div class="charity-item-details">
                        <div class="charity-item-title-row">
                            <span class="charity-item-title">${escapeHtml(item.title)}</span>
                            <span class="charity-tag-cat">${catIcon} ${catLabel}</span>
                            <span class="charity-tag-payer">${payerEmoji}${escapeHtml(item.payer || 'Aile')}</span>
                            ${item.beneficiary ? `<span class="charity-beneficiary-tag"><i class="fa-solid fa-building-ngo"></i> ${escapeHtml(item.beneficiary)}</span>` : ''}
                        </div>
                        ${item.notes ? `<div class="charity-item-notes">"${escapeHtml(item.notes)}"</div>` : ''}
                        <div class="charity-item-date">
                            <i class="fa-regular fa-calendar"></i> ${item.date || ''}
                        </div>
                    </div>
                </div>
                <div class="charity-item-right">
                    <div class="charity-item-amount">+ ${formatTL(item.amount)}</div>
                    <button class="btn-delete-item" onclick="handleDeleteCharity('${item.id}')" title="Kaydı Sil" style="padding: 4px 8px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
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
        const safeName = (m.name || 'Üye').replace(/'/g, "\\'");
        return `
            <div class="member-card">
                <div class="member-avatar">${m.avatar || '👤'}</div>
                <div class="member-info">
                    <strong>${m.name} ${isMe ? '<span style="font-size: 0.7rem; color: var(--primary); font-weight: 700;">(Siz)</span>' : ''}</strong>
                    <small>${m.role}</small>
                    <span class="member-phone"><i class="fa-solid fa-phone"></i> ${m.phone}</span>
                </div>
                <div class="member-card-actions">
                    ${!isMe ? `
                        <button class="btn-member-msg" onclick="openFamilyGroupChat()" title="Aile Sohbetine Git">
                            <i class="fa-solid fa-comment-dots"></i> Sohbet
                        </button>
                        <button class="btn-member-delete" onclick="handleDeleteMember('${m.id}', '${safeName}')" title="Üyeyi Aileden Çıkar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateMemberSelectDropdowns(forceDefault = false) {
    const members = appState.familyData ? (appState.familyData.members || []) : [];
    const taskSelect = document.getElementById('taskAssignee');
    const expenseSelect = document.getElementById('expensePayer');
    const fixedSelect = document.getElementById('fixedPayer');
    const dailyAssigneeSelect = document.getElementById('newDailyPlanAssignedTo');
    const editDailyAssigneeSelect = document.getElementById('editDailyPlanAssignedTo');
    const charitySelect = document.getElementById('charityPayer');

    const curName = appState.currentUser ? appState.currentUser.name : '';

    const populateSelect = (selectEl, includeFamily = false) => {
        if (!selectEl) return;
        const currentVal = selectEl.value;
        const optionsHtml = members.map(m => `
            <option value="${m.name}">
                ${m.avatar || '👤'} ${m.name} (${m.role}) ${m.name === curName ? '(Siz)' : ''}
            </option>
        `).join('') + (includeFamily ? `<option value="Tüm Aile">👨‍👩‍👧‍👦 Tüm Aile (Ortak)</option>` : '');

        selectEl.innerHTML = optionsHtml;

        if (!forceDefault && currentVal && Array.from(selectEl.options).some(opt => opt.value === currentVal)) {
            selectEl.value = currentVal;
        } else if (curName && Array.from(selectEl.options).some(opt => opt.value === curName)) {
            selectEl.value = curName;
        }
    };

    populateSelect(taskSelect, true);
    populateSelect(expenseSelect, false);
    populateSelect(fixedSelect, false);
    populateSelect(dailyAssigneeSelect, true);
    populateSelect(editDailyAssigneeSelect, true);
    populateSelect(charitySelect, true);
}

// ==========================================================
// 5. ETKİLEŞİM & EKLEME/SİLME FONKSİYONLARI
// ==========================================================

// Günlük Plan Ekleme & Rutin İşlemleri
async function handleAddDailyPlan(e) {
    e.preventDefault();
    const title = document.getElementById('newDailyPlanTitle').value.trim();
    if (!title) {
        showToast('Lütfen plan veya aktivite başlığını girin.');
        return;
    }

    const time = document.getElementById('newDailyPlanTime').value.trim();
    const category = document.getElementById('newDailyPlanCategory').value;
    const assignedTo = document.getElementById('newDailyPlanAssignedTo').value;
    const isRecurring = document.getElementById('newDailyPlanIsRecurring').checked;

    const newPlan = {
        id: 'daily_' + Date.now(),
        title,
        time,
        category,
        assignedTo,
        isRecurring,
        completed: false,
        addedBy: appState.currentUser ? appState.currentUser.name : 'Aile Üyesi',
        addedById: appState.currentUser ? appState.currentUser.id : null,
        currentUserId: appState.currentUser ? appState.currentUser.id : null,
        createdAt: new Date().toISOString()
    };

    // 1. SQLite API Çağrısı
    const updatedFamily = await AilemAPI.addDailyPlan(appState.familyData.id, newPlan);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.dailyPlans) appState.familyData.dailyPlans = [];
        appState.familyData.dailyPlans.push(newPlan);
    }

    saveStateToStorage();
    closeModal('modalNewDailyPlan');
    renderDailyPlans();
    if (appState.activePlanHub === 'Gunluk') renderPlans();
    updateQuickStats();

    // Formu temizle
    const formEl = document.getElementById('formNewDailyPlan');
    if (formEl) formEl.reset();
    showToast('Günlük plan eklendi! ⏰');
}

async function handleToggleDailyPlan(id) {
    const updatedFamily = await AilemAPI.toggleDailyPlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        const plan = (appState.familyData.dailyPlans || []).find(p => p.id === id);
        if (plan) {
            plan.completed = !plan.completed;
        }
    }

    saveStateToStorage();
    renderDailyPlans();
    if (appState.activePlanHub === 'Gunluk') renderPlans();
    updateQuickStats();
    showToast('Günlük plan durumu güncellendi! ✅');
}

async function handleDeleteDailyPlan(id) {
    const updatedFamily = await AilemAPI.deleteDailyPlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (appState.familyData.dailyPlans) {
            appState.familyData.dailyPlans = appState.familyData.dailyPlans.filter(p => p.id !== id);
        }
    }

    saveStateToStorage();
    renderDailyPlans();
    if (appState.activePlanHub === 'Gunluk') renderPlans();
    updateQuickStats();
    showToast('Günlük plan silindi. 🗑️');
}

async function handleResetDailyPlans() {
    if (!confirm('Günün planlarını sıfırlamak istiyor musunuz? Tekrarlayan rutinler temizlenecek ve yeni gün için taze bir başlangıç yapılacaktır.')) {
        return;
    }

    const updatedFamily = await AilemAPI.resetDailyPlans(appState.familyData.id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (appState.familyData.dailyPlans) {
            appState.familyData.dailyPlans = appState.familyData.dailyPlans
                .filter(p => p.isRecurring)
                .map(p => ({ ...p, completed: false }));
        }
    }

    saveStateToStorage();
    renderDailyPlans();
    if (appState.activePlanHub === 'Gunluk') renderPlans();
    updateQuickStats();
    showToast('Günün planları sıfırlandı ve yeni gün başlatıldı! 🌅');
}

function openEditDailyPlanModal(planId) {
    const plans = appState.familyData ? (appState.familyData.dailyPlans || []) : [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
        showToast('Plan bulunamadı.');
        return;
    }

    updateMemberSelectDropdowns();

    document.getElementById('editDailyPlanId').value = plan.id;
    document.getElementById('editDailyPlanTitle').value = plan.title || '';
    document.getElementById('editDailyPlanTime').value = plan.time || '09:00';
    
    const catSelect = document.getElementById('editDailyPlanCategory');
    if (catSelect) {
        let matchedVal = '';
        for (const opt of catSelect.options) {
            if (opt.value === plan.category || opt.value.includes(plan.category) || (plan.category && plan.category.includes(opt.value.replace(/^[^\s]+\s*/, '')))) {
                matchedVal = opt.value;
                break;
            }
        }
        catSelect.value = matchedVal || plan.category || '🌅 Sabah';
    }

    // Sorumlu Kişi Eşleştirmesi (Tüm Aile'ye zorlamayı engelle)
    const editAssigneeSelect = document.getElementById('editDailyPlanAssignedTo');
    if (editAssigneeSelect) {
        const rawAssigned = (plan.assignedTo || '').trim();
        const lowerAssigned = rawAssigned.toLowerCase();
        
        let found = false;
        if (rawAssigned && lowerAssigned !== 'tüm aile' && lowerAssigned !== 'tum aile') {
            for (const opt of editAssigneeSelect.options) {
                const optVal = opt.value.trim().toLowerCase();
                if (optVal === lowerAssigned || optVal.includes(lowerAssigned) || lowerAssigned.includes(optVal)) {
                    editAssigneeSelect.value = opt.value;
                    found = true;
                    break;
                }
            }
        }
        
        if (!found) {
            if (lowerAssigned === 'tüm aile' || lowerAssigned === 'tum aile') {
                editAssigneeSelect.value = 'Tüm Aile';
            } else if (appState.currentUser && appState.currentUser.name) {
                editAssigneeSelect.value = appState.currentUser.name;
            } else if (editAssigneeSelect.options.length > 0) {
                editAssigneeSelect.selectedIndex = 0;
            }
        }
    }

    document.getElementById('editDailyPlanIsRecurring').checked = plan.isRecurring !== undefined ? !!plan.isRecurring : true;

    openModal('modalEditDailyPlan');
}

async function handleEditDailyPlan(e) {
    e.preventDefault();
    const planId = document.getElementById('editDailyPlanId').value;
    const title = document.getElementById('editDailyPlanTitle').value.trim();
    if (!title) {
        showToast('Lütfen plan başlığını girin.');
        return;
    }

    const time = document.getElementById('editDailyPlanTime').value.trim();
    const category = document.getElementById('editDailyPlanCategory').value;
    const assignedTo = document.getElementById('editDailyPlanAssignedTo').value;
    const isRecurring = document.getElementById('editDailyPlanIsRecurring').checked;

    const updatedPlan = {
        title,
        time,
        category,
        assignedTo,
        isRecurring,
        addedById: appState.currentUser ? appState.currentUser.id : null,
        currentUserId: appState.currentUser ? appState.currentUser.id : null
    };

    const updatedFamily = await AilemAPI.updateDailyPlan(appState.familyData.id, planId, updatedPlan);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        const p = (appState.familyData.dailyPlans || []).find(x => x.id === planId);
        if (p) {
            Object.assign(p, updatedPlan);
        }
    }

    saveStateToStorage();
    closeModal('modalEditDailyPlan');
    renderDailyPlans();
    if (appState.activePlanHub === 'Gunluk') renderPlans();
    updateQuickStats();
    showToast('Günlük plan güncellendi! ⏰');
}

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
        addedBy: appState.currentUser ? appState.currentUser.name : 'Aile Üyesi',
        addedById: appState.currentUser ? appState.currentUser.id : null,
        currentUserId: appState.currentUser ? appState.currentUser.id : null,
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.plans) appState.familyData.plans = [];
        appState.familyData.plans.unshift(newPlan);
    }

    saveStateToStorage();
    closeModal('modalNewPlan');
    renderPlans();
    updateQuickStats();

    // Formu temizle
    document.getElementById('planTitleInput').value = '';
    showToast('Yeni aile planı kaydedildi! 🗺️');

    // Alışveriş ürünü linki varsa hemen otomatik güncel fiyatı çek ve kontrol et
    if (category === 'Alisveris' && newPlan.link) {
        setTimeout(() => {
            checkPlanPrice(newPlan.id);
        }, 500);
    }
}

async function togglePlanStatus(id) {
    const updatedFamily = await AilemAPI.togglePlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        const plan = (appState.familyData.plans || []).find(p => p.id === id);
        if (plan) {
            plan.completed = !plan.completed;
            plan.status = plan.completed ? 'COMPLETED' : 'PENDING';
        }
    }

    saveStateToStorage();
    renderPlans();
    updateQuickStats();
    showToast('Plan durumu güncellendi! ⭐');
}

async function deletePlan(id) {
    const updatedFamily = await AilemAPI.deletePlan(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.plans = (appState.familyData.plans || []).filter(p => p.id !== id);
    }

    saveStateToStorage();
    renderPlans();
    updateQuickStats();
    showToast('Plan silindi.');
}

function onEditPlanCategoryChange(category) {
    const secSeyahat = document.getElementById('sectionEditSeyahatFields');
    const secRestoran = document.getElementById('sectionEditRestoranFields');
    const secEtkinlik = document.getElementById('sectionEditEtkinlikFields');
    const secAlisveris = document.getElementById('sectionEditAlisverisFields');
    const titleLabel = document.getElementById('editPlanTitleLabel');
    const titleInput = document.getElementById('editPlanTitleInput');

    if (!secSeyahat || !secRestoran || !secEtkinlik || !secAlisveris) return;

    secSeyahat.classList.add('hidden');
    secRestoran.classList.add('hidden');
    secEtkinlik.classList.add('hidden');
    secAlisveris.classList.add('hidden');

    if (category === 'Seyahat') {
        secSeyahat.classList.remove('hidden');
        if (titleLabel) titleLabel.innerHTML = '<i class="fa-solid fa-heading"></i> Seyahat / Tatil Başlığı';
        if (titleInput) titleInput.placeholder = 'Örn: Kapadokya Balon Turu veya Roma Gezisi';
    } else if (category === 'Restoran') {
        secRestoran.classList.remove('hidden');
        if (titleLabel) titleLabel.innerHTML = '<i class="fa-solid fa-store"></i> Mekan / Restoran / Kafe Adı';
        if (titleInput) titleInput.placeholder = 'Örn: Tarihi Çınaraltı Çay Bahçesi';
    } else if (category === 'Etkinlik') {
        secEtkinlik.classList.remove('hidden');
        if (titleLabel) titleLabel.innerHTML = '<i class="fa-solid fa-masks-theater"></i> Etkinlik / Gösteri Adı';
        if (titleInput) titleInput.placeholder = 'Örn: Fazıl Say & Serenad Bağcan Konseri';
    } else if (category === 'Alisveris') {
        secAlisveris.classList.remove('hidden');
        if (titleLabel) titleLabel.innerHTML = '<i class="fa-solid fa-bag-shopping"></i> Ürün / İstek / Hayal Adı';
        if (titleInput) titleInput.placeholder = 'Örn: Tam Otomatik Espresso Kahve Makinesi';
    }
}

function openEditPlanModal(planId) {
    const plans = appState.familyData ? (appState.familyData.plans || []) : [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
        showToast('Plan bulunamadı.');
        return;
    }

    document.getElementById('editPlanId').value = plan.id;
    const cat = plan.category || 'Seyahat';
    document.getElementById('editPlanCategorySelect').value = cat;
    onEditPlanCategoryChange(cat);

    document.getElementById('editPlanTitleInput').value = plan.title || '';

    // Kategori alanlarını doldur
    if (cat === 'Seyahat') {
        document.getElementById('editPlanTravelType').value = plan.travelType || 'Yurtici';
        document.getElementById('editPlanTravelDate').value = plan.travelDate || '';
        document.getElementById('editPlanTravelTransport').value = plan.travelTransport || '🚗 Şahsi Araç';
        const numBudget = plan.travelBudget ? plan.travelBudget.replace(/[^0-9]/g, '') : '';
        document.getElementById('editPlanTravelBudget').value = numBudget;
        document.getElementById('editPlanTravelNotes').value = plan.travelNotes || '';
    } else if (cat === 'Restoran') {
        document.getElementById('editPlanRestLocation').value = plan.location || '';
        document.getElementById('editPlanRestDish').value = plan.dish || '';
        document.getElementById('editPlanRestPrice').value = plan.price || '₺ Uygun';
        document.getElementById('editPlanRestLink').value = plan.link || '';
    } else if (cat === 'Etkinlik') {
        document.getElementById('editPlanEventDate').value = plan.eventDate || '';
        document.getElementById('editPlanEventVenue').value = plan.eventVenue || '';
        document.getElementById('editPlanEventLink').value = plan.link || '';
        document.getElementById('editPlanEventAttendees').value = plan.attendees || '';
    } else if (cat === 'Alisveris') {
        document.getElementById('editPlanShopLink').value = plan.link || '';
        const numShopPrice = plan.shopPrice ? plan.shopPrice.replace(/[^0-9]/g, '') : '';
        document.getElementById('editPlanShopPrice').value = numShopPrice;
        document.getElementById('editPlanShopPriority').value = plan.priority || '⭐ Yüksek / Acil';
        document.getElementById('editPlanShopNote').value = plan.shopNote || '';
    }

    openModal('modalEditPlan');
}

async function handleEditPlan(e) {
    e.preventDefault();
    const planId = document.getElementById('editPlanId').value;
    const category = document.getElementById('editPlanCategorySelect').value;
    const title = document.getElementById('editPlanTitleInput').value.trim();

    if (!title) {
        showToast('Lütfen plan başlığını girin.');
        return;
    }

    const updatedPlan = {
        category,
        title
    };

    if (category === 'Seyahat') {
        updatedPlan.travelType = document.getElementById('editPlanTravelType').value;
        updatedPlan.travelDate = document.getElementById('editPlanTravelDate').value.trim();
        updatedPlan.travelTransport = document.getElementById('editPlanTravelTransport').value;
        const budget = document.getElementById('editPlanTravelBudget').value.trim();
        updatedPlan.travelBudget = budget ? `${parseFloat(budget).toLocaleString('tr-TR')} ₺` : '';
        updatedPlan.travelNotes = document.getElementById('editPlanTravelNotes').value.trim();
    } else if (category === 'Restoran') {
        updatedPlan.location = document.getElementById('editPlanRestLocation').value.trim();
        updatedPlan.dish = document.getElementById('editPlanRestDish').value.trim();
        updatedPlan.price = document.getElementById('editPlanRestPrice').value;
        updatedPlan.link = document.getElementById('editPlanRestLink').value.trim();
    } else if (category === 'Etkinlik') {
        updatedPlan.eventDate = document.getElementById('editPlanEventDate').value.trim();
        updatedPlan.eventVenue = document.getElementById('editPlanEventVenue').value.trim();
        updatedPlan.link = document.getElementById('editPlanEventLink').value.trim();
        updatedPlan.attendees = document.getElementById('editPlanEventAttendees').value.trim();
    } else if (category === 'Alisveris') {
        updatedPlan.link = document.getElementById('editPlanShopLink').value.trim();
        const price = document.getElementById('editPlanShopPrice').value.trim();
        updatedPlan.shopPrice = price ? `${parseFloat(price).toLocaleString('tr-TR')} ₺` : '';
        updatedPlan.priority = document.getElementById('editPlanShopPriority').value;
        updatedPlan.shopNote = document.getElementById('editPlanShopNote').value.trim();
    }

    const updatedFamily = await AilemAPI.updatePlan(appState.familyData.id, planId, updatedPlan);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        const p = (appState.familyData.plans || []).find(x => x.id === planId);
        if (p) {
            Object.assign(p, updatedPlan);
        }
    }

    saveStateToStorage();
    closeModal('modalEditPlan');
    renderPlans();
    updateQuickStats();
    showToast('Plan güncellendi! ⭐');

    // Alışveriş ürünü linki varsa güncel fiyatı kontrol et
    if (category === 'Alisveris' && updatedPlan.link) {
        setTimeout(() => {
            checkPlanPrice(planId);
        }, 500);
    }
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
        authorId: appState.currentUser.id,
        currentUserId: appState.currentUser.id,
        createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedFamily = await AilemAPI.addPost(appState.familyData.id, newPost);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.posts) appState.familyData.posts = [];
        appState.familyData.posts.unshift(newPost);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.posts = (appState.familyData.posts || []).filter(p => p.id !== id);
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
        addedBy: appState.currentUser ? appState.currentUser.name : 'Aile Üyesi',
        addedById: appState.currentUser ? appState.currentUser.id : null,
        currentUserId: appState.currentUser ? appState.currentUser.id : null
    };

    const updatedFamily = await AilemAPI.addShoppingItem(appState.familyData.id, newItem);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.shoppingList) appState.familyData.shoppingList = appState.familyData.shopping || [];
        appState.familyData.shoppingList.unshift(newItem);
        appState.familyData.shopping = appState.familyData.shoppingList;
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.shoppingList) appState.familyData.shoppingList = appState.familyData.shopping || [];
        const item = appState.familyData.shoppingList.find(i => i.id === id);
        if (item) item.completed = !item.completed;
        appState.familyData.shopping = appState.familyData.shoppingList;
    }

    saveStateToStorage();
    renderShopping();
    updateQuickStats();
}

async function deleteShoppingItem(id) {
    const updatedFamily = await AilemAPI.deleteShoppingItem(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.shoppingList) appState.familyData.shoppingList = appState.familyData.shopping || [];
        appState.familyData.shoppingList = appState.familyData.shoppingList.filter(i => i.id !== id);
        appState.familyData.shopping = appState.familyData.shoppingList;
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
        addedBy: appState.currentUser ? appState.currentUser.name : 'Aile Üyesi',
        addedById: appState.currentUser ? appState.currentUser.id : null,
        currentUserId: appState.currentUser ? appState.currentUser.id : null
    };

    const updatedFamily = await AilemAPI.addTask(appState.familyData.id, newTask);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.tasks) appState.familyData.tasks = [];
        appState.familyData.tasks.unshift(newTask);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.tasks) appState.familyData.tasks = [];
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.tasks) appState.familyData.tasks = [];
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

// Alt Sekme Geçişi (Harcamalar, Sabit Giderler, Yatırımlar, Hayır & Sadaka)
function switchBudgetSubTab(tabKey) {
    appState.activeBudgetSubTab = tabKey;

    // Subtab butonları aktifliği
    document.querySelectorAll('.budget-subtab-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtnId = 'subtabBtnExpenses';
    if (tabKey === 'fixed') activeBtnId = 'subtabBtnFixed';
    else if (tabKey === 'investments') activeBtnId = 'subtabBtnInvestments';
    else if (tabKey === 'charity') activeBtnId = 'subtabBtnCharity';

    const activeSubBtn = document.getElementById(activeBtnId);
    if (activeSubBtn) activeSubBtn.classList.add('active');

    // Subview panellerini göster/gizle
    const viewExp = document.getElementById('budgetViewExpenses');
    const viewFixed = document.getElementById('budgetViewFixed');
    const viewInv = document.getElementById('budgetViewInvestments');
    const viewCharity = document.getElementById('budgetViewCharity');

    if (viewExp) viewExp.classList.toggle('hidden', tabKey !== 'expenses');
    if (viewFixed) viewFixed.classList.toggle('hidden', tabKey !== 'fixed');
    if (viewCharity) viewCharity.classList.toggle('hidden', tabKey !== 'charity');
    if (viewInv) {
        viewInv.classList.toggle('hidden', tabKey !== 'investments');
        if (tabKey === 'investments') {
            fetchLiveMarketRates();
        }
    }

    // Header Ekle Buton Metnini Güncelle
    const btnActionText = document.getElementById('budgetActionBtnText');
    if (btnActionText) {
        if (tabKey === 'expenses') btnActionText.textContent = 'Harcama Ekle';
        else if (tabKey === 'fixed') btnActionText.textContent = 'Sabit Gider Ekle';
        else if (tabKey === 'investments') btnActionText.textContent = 'Yatırım Ekle';
        else if (tabKey === 'charity') btnActionText.textContent = 'Hayır Ekle';
    }
}

function openCurrentBudgetActionModal() {
    if (appState.activeBudgetSubTab === 'expenses') {
        openModal('modalNewExpense');
    } else if (appState.activeBudgetSubTab === 'fixed') {
        openModal('modalNewFixedExpense');
    } else if (appState.activeBudgetSubTab === 'investments') {
        openModal('modalNewInvestment');
    } else if (appState.activeBudgetSubTab === 'charity') {
        openAddCharityModal();
    }
}

// 0. Hayır & Sadaka Modalını Aç ve Kaydet
function openAddCharityModal() {
    updateMemberSelectDropdowns();
    const dateInput = document.getElementById('charityDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const titleInput = document.getElementById('charityTitle');
    if (titleInput) titleInput.value = '';
    const amountInput = document.getElementById('charityAmount');
    if (amountInput) amountInput.value = '';
    const benInput = document.getElementById('charityBeneficiary');
    if (benInput) benInput.value = '';
    const notesInput = document.getElementById('charityNotes');
    if (notesInput) notesInput.value = '';

    openModal('modalNewCharity');
}

async function handleAddCharity(e) {
    if (e && e.preventDefault) e.preventDefault();
    const title = document.getElementById('charityTitle').value.trim();
    const amount = parseFloat(document.getElementById('charityAmount').value) || 0;
    const category = document.getElementById('charityCategory').value;
    const payer = document.getElementById('charityPayer').value || (appState.currentUser ? appState.currentUser.name : 'Aile');
    const date = document.getElementById('charityDate').value || new Date().toISOString().split('T')[0];
    const beneficiary = document.getElementById('charityBeneficiary').value.trim();
    const notes = document.getElementById('charityNotes').value.trim();

    if (!title || amount <= 0) {
        showToast('Lütfen geçerli bir başlık ve tutar girin.');
        return;
    }

    const family = appState.familyData;
    if (!family) return;

    const newCharity = {
        id: 'charity_' + Date.now(),
        title,
        amount,
        category,
        payer,
        date,
        beneficiary,
        notes,
        createdAt: new Date().toISOString()
    };

    closeModal('modalNewCharity');
    showToast('Hayır / Sadaka kaydı bereketiyle eklendi ✨');

    const updatedFamily = await AilemAPI.addCharity(family.id, newCharity);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.charities) appState.familyData.charities = [];
        appState.familyData.charities.unshift(newCharity);
    }

    saveStateToStorage();
    renderBudget();
}

async function handleDeleteCharity(id) {
    if (!confirm('Bu hayır / sadaka kaydını silmek istediğinize emin misiniz?')) return;
    const family = appState.familyData;
    if (!family) return;

    showToast('Kayıt silindi.');
    const updatedFamily = await AilemAPI.deleteCharity(family.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (appState.familyData.charities) {
            appState.familyData.charities = appState.familyData.charities.filter(c => c.id !== id);
        }
    }

    saveStateToStorage();
    renderBudget();
}

function filterCharityCategory(cat, btn) {
    appState.charityCategoryFilter = cat;
    if (btn) {
        btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    }
    renderCharities();
}

function filterCharityMember(mem, btn) {
    appState.charityMemberFilter = mem;
    if (btn) {
        btn.parentElement.querySelectorAll('.pill-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    }
    renderCharities();
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
        appState.familyData = normalizeFamilyData(updatedFamily);
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

// 1.1 Aylık Ek Gelir Modalını Aç ve Kaydet (Ayın 1'inde Sıfırlanır)
function openAddExtraIncomeModal() {
    const family = appState.familyData;
    if (!family) return;

    // Aile üyelerini seçiciye doldur
    const selectReceiver = document.getElementById('extraIncomeReceiver');
    if (selectReceiver) {
        const members = family.members || [];
        selectReceiver.innerHTML = members.map(m => `
            <option value="${m.name}" ${appState.currentUser && appState.currentUser.id === m.id ? 'selected' : ''}>
                ${m.avatar || '👤'} ${m.name} (${m.role})
            </option>
        `).join('');
    }

    // Tarih alanını bugünün tarihiyle doldur
    const dateInput = document.getElementById('extraIncomeDate');
    if (dateInput) {
        dateInput.value = new Date().toLocaleDateString('tr-TR');
    }

    // Form alanlarını sıfırla
    const titleInput = document.getElementById('extraIncomeTitle');
    if (titleInput) titleInput.value = '';
    const amountInput = document.getElementById('extraIncomeAmount');
    if (amountInput) amountInput.value = '';
    const notesInput = document.getElementById('extraIncomeNotes');
    if (notesInput) notesInput.value = '';

    openModal('modalNewExtraIncome');
}

async function handleAddExtraIncome(e) {
    e.preventDefault();
    const family = appState.familyData;
    if (!family) return;

    const title = document.getElementById('extraIncomeTitle').value.trim();
    const amount = parseFloat(document.getElementById('extraIncomeAmount').value);
    const category = document.getElementById('extraIncomeCategory').value;
    const receivedBy = document.getElementById('extraIncomeReceiver').value;
    const date = document.getElementById('extraIncomeDate').value.trim() || new Date().toLocaleDateString('tr-TR');
    const notes = document.getElementById('extraIncomeNotes').value.trim();

    if (!title || !amount || amount <= 0) {
        showToast('Lütfen geçerli bir ek gelir tanımı ve tutarı girin.');
        return;
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const newIncome = {
        id: 'inc_' + Date.now(),
        title,
        amount,
        category,
        receivedBy,
        date,
        month: currentMonthKey,
        notes,
        createdAt: new Date().toISOString()
    };

    const updatedFamily = await AilemAPI.addExtraIncome(family.id, newIncome);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.extraIncomes) appState.familyData.extraIncomes = [];
        appState.familyData.extraIncomes.unshift(newIncome);
    }

    saveStateToStorage();
    closeModal('modalNewExtraIncome');
    renderBudget();
    showToast('Ek gelir bu aya başarıyla eklendi! 🎁');
}

async function handleDeleteExtraIncome(id) {
    if (!confirm('Bu ek gelir kaydını silmek istediğinize emin misiniz?')) return;
    const family = appState.familyData;
    if (!family) return;

    const updatedFamily = await AilemAPI.deleteExtraIncome(family.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.extraIncomes = (appState.familyData.extraIncomes || []).filter(inc => inc.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Ek gelir silindi.');
}

// ==========================================================
// 1.2 MESAİ MODALI, HESAPLAMA VE KAYIT İŞLEMLERİ
// (Dicle: Saatlik 296,875 TL | Fırat: Günlük Hafta İçi 1.041,67 TL / Cts 3.125,00 TL - Ayın 1'inde Sıfırlanır)
// ==========================================================
const DICLE_HOURLY_OVERTIME_RATE = 296.875;
const FIRAT_WEEKDAY_OVERTIME_RATE = 1041.67;
const FIRAT_SATURDAY_OVERTIME_RATE = 3125.00;

let selectedOvertimePerson = 'Dicle'; // 'Dicle' | 'Fırat'
let selectedFiratDayType = 'weekday'; // 'weekday' | 'saturday'

function selectOvertimePerson(person) {
    selectedOvertimePerson = person;
    const inputPerson = document.getElementById('overtimePersonInput');
    if (inputPerson) inputPerson.value = person;

    const btnDicle = document.getElementById('btnPersonDicle');
    const btnFirat = document.getElementById('btnPersonFirat');
    const dicleFields = document.getElementById('overtimeDicleFields');
    const firatFields = document.getElementById('overtimeFiratFields');
    const dicleHoursInput = document.getElementById('overtimeDicleHoursInput');
    const firatDaysInput = document.getElementById('overtimeFiratDaysInput');

    if (btnDicle) btnDicle.classList.toggle('active', person === 'Dicle');
    if (btnFirat) btnFirat.classList.toggle('active', person === 'Fırat');

    if (dicleFields) dicleFields.classList.toggle('hidden', person !== 'Dicle');
    if (firatFields) firatFields.classList.toggle('hidden', person !== 'Fırat');

    if (person === 'Dicle') {
        if (dicleHoursInput) dicleHoursInput.required = true;
        if (firatDaysInput) firatDaysInput.required = false;
    } else {
        if (dicleHoursInput) dicleHoursInput.required = false;
        if (firatDaysInput) firatDaysInput.required = true;
        onOvertimeDateChanged();
    }

    calculateOvertimeTotalLive();
}

function selectFiratDayType(dayType) {
    selectedFiratDayType = dayType;
    const inputDayType = document.getElementById('overtimeFiratDayType');
    if (inputDayType) inputDayType.value = dayType;

    const btnWeekday = document.getElementById('btnFiratWeekday');
    const btnSaturday = document.getElementById('btnFiratSaturday');
    const rateInput = document.getElementById('overtimeFiratRateInput');
    const hintEl = document.getElementById('firatRateHint');

    if (btnWeekday) btnWeekday.classList.toggle('active', dayType === 'weekday');
    if (btnSaturday) btnSaturday.classList.toggle('active', dayType === 'saturday');

    if (dayType === 'saturday') {
        if (rateInput) rateInput.value = FIRAT_SATURDAY_OVERTIME_RATE.toFixed(2);
        if (hintEl) hintEl.textContent = 'Cumartesi Mesaisi: 3.125,00 ₺ / gün';
    } else {
        if (rateInput) rateInput.value = FIRAT_WEEKDAY_OVERTIME_RATE.toFixed(2);
        if (hintEl) hintEl.textContent = 'Hafta İçi: 1.041,67 ₺ / gün';
    }

    calculateOvertimeTotalLive();
}

function onOvertimeDateChanged() {
    const dateInput = document.getElementById('overtimeDateInput');
    if (!dateInput || !dateInput.value) return;

    // Fırat seçiliyse ve seçilen tarih Cumartesi ise otomatik Cumartesi mesaisine geçir
    if (selectedOvertimePerson === 'Fırat') {
        try {
            const parts = dateInput.value.split('-');
            if (parts.length === 3) {
                const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (dateObj.getDay() === 6) {
                    selectFiratDayType('saturday');
                    return;
                } else if (dateObj.getDay() >= 1 && dateObj.getDay() <= 5) {
                    selectFiratDayType('weekday');
                    return;
                }
            }
        } catch (e) {}
    }
    calculateOvertimeTotalLive();
}

function calculateOvertimeTotalLive() {
    const resEl = document.getElementById('overtimeLiveCalcResult');
    const detailEl = document.getElementById('overtimeLiveCalcDetail');
    if (!resEl || !detailEl) return;

    if (selectedOvertimePerson === 'Dicle') {
        const hours = parseFloat(document.getElementById('overtimeDicleHoursInput')?.value) || 0;
        const rate = parseFloat(document.getElementById('overtimeDicleRateInput')?.value) || DICLE_HOURLY_OVERTIME_RATE;
        const total = hours * rate;

        resEl.textContent = Number(total.toFixed(2)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        detailEl.textContent = `${hours.toLocaleString('tr-TR')} saat × ${Number(rate).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ₺`;
    } else {
        const days = parseFloat(document.getElementById('overtimeFiratDaysInput')?.value) || 0;
        const rate = selectedFiratDayType === 'saturday' ? FIRAT_SATURDAY_OVERTIME_RATE : FIRAT_WEEKDAY_OVERTIME_RATE;
        const total = days * rate;

        resEl.textContent = Number(total.toFixed(2)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
        detailEl.textContent = `${days.toLocaleString('tr-TR')} gün × ${Number(rate).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ (${selectedFiratDayType === 'saturday' ? 'Cumartesi' : 'Hafta İçi'})`;
    }
}

function openAddOvertimeModal() {
    const family = appState.familyData;
    if (!family) return;

    // Bugünün tarihini YYYY-MM-DD olarak ayarla
    const dateInput = document.getElementById('overtimeDateInput');
    if (dateInput) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Alanları sıfırla
    const dicleHours = document.getElementById('overtimeDicleHoursInput');
    if (dicleHours) dicleHours.value = '';

    const dicleRate = document.getElementById('overtimeDicleRateInput');
    if (dicleRate) dicleRate.value = DICLE_HOURLY_OVERTIME_RATE;

    const firatDays = document.getElementById('overtimeFiratDaysInput');
    if (firatDays) firatDays.value = '1';

    const notesInput = document.getElementById('overtimeNotesInput');
    if (notesInput) notesInput.value = '';

    // Aktif kullanıcıya göre başlangıç kişisini belirle
    const curName = (appState.currentUser?.name || '').toLowerCase();
    if (curName.includes('fırat') || curName.includes('firat')) {
        selectOvertimePerson('Fırat');
    } else {
        selectOvertimePerson('Dicle');
    }

    onOvertimeDateChanged();
    calculateOvertimeTotalLive();

    openModal('modalNewOvertime');
}

async function handleAddOvertime(e) {
    e.preventDefault();
    const family = appState.familyData;
    if (!family) return;

    const person = selectedOvertimePerson; // 'Dicle' veya 'Fırat'
    const dateInput = document.getElementById('overtimeDateInput');
    const date = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
    const month = date.substring(0, 7); // YYYY-MM
    const notes = document.getElementById('overtimeNotesInput')?.value.trim() || '';

    let newOvertime = null;

    if (person === 'Dicle') {
        const hours = parseFloat(document.getElementById('overtimeDicleHoursInput')?.value);
        const hourlyRate = parseFloat(document.getElementById('overtimeDicleRateInput')?.value) || DICLE_HOURLY_OVERTIME_RATE;
        if (!hours || hours <= 0) {
            showToast('Lütfen geçerli bir mesai saati girin.');
            return;
        }
        const amount = Math.round(hours * hourlyRate * 100) / 100;
        newOvertime = {
            id: 'ot_' + Date.now(),
            person: 'Dicle',
            isHourly: true,
            hours,
            hourlyRate,
            amount,
            date,
            month,
            notes,
            addedBy: appState.currentUser?.name || 'Dicle',
            createdAt: new Date().toISOString()
        };
    } else {
        const days = parseFloat(document.getElementById('overtimeFiratDaysInput')?.value) || 1;
        const dayType = selectedFiratDayType; // 'weekday' | 'saturday'
        const dailyRate = dayType === 'saturday' ? FIRAT_SATURDAY_OVERTIME_RATE : FIRAT_WEEKDAY_OVERTIME_RATE;
        if (!days || days <= 0) {
            showToast('Lütfen geçerli bir gün sayısı girin.');
            return;
        }
        const amount = Math.round(days * dailyRate * 100) / 100;
        newOvertime = {
            id: 'ot_' + Date.now(),
            person: 'Fırat',
            isHourly: false,
            dayType,
            days,
            dailyRate,
            amount,
            date,
            month,
            notes,
            addedBy: appState.currentUser?.name || 'Fırat',
            createdAt: new Date().toISOString()
        };
    }

    const updatedFamily = await AilemAPI.addOvertime(family.id, newOvertime);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.overtimes) appState.familyData.overtimes = [];
        appState.familyData.overtimes.unshift(newOvertime);
    }

    saveStateToStorage();
    closeModal('modalNewOvertime');
    renderBudget();
    showToast(`${person} için mesai başarıyla eklendi! ⏰💰`);
}

async function handleDeleteOvertime(id) {
    if (!confirm('Bu mesai kaydını silmek istediğinize emin misiniz?')) return;
    const family = appState.familyData;
    if (!family) return;

    const updatedFamily = await AilemAPI.deleteOvertime(family.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.overtimes = (appState.familyData.overtimes || []).filter(ot => ot.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Mesai kaydı silindi.');
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

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const newExpense = {
        id: 'exp_' + Date.now(),
        title,
        amount,
        category,
        payer,
        month: currentMonthKey,
        date: new Date().toLocaleDateString('tr-TR'),
        createdAt: new Date().toISOString()
    };

    const updatedFamily = await AilemAPI.addExpense(appState.familyData.id, newExpense);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.expenses) appState.familyData.expenses = [];
        appState.familyData.expenses.unshift(newExpense);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.expenses = (appState.familyData.expenses || []).filter(e => e.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Harcama silindi.');
}

// 3. Sabit Gider Ekle / Düzenle / Ödendi İşaretle / Sil
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.fixedExpenses) appState.familyData.fixedExpenses = [];
        appState.familyData.fixedExpenses.unshift(newFixed);
    }

    saveStateToStorage();
    closeModal('modalNewFixedExpense');
    renderBudget();
    document.getElementById('fixedTitle').value = '';
    document.getElementById('fixedAmount').value = '';
    document.getElementById('fixedNotes').value = '';
    showToast('Sabit gider kaydedildi! 📑');
}

function openEditFixedExpenseModal(id) {
    const family = appState.familyData;
    if (!family) return;
    const fixed = (family.fixedExpenses || []).find(f => f.id === id);
    if (!fixed) return;

    document.getElementById('editFixedId').value = fixed.id;
    document.getElementById('editFixedTitle').value = fixed.title || '';
    document.getElementById('editFixedAmount').value = fixed.amount || '';
    document.getElementById('editFixedCategory').value = fixed.category || 'Kira';
    document.getElementById('editFixedDueDay').value = fixed.dueDay || 1;
    document.getElementById('editFixedNotes').value = fixed.notes || '';

    // Aile üyelerini dropdown'a doldur
    const selectPayer = document.getElementById('editFixedPayer');
    if (selectPayer) {
        const members = family.members || [];
        selectPayer.innerHTML = members.map(m => `
            <option value="${m.name}" ${fixed.payer === m.name ? 'selected' : ''}>
                ${m.avatar || '👤'} ${m.name} (${m.role})
            </option>
        `).join('');
    }

    openModal('modalEditFixedExpense');
}

async function handleEditFixedExpense(e) {
    e.preventDefault();
    const family = appState.familyData;
    if (!family) return;

    const id = document.getElementById('editFixedId').value;
    const title = document.getElementById('editFixedTitle').value.trim();
    const amount = parseFloat(document.getElementById('editFixedAmount').value);
    const category = document.getElementById('editFixedCategory').value;
    const dueDay = parseInt(document.getElementById('editFixedDueDay').value, 10) || 1;
    const payer = document.getElementById('editFixedPayer').value;
    const notes = document.getElementById('editFixedNotes').value.trim();

    if (!title || !amount || amount <= 0) {
        showToast('Lütfen geçerli bir sabit gider tanımı ve tutarı girin.');
        return;
    }

    const updatedFixed = {
        title,
        amount,
        category,
        dueDay,
        payer,
        notes
    };

    const updatedFamily = await AilemAPI.updateFixedExpense(family.id, id, updatedFixed);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.fixedExpenses) appState.familyData.fixedExpenses = [];
        const idx = appState.familyData.fixedExpenses.findIndex(f => f.id === id);
        if (idx >= 0) {
            appState.familyData.fixedExpenses[idx] = {
                ...appState.familyData.fixedExpenses[idx],
                ...updatedFixed
            };
        }
    }

    saveStateToStorage();
    closeModal('modalEditFixedExpense');
    renderBudget();
    showToast('Sabit gider başarıyla güncellendi! ✏️');
}

async function handleToggleFixedExpense(id) {
    const updatedFamily = await AilemAPI.toggleFixedExpense(appState.familyData.id, id);
    if (updatedFamily) {
        appState.familyData = normalizeFamilyData(updatedFamily);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
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
    const btnRefresh = document.querySelector('.btn-refresh-rates') || document.getElementById('btnRefreshRates');
    const iconRefresh = document.getElementById('iconRefreshRates');
    if (iconRefresh) iconRefresh.classList.add('fa-spin');
    if (btnRefresh) btnRefresh.classList.add('spinning');

    try {
        const result = await AilemAPI.getMarketRates(forceRefresh);
        if (result && result.rates) {
            appState.marketRates = result.rates;
            appState.lastMarketRatesFetch = Date.now();

            // Ticker UI güncelle
            const elGold = document.getElementById('tickerGramGold');
            const elGoldSub = document.getElementById('tickerGramGoldSub');
            const elUsd = document.getElementById('tickerUsd');
            const elUsdSub = document.getElementById('tickerUsdSub');
            const elEur = document.getElementById('tickerEur');
            const elEurSub = document.getElementById('tickerEurSub');
            const elCeyrek = document.getElementById('tickerCeyrek');
            const elCeyrekSub = document.getElementById('tickerCeyrekSub');
            const elTime = document.getElementById('rateLastUpdatedTime') || document.getElementById('ratesLastUpdated');

            if (elGold && result.rates.ALTIN) {
                elGold.textContent = (result.rates.ALTIN.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
                if (elGoldSub) {
                    elGoldSub.textContent = `Alış: ${(result.rates.ALTIN.buy || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ | Satış: ${(result.rates.ALTIN.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
                }
            }
            if (elUsd && result.rates.USD) {
                elUsd.textContent = (result.rates.USD.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
                if (elUsdSub) {
                    elUsdSub.textContent = `Alış: ${(result.rates.USD.buy || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ | Satış: ${(result.rates.USD.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
                }
            }
            if (elEur && result.rates.EUR) {
                elEur.textContent = (result.rates.EUR.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
                if (elEurSub) {
                    elEurSub.textContent = `Alış: ${(result.rates.EUR.buy || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ | Satış: ${(result.rates.EUR.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
                }
            }
            if (elCeyrek && result.rates.CEYREK) {
                elCeyrek.textContent = (result.rates.CEYREK.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
                if (elCeyrekSub) {
                    elCeyrekSub.textContent = `Alış: ${(result.rates.CEYREK.buy || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ | Satış: ${(result.rates.CEYREK.sell || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
                }
            }
            if (elTime) {
                const timeStr = result.timestamp ? new Date(result.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                elTime.textContent = `Son Güncelleme: ${timeStr}`;
            }

            // Portföydeki yatırım kalemlerinin TL karşılıklarını anlık kura göre güncelle
            if (appState.familyData) {
                recalculateInvestmentsWithLiveRates();
                renderBudget();
            }

            // Açık olan yatırım modalı varsa kurunu yenile
            autoCalculateInvestmentTL();
        }
    } catch (e) {
        console.warn('Canlı kur alma hatası:', e);
    } finally {
        if (iconRefresh) {
            setTimeout(() => iconRefresh.classList.remove('fa-spin'), 600);
        }
        if (btnRefresh) {
            setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
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
        ALTIN: { sell: 6616 },
        USD: { sell: 49.13 },
        EUR: { sell: 55.83 },
        CEYREK: { sell: 11090 },
        TL: { sell: 1 }
    };

    let unitRate = 1;
    let rateLabel = '';

    if (cat === 'Altın') {
        const unit = document.getElementById('invUnit')?.value || 'Gram';
        if (unit.toLowerCase().includes('çeyrek') || unit.toLowerCase().includes('ceyrek')) {
            unitRate = (rates.CEYREK && rates.CEYREK.sell) ? rates.CEYREK.sell : 11090;
            rateLabel = `1 Çeyrek Altın = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
        } else {
            unitRate = (rates.ALTIN && rates.ALTIN.sell) ? rates.ALTIN.sell : 6616;
            rateLabel = `1 Gram Altın = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
        }
    } else if (cat === 'Dolar') {
        unitRate = (rates.USD && rates.USD.sell) ? rates.USD.sell : 49.13;
        rateLabel = `1 Dolar (USD) = ${unitRate.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (Altınkaynak)`;
    } else if (cat === 'Euro') {
        unitRate = (rates.EUR && rates.EUR.sell) ? rates.EUR.sell : 55.83;
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        if (!appState.familyData.investments) appState.familyData.investments = [];
        appState.familyData.investments.unshift(newInv);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
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
        appState.familyData = normalizeFamilyData(updatedFamily);
    } else {
        appState.familyData.investments = (appState.familyData.investments || []).filter(i => i.id !== id);
    }

    saveStateToStorage();
    renderBudget();
    showToast('Yatırım kalemi silindi.');
}

// Yeni Üye Ekle
async function handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('newMemberName').value.trim();
    const phone = document.getElementById('newMemberPhone').value.trim();
    const role = document.getElementById('newMemberRole').value;

    if (!name || !phone) {
        showToast('Lütfen isim ve telefon numarasını eksiksiz girin.');
        return;
    }

    const newMember = {
        id: 'usr_' + Date.now(),
        name,
        phone,
        role,
        avatar: ROLE_AVATARS[role] || '👤'
    };

    // 1. Sunucu ve Veritabanına (Neon / SQLite) kaydet
    if (appState.familyData && appState.familyData.id) {
        const updatedFamily = await AilemAPI.addMember(appState.familyData.id, newMember, appState.familyData);
        if (updatedFamily) {
            appState.familyData = normalizeFamilyData(updatedFamily);
        } else {
            if (!appState.familyData.members) appState.familyData.members = [];
            appState.familyData.members.push(newMember);
            await AilemAPI.syncFamily(appState.familyData);
        }
    }

    saveStateToStorage();
    closeModal('modalAddMember');
    renderMembers();
    updateMemberSelectDropdowns();
    updateQuickStats();
    document.getElementById('newMemberName').value = '';
    document.getElementById('newMemberPhone').value = '';
    showToast(`${name} aileye eklendi ve veritabanına kaydedildi! 🎉`);
}

// Aile Üyesi Sil / Çıkar
async function handleDeleteMember(memberId, memberName) {
    if (!confirm(`"${memberName}" isimli aile üyesini aileden çıkarmak ve hesabını silmek istediğinize emin misiniz?`)) {
        return;
    }

    if (appState.familyData && appState.familyData.id) {
        const updatedFamily = await AilemAPI.deleteMember(appState.familyData.id, memberId);
        if (updatedFamily) {
            appState.familyData = normalizeFamilyData(updatedFamily);
        } else {
            if (appState.familyData.members) {
                appState.familyData.members = appState.familyData.members.filter(m => m.id !== memberId);
            }
        }
    }

    saveStateToStorage();
    renderMembers();
    updateMemberSelectDropdowns();
    updateQuickStats();
    showToast(`"${memberName}" aileden çıkarıldı.`);
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
        // Bu cihazın bildirim aboneliğini ve canlı akışını yeni seçilen kullanıcıya anında bağla
        registerPushSubscription(true);
        initRealtimeStream();
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
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = window.__audioCtx || new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        
        // 1. Ton (587.33 Hz - Re/D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain1.gain.setValueAtTime(0.24, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.16);

        // 2. Ton (880 Hz - La/A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0.28, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
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
            navigator.vibrate([100, 50, 100, 50, 150]);
        } catch (e) {}
    }
}

// Sekme Başlığını Yanıp Söndürme (Tab Flash)
let titleFlashInterval = null;
function flashTabTitleForNewMessage(senderName) {
    if (document.hasFocus() && appState.currentTab === 'tabChat') return;
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    const originalTitle = (appState.familyData ? appState.familyData.name : 'YuvaPusula') + ' - YuvaPusula';
    let isOriginal = false;
    let count = 0;
    titleFlashInterval = setInterval(() => {
        if (document.hasFocus() && appState.currentTab === 'tabChat') {
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
            document.title = originalTitle;
            return;
        }
        document.title = isOriginal ? originalTitle : `💬 (${senderName}) Yeni Mesaj!`;
        isOriginal = !isOriginal;
        count++;
        if (count > 25) {
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
            document.title = `(1) ${originalTitle}`;
        }
    }, 1000);
}

// Çok Katmanlı Anlık Sohbet Bildirimi Dağıtımı (Yalnızca ilgili kişiye veya aile grubuna)
function dispatchChatMessageNotification(msg) {
    if (!msg || !appState.currentUser) return;

    // Kendimiz gönderdiysek kesinlikle bildirim verme!
    if (msg.senderId === appState.currentUser.id) return;

    const receiverId = msg.receiverId || msg.receiver_id;
    const isGroup = !receiverId || receiverId === 'group';

    // Eğer özel mesajsa ve alıcı mevcut kullanıcı DEĞİLSE, kesinlikle bildirim verme!
    if (!isGroup && receiverId !== appState.currentUser.id) {
        return;
    }

    // 1. Ses ve Titreşim
    triggerHapticAndSound();

    // 2. Sistem / Web Bildirimi (PWA & Service Worker)
    const notifTitle = isGroup 
        ? `💬 ${msg.senderName} (${appState.familyData ? appState.familyData.name : 'Aile'})` 
        : `🔒 ${msg.senderName} (${msg.senderRole || 'Özel Mesaj'})`;
    const notifBody = msg.content;
    const notifIcon = 'icons/icon.svg';

    if ('Notification' in window && Notification.permission === 'granted' && appState.notificationsEnabled) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(notifTitle, {
                    body: notifBody,
                    icon: notifIcon,
                    badge: notifIcon,
                    tag: `chat-msg-${msg.id || Date.now()}`,
                    renotify: true,
                    vibrate: [100, 50, 100, 50, 150],
                    data: { url: isGroup ? './?tab=chat' : `./?tab=chat&direct=${msg.senderId}` }
                });
            }).catch(() => {
                try {
                    new Notification(notifTitle, { body: notifBody, icon: notifIcon });
                } catch (e) {}
            });
        } else {
            try {
                new Notification(notifTitle, { body: notifBody, icon: notifIcon });
            } catch (e) {}
        }
    }

    // 3. Sekme Başlığı Uyarısı
    flashTabTitleForNewMessage(msg.senderName);

    // 4. Uygulama İçi Yüzen Bildirim Kartı (Eğer o an o sohbette değilsek)
    const isViewingActiveChat = (appState.currentTab === 'tabChat' && 
        ((isGroup && appState.chatChannel === 'group') ||
         (!isGroup && msg.senderId === appState.chatTargetMemberId && appState.chatChannel === 'direct')));

    if (!isViewingActiveChat) {
        showInAppMessageBanner(msg);
    }
}

// ==========================================================
// WEB PUSH BİLDİRİM VE VAPID ENTEGRASYONU (UYGULAMA KAPALIYKEN)
// ==========================================================
const VAPID_PUBLIC_KEY = 'BAy8L7Fodzvl0ZARDLnnLt5Kc9E2mYVlcI6OXDAmKlq0zs9598HUlghuzmxz-bcL1G8wepKOSbAaLXm_dX45Xi4';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function registerPushSubscription(forceRefresh = false) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('PushManager bu tarayıcıda desteklenmiyor.');
        return { success: false, reason: 'unsupported' };
    }
    if (!appState.currentUser || !appState.familyData) {
        return { success: false, reason: 'not_logged_in' };
    }

    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (forceRefresh && sub) {
            try { await sub.unsubscribe(); } catch (e) {}
            sub = null;
        }

        if (!sub) {
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        if (sub) {
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    familyId: appState.familyData.id,
                    userId: appState.currentUser.id,
                    subscription: sub
                })
            });
            const data = await res.json();
            console.log('✅ Arka plan Web Push aboneliği aktif edildi:', sub.endpoint);
            updatePushNotificationUI();
            return { success: true, subscription: sub, apiResponse: data };
        }
    } catch (err) {
        console.warn('Web Push abonelik kaydı hatası:', err);
        if (!forceRefresh) {
            try {
                const reg = await navigator.serviceWorker.ready;
                const oldSub = await reg.pushManager.getSubscription();
                if (oldSub) await oldSub.unsubscribe();
                return await registerPushSubscription(true);
            } catch (retryErr) {
                console.error('Retry push subscription error:', retryErr);
            }
        }
        return { success: false, error: err.message };
    }
    return { success: false, reason: 'unknown' };
}

function updatePushNotificationUI() {
    const btn = document.getElementById('btnToggleNotifications');
    const isGranted = ('Notification' in window && Notification.permission === 'granted');
    const isEnabled = isGranted && (appState.notificationsEnabled !== false);
    
    if (btn) {
        btn.classList.toggle('active', isEnabled);
        btn.title = isEnabled ? 'Bildirimler Açık 🔔' : 'Bildirimler Kapalı 🔕';
    }

    const noticeBanner = document.getElementById('chatPushPermissionNotice');
    if (noticeBanner) {
        if (!isGranted) {
            noticeBanner.classList.remove('hidden');
        } else {
            noticeBanner.classList.add('hidden');
        }
    }

    const iosBanner = document.getElementById('iosPwaPushNotice');
    if (iosBanner) {
        if (isIosDevice() && !isStandaloneMode()) {
            iosBanner.classList.remove('hidden');
        } else {
            iosBanner.classList.add('hidden');
        }
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
        localStorage.setItem('ailem_notifications_enabled', appState.notificationsEnabled ? 'true' : 'false');
        updatePushNotificationUI();
        if (appState.notificationsEnabled) {
            await registerPushSubscription();
            showToast('Anlık bildirimler devrede! 🔔');
        } else {
            showToast('Bildirimler kapatıldı 🔕');
        }
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        appState.notificationsEnabled = true;
        localStorage.setItem('ailem_notifications_enabled', 'true');
        await registerPushSubscription(true);
        updatePushNotificationUI();
        showToast('Bildirim izni verildi! Uygulama kapalıyken de bildirim alacaksınız. 🔔');
    } else {
        localStorage.setItem('ailem_notifications_enabled', 'false');
        updatePushNotificationUI();
        showToast('Bildirim izni verilmedi. Telefon ayarlarından izin verebilirsiniz.');
    }
}

// Telefona Anında Test Bildirimi Gönderme
async function testPhonePushNotification() {
    if (!('Notification' in window)) {
        showToast('Tarayıcınız Web Bildirimlerini desteklemiyor.');
        return;
    }

    if (isIosDevice() && !isStandaloneMode()) {
        showToast('⚠️ iPhone\'da bildirim için uygulamayı "Ana Ekrana Ekle"meniz gerekmektedir.');
        openModal('modalPwaGuide');
        switchPwaGuideTab('ios');
        return;
    }

    if (Notification.permission !== 'granted') {
        showToast('Bildirim izni isteniyor, lütfen "İzin Ver"e dokunun...');
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            showToast('❌ Bildirim izni verilmedi. Telefon ayarlarından tarayıcı bildirimlerine izin verin.');
            updatePushNotificationUI();
            return;
        }
        appState.notificationsEnabled = true;
        localStorage.setItem('ailem_notifications_enabled', 'true');
    }

    showToast('⏳ Telefon bildirim aboneliği hazırlanıyor...');
    const subResult = await registerPushSubscription(true);
    
    if (!subResult || !subResult.success) {
        showToast('❌ Bildirim aboneliği oluşturulamadı: ' + (subResult?.error || 'Bilinmeyen hata'));
        return;
    }

    showToast('🚀 Test bildirimi telefonunuza gönderiliyor...');
    try {
        const response = await fetch('/api/push/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: appState.currentUser.id,
                familyId: appState.familyData ? appState.familyData.id : null
            })
        });
        const resData = await response.json();
        if (resData && resData.success) {
            showToast('✅ Harika! Test bildirimi telefonunuza iletildi. Üst bildirim çubuğunu kontrol edin 🔔');
            triggerHapticAndSound();
        } else {
            showToast('⚠️ Bildirim sunucudan iletilemedi: ' + (resData?.message || 'Abonelik kaydı bulunamadı.'));
        }
    } catch (err) {
        showToast('❌ Test bildirimi isteği başarısız: ' + err.message);
    }
    updatePushNotificationUI();
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
    if (banner) banner.classList.add('hidden');
    openFamilyGroupChat();
}

// Sohbet Arayüzünü Render Et (Tüm Aile Grubu)
function renderChat() {
    const family = appState.familyData;
    const currentUser = appState.currentUser;
    if (!family || !currentUser) return;

    if (!family.messages) family.messages = [];
    const messages = family.messages;
    const members = family.members || [];

    // 1. Bildirim Butonu Durumu
    const btnBell = document.getElementById('btnToggleNotifications');
    if (btnBell) {
        btnBell.classList.toggle('active', !!appState.notificationsEnabled);
        btnBell.title = appState.notificationsEnabled ? 'Bildirimler Açık 🔔' : 'Bildirimleri Aç 🔕';
    }

    // 2. Aktif Sohbet Başlığı ve Durumu
    const activeAvatar = document.getElementById('activeChatAvatar');
    const activeTitle = document.getElementById('activeChatTitle');
    const activeSubtitle = document.getElementById('activeChatSubtitle');

    if (activeAvatar) activeAvatar.textContent = '👨‍👩‍👧‍👦';
    if (activeTitle) activeTitle.textContent = `${family.name} Sohbeti`;
    if (activeSubtitle) activeSubtitle.textContent = `🟢 ${members.length} Aile Bireyi • Çevrim İçi`;

    // 3. Mesaj Baloncuklarını Render Et
    const msgContainer = document.getElementById('chatMessagesContainer');
    if (msgContainer) {
        if (messages.length === 0) {
            msgContainer.innerHTML = `
                <div class="empty-state" style="padding: 40px 10px;">
                    <i class="fa-solid fa-comments" style="font-size: 32px; color: #cbd5e1;"></i>
                    <p style="margin-top: 8px; font-size: 0.85rem; color: #64748b;">
                        Aile grubunda henüz mesaj yok. İlk mesajı siz yazın! 🎉
                    </p>
                </div>
            `;
        } else {
            msgContainer.innerHTML = messages.map(msg => {
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

    // 4. Okunmamış Mesajları Okundu Yap
    if (appState.currentTab === 'tabChat') {
        markMessagesRead('group');
    }

    // 5. Rozetleri Güncelle
    updateChatUnreadCounts();
}

function updateChatUnreadCounts() {
    const family = appState.familyData;
    const currentUser = appState.currentUser;
    if (!family || !currentUser) return;

    const messages = family.messages || [];

    // Okunmamış mesajlar (başkalarının gönderdikleri ve henüz okunmamış olanlar)
    const unreadCount = messages.filter(m => 
        m.senderId !== currentUser.id && 
        !m.isRead &&
        !(m.readBy && m.readBy.includes(currentUser.id))
    ).length;

    // Header rozeti (Sadece yeni mesaj varsa görünür, aksi takdirde tamamen gizlenir)
    const headerBadge = document.getElementById('headerChatBadge');
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        if (unreadCount > 0) {
            headerBadge.classList.remove('hidden');
        } else {
            headerBadge.classList.add('hidden');
        }
    }

    // Masaüstü Sol Menü (Sidebar) Sohbet Rozeti
    const sidebarChatBadge = document.getElementById('sidebarChatBadge');
    if (sidebarChatBadge) {
        sidebarChatBadge.textContent = unreadCount;
        if (unreadCount > 0) {
            sidebarChatBadge.classList.remove('hidden');
        } else {
            sidebarChatBadge.classList.add('hidden');
        }
    }

    // Quick info pill
    const quickUnread = document.getElementById('quickUnreadMessages');
    if (quickUnread) {
        quickUnread.textContent = unreadCount;
    }

    // Alt navigasyon rozeti
    const navChatBadge = document.getElementById('navChatBadge');
    if (navChatBadge) {
        navChatBadge.textContent = unreadCount;
        if (unreadCount > 0) {
            navChatBadge.classList.remove('hidden');
        } else {
            navChatBadge.classList.add('hidden');
        }
    }
}

async function markMessagesRead(chatPartnerId = 'group') {
    if (!appState.familyData || !appState.currentUser) return;
    const familyId = appState.familyData.id;
    const currentUserId = appState.currentUser.id;

    let changed = false;
    (appState.familyData.messages || []).forEach(m => {
        if (m.senderId !== currentUserId) {
            if (!m.isRead || !(m.readBy && m.readBy.includes(currentUserId))) {
                m.isRead = 1;
                if (!m.readBy) m.readBy = [];
                if (!m.readBy.includes(currentUserId)) m.readBy.push(currentUserId);
                changed = true;
            }
        }
    });

    if (changed) {
        saveStateToStorage();
        updateChatUnreadCounts();
        // SQLite Sunucusuna bildir
        await AilemAPI.markMessagesAsRead(familyId, currentUserId, 'group');
    }
}

function switchChatChannel(channel) {
    openFamilyGroupChat();
}

function switchDirectMember(memberId) {
    openFamilyGroupChat();
}

function openFamilyGroupChat() {
    appState.chatChannel = 'group';
    switchTab('tabChat');
    renderChat();
}

function openDirectChat(memberId) {
    openFamilyGroupChat();
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

    const receiverId = 'group';

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
        appState.familyData = normalizeFamilyData(updatedFamily);
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
    } else if (tabId === 'tabExpenses') {
        renderBudget();
        fetchLiveMarketRates();
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
    if (modal) {
        modal.classList.remove('hidden');
        if (modalId === 'modalNewTask') {
            updateMemberSelectDropdowns();
            const taskAssignee = document.getElementById('taskAssignee');
            if (taskAssignee && !taskAssignee.value && appState.currentUser && appState.currentUser.name) {
                taskAssignee.value = appState.currentUser.name;
            }
        } else if (modalId === 'modalNewInvestment') {
            autoCalculateInvestmentTL();
        } else if (modalId === 'modalNewDailyPlan') {
            updateMemberSelectDropdowns();
            const dailyAssignee = document.getElementById('newDailyPlanAssignedTo');
            if (dailyAssignee && !dailyAssignee.value && appState.currentUser && appState.currentUser.name) {
                dailyAssignee.value = appState.currentUser.name;
            }
        } else if (modalId === 'modalNewCharity') {
            updateMemberSelectDropdowns();
            const dateInput = document.getElementById('charityDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }
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
