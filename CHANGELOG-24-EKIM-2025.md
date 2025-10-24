# Changelog - 24 Ekim 2025

## 🎉 Yapılan Geliştirmeler

### 1. Portal İade Talepleri Ayrımı
**Özellik:** Portal ve Dashboard'dan oluşturulan iade talepleri artık ayrı kategorilerde görüntüleniyor.

#### Detaylar:
- **Database Schema Güncellemesi**
  - `RefundRequest` modeline `source` field'ı eklendi
  - Değerler: `"dashboard"` (manuel) veya `"portal"` (müşteri tarafından)
  - Default değer: `"dashboard"`

- **İadeler Sayfası Yenilendi** (`/refunds`)
  - 3 tab yapısı: "İkas İade Siparişleri", "Portal İade Talepleri", "Manuel İade Kayıtları"
  - Her tab için ayrı filtreleme ve KPI gösterimi
  - Portal iadelerini otomatik filtreleme

- **API Güncellemeleri**
  - Portal submit endpoint: `source: 'portal'` olarak işaretleniyor
  - Manuel create endpoint: `source: 'dashboard'` olarak işaretleniyor

**Dosyalar:**
- `prisma/schema.prisma` - Schema güncellemesi
- `src/app/refunds/page.tsx` - 3 tab'lı görünüm
- `src/app/api/public/submit-refund/route.ts` - Portal source
- `src/app/api/refunds/route.ts` - Dashboard source

---

### 2. İade Takip Sistemi
**Özellik:** Müşteriler artık iade durumlarını takip numarası ile sorgulayabilir.

#### Detaylar:
- **Yeni API Endpoint**
  - `/api/public/track-refund` - Public iade takip endpoint'i
  - Query param: `refundId`
  - Dönen veri: İade detayları, timeline, notlar, sipariş bilgileri
  - Mock data desteği

- **Yeni Sayfalar**
  - `/portal/track/[id]` - Detaylı iade takip sayfası
    - Timeline görünümü
    - Sipariş bilgileri
    - İade notları
    - Durum gösterimi
    - Yazdırma özelliği

  - `/track` - Public iade takip giriş sayfası
    - İade numarası ile direkt sorgulama
    - Portal'a yönlendirme
    - Kullanım talimatları

- **Portal Akışı İyileştirmeleri**
  - Eğer sipariş için zaten iade varsa → Tracking sayfasına yönlendirme
  - Hata mesajı yerine mevcut iade durumu gösterimi
  - Success sayfasında tracking linki eklendi

- **Success Sayfası Güncellemesi**
  - İade takip numarası prominently gösteriliyor
  - "İade Durumunu Görüntüle" butonu eklendi
  - Tracking sayfasına direkt link

**Dosyalar:**
- `src/app/api/public/track-refund/route.ts` - Tracking API
- `src/app/portal/track/[id]/page.tsx` - Tracking sayfası
- `src/app/track/page.tsx` - Public tracking giriş
- `src/app/portal/page.tsx` - Mevcut iade yönlendirmesi
- `src/app/portal/complete/page.tsx` - Tracking linki eklendi

---

## 📊 Kullanım Senaryoları

### Senaryo 1: Yeni İade Talebi
1. Müşteri portal'a girer: `http://localhost:3001/portal`
2. Sipariş numarası ve email girer
3. İade nedeni seçer ve fotoğraf yükler
4. İade talebi oluşturulur
5. Success sayfasında tracking numarası gösterilir
6. "İade Durumunu Görüntüle" ile tracking sayfasına gider

### Senaryo 2: Mevcut İade Kontrolü
1. Müşteri portal'a girer
2. Sipariş numarası ve email girer (bu sipariş için zaten iade var)
3. **Otomatik olarak** tracking sayfasına yönlendirilir
4. Mevcut iade durumunu görür (hata mesajı YOK!)

### Senaryo 3: Direkt İade Takip
1. Müşteri tracking sayfasına gider: `http://localhost:3001/track`
2. İade takip numarasını girer
3. İade durumunu ve timeline'ı görüntüler

### Senaryo 4: Dashboard Yönetimi
1. Yönetici dashboard'a girer: `http://localhost:3001/refunds`
2. "Portal İade Talepleri" tab'ına tıklar
3. Müşteriler tarafından oluşturulan iadeleri görür
4. "Manuel İade Kayıtları" tab'ında kendi oluşturduklarını görür

---

## 🧪 Test Bilgileri

### Mock Sipariş Verileri:
**Sipariş 1:**
- Sipariş No: `1001`
- Email: `test@example.com`
- Tutar: ₺150.00
- Müşteri: Test Müşteri

**Sipariş 2:**
- Sipariş No: `1002`
- Email: `demo@example.com`
- Tutar: ₺250.00
- Müşteri: Demo User

### Test Adımları:
1. Portal'dan iade oluştur: `http://localhost:3001/portal`
2. Success sayfasında tracking numarasını kopyala
3. Tracking sayfasını test et: `http://localhost:3001/portal/track/[refundId]`
4. Aynı siparişle tekrar portal'a gir - otomatik tracking'e yönlendirilmeli
5. Public tracking'i test et: `http://localhost:3001/track`
6. Dashboard'da "Portal İade Talepleri" tab'ını kontrol et

---

## 🔧 Teknik Detaylar

### Database Değişiklikleri:
```prisma
model RefundRequest {
  // ... diğer fieldlar
  source          String   @default("dashboard") // dashboard, portal
}
```

### Yeni Endpoint:
```
GET /api/public/track-refund?refundId=xxx
```

### Yeni Route'lar:
```
/portal/track/[id]  - Iade takip sayfası
/track              - Public tracking giriş
/refunds/portal     - Portal iade talepleri (dashboard için)
```

---

## 📈 İstatistikler

- **Toplam Yeni Dosya:** 3
- **Güncellenen Dosya:** 5
- **Yeni API Endpoint:** 1
- **Yeni Route:** 3
- **Database Migration:** 1 (source field)

---

## 🚀 v2 İçin Önerilen Özellikler

### 1. Email Bildirimleri
**Öncelik:** Yüksek
- İade talebi oluşturulduğunda müşteriye email
- Durum değişikliklerinde otomatik bildirim
- Kargo takip numarası eklendiğinde email
- Email template sistemi (Resend/SendGrid)

**Teknik:**
```typescript
// Email service
await sendEmail({
  to: customer.email,
  template: 'refund-created',
  data: { refundId, orderNumber, trackingUrl }
});
```

---

### 2. SMS Bildirimleri
**Öncelik:** Orta
- Kritik durum değişikliklerinde SMS
- Türk operatörlerle entegrasyon (Netgsm, İleti Merkezi)
- Opt-in/opt-out sistemi

---

### 3. Fotoğraf Yükleme ve Saklama
**Öncelik:** Yüksek
- AWS S3 / Cloudinary entegrasyonu
- Otomatik image compression
- Thumbnail oluşturma
- Gallery view dashboard'da
- Fotoğrafları timeline'da gösterme

**Teknik Stack:**
```typescript
// Upload to S3
const uploadedImages = await Promise.all(
  images.map(img => s3.upload({
    Bucket: 'refund-images',
    Key: `${refundId}/${Date.now()}-${img.name}`,
    Body: img.buffer
  }))
);
```

---

### 4. PDF Rapor ve Fatura
**Öncelik:** Orta
- İade formu PDF export
- Kargo etiketi PDF oluşturma
- Toplu iade raporu (Excel)
- Aylık özet raporlar

**Teknoloji:**
- `@react-pdf/renderer` veya `puppeteer`
- Excel: `xlsx` (mevcut)

---

### 5. Kargo Entegrasyonları
**Öncelik:** Yüksek
- Aras Kargo API entegrasyonu
- Yurtiçi Kargo API
- MNG Kargo API
- Otomatik kargo takip numarası ekleme
- Kargo durumu senkronizasyonu

**Özellikler:**
- Otomatik kargo etiketi oluşturma
- QR kodlu etiket
- Müşteriye kargo linki gönderme

---

### 6. Çoklu Dil Desteği (i18n)
**Öncelik:** Orta
- Türkçe (default)
- İngilizce
- `next-intl` kullanımı
- Portal sayfalarında dil seçimi

---

### 7. Otomatik İade Kural Motoru
**Öncelik:** Düşük
**Açıklama:** Belirli koşullarda otomatik onay/red

**Kurallar:**
```typescript
const rules = {
  autoApprove: {
    // 30 gün içinde, hasarlı ürün → otomatik onay
    condition: (order, reason) =>
      daysSinceOrder(order) <= 30 &&
      reason === 'damaged_product',
    action: 'approve'
  },
  autoReject: {
    // 60 günden eski → otomatik red
    condition: (order) => daysSinceOrder(order) > 60,
    action: 'reject',
    message: 'İade süresi geçmiş'
  }
}
```

---

### 8. Müşteri Dashboard'u
**Öncelik:** Orta
**Açıklama:** Müşteriler için geçmiş iade talepleri

**Özellikler:**
- Tüm geçmiş iadeler
- Her iade için detaylı timeline
- Aktif/tamamlanan iadeler
- Email ile login sistemi

**Route:** `/customer/dashboard`

---

### 9. İade Sebep Analizi ve Raporlama
**Öncelik:** Düşük
**Dashboard Kartları:**
- En çok iade edilen ürünler
- İade sebeplerinin dağılımı (pie chart)
- Aylık iade trendi (line chart)
- Ortalama işlem süresi
- Müşteri memnuniyeti (iade sonrası anket)

**Teknoloji:**
- `recharts` veya `chart.js`
- Analytics service (Google Analytics, Mixpanel)

---

### 10. Webhook Sistemi
**Öncelik:** Orta
**Açıklama:** Durum değişikliklerinde dış sistemlere bildirim

**Events:**
- `refund.created`
- `refund.approved`
- `refund.rejected`
- `refund.shipped`
- `refund.completed`

**Kullanım:**
```typescript
await webhooks.send('refund.created', {
  refundId,
  orderNumber,
  status,
  timestamp: new Date()
});
```

---

### 11. Toplu İşlemler
**Öncelik:** Düşük
**Özellikler:**
- Çoklu iade seçimi
- Toplu durum değiştirme
- Toplu email gönderme
- Toplu PDF export

**UI:**
- Checkbox selection
- Bulk actions dropdown
- Konfirmasyon modali

---

### 12. İade Şablonları (Templates)
**Öncelik:** Düşük
**Açıklama:** Sık kullanılan iade notları için şablonlar

**Örnekler:**
- "Ürün hasarlı geldi - kargo hatası"
- "Beden uyumsuzluğu - değişim talebi"
- "Müşteri memnuniyetsizliği - iade onaylandı"

---

### 13. İade Politikası Yönetimi
**Öncelik:** Orta
**Özellikler:**
- Kategori bazlı iade süreleri (Elektronik: 14 gün, Giyim: 30 gün)
- Ürün bazlı iade yasağı (Hijyenik ürünler)
- Dinamik kargo ücreti kuralları
- Portal'da otomatik politika gösterimi

---

### 14. Chatbot / Live Support
**Öncelik:** Düşük
**Entegrasyonlar:**
- Intercom
- Crisp
- Tawk.to
- Custom ChatGPT-4 bot

**Özellikler:**
- Portal'da iade sürecinde yardım
- Otomatik cevaplar (FAQ)
- Agent escalation

---

### 15. Mobile App (React Native)
**Öncelik:** Düşük
**Özellikler:**
- Native iOS/Android app
- Push notifications
- Fotoğraf direkt kameradan
- QR kod ile kargo takip
- Offline mode

---

### 16. Video Kayıt Sistemi
**Öncelik:** Düşük
**Açıklama:** Hasarlı ürünler için video kanıtı

**Özellikler:**
- Video upload (max 2 dakika)
- Video compression
- Cloudflare Stream / AWS Media
- Dashboard'da video player

---

### 17. İade Puanlama Sistemi
**Öncelik:** Düşük
**Açıklama:** Müşteri iade geçmişine göre risk skoru

**Kriterler:**
- Toplam iade sayısı
- İade/sipariş oranı
- İptal edilen iade sayısı
- Kötüye kullanım tespiti

**Kullanım:**
- Yüksek riskli müşterilere manuel inceleme
- Otomatik kurallar için input

---

### 18. Envanter Entegrasyonu
**Öncelik:** Yüksek (E-ticaret için)
**Özellikler:**
- İade onaylandığında otomatik stok arttırma
- Ürün durumu takibi (sıfır, kusurlu, hasarlı)
- İadeden satışa geri dönüş tracking
- ikas envanter API entegrasyonu

---

### 19. Muhasebe Entegrasyonu
**Öncelik:** Orta
**Entegrasyonlar:**
- Paraşüt
- e-Fatura sistemi
- İade faturası oluşturma
- Otomatik muhasebe kayıtları

---

### 20. A/B Testing Portal
**Öncelik:** Düşük
**Test Edilebilecekler:**
- Farklı form tasarımları
- İade sebep sıralaması
- CTA button renkleri
- Başarı mesajı varyasyonları

**Teknoloji:**
- Google Optimize
- Optimizely
- Custom AB testing

---

## 🎯 Öncelik Sıralaması (v2 Roadmap)

### Q1 - Temel Geliştirmeler
1. ✅ Email bildirimleri
2. ✅ Fotoğraf saklama (S3/Cloudinary)
3. ✅ Kargo entegrasyonları
4. ✅ Envanter entegrasyonu

### Q2 - Kullanıcı Deneyimi
1. ✅ PDF raporlar
2. ✅ Müşteri dashboard'u
3. ✅ İade politikası yönetimi
4. ✅ Çoklu dil desteği

### Q3 - Analytics & Automation
1. ✅ İade analiz raporları
2. ✅ Webhook sistemi
3. ✅ Otomatik kural motoru
4. ✅ Toplu işlemler

### Q4 - Gelişmiş Özellikler
1. ✅ SMS bildirimleri
2. ✅ Muhasebe entegrasyonu
3. ✅ Chatbot desteği
4. ✅ Mobile app (opsiyonel)

---

## 📝 Notlar

- Tüm özellikler mock data ile test edildi
- Production'a geçmeden önce gerçek ikas OAuth testi yapılmalı
- Vercel deployment için portal sayfaları hazır
- Database migrations manuel olarak uygulanmalı
- Email servisi için SMTP/Resend hesabı gerekli

---

## 🤝 Katkıda Bulunanlar

- **Developer:** Claude Code + Enes Tekin
- **Tarih:** 24 Ekim 2025
- **Versiyon:** v1.2.0

---

## 📞 İletişim

Sorular veya öneriler için:
- GitHub Issues: `https://github.com/yourusername/refund-v1/issues`
- Email: `support@yourstore.com`

---

**Son Güncelleme:** 24 Ekim 2025, 15:00 TSI
