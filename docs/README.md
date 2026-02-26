# A1 Garage Door - Backend Documentation

Complete documentation for the A1 Garage Door booking system backend.

---

## 📚 Documentation Index

### Core Documentation
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - High-level system architecture overview
- **[API.md](API.md)** - Complete REST API documentation with all endpoints
- **[DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md)** - Database schema and table structures
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Database setup and migration instructions

### Integration & Deployment
- **[WIDGET_EMBED_GUIDE.md](WIDGET_EMBED_GUIDE.md)** - Complete guide for embedding the booking widget on external websites
- **[REDIS_CONFIGURATION.md](REDIS_CONFIGURATION.md)** - Redis setup, queue configuration, and worker management
- **[birlasoft-integration-plan.md](birlasoft-integration-plan.md)** - Birlasoft Cloud Run integration requirements
- **[current-servicetitan-integration.md](current-servicetitan-integration.md)** - Current ServiceTitan integration implementation

### Handoff Documentation
- **[COMPREHENSIVE_HANDOFF.md](COMPREHENSIVE_HANDOFF.md)** - Complete system walkthrough for TMV/Birlasoft teams
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - Development roadmap and planning

---

## 🎯 Quick Start Guides

### For Frontend Developers
Start here to integrate the booking widget on your website:
1. Read [WIDGET_EMBED_GUIDE.md](WIDGET_EMBED_GUIDE.md)
2. Check [examples/abc-com-integration-demo.html](examples/abc-com-integration-demo.html)
3. Review [API.md](API.md) for endpoint details

### For Backend Developers
Start here to understand the API and backend architecture:
1. Read [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
2. Review [API.md](API.md) for all endpoints
3. Check [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md)

### For DevOps/Infrastructure
Start here to deploy and configure:
1. Read [DATABASE_SETUP.md](DATABASE_SETUP.md)
2. Review [REDIS_CONFIGURATION.md](REDIS_CONFIGURATION.md)
3. Check [COMPREHENSIVE_HANDOFF.md](COMPREHENSIVE_HANDOFF.md) for production requirements

---

## 📁 Examples

Working integration examples are available in the [examples/](examples/) directory:

- **[abc-com-integration-demo.html](examples/abc-com-integration-demo.html)** - Modal overlay integration (recommended for "BOOK NOW" buttons)
- **[inline-iframe-demo.html](examples/inline-iframe-demo.html)** - Inline iframe for dedicated booking pages
- **[README.md](examples/README.md)** - Testing instructions and demo guide

---

## 🔗 Related Documentation

### Frontend Documentation
See `garage-door-frontend/docs/` for:
- Static vs Dynamic Data Mapping
- Complete Booking Flow Guide
- Frontend API Integration

### Project Planning
See `.claude/` directory for:
- Implementation plans
- Work logs
- Client handoff planning

---

## 📞 Support

- **API Issues:** Check [API.md](API.md) troubleshooting section
- **Integration Help:** See [WIDGET_EMBED_GUIDE.md](WIDGET_EMBED_GUIDE.md) troubleshooting
- **Technical Issues:** Create GitHub issue or contact development team

---

**Last Updated:** 2026-02-26
**Version:** 1.0.0
