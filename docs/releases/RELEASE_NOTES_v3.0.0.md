# NesVentory v3.0.0

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v3.0.0

## Summary
v3.0.0 is the v3 major release that includes a redesigned front-end, API improvements, and a stronger foundation for future features. This release focuses on performance, consistency, and developer experience, and includes several breaking changes compared to v2.x.

## Highlights
- Modernized UI with improved responsiveness and accessibility.
- Reworked API endpoints and data shapes for clearer semantics and extensibility.
- TypeScript migration for frontend/backend surfaces where applicable.
- Significant performance improvements in list rendering and search.
- Improved developer tooling and local environment scripts.
- Docker build and Compose improvements for easier deployments.

## Breaking changes
- API changes: some endpoints and response shapes have changed to support the new model — review API clients and integrations.
- Config reorganizations: a few environment variables were renamed and configuration layout was updated.
- Upgrade your clients and scripts to be compatible with the new API/fields.

## What's new
- UI: refreshed item cards, improved navigation, and clearer edit flows.
- API: consolidated item endpoints and introduced more robust filtering options.
- Developer: improved local dev tooling, test scripts, and TypeScript type coverage.
- Deployment: smaller, faster Docker images and updated Compose files.

## Improvements
- Faster search and list operations via query optimizations and caching.
- Better error handling and user-facing messages.
- Updated core dependencies and security patches.

## Bug fixes
- Fixed a number of UI regressions from earlier releases.
- Reliability fixes for attachment uploads and concurrent edits.

## Upgrade checklist (short)
- Backup DB & storage before upgrading.
- Review API integrations and environment variable changes.
- Redeploy with v3.0.0 and validate critical flows.
