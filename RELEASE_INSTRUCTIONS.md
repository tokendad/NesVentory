# Release Publishing Instructions

This document explains how to publish a new release of NesVentory to GitHub.

## Current Version

The repository is currently at version **6.0.0** as indicated in:
- `VERSION` file
- `package.json`
- `RELEASE_NOTES.md`
- `docs/releases/RELEASE_NOTES_v6.0.0.md`
- `CHANGELOG.md`

## Release Workflow

NesVentory uses an automated GitHub Actions workflow (`release-workflow.yml`) to publish releases.

### How to Publish a Release

1. **Navigate to GitHub Actions**
   - Go to: https://github.com/tokendad/NesVentory/actions
   - Click on "Release Workflow" in the left sidebar

2. **Trigger the Workflow**
   - Click the "Run workflow" button (top right)
   - Select the branch (usually `main`)
   - Fill in the workflow parameters:

### Workflow Parameters

#### Required
- **bump_type**: Choose the version bump type
  - `patch` - for bug fixes (6.0.0 → 6.0.1)
  - `minor` - for new features (6.0.0 → 6.1.0)
  - `major` - for breaking changes (6.0.0 → 7.0.0)

#### Optional
- **release_title**: A descriptive title for the release (e.g., "Bug Fix Release", "Feature Release")
- **release_notes**: Describe changes, features, and fixes
- **breaking_changes**: List any breaking changes (leave empty if none)
- **upgrade_notes**: Instructions for upgrading (leave empty if none)

### What the Workflow Does

When triggered, the workflow will:

1. ✅ Read the current version from the `VERSION` file
2. ✅ Bump the version according to your selection
3. ✅ Update `VERSION` file with the new version
4. ✅ Update `package.json` version
5. ✅ Collect all merged PRs since the last release
6. ✅ Generate release documentation in `docs/releases/RELEASE_NOTES_v{NEW_VERSION}.md`
7. ✅ Update `CHANGELOG.md` with the new version entry
8. ✅ Update `RELEASE_NOTES.md` with the latest release information
9. ✅ Update `README.md` version badge (if present)
10. ✅ Commit all changes with message: `chore: release v{NEW_VERSION} [skip ci]`
11. ✅ Push the commit to the repository
12. ✅ Create a GitHub Release with tag `v{NEW_VERSION}`

### GitHub Release Details

The created GitHub release will include:
- Release title from your input
- Release notes from your input
- List of all merged PRs since the last release
- Breaking changes (if any)
- Upgrade notes (if any)
- Link to the full CHANGELOG.md
- Auto-generated release notes from GitHub

### Alternative: Manual Release Creation

If you prefer to create a release manually:

1. **Go to GitHub Releases**
   - Navigate to: https://github.com/tokendad/NesVentory/releases/new

2. **Fill in Release Information**
   - **Tag**: Create a new tag (e.g., `v6.0.1`, `v6.1.0`, `v7.0.0`)
   - **Release title**: Descriptive title for the release
   - **Description**: Copy content from `RELEASE_NOTES.md` or create custom notes

3. **Include Release Notes**
   - Copy the relevant content from `RELEASE_NOTES.md`
   - Or copy from `docs/releases/RELEASE_NOTES_v{VERSION}.md`
   - Include sections: Summary, New Features, Breaking Changes, Upgrade Notes

4. **Publish**
   - Click "Publish release"

### Docker Publishing

After publishing a GitHub release, you may want to publish Docker images:

1. **Navigate to GitHub Actions**
   - Go to: https://github.com/tokendad/NesVentory/actions
   - Click on "Publish to Docker Hub"

2. **Run the Workflow**
   - Click "Run workflow"
   - Optionally specify a custom tag
   - The workflow will automatically use the version from the `VERSION` file

The Docker workflow will:
- Build multi-platform images (amd64, arm64)
- Tag with: `latest`, `{VERSION}`, `{MAJOR.MINOR}`, `{MAJOR}`
- Push to Docker Hub at `neuman1812/nesventory`
- Update Docker Hub description from `DOCKERHUB.md`

## Example: Publishing Version 6.0.1 (Patch Release)

To publish a patch release for bug fixes:

1. Go to GitHub Actions → Release Workflow → Run workflow
2. Set parameters:
   - Branch: `main`
   - bump_type: `patch`
   - release_title: "Bug Fix Release"
   - release_notes: "Fixed login timeout issue and improved error handling"
   - breaking_changes: (leave empty)
   - upgrade_notes: (leave empty)
3. Click "Run workflow"

The workflow will:
- Update version from 6.0.0 to 6.0.1
- Update all documentation
- Create release v6.0.1 on GitHub with complete notes
- Include all merged PRs since v6.0.0

## Verifying the Release

After the workflow completes:

1. ✅ Check the GitHub Releases page: https://github.com/tokendad/NesVentory/releases
2. ✅ Verify the new release is listed with correct version
3. ✅ Verify release notes are complete and accurate
4. ✅ Check that the VERSION file is updated in the repository
5. ✅ Check that CHANGELOG.md has the new version entry
6. ✅ Optionally: Trigger Docker Hub publish workflow

## Current Release Status

**Version 6.0.0** is documented and ready. All release documentation is in place:

- ✅ `RELEASE_NOTES.md` - Contains v6.0.0 overview
- ✅ `docs/releases/RELEASE_NOTES_v6.0.0.md` - Detailed v6.0.0 notes
- ✅ `CHANGELOG.md` - Includes v6.0.0 entry (2025-12-14)
- ✅ `VERSION` file - Set to 6.0.0
- ✅ `package.json` - Version 6.0.0
- ✅ `README.md` - References v6.0.0

To publish the next release, follow the instructions above and choose the appropriate bump type.

## Notes

- The workflow uses `[skip ci]` in commit messages to avoid triggering CI on version bump commits
- The workflow requires `GITHUB_TOKEN` which is automatically provided by GitHub Actions
- Docker publishing requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets to be configured in the repository
- Release notes automatically include merged PRs since the last tagged release

## Questions?

For questions about releases, consult:
- This file (RELEASE_INSTRUCTIONS.md)
- `.github/workflows/release-workflow.yml` - The automated workflow
- `.github/workflows/docker-publish.yml` - Docker publishing workflow
- `CHANGELOG.md` - Full version history
