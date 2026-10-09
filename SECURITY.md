# Enterprise Security Blueprint & Policy

This platform is engineered adhering to OWASP Top 10 guidelines, Zero-Trust Architecture, and ISO/IEC 27001 secure development principles.

---

## 1. SQL Injection (SQLi) Defense
- **Implementation:** Parameterized queries, prepared statements, and strict schema validation in [database/schema.sql](database/schema.sql).
- **Control:** Raw SQL string concatenation is forbidden. All inputs are typed, length-checked, and sanitized before execution.

## 2. Cross-Site Scripting (XSS) Mitigation
- **Implementation:** Output encoding via `sanitizeText()` in [api/security-utils.js](api/security-utils.js) and contextual DOM manipulation (`textContent`, sanitized properties) in [index.html](index.html).
- **Control:** Zero unescaped `innerHTML` usage. Content Security Policy (CSP) enforces script origin restrictions.

## 3. Cross-Site Request Forgery (CSRF) Protection
- **Implementation:** Custom header verification (`X-Requested-With`, `X-CSRF-Token`) and strict origin/referrer matching in [api/book-plan.js](api/book-plan.js).
- **Control:** Mutation requests (POST/PUT/DELETE) reject untrusted origins. Cookies are configured with `SameSite=Strict; Secure`.

## 4. File Upload Validation
- **Implementation:** Multi-stage validation helper `validateFileUpload()` in [api/security-utils.js](api/security-utils.js).
- **Control:** Validates MIME type, file extension whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`), file size limit (5MB), and sanitizes filenames against directory traversal (`../`).

## 5. Broken Object Level Authorization (BOLA / IDOR) Defense
- **Implementation:** Strict multi-tenant isolation via `validateResourceOwnership()` in backend logic and database policies.
- **Control:** Direct object references (e.g., booking IDs) require matching authenticated user UUID or admin role.

## 6. Rate Limiting
- **Implementation:** In-memory sliding window limiter `checkRateLimit()` in [api/security-utils.js](api/security-utils.js).
- **Control:** Limits client IP addresses to 5 booking submissions per 15-minute window with HTTP 429 Retry-After headers.

## 7. Secure JWT Secrets & Cryptography
- **Implementation:** Cryptographic keys must be sourced exclusively from environment variables (`process.env.JWT_SECRET`) with $\ge$ 256-bit entropy.
- **Control:** Algorithm whitelist enforces `HS256` or `RS256` and strictly rejects the insecure `none` algorithm.

## 8. Server-Side API Isolation
- **Implementation:** Business logic, email dispatchers, and notification APIs run isolated in serverless functions under `/api/`.
- **Control:** No private API keys or database connection strings are exposed in client-side JavaScript bundles.

## 9. Secure Password Hashing
- **Implementation:** Argon2id (recommended) or bcrypt with work factor $\ge$ 12.
- **Control:** Plaintext passwords are never stored, logged, or transmitted insecurely.

## 10. Multi-Factor Authentication (MFA / TOTP)
- **Implementation:** Time-based One-Time Password (TOTP RFC 6238) standard support for administrative accounts.
- **Control:** High-privilege management operations require 2FA verification.

## 11. Tightened CORS Configuration
- **Implementation:** Explicit whitelist `isOriginAllowed()` matching trusted deployment domains in [api/security-utils.js](api/security-utils.js).
- **Control:** Rejects wildcards (`*`) when credentials are used, restricting allowed methods to `POST, OPTIONS`.

## 12. Removal of Auth Tokens from LocalStorage
- **Implementation:** Session tokens are delivered via `HttpOnly; Secure; SameSite=Strict` HTTP cookies.
- **Control:** Protects authentication tokens from client-side script inspection and DOM XSS theft.

## 13. Server-Side Permission Enforcement (RBAC)
- **Implementation:** Role-based access control evaluated exclusively on the server before dispatching data.
- **Control:** Client UI state is considered untrusted; backend verifies user capabilities for every mutation.

## 14. Row Level Security (RLS)
- **Implementation:** PostgreSQL / Supabase policies enabled on all tables in [database/schema.sql](database/schema.sql).
- **Control:** Database engine guarantees clients cannot access or modify records owned by other accounts.

## 15. Webhook Signature Verification
- **Implementation:** Constant-time HMAC-SHA256 verification `verifyWebhookSignature()` using `crypto.timingSafeEqual`.
- **Control:** Prevents timing attacks and rejects forged third-party webhooks.

## 16. Server-Side Request Forgery (SSRF) Defense
- **Implementation:** URL parser and IP blacklist `isSafeUrl()` blocking internal subnets (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
- **Control:** Prevents attackers from querying internal cloud metadata services or intranet servers.

## 17. Elimination of Exposed Source Maps
- **Implementation:** Production build flag `GENERATE_SOURCEMAP=false`.
- **Control:** Proprietary application source maps are not served publicly on production CDN endpoints.

## 18. Default Credentials Elimination
- **Implementation:** Zero hardcoded credentials or fallback administrative passwords in codebase.
- **Control:** Environment setup requires explicit secret initialization.

## 19. Sensitive Data Redaction from Logs (PII Scrubbing)
- **Implementation:** Recursive log sanitizer `scrubPII()` in [api/security-utils.js](api/security-utils.js).
- **Control:** Automatically masks email addresses, phone numbers, tokens, and passwords prior to log persistence.

## 20. Dependency Vulnerability Management
- **Implementation:** Automated vulnerability scanning (`npm audit`) and pinned dependencies.
- **Control:** Zero high/critical known CVEs permitted in the dependency tree.
