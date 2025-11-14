# 🔒 Subdomain Multi-Tenant Güvenlik Analizi

## Tarih: 14 Kasım 2025

Bu doküman, subdomain-based multi-tenant sistemimizin güvenlik risklerini ve alınan önlemleri detaylandırır.

---

## 🔴 KRİTİK GÜVENLİK RİSKLERİ

### 1. **Subdomain Takeover Attack**

**Risk Seviyesi**: 🔴 YÜKSEK

**Açıklama**:
Bir merchant app'i sildiğinde veya subdomain'ini değiştirdiğinde, eski subdomain başkası tarafından alınabilir.

**Senaryo**:
```
1. Merchant A: paen.enestekin.com (100 müşteri)
2. Merchant A appı kaldırır
3. Merchant B yeni hesap açar, "paen" subdomain'ini alır
4. Merchant B, Merchant A'nın eski müşterilerine erişir
5. Phishing, data leak, reputation damage
```

**Mevcut Koruması**:
```prisma
model Merchant {
  subdomain            String?   @unique
  subdomainStatus      String    @default("pending") // pending, active, suspended
  subdomainChangedAt   DateTime?
  subdomainChangeCount Int       @default(0)
}
```

**Sorunlar**:
- ❌ `subdomainStatus = "suspended"` durumda subdomain yeniden kullanılabilir
- ❌ Merchant silme durumu handle edilmiyor
- ❌ Subdomain soft-delete mekanizması yok

**ÖNERİLEN ÇÖZÜM**:

```typescript
// 1. Subdomain'i kalıcı olarak reserve et
model SubdomainHistory {
  id         String   @id @default(cuid())
  subdomain  String   @unique
  merchantId String
  usedFrom   DateTime
  usedUntil  DateTime?
  status     String   // active, retired, blacklisted

  @@index([subdomain])
}

// 2. Subdomain değiştirme/silme kuralları
- Merchant silinirse → subdomain "retired" olur (60 gün)
- 60 gün sonra → "blacklisted" (kalıcı yasaklı)
- Subdomain değiştirme: Max 1 kez, 30 gün cooldown
```

**ACİL EYLEM**:
```bash
# Suspended subdomain'leri blacklist'e al
UPDATE "Merchant"
SET "subdomainStatus" = 'blacklisted'
WHERE "subdomainStatus" = 'suspended';
```

---

### 2. **Cookie Scope / Session Leakage**

**Risk Seviyesi**: 🔴 YÜKSEK

**Açıklama**:
Wildcard domain cookie'leri (`domain=.enestekin.com`) tüm subdomain'lerde paylaşılır.

**Senaryo**:
```javascript
// paen.enestekin.com
document.cookie = "session=abc123; domain=.enestekin.com"; // 🔴 YANLIŞ

// evil.enestekin.com
console.log(document.cookie); // "session=abc123" ← Cross-tenant leak!
```

**Mevcut Koruması**:
✅ `iron-session` kullanıyoruz, default olarak subdomain-specific cookie
✅ `.domain` set edilmiyor

**Verification**:
```typescript
// src/lib/session.ts
// iron-session otomatik olarak cookie'yi mevcut subdomain'e özgü yapıyor
// Cookie: subdomain=paen → sadece paen.enestekin.com'da geçerli
```

**ÖNERİLEN İYİLEŞTİRME**:
```typescript
// Cookie attributes açıkça belirt
cookieOptions: {
  secure: true,        // HTTPS only
  httpOnly: true,      // XSS protection
  sameSite: 'strict',  // CSRF protection
  path: '/',
  domain: undefined,   // Subdomain-specific (NO wildcard)
}
```

**ACİL EYLEM**:
✅ Mevcut implementation güvenli
⚠️ Manual cookie set edilmediğinden emin ol

---

### 3. **XSS via Malicious Subdomain**

**Risk Seviyesi**: 🟡 ORTA

**Açıklama**:
Saldırgan kendi subdomain'i üzerinden XSS saldırısı yapabilir.

**Senaryo**:
```javascript
// evil.enestekin.com (saldırganın subdomain'i)
<script>
  // 1. Phishing
  window.location = "https://paen.enestekin.com/portal?ref=evil";

  // 2. UI Redressing
  document.write('<iframe src="https://paen.enestekin.com"></iframe>');

  // 3. Social Engineering
  alert("paen.enestekin.com size ödeme iade etti!");
</script>
```

**Mevcut Koruması**:
```javascript
// next.config.js - CSP Headers
headers: [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self' https://*.myikas.com"
  }
]
```

**Sorunlar**:
- ❌ CSP sadece frame-ancestors (iframe koruması)
- ❌ script-src, style-src gibi direktifler yok
- ❌ Subdomain validation yeterince strict değil

**ÖNERİLEN ÇÖZÜM**:

```typescript
// 1. Comprehensive CSP
headers: [{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.myikas.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.myikas.com",
    "frame-src 'self' https://*.myikas.com",
    "frame-ancestors 'self' https://*.myikas.com https://*.ikas.com",
  ].join('; ')
}]

// 2. Subdomain validation sıkılaştır
static BLOCKED_PATTERNS = [
  /^(admin|api|www|dashboard)/,
  /phish/i,
  /hack/i,
  /evil/i,
  /test.*test/i, // test-test-test gibi spam
];
```

**ACİL EYLEM**:
```typescript
// SubdomainHelpers'a güvenlik kontrolü ekle
static isSubdomainSafe(subdomain: string): boolean {
  // 1. Length check
  if (subdomain.length < 3 || subdomain.length > 63) return false;

  // 2. Pattern check
  if (this.BLOCKED_PATTERNS.some(pattern => pattern.test(subdomain))) {
    return false;
  }

  // 3. Consecutive dashes
  if (/--/.test(subdomain)) return false;

  // 4. Only alphanumeric + dash
  if (!/^[a-z0-9-]+$/.test(subdomain)) return false;

  return true;
}
```

---

### 4. **DNS Rebinding Attack**

**Risk Seviyesi**: 🟡 ORTA

**Açıklama**:
Saldırgan DNS kaydını değiştirerek trafiği farklı bir IP'ye yönlendirebilir.

**Senaryo**:
```
1. evil.enestekin.com → DNS: 1.2.3.4 (saldırganın sunucusu)
2. Müşteri evil.enestekin.com'a gider
3. Saldırgan DNS'i değiştirir → 5.6.7.8 (Vercel IP)
4. Browser cache'inden eski IP'yi kullanır
5. Saldırgan MITM attack yapar
```

**Mevcut Koruması**:
✅ Vercel DNS management
✅ HTTPS (TLS certificate validation)

**ÖNERİLEN İYİLEŞTİRME**:
```typescript
// 1. HSTS Preload
headers: [{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
}]

// 2. Subdomain DNS validation
- Vercel otomatik DNS validation yapıyor
- Subdomain create edildiğinde DNS check et
```

---

### 5. **Subdomain Enumeration**

**Risk Seviyesi**: 🟢 DÜŞÜK

**Açıklama**:
Saldırgan tüm subdomain'leri keşfedebilir.

**Senaryo**:
```bash
# Subdomain brute force
for i in {a..z}; do
  curl -I "https://$i.enestekin.com" 2>/dev/null | grep "200 OK"
done

# DNS enumeration
dig @8.8.8.8 enestekin.com ANY
```

**Mevcut Koruması**:
- ⚠️ Subdomain'ler public (gizlenmesi mümkün değil)
- ⚠️ Rate limiting var ama DNS level'de değil

**ÖNERİLEN İYİLEŞTİRME**:
```typescript
// 1. Cloudflare DNS Proxy
- DNS queries rate limit
- DDoS protection

// 2. Robots.txt
User-agent: *
Disallow: /

// 3. No directory listing
- Subdomain'leri public API'de listeleme
```

---

### 6. **Homograph Attack (IDN Spoofing)**

**Risk Seviyesi**: 🟡 ORTA

**Açıklama**:
Görsel olarak benzer karakterlerle subdomain oluşturma.

**Senaryo**:
```javascript
// Orijinal
paen.enestekin.com

// Homograph
раen.enestekin.com  // 'p' değil, Cyrillic 'р' (U+0440)
pаen.enestekin.com  // 'a' değil, Cyrillic 'а' (U+0430)
```

**Mevcut Koruması**:
✅ `slugify` kullanıyoruz, sadece ASCII karakterler

**Verification**:
```typescript
// src/helpers/subdomain-helpers.ts
slugify(storeName, {
  lower: true,
  strict: true,  // ✅ Sadece [a-z0-9-] karakterler
  locale: 'tr',
})
```

**ÖNERİLEN İYİLEŞTİRME**:
```typescript
// Additional validation
static validateSubdomain(subdomain: string): boolean {
  // Ensure only ASCII lowercase
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    throw new Error('Only lowercase ASCII allowed');
  }

  // Check for confusables
  const confusables = ['0o', 'il', 'rn', 'vv'];
  if (confusables.some(c => subdomain.includes(c))) {
    console.warn('Subdomain contains confusable characters');
  }

  return true;
}
```

---

## ✅ MEVCUT GÜVENLİK ÖNLEMLERİ

### 1. Database Level
```prisma
✅ subdomain @unique           // Duplicate prevention
✅ subdomainStatus tracking    // Lifecycle management
✅ RestrictedSubdomain model   // Blacklist system
```

### 2. Middleware Level
```typescript
✅ Subdomain extraction
✅ System subdomain filtering
✅ Header injection (x-subdomain)
```

### 3. API Level
```typescript
✅ Subdomain validation
✅ Merchant isolation check
✅ portalEnabled check
✅ subdomainStatus = 'active' check
```

### 4. Rate Limiting
```typescript
✅ IP-based rate limiting
✅ Per-endpoint limits:
   - verify-order: 10/min
   - submit-refund: 5/min
   - track-refund: 20/min
```

### 5. Cookie Security
```typescript
✅ iron-session (encrypted)
✅ httpOnly: true
✅ secure: true (production)
✅ Subdomain-specific (no wildcard)
```

---

## 🚨 ACİL YAPILMASI GEREKENLER

### Priority 1 (Kritik - 1 hafta)
1. **Subdomain Lifecycle Management**
   - [ ] Deleted/suspended subdomain'leri blacklist'e al
   - [ ] SubdomainHistory table oluştur
   - [ ] 60 günlük cooldown period ekle

2. **Comprehensive CSP**
   - [ ] script-src, style-src, img-src direktifleri ekle
   - [ ] unsafe-inline minimize et
   - [ ] Nonce-based CSP kullan

### Priority 2 (Yüksek - 2 hafta)
3. **Subdomain Validation**
   - [ ] isSubdomainSafe() fonksiyonu ekle
   - [ ] BLOCKED_PATTERNS listesi genişlet
   - [ ] Real-time validation frontend'de

4. **Audit Logging**
   - [ ] Subdomain değişikliklerini logla
   - [ ] Suspicious activity detection
   - [ ] Alert system (email/slack)

### Priority 3 (Orta - 1 ay)
5. **DNS Security**
   - [ ] HSTS Preload list'e ekle
   - [ ] CAA DNS records ekle
   - [ ] DNSSEC enable et

6. **Monitoring**
   - [ ] Subdomain enumeration detection
   - [ ] Failed login attempts tracking
   - [ ] Rate limit violation alerts

---

## 📊 GÜVENLİK SKOR KARTI

| Kategori | Mevcut Durum | Hedef | Öncelik |
|----------|--------------|-------|---------|
| Subdomain Takeover | 🟡 Orta | 🟢 Yüksek | P1 |
| Cookie Security | 🟢 Yüksek | 🟢 Yüksek | ✅ |
| XSS Protection | 🟡 Orta | 🟢 Yüksek | P1 |
| DNS Security | 🟡 Orta | 🟢 Yüksek | P3 |
| Rate Limiting | 🟢 Yüksek | 🟢 Yüksek | ✅ |
| Audit Logging | 🔴 Düşük | 🟢 Yüksek | P2 |

**Genel Skor**: 🟡 **7/10** (İyi ama iyileştirmeler gerekli)

---

## 🔗 Kaynaklar

- [OWASP Multi-Tenancy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multitenant_Architecture_Cheat_Sheet.html)
- [Subdomain Takeover](https://0xpatrik.com/subdomain-takeover/)
- [DNS Rebinding](https://en.wikipedia.org/wiki/DNS_rebinding)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Son Güncelleme**: 14 Kasım 2025
**Yazar**: Security Analysis via Claude Code
**Durum**: ⚠️ Action Required
