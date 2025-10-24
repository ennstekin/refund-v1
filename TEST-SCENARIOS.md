# Portal Test Senaryoları

## 📧 Test Hesap Bilgileri

**Email:** `test@test.com`
**Sipariş Numaraları:** `1001` - `1015`

---

## 📦 Mock Sipariş Detayları

| Sipariş No | Tutar | Sipariş Tarihi | Kargo Durumu | Test Senaryosu |
|-----------|-------|---------------|-------------|---------------|
| 1001 | ₺150.00 | 2 gün önce | DELIVERED | Temel iade akışı |
| 1002 | ₺250.00 | 5 gün önce | DELIVERED | Orta fiyatlı ürün |
| 1003 | ₺89.99 | 1 gün önce | SHIPPED | Yeni sipariş (henüz teslim edilmedi) |
| 1004 | ₺399.90 | 10 gün önce | DELIVERED | Eski sipariş |
| 1005 | ₺599.00 | 3 gün önce | DELIVERED | Yüksek fiyatlı ürün |
| 1006 | ₺129.50 | 1 hafta önce | SHIPPED | Kargo yolda |
| 1007 | ₺799.99 | 15 gün önce | DELIVERED | İade süresi test |
| 1008 | ₺199.00 | 4 gün önce | DELIVERED | Standart iade |
| 1009 | ₺449.00 | 20 gün önce | DELIVERED | 3 haftalık sipariş |
| 1010 | ₺99.90 | 6 gün önce | SHIPPED | Düşük fiyatlı + kargo yolda |
| 1011 | ₺1299.00 | 12 gün önce | DELIVERED | Premium ürün |
| 1012 | ₺349.50 | 8 gün önce | DELIVERED | 1 haftalık sipariş |
| 1013 | ₺899.00 | 25 gün önce | DELIVERED | Neredeyse 1 aylık |
| 1014 | ₺179.90 | 9 gün önce | SHIPPED | Kargo yolda |
| 1015 | ₺2499.00 | 30 gün önce | DELIVERED | En pahalı + 1 aylık |

---

## 🧪 Test Senaryoları

### 1. Temel Portal Akışı
**Adımlar:**
1. Portal'a git: `http://localhost:3001/portal`
2. Sipariş No: `1001`
3. Email: `test@test.com`
4. İade nedeni seç: "Fikir Değişikliği"
5. Not ekle: "Bedenimi beğenmedim"
6. Fotoğraf yükle (opsiyonel)
7. İade talebini gönder

**Beklenen Sonuç:**
- ✅ Success sayfası görüntülenir
- ✅ İade takip numarası gösterilir
- ✅ "İade Durumunu Görüntüle" butonu çalışır

---

### 2. Mevcut İade Kontrolü
**Adımlar:**
1. Portal'dan `1001` için iade oluştur
2. Portal'a tekrar git
3. Aynı sipariş numarasını gir: `1001`
4. Email: `test@test.com`

**Beklenen Sonuç:**
- ✅ Hata mesajı YOK
- ✅ Otomatik olarak tracking sayfasına yönlendirilir
- ✅ Mevcut iade durumu gösterilir

---

### 3. Farklı İade Nedenleri
**Test Edilecek Nedenler:**
- ✅ Hasarlı Ürün (`1002`) - Fotoğraf zorunlu
- ✅ Yanlış Beden (`1003`) - Fotoğraf opsiyonel
- ✅ Fikir Değişikliği (`1004`) - Fotoğraf yok
- ✅ Kusurlu Ürün (`1005`) - Fotoğraf zorunlu
- ✅ Açıklamaya Uygun Değil (`1006`) - Fotoğraf zorunlu
- ✅ Diğer (`1007`) - Not zorunlu

**Her Biri İçin:**
1. İade oluştur
2. Success sayfasını kontrol et
3. Tracking sayfasında timeline'ı kontrol et
4. Dashboard'da "Portal İade Talepleri" tab'ında görün

---

### 4. Fotoğraf Yükleme
**Adımlar:**
1. `1008` için iade başlat
2. "Hasarlı Ürün" seç
3. Upload sayfasında 3 fotoğraf yükle
4. Önizlemeyi kontrol et
5. Fotoğrafı sil ve tekrar yükle
6. İade talebi gönder

**Beklenen Sonuç:**
- ✅ Fotoğraflar önizlemede görünür
- ✅ Silme butonu çalışır
- ✅ Maximum 5 fotoğraf yüklenebilir
- ✅ Success sayfasında "3 fotoğraf yüklendi" notu var

---

### 5. İade Takip - Direkt Link
**Adımlar:**
1. `1009` için iade oluştur
2. Success sayfasında tracking numarasını kopyala
3. Yeni sekmede `/track` sayfasına git
4. Tracking numarasını yapıştır
5. "Sorgula" butonuna tıkla

**Beklenen Sonuç:**
- ✅ İade detayları görüntülenir
- ✅ Timeline doğru gösterilir
- ✅ Sipariş bilgileri eksiksiz
- ✅ Yazdırma butonu çalışır

---

### 6. Dashboard - Portal İadeleri
**Adımlar:**
1. 5 farklı sipariş için portal'dan iade oluştur (1010-1014)
2. Dashboard'a git: `/refunds`
3. "Portal İade Talepleri" tab'ına tıkla
4. Filtreleme yap:
   - Arama: "1012" yaz
   - Durum: "Beklemede" seç
   - Tarih: "Son 7 Gün" seç
5. Filtreleri temizle

**Beklenen Sonuç:**
- ✅ 5 portal iadesi görünür
- ✅ Manuel iadeler bu tab'da YOK
- ✅ Filtreler çalışıyor
- ✅ KPI kartları doğru sayıları gösteriyor

---

### 7. Dashboard - Manuel İade Oluşturma
**Adımlar:**
1. Dashboard'a git: `/refunds`
2. "Manuel İade Kayıtları" tab'ına tıkla
3. "Yeni İade Kaydı" butonuna tıkla
4. Sipariş No: `1015` ara
5. İade kaydı oluştur

**Beklenen Sonuç:**
- ✅ Sipariş bulunur
- ✅ Manuel iade oluşturulur
- ✅ "Manuel İade Kayıtları" tab'ında görünür
- ✅ "Portal İade Talepleri" tab'ında GÖRÜNMEMELİ

---

### 8. Sipariş Bulunamadı
**Adımlar:**
1. Portal'a git
2. Sipariş No: `9999` (olmayan)
3. Email: `test@test.com`

**Beklenen Sonuç:**
- ✅ "Sipariş bulunamadı" hatası
- ✅ Kırmızı uyarı gösterilir
- ✅ Form temizlenmez (tekrar dene)

---

### 9. Yanlış Email
**Adımlar:**
1. Portal'a git
2. Sipariş No: `1001`
3. Email: `wrong@email.com`

**Beklenen Sonuç:**
- ✅ "Email adresi sipariş ile eşleşmiyor" hatası
- ✅ Form temizlenmez

---

### 10. İade Durumu Timeline
**Adımlar:**
1. `1002` için iade oluştur
2. Tracking sayfasına git
3. Timeline'ı kontrol et:
   - İlk event: "Müşteri iade talebi oluşturdu"
   - Fotoğraf varsa: "X adet fotoğraf yüklendi"

**Beklenen Sonuç:**
- ✅ Timeline en yeniden en eskiye doğru
- ✅ Tarih ve saat doğru
- ✅ Oluşturan kişi: müşteri email

---

### 11. Toplu İade Test
**Adımlar:**
1. 10 farklı sipariş için portal'dan iade oluştur
2. Her birini farklı nedenle oluştur
3. Dashboard'da "Portal İade Talepleri" tab'ını aç
4. Excel İndir butonuna tıkla

**Beklenen Sonuç:**
- ✅ 10 iade başarıyla oluşturulur
- ✅ Hepsi "Portal İade Talepleri" tab'ında
- ✅ Excel dosyası indirilir
- ✅ Excel'de tüm iadeler var

---

### 12. Aynı Anda İki Müşteri
**Senaryo:** İki farklı tarayıcıda test

**Tarayıcı 1:**
1. `1005` için iade başlat
2. Reason sayfasında bekle

**Tarayıcı 2:**
1. `1005` için iade başlat
2. İade talebi gönder

**Tarayıcı 1 Devam:**
1. İade talebi göndermeye çalış

**Beklenen Sonuç:**
- ✅ Tarayıcı 2 başarılı
- ✅ Tarayıcı 1'de tracking sayfasına yönlendirilir (çünkü iade zaten var)

---

### 13. Kargo Yolda Siparişler
**Test Edilecek Siparişler:** `1003`, `1006`, `1010`, `1014` (SHIPPED statüsünde)

**Adımlar:**
1. Her bir sipariş için iade oluştur
2. İade nedeni: "Hasarlı Ürün"
3. Tracking'de sipariş detaylarını kontrol et

**Beklenen Sonuç:**
- ✅ İade oluşturulabilir (kargo yolda olsa bile)
- ✅ Paket durumu: "SHIPPED" gösterilir
- ✅ Uyarı mesajı: "Ürün henüz size ulaşmadı"

---

### 14. En Eski Sipariş (30 Gün)
**Adımlar:**
1. `1015` (30 gün önceki sipariş) için iade oluştur
2. İade nedeni: "Fikir Değişikliği"

**Beklenen Sonuç:**
- ✅ İade oluşturulur
- ✅ Uyarı mesajı: "İade süresi sona eriyor" (opsiyonel - v2)

---

### 15. En Pahalı Sipariş
**Adımlar:**
1. `1015` için iade oluştur (₺2499.00)
2. İade nedeni: "Kusurlu Ürün"
3. Fotoğraf yükle
4. Tracking sayfasını kontrol et

**Beklenen Sonuç:**
- ✅ Tutar doğru gösterilir: ₺2,499.00
- ✅ Timeline'da tüm eventler var
- ✅ Fotoğraf notu eklendi

---

## 🎯 Ekstra Test Noktaları

### Responsive Design
- [ ] Mobilde portal kullanımı
- [ ] Tablet'te tracking sayfası
- [ ] Desktop'ta dashboard

### Tarayıcı Uyumluluğu
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Performance
- [ ] Portal loading süresi < 2 saniye
- [ ] Tracking sayfası loading < 1 saniye
- [ ] Dashboard tab switching smooth

### Accessibility
- [ ] Keyboard navigation çalışıyor
- [ ] Screen reader uyumlu
- [ ] Contrast oranları yeterli

---

## ✅ Hızlı Test Checklist

Temel akışı hızlıca test etmek için:

1. [ ] `1001` ile portal'dan iade oluştur
2. [ ] Success sayfası çalışıyor
3. [ ] Tracking sayfası çalışıyor
4. [ ] `1001` ile tekrar dene → tracking'e yönlendirildi
5. [ ] `/track` sayfası çalışıyor
6. [ ] Dashboard "Portal İade Talepleri" tab'ında görünüyor
7. [ ] Excel export çalışıyor
8. [ ] `1002` ile manuel iade oluştur (dashboard'dan)
9. [ ] Manuel ve portal iadeler ayrı tab'larda
10. [ ] Filtreler çalışıyor

---

## 🐛 Bilinen Sorunlar / Limitasyonlar

1. **Fotoğraf Saklama:** Şu an fotoğraflar gerçekten storage'a kaydedilmiyor (mock)
2. **Email Bildirimleri:** Email gönderimi henüz aktif değil
3. **Kargo Takip:** Gerçek kargo entegrasyonu yok
4. **Real-time:** WebSocket yok, manuel refresh gerekiyor

---

## 📞 Test Sonuçlarını Raporlama

Her test sonunda:
```markdown
### Test: [Test Adı]
- **Tarih:** [Tarih/Saat]
- **Tarayıcı:** [Chrome/Firefox/Safari/Edge]
- **Sonuç:** ✅ PASS / ❌ FAIL
- **Notlar:** [Varsa özel notlar]
- **Screenshot:** [Varsa ekran görüntüsü]
```

---

**Son Güncelleme:** 24 Ekim 2025
**Test Verileri Geçerlilik:** Development mode (`DEV_MODE=true`)
