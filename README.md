# 🏠🧭 YuvaPusula - Akıllı Aile Yönetimi, Bütçe ve Zaman Rehberi

**YuvaPusula**, aile bireylerinin zamanı, bütçeyi, görevleri ve ortak hedefleri doğru yönetmesi için yön gösteren güvenilir ve modern bir rehber **Progressive Web App (PWA)** uygulamasıdır.

Sıcak bir yuva samimiyetini, pusulanın yol gösterici netliğiyle birleştirir.

---

## ✨ Temel Özellikler

### 1. 📢 Aile Panosu & Duyurular
- Aile üyelerine anlık duyuru, hatırlatma ve not bırakma.
- Renkli kategori etiketleri (Acil, Yemek, Hatırlatma, Kutlama vb.).

### 2. 💬 Anlık Mesajlaşma & Bildirimler
- **Aile Grubu Sohbeti:** Tüm ailenin birlikte yazışabildiği ortak alan.
- **Birebir Özel Mesajlaşma:** Aile fertleri arasında gizli ve hızlı iletişim.
- Sesli bildirimler, titreşim ve uygulama içi yüzen bildirim balonları.
- Hızlı hazır cevaplar ve emoji desteği.

### 3. 💰 Aile Finansı, Maaşlar & Sabit Giderler
- **Kişisel Maaş Tanımlama:** Her aile üyesi kendi aylık gelirini ve maaş gününü belirler.
- **Ay Başı Otomatik Bildirim:** Her ayın 1'inde bütçe ve maaş yenileme hatırlatıcısı.
- **Düzenli Sabit Giderler:** Kira, aidat, elektrik, su, internet, kredi ödemeleri ve tek dokunuşla ödendi/ödenmedi takibi.
- **Günlük Değişken Harcamalar:** Kategorili harcama takibi ve bütçeden anlık düşüş.
- **4'lü Master Bütçe Dengesi:** Toplam Maaşlar, Sabit Giderler, Harcamalar ve Kalan Net Bütçe Dengesi.

### 4. 🪙 Altınkaynak Canlı Kurlarla Yatırım & Portföy Yönetimi
- **4 Temel Varlık:** Altın (Gram / Çeyrek), Dolar (USD), Euro (EUR) ve Türk Lirası (TL).
- **Altınkaynak.com Entegrasyonu:** Gerçek zamanlı canlı piyasa kurları ve ticker bandı.
- **Otomatik Portföy Değeri:** Miktar girildiğinde güncel kur üzerinden otomatik TL hesaplama.
- **Alış / Satış & Bozdurma:** Portföy büyütme ve azaltma hareketlerinin detaylı işlem geçmişi.

### 5. 🗺️ Aile Planları & Keşif Rehberi
- **Seyahat & Tatil:** Yurt içi / yurt dışı rotalar, ulaşım türü, hedef dönem ve tahmini bütçe.
- **Restoran & Kafe:** Denenecek mekanlar, özel lezzetler, fiyat düzeyi ve harita bağlantıları.
- **Etkinlik & Gösteri:** Konser, tiyatro, sinema etkinlikleri, bilet linkleri ve tarih/saat.
- **Alışveriş & İstekler:** Ailenin büyük istekleri, öncelik dereceleri ve ürün bağlantıları.

### 6. 🛒 Akıllı Alışveriş Listesi
- Kategori bazlı filtreleme (Market, Manav, Kasap, Eşya vb.).
- Alınan ürünleri tek tıkla tamamlama ve otomatik temizleme.

### 7. ✅ Görev & Sorumluluk Dağılımı
- Ev işleri, dersler ve sorumlulukların aile üyelerine atanması.
- Bitiş süresi ve tamamlanma durumu takibi.

### 8. 📱 PWA, Yerel SQLite & Bulut Dağıtım Desteği
- iOS (Safari) ve Android (Chrome) cihazlara tek dokunuşla uygulama gibi kurulabilme.
- Hibrit Veritabanı Mimarisi: Node.js yerleşik `node:sqlite` ve Vercel Serverless JSON uyumluluğu.
- Yerel ağdaki (Wi-Fi) tüm telefon ve tabletlerden IP adresi üzerinden ortak kullanım.

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- **Node.js** (v18.0.0 veya üzeri)

### Adımlar
1. Projeyi bilgisayarınıza klonlayın veya indirin:
   ```bash
   git clone https://github.com/dicleinceleruysal/YuvaPusula.git
   cd YuvaPusula
   ```

2. Sunucuyu başlatın:
   ```bash
   npm start
   ```
   veya:
   ```bash
   node server.js
   ```

3. Tarayıcınızda açın:
   - **Bilgisayarınızdan:** `http://localhost:3000`
   - **Aynı Wi-Fi ağındaki telefon/tabletten:** Sunucu konsolunda yazan IP adresi (Örn: `http://192.168.1.XX:3000`)

---

## 🛠️ Kullanılan Teknolojiler
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3, PWA (Service Worker + Web App Manifest)
- **Backend:** Node.js HTTP Server & Vercel Serverless Functions
- **Veritabanı:** Hibrit SQLite (`node:sqlite`) + Vercel JSON Fallback
- **Canlı Veri Kaynağı:** [altinkaynak.com](https://www.altinkaynak.com/) Canlı Döviz ve Altın API'si
- **İkon Seti:** Font Awesome 6.5.1
- **Tipografi:** Google Fonts (Plus Jakarta Sans)

---

## 📄 Lisans
Bu proje MIT lisansı altında korunmaktadır.
