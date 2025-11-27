# NesVentory v3.1.0

Release tag: https://github.com/tokendad/NesVentory/releases/tag/v3.1.0

## Summary
v3.1.0 is a minor feature release focused on productivity and discoverability improvements. It brings enhanced tagging, search refinements, and a CSV export capability that makes reporting and offline workflows easier.

## Highlights
- Improved search relevance and new quick-filters for common fields.
- CSV export of current list views (including applied filters).
- Tag management enhancements: bulk tag add/remove and inline tag editing.
- Attachment preview improvements and better error messaging for uploads.
- Dependency updates addressing security advisories.

## What's new
- CSV export: Export filtered lists to CSV for reporting or archival.
- Tagging: Add/remove tags from item cards and bulk tag operations for selections.
- Search: Relevance tweaks and new shortcuts for common searches.
- Previews: Inline previews for images and common document types.

## Improvements
- Faster list rendering and reduced API paging latency.
- Clearer validation and network error messages for upload/export flows.
- Updated dependencies for improved security posture.

## Bug fixes
- Fixed duplicate items appearing under certain filter combinations.
- Fixed timeouts and failed uploads on slower networks.
- Resolved a UI crash when editing items with many custom fields.

## Upgrade checklist
- Pull v3.1.0 code/image.
- Redeploy or restart with the new code.
- Verify search, tagging, CSV export, and attachment previews in staging.
