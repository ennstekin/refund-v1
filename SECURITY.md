# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in this project, please report it privately to the repository maintainers. Do **not** open a public GitHub issue.

**Reporting Methods:**
- Email: [Your security email]
- GitHub Security Advisories: Use the "Security" tab in this repository

We will acknowledge receipt of your report within 48 hours and provide a detailed response within 5 business days.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

---

## Security Best Practices

### 1. Environment Variables

**DO:**
- ✅ Store all secrets in environment variables
- ✅ Use `.env.local` for local development (never commit)
- ✅ Use Vercel dashboard or CLI for production secrets
- ✅ Use `echo -n` when adding env vars via CLI to prevent trailing newlines

**DON'T:**
- ❌ Never commit `.env`, `.env.local`, or `.env.production` files
- ❌ Never hardcode secrets in source code
- ❌ Never log sensitive data (tokens, passwords, API keys)
- ❌ Never expose secrets in error messages

**Example - Adding Production Variables:**
```bash
# Correct way (no newline)
echo -n "your_secret_value" | vercel env add SECRET_NAME production

# Incorrect way (adds newline - causes issues!)
vercel env add SECRET_NAME production <<< "your_secret_value"
```

### 2. Credential Rotation Schedule

| Credential Type | Rotation Frequency | Notes |
|----------------|-------------------|-------|
| Database Password | Every 90 days | Or immediately if compromised |
| JWT Secret | Every 6 months | Invalidates all existing tokens |
| OAuth Client Secret | As needed | Only rotate if compromised |
| Session Cookie Password | Every 6 months | Invalidates all sessions |
| Vercel Tokens | Every 12 months | Or when team member leaves |

### 3. Authentication & Authorization

**Implemented Security Layers:**

1. **OAuth 2.0 (ikas Platform)**
   - Authorization Code Flow with HMAC-SHA256 signature validation
   - Automatic token refresh via `onCheckToken`
   - Tokens stored encrypted in PostgreSQL

2. **JWT Tokens (Client ↔ Server)**
   - Short-lived (24 hours)
   - Contains: `merchantId` (sub), `authorizedAppId` (aud)
   - Validated on every API request

3. **Iron Session (Server-side)**
   - Encrypted session cookies
   - Secure, httpOnly, sameSite

4. **Database Security**
   - PostgreSQL with SSL (`sslmode=require`)
   - Prisma ORM (prevents SQL injection)
   - No raw queries

### 4. API Security

**Protected Endpoints:**
- `/api/ikas/*` - Requires JWT authentication
- `/api/refunds/*` - Requires JWT authentication
- `/api/settings/*` - Requires JWT authentication

**Public Endpoints:**
- `/api/public/*` - No JWT required (customer-facing)
- Input validation: Order number, email format
- Email verification: Must match order email

**Recommendations:**
- [ ] Add rate limiting to public endpoints (10 req/10s per IP)
- [ ] Implement CORS policy (whitelist ikas domains)
- [ ] Add request size limits
- [ ] Add API response caching (Redis/Vercel KV)

### 5. Code Security

**Dependencies:**
```bash
# Check for vulnerabilities
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Update dependencies
pnpm update
```

**Pre-commit Checks:**
- ESLint for code quality
- TypeScript for type safety
- No secrets in code (git pre-commit hook)

### 6. Development Mode

**⚠️ CRITICAL: DEV_MODE Must Be False in Production**

Development mode bypasses security checks and uses mock data.

**Check Production Setting:**
```bash
vercel env ls production | grep DEV_MODE
# Should be: DEV_MODE="false" or not set
```

**If DEV_MODE is true in production:**
```bash
# Remove or set to false
vercel env rm DEV_MODE production --yes
echo -n "false" | vercel env add DEV_MODE production

# Redeploy
vercel --prod
```

---

## Security Incident Response

### If Credentials Are Compromised:

1. **Immediate Actions (Within 1 hour):**
   - [ ] Rotate compromised credentials immediately
   - [ ] Review access logs for unauthorized access
   - [ ] Notify team members
   - [ ] Document the incident

2. **Short-term Actions (Within 24 hours):**
   - [ ] Identify how credentials were exposed
   - [ ] Fix the vulnerability
   - [ ] Update documentation
   - [ ] Implement additional security measures

3. **Long-term Actions (Within 1 week):**
   - [ ] Conduct security audit
   - [ ] Update security policies
   - [ ] Train team on security best practices
   - [ ] Implement automated security checks

### If .env File Is Committed to Git:

1. **DO NOT just delete the file and commit** - it will still be in git history!

2. **Remove from Git History:**
```bash
# Option A: BFG Repo-Cleaner (recommended)
java -jar bfg.jar --delete-files .env.production
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all

# Option B: git filter-repo
pip install git-filter-repo
git filter-repo --path .env.production --invert-paths
git push origin --force --all
```

3. **Rotate ALL credentials** in the exposed file immediately

4. **Update .gitignore** to prevent future leaks

5. **Notify team** to re-clone the repository

---

## Deployment Security Checklist

Before deploying to production:

### Environment Variables
- [ ] All secrets configured in Vercel (not in code)
- [ ] No trailing newlines in environment variables
- [ ] `NEXT_PUBLIC_DEPLOY_URL` points to production URL
- [ ] `DEV_MODE` is `false` or not set

### Authentication
- [ ] OAuth redirect URLs registered in ikas Developer Portal
- [ ] JWT secret is strong (32+ characters, random)
- [ ] Session cookie password is strong (32+ characters, random)
- [ ] Database uses SSL (`?sslmode=require` in connection string)

### Code Quality
- [ ] `pnpm build` succeeds locally
- [ ] `pnpm lint` passes
- [ ] No console.log statements with sensitive data
- [ ] No hardcoded secrets in code
- [ ] Dependencies up to date (`pnpm update`)
- [ ] No known vulnerabilities (`pnpm audit`)

### Git Repository
- [ ] `.env` files in `.gitignore`
- [ ] No secrets in git history
- [ ] Repository is private (or secrets are rotated if public)

---

## Security Tools & Resources

### Recommended Tools

| Tool | Purpose | Link |
|------|---------|------|
| **Vercel CLI** | Manage environment variables | `pnpm add -g vercel` |
| **BFG Repo-Cleaner** | Remove sensitive data from git history | https://rtyley.github.io/bfg-repo-cleaner/ |
| **git-secrets** | Prevent committing secrets | https://github.com/awslabs/git-secrets |
| **trufflehog** | Scan for secrets in git history | https://github.com/trufflesecurity/trufflehog |

### Security Scanning

```bash
# Dependency vulnerabilities
pnpm audit

# Git history secrets scan
npx trufflehog git file://. --only-verified

# Check for common security issues
npx eslint . --ext .ts,.tsx
```

---

## Contact

For security concerns, please contact:
- Repository Owner: [Your contact info]
- Security Team: [Security email]

---

**Last Updated:** 2025-01-24
**Version:** 1.0.0
