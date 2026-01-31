# Changelog

All notable changes to AUS Property Intelligence DB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project scaffolding with Turborepo monorepo structure
- Core packages: @aus-prop/shared, @aus-prop/db, @aus-prop/geo, @aus-prop/connectors, @aus-prop/observability
- NestJS API with Health endpoints and module structure
- Bull.js job queues with 8 job types configured
- PostgreSQL schema with 16 tables and PostGIS integration
- Zod schemas for all entity types
- Address parsing and fuzzy matching algorithms (Jaro-Winkler, Levenshtein)
- Convenience scoring with 4 presets (family, investor, student, retiree)
- Pluggable connector architecture for data source integration
- Docker Compose setup with PostgreSQL, Redis, and service definitions
- GitHub Actions CI/CD workflows (test, build)
- Comprehensive README with architecture diagrams
- Contributing guidelines and documentation

### In Progress

- Auth module implementation (JWT + magic links)
- User management module
- Property search and filtering
- Frontend pages and components
- Worker job logic
- Comprehensive test suite

### Planned

- ML-based price prediction model
- Advanced entity resolution with machine learning
- SMS alerts and Telegram integration
- Mobile app (React Native)
- GraphQL API layer
- Data export functionality
- Custom connector builder UI
- Analytics dashboard
- Webhook integrations

## [0.1.0] - 2025-01-XX

### Initial Release

- Core monorepo structure
- Database schema (16 tables)
- Shared packages and configurations
- API bootstrap
- Worker infrastructure
- Docker setup
- Documentation

[Unreleased]: https://github.com/yourusername/aus-property-intelligence-db/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/aus-property-intelligence-db/releases/tag/v0.1.0
