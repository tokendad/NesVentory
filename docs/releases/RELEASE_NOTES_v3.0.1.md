# NesVentory v3.0.1

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v3.0.1

## Summary
v3.0.1 is a patch release that fixes regressions and improves stability following the v3.0.0 release. Install this update if you observed issues with pagination, uploads, or certain UI flows in v3.0.0.

## Highlights
- Patch for pagination edge cases.
- Fixed attachment upload reliability on slow connections.
- Several small UI crash fixes and accessibility improvements.

## Bug fixes
- Resolved pagination bug which caused incomplete pages on the last page.
- Fixed intermittent attachment upload failures and timeout handling.
- Addressed UI crash when saving items with many custom fields.
- Minor accessibility fixes in modal dialogs and forms.

## Notes
- No breaking changes; safe to upgrade in most environments. As always, test in staging if you rely on custom integrations.
