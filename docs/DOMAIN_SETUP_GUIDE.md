# 🌐 Domain Setup Guide - Subdomain Sistemi

Bu döküman, subdomain tabanlı multi-tenant portal sistemini kurmak için adım adım talimatlar içerir.

---

## 📋 Ön Gereksinimler

- ✅ Bir domain adı (örn: `alanadı.com`)
- ✅ Vercel hesabı (ücretsiz)
- ✅ Domain registrar erişimi (GoDaddy, Namecheap, vs.)

---

## 🚀 Adım Adım Kurulum

### 1. Domain Satın Al (Eğer yoksa)

Önerilen sağlayıcılar:
- **GoDaddy**: https://godaddy.com (Türkçe destek)
- **Namecheap**: https://namecheap.com (Ucuz)
- **Porkbun**: https://porkbun.com (En ucuz)

**Fiyat:** ~$10-15/yıl

**Domain seç:**
- ✅ Kısa ve akılda kalıcı
- ✅ `.com` uzantısı önerilir
- ✅ Türkçe karakter YOK

---

### 2. Vercel'e Domain Ekle

#### 2.1 Vercel Dashboard'a Git

```
https://vercel.com/dashboard
→ Projenizi seçin (refund-v1)
→ Settings → Domains
```

#### 2.2 Domain Ekle

```
Add Domain → alanadı.com yazın → Add
```

Vercel size **nameserver'ları** verecek:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**ÖNEMLİ:** Bu nameserver'ları not alın! ✍️

---

### 3. Domain Registrar'da Nameserver Değiştir

#### GoDaddy'de:

```
1. GoDaddy hesabınıza girin
2. My Products → Domains
3. alanadı.com → Manage
4. Additional Settings → Manage DNS
5. Nameservers → Change
6. Custom Nameservers seçin
7. Nameserver'ları ekleyin:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
8. Save
```

#### Namecheap'te:

```
1. Namecheap hesabınıza girin
2. Domain List → alanadı.com → Manage
3. Nameservers → Custom DNS
4. Nameserver'ları ekleyin:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
5. Save
```

#### Porkbun'da:

```
1. Porkbun hesabınıza girin
2. Domain Management → alanadı.com
3. Nameservers → Custom
4. Nameserver'ları ekleyin:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
5. Update
```

---

### 4. DNS Propagation Bekle

**Süre:** 2-48 saat (genelde 2-6 saat)

**Kontrol et:**
```bash
# Terminal'de:
nslookup alanadı.com

# Veya online tool:
https://dnschecker.org
→ alanadı.com yazın
→ NS record seçin
→ Global propagation kontrol et
```

**Başarılı olduğunda:**
```
alanadı.com
nameserver = ns1.vercel-dns.com
nameserver = ns2.vercel-dns.com
```

---

### 5. Vercel'de Wildcard Domain Ekle

DNS propagation tamamlandıktan sonra:

```
Vercel Dashboard → Settings → Domains → Add Domain
```

**Eklenecek domain'ler:**

1. **Root domain:** `alanadı.com`
2. **WWW subdomain:** `www.alanadı.com`
3. **Wildcard subdomain:** `*.alanadı.com` ← **EN ÖNEMLİ!**

**Wildcard domain eklerken:**
- Vercel otomatik SSL sertifikası oluşturacak
- Tüm subdomainler (ornek-magaza.alanadı.com, test.alanadı.com, vb.) çalışacak
- 5-10 dakika sürebilir

**Başarılı olduğunda:**
```
✅ alanadı.com           Valid
✅ www.alanadı.com       Valid
✅ *.alanadı.com         Valid
```

---

### 6. Environment Variables Güncelle

#### 6.1 Local Development (.env.local)

```bash
# .env.local dosyasını düzenle
NEXT_PUBLIC_BASE_DOMAIN=localhost
NEXT_PUBLIC_DEPLOY_URL=http://localhost:3001
```

#### 6.2 Production (Vercel)

```bash
# Vercel Dashboard
Settings → Environment Variables

Add:
NEXT_PUBLIC_BASE_DOMAIN = alanadı.com
NEXT_PUBLIC_DEPLOY_URL = https://alanadı.com
```

**Veya CLI ile:**
```bash
vercel env add NEXT_PUBLIC_BASE_DOMAIN production
# Value: alanadı.com

vercel env add NEXT_PUBLIC_DEPLOY_URL production
# Value: https://alanadı.com
```

---

### 7. Production Deployment

```bash
# Git commit (eğer değişiklik varsa)
git add .
git commit -m "feat: add subdomain system"
git push origin main

# Vercel otomatik deploy eder

# Veya manuel deploy:
vercel --prod
```

**Deployment süresi:** 2-5 dakika

---

### 8. Test Et

#### 8.1 Wildcard Domain Test

```bash
# Browser'da aç:
https://test-magaza.alanadı.com
https://deneme.alanadı.com
https://ornek.alanadı.com

# Hepsi çalışmalı!
```

#### 8.2 SSL Test

```bash
# Browser'da:
https://test-magaza.alanadı.com

# ✅ Yeşil kilit simgesi görmeli
# ❌ "Your connection is not secure" görürsen:
#    → 5-10 dakika bekle (SSL oluşuyor)
#    → Sayfayı yenile
```

#### 8.3 Middleware Test

```bash
# Developer console'da (F12):
# Network tab → Headers

# Görmeli:
x-merchant-id: merchant-xxx
x-subdomain: test-magaza
```

---

## 🎯 Merchant Onboarding Flow

### Yeni Merchant Ekleme:

```
1. Merchant OAuth ile giriş yapar
   ↓
2. OAuth callback otomatik subdomain oluşturur:
   - Store name: "Örnek Mağaza A.Ş."
   - Subdomain: "ornek-magaza-as"
   ↓
3. Merchant settings'e gider:
   - Portal URL: https://ornek-magaza-as.alanadı.com
   - Kopyala butonu ile müşterilere paylaşır
   ↓
4. Müşteriler portal'a erişir:
   - https://ornek-magaza-as.alanadı.com
   - İade talebi oluşturur
```

**SEN HİÇBİR ŞEY YAPMAZSIN!** ✅ Tamamen otomatik!

---

## 🔧 Troubleshooting

### Problem 1: Wildcard domain eklenemiyor

**Hata:** "Failed to add domain"

**Çözüm:**
1. Nameserver'ların propagate olduğundan emin ol
   ```bash
   nslookup alanadı.com
   # ns1.vercel-dns.com görmeli
   ```
2. 24-48 saat bekle
3. Vercel support ile iletişime geç

---

### Problem 2: SSL sertifikası oluşmuyor

**Hata:** "Your connection is not secure"

**Çözüm:**
1. 10-15 dakika bekle (SSL oluşması zaman alır)
2. Browser cache temizle (Ctrl+Shift+Delete)
3. Vercel Dashboard → Domains → SSL'i kontrol et
4. Eğer hala sorun varsa:
   ```bash
   # Vercel CLI
   vercel domains inspect *.alanadı.com
   ```

---

### Problem 3: Subdomain çalışmıyor

**Hata:** "Portal Bulunamadı"

**Çözüm:**
1. Middleware'in çalıştığından emin ol:
   ```bash
   # Terminal'de:
   curl -I https://test.alanadı.com
   # x-merchant-id header'ı olmalı
   ```
2. Database'de merchant'ın subdomain'i var mı kontrol et:
   ```sql
   SELECT subdomain, subdomainStatus FROM "Merchant";
   ```
3. Merchant'ın `subdomainStatus` = 'active' olmalı

---

### Problem 4: DNS propagation çok yavaş

**Hata:** 48 saattir propagate olmadı

**Çözüm:**
1. DNS cache temizle:
   ```bash
   # Mac
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns

   # Linux
   sudo systemd-resolve --flush-caches
   ```
2. Farklı DNS kullan (Google DNS):
   - 8.8.8.8
   - 8.8.4.4
3. Domain registrar'a ticket aç

---

## 📊 DNS Kayıtları (Referans)

### Vercel Nameservers Kullanımı (Önerilen)

```
Domain Registrar'da:
Type: NS (Nameserver)
Host: @
Value:
  ns1.vercel-dns.com
  ns2.vercel-dns.com
```

### Vercel'de Otomatik Oluşan Kayıtlar:

```
Type: A
Host: @
Value: 76.76.21.21 (Vercel IP)

Type: A
Host: www
Value: 76.76.21.21

Type: CNAME
Host: *
Value: cname.vercel-dns.com
```

**Not:** Bunları manuel eklemeye gerek yok! Vercel otomatik yapar.

---

## ✅ Checklist

### Initial Setup:
- [ ] Domain satın alındı
- [ ] Vercel'e domain eklendi
- [ ] Nameserver'lar değiştirildi (registrar'da)
- [ ] DNS propagation tamamlandı (2-48 saat)
- [ ] Wildcard domain eklendi (*.alanadı.com)
- [ ] SSL sertifikası oluştu (yeşil kilit)
- [ ] Environment variables güncellendi
- [ ] Production deployment yapıldı

### Testing:
- [ ] https://alanadı.com çalışıyor
- [ ] https://www.alanadı.com çalışıyor
- [ ] https://test.alanadı.com çalışıyor (wildcard)
- [ ] Middleware merchantId ekliyor (x-merchant-id header)
- [ ] Settings sayfasında subdomain görünüyor
- [ ] Yeni merchant onboarding'de subdomain oluşuyor

---

## 🆘 Destek

### Vercel Destek:
- https://vercel.com/support
- support@vercel.com

### Domain Registrar Destek:
- **GoDaddy:** https://support.godaddy.com
- **Namecheap:** https://support.namecheap.com
- **Porkbun:** https://porkbun.com/support

### DNS Tools:
- **DNS Checker:** https://dnschecker.org
- **What's My DNS:** https://whatsmydns.net
- **DNS Propagation:** https://dnspropagation.net

---

## 📚 Ek Kaynaklar

- [Vercel Domains Documentation](https://vercel.com/docs/domains)
- [Wildcard Domains Guide](https://vercel.com/blog/wildcard-domains)
- [DNS Basics](https://www.cloudflare.com/learning/dns/what-is-dns/)

---

**Başarılar! 🎉**

Sorularınız için: Bu dökümanı okuyun veya Vercel/Domain registrar desteğine başvurun.
