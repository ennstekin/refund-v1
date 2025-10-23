# Changelog

Bu dosya projedeki önemli değişiklikleri belgeler.

Format [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standardını takip eder,
ve bu proje [Semantic Versioning](https://semver.org/spec/v2.0.0.html) kullanır.

## [1.0.0] - 2025-10-23

### ✨ Eklendi

#### Admin Panel Özellikleri
- İki sekme ile iade yönetim sistemi
  - ikas Siparişleri sekmesi: Son 90 gündeki iade durumundaki siparişler (otomatik)
  - Manuel Kayıtlar sekmesi: Yönetici tarafından oluşturulan kayıtlar
- Manuel iade kaydı oluşturma sayfası
  - Sipariş arama fonksiyonu
  - 7 farklı iade nedeni seçimi
  - Kargo takip numarası girişi
  - Otomatik timeline event oluşturma
- İade detay sayfası
  - Sipariş bilgileri görüntüleme
  - Durum güncelleme (pending, processing, completed, rejected)
  - Not ekleme sistemi
  - Timeline görüntüleme
- Ayarlar sayfası
  - Portal aktif/pasif yapma
  - Özel domain ayarlama
  - Portal URL kopyalama
  - Entegrasyon örnekleri (email, web, WhatsApp/SMS)
- Dashboard navigasyonu
  - İade Talepleri kartı
  - Ayarlar kartı
  - Müşteri Portalı önizleme kartı

#### Müşteri Self-Service Portalı
- 4 adımlı iade talep süreci
  - Adım 1: Sipariş doğrulama (sipariş no + email)
  - Adım 2: İade nedeni seçimi (7 farklı neden)
  - Adım 3: Fotoğraf yükleme (hasarlı/yanlış/kusurlu ürünler için, max 5 adet)
  - Adım 4: İade talimatları ve gönderme
- Progress bar ile adım gösterimi
- SessionStorage ile multi-step form state management
- Responsive design (mobile, tablet, desktop)

#### API Endpoints
**Authenticated (JWT gerekli):**
- `GET /api/refunds` - İade listesi
- `POST /api/refunds` - Manuel iade oluşturma
- `GET /api/refunds/[id]` - İade detayı
- `PATCH /api/refunds/[id]` - İade güncelleme
- `GET /api/refunds/[id]/timeline` - İade timeline
- `GET /api/ikas/orders` - Sipariş arama
- `GET /api/ikas/refund-orders` - İade durumundaki siparişler
- `GET /api/settings` - Mağaza ayarları
- `PATCH /api/settings` - Mağaza ayarları güncelleme

**Public (JWT gerekmez):**
- `POST /api/public/verify-order` - Sipariş doğrulama
- `POST /api/public/submit-refund` - İade talebi gönderme

#### Veritabanı
- `RefundRequest` modeli: İade talepleri
- `RefundNote` modeli: İade notları
- `RefundTimeline` modeli: İade event history
- `Merchant` modeli: Mağaza ayarları

#### GraphQL Queries
- `LIST_REFUND_ORDERS` query: İade durumundaki siparişleri çekmek için

#### Dokümantasyon
- `.docs/DEVELOPMENT_LOG.md`: Detaylı geliştirme süreci dökümanı
  - Tüm özellikler ve teknik detaylar
  - Karşılaşılan sorunlar ve çözümler
  - Production önerileri
  - API dokümantasyonu
  - Güvenlik notları
  - Performans önerileri
- `CHANGELOG.md`: Sürüm notları
- `README.md`: Güncellenmiş proje açıklaması

### 🔧 Değiştirildi
- `README.md` dosyası iade yönetim sistemine göre güncellendi
- Dashboard sayfası sadeleştirildi, 3 navigasyon kartı eklendi
- `ApiRequests` helper'ına yeni endpoint'ler eklendi

### 🐛 Düzeltildi
- GraphQL enum değerlerinde tırnak işareti sorunu çözüldü
- Pagination offset parametresi kaldırıldı (ikas API desteklemiyor)
- ikas GraphQL query'lerinde REFUND_DELIVERED enum değeri eklendi

### 🔐 Güvenlik
- Public endpoint'ler için JWT zorunluluğu kaldırıldı
- Sipariş doğrulama için email matching eklendi
- Duplicate iade kontrolü eklendi

### 📝 Teknik Notlar

#### GraphQL Enum Kullanımı
```typescript
// ❌ Yanlış
orderPackageStatus: { in: ["REFUND_REQUESTED", "REFUNDED"] }

// ✅ Doğru
orderPackageStatus: { in: [REFUND_REQUESTED, REFUNDED, REFUND_DELIVERED] }
```

#### SessionStorage Akışı
1. `refund_order` - Sipariş bilgileri
2. `refund_reason` - İade nedeni ve notu
3. `refund_images` - Base64 fotoğraflar
4. Gönderimden sonra temizleniyor

#### Timeline Event Types
- `created` - İade oluşturuldu
- `status_changed` - Durum değişti
- `note_added` - Not eklendi
- `tracking_updated` - Kargo takip numarası güncellendi

### 🚀 Production Önerileri

**Öncelikli:**
- [ ] Cloud storage entegrasyonu (S3, Cloudinary)
- [ ] Email bildirimleri (SendGrid, AWS SES)
- [ ] Multi-tenant domain routing
- [ ] Database migration (SQLite → PostgreSQL)

**Orta Vadeli:**
- [ ] Kargo firması entegrasyonları
- [ ] SMS/WhatsApp bildirimleri
- [ ] Müşteri iade takip sayfası
- [ ] İade istatistikleri dashboard'u

**Uzun Vadeli:**
- [ ] Rate limiting ve security enhancements
- [ ] Unit ve integration testleri
- [ ] CI/CD pipeline
- [ ] Docker deployment

### 📊 İstatistikler
- **Yeni Dosyalar:** 15+
- **Değiştirilen Dosyalar:** 5
- **API Endpoints:** 13
- **Database Modeller:** 5
- **Satır Sayısı:** ~3000+

---

## İleriki Sürümler İçin Planlar

### [1.1.0] - Planlanan
- Email bildirim sistemi
- S3 fotoğraf yükleme
- Excel/CSV export
- Toplu işlem (bulk actions)

### [1.2.0] - Planlanan
- Kargo entegrasyonları
- Otomatik kargo etiketi
- SMS bildirimleri
- İade takip sayfası

### [2.0.0] - Planlanan
- Multi-tenant domain routing
- İstatistikler dashboard'u
- AI iade analizi
- Mobile app
- Advanced security features

---

**Not:** Detaylı teknik dokümantasyon için [.docs/DEVELOPMENT_LOG.md](.docs/DEVELOPMENT_LOG.md) dosyasına bakın.
