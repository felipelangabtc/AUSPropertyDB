# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in AUS Property Intelligence DB, please **DO NOT** open a public issue. Instead, please email security@example.com with:

1. **Description** of the vulnerability
2. **Affected components** (api, worker, connectors, etc.)
3. **Steps to reproduce** the issue
4. **Potential impact** assessment
5. **Suggested fix** (if you have one)

We will acknowledge your report within 48 hours and work with you on a fix.

## Security Best Practices

### Data Protection

- **Encryption in transit**: All API endpoints use HTTPS (enforced in production)
- **Encryption at rest**: Sensitive data (API keys, passwords) encrypted in database
- **Personal data**: Minimal PII collection (only required for alerts)
- **Data retention**: 90-day default retention, configurable per user
- **Anonymization**: Address data aggregated to suburb level for analytics

### Access Control

- **Authentication**: JWT tokens + refresh token rotation
- **Authorization**: RBAC with three roles (user, analyst, admin)
- **Session management**: 24-hour token expiry, optional 2FA for admin
- **API keys**: Per-connector API key isolation, rotated quarterly

### Input Validation

- **All user inputs** validated with Zod schemas
- **SQL injection prevention**: Prisma parameterized queries
- **XSS prevention**: Input sanitization + CSP headers
- **CSRF protection**: Token validation for state-changing operations

### Dependency Management

- **Automated scanning**: Dependabot configured for npm/lock file updates
- **Vulnerability disclosure**: All dependencies tracked in SBOM
- **Pinned versions**: Production dependencies use exact semver versions
- **Quarterly audits**: `npm audit` run before releases

### Secrets Management

- **Environment variables**: All secrets in `.env` (never committed)
- **Rotation**: API keys rotated every 90 days
- **Scope**: Each service has isolated credentials
- **Audit logging**: All credential access logged

### Infrastructure Security

- **Network**: Services isolated via Docker internal network
- **Database**: PostgreSQL auth required, least-privilege user roles
- **Redis**: Auth token required, disabled dangerous commands
- **Firewall**: API rate limiting (100 req/min per user)
- **Monitoring**: All failed auth attempts logged and alerted

### Compliance

- **Data privacy**: GDPR and Privacy Act (Australia) compliant
- **Audit trails**: All data modifications logged with user/timestamp
- **Right to deletion**: User data deletion via admin dashboard
- **Right to export**: User data export in JSON format
- **ToS enforcement**: All scraped data respects source ToS

## Known Security Considerations

### Third-Party Connectors

- Connectors are responsible for respecting robots.txt and ToS
- Connector authors must validate all scraped data
- Rate limiting per connector prevents abuse
- All connectors logged for audit purposes

### User Data

- Email addresses stored for alerts (required)
- Search history stored for personalization (optional, user-controlled)
- No payment information stored (uses Stripe Connect)
- All data encrypted with AES-256

### Geolocation Data

- Coordinates stored at suburb level (not exact address)
- IP-based geolocation not used (privacy respecting)
- Historical location data archived after 90 days
- Heatmap generation uses aggregated data

## Security Changelog

### Implemented Security Measures

- ✅ HTTPS/TLS enforcement in production
- ✅ JWT-based authentication
- ✅ RBAC authorization
- ✅ Zod input validation
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting middleware
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Audit logging
- ✅ Secrets encryption
- ✅ Dependency scanning
- ✅ CSP headers

### Future Security Improvements

- [ ] Web Application Firewall (WAF)
- [ ] DDoS protection (Cloudflare)
- [ ] Advanced threat detection (Snyk)
- [ ] Penetration testing (quarterly)
- [ ] Bug bounty program
- [ ] Red team exercises
- [ ] SIEM integration
- [ ] Hardware security keys for admin

## Compliance Frameworks

- **GDPR**: Personal data processing with valid legal basis
- **Privacy Act**: Australian privacy principles compliance
- **OWASP Top 10**: Protection against common vulnerabilities
- **CWE Top 25**: Mitigation of most critical weaknesses
- **SOC 2 Type II**: Planned for enterprise offering

## Security Testing

```bash
# Dependency audit
npm audit

# Type checking (prevents some vulnerabilities)
pnpm type-check

# Linting with security rules
pnpm lint

# SAST with SonarQube (future)
pnpm sonar

# Penetration testing (quarterly)
# Managed by external security firm
```

## Responsible Disclosure

We follow the [Coordinated Vulnerability Disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html) model:

1. **Report** to security@example.com
2. **Acknowledge** receipt within 48 hours
3. **Assess** severity (CVSS score)
4. **Develop** fix in private branch
5. **Verify** fix with reporter
6. **Release** patch update
7. **Disclose** vulnerability in release notes (with credit)

## Security Contacts

- **Security Team**: security@example.com
- **Security Officer**: security-officer@example.com
- **Emergency**: +61-2-XXXX-XXXX (after hours)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [NestJS Security](https://docs.nestjs.com/security/overview)
- [Prisma Security](https://www.prisma.io/docs/concepts/security)

---

Last updated: 2025-01-XX
