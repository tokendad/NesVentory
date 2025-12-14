# How to Publish v6.0.0 Release - Quick Guide

## 🎯 Goal
Publish NesVentory version 6.0.0 to GitHub Releases with complete release notes.

## ✅ What's Already Prepared

All release materials are ready:
- ✅ VERSION file is set to 6.0.0
- ✅ RELEASE_NOTES.md contains v6.0.0 information
- ✅ docs/releases/RELEASE_NOTES_v6.0.0.md contains detailed notes
- ✅ CHANGELOG.md updated with v6.0.0 entry
- ✅ package.json version is 6.0.0
- ✅ README.md references v6.0.0
- ✅ RELEASE_v6.0.0.md created with complete release details
- ✅ Workflows created to automate the release

## 🚀 Option 1: Use the Manual Workflow (RECOMMENDED)

This is the easiest method!

### Steps:

1. **Merge this PR** to the `main` branch (if not already merged)

2. **Go to GitHub Actions**:
   ```
   https://github.com/tokendad/NesVentory/actions/workflows/publish-v6.0.0.yml
   ```

3. **Click "Run workflow"**:
   - Select branch: `main` (or the branch with these changes)
   - Type "yes" in the confirmation field
   - Click the green "Run workflow" button

4. **Wait for completion** (should take < 1 minute)

5. **Verify the release**:
   ```
   https://github.com/tokendad/NesVentory/releases/tag/v6.0.0
   ```

That's it! The workflow will:
- Create and push the v6.0.0 tag
- Create the GitHub release with full release notes from RELEASE_v6.0.0.md
- Mark it as the latest release

## 🔄 Option 2: Automatic on Merge

If you merge this PR to `main`, the `auto-release-v6.0.0.yml` workflow will automatically:
- Detect that VERSION is 6.0.0 and RELEASE_v6.0.0.md exists
- Create the v6.0.0 tag
- Publish the release

No manual action needed after merge!

## 🛠️ Option 3: Use the Bash Script

If you prefer command line:

```bash
# Make sure you're on the main branch with these changes
git checkout main
git pull

# Run the script (requires GitHub CLI authentication)
./create-release-v6.0.0.sh auto

# OR trigger with specific method:
./create-release-v6.0.0.sh workflow  # Trigger via API
./create-release-v6.0.0.sh gh        # Use gh CLI
./create-release-v6.0.0.sh api       # Use curl + API
./create-release-v6.0.0.sh manual    # Show manual instructions
```

## 📋 Option 4: Manual Release (Last Resort)

If automated methods don't work:

1. **Create and push tag**:
   ```bash
   git tag -a v6.0.0 -F RELEASE_v6.0.0.md
   git push origin v6.0.0
   ```

2. **Go to GitHub**:
   ```
   https://github.com/tokendad/NesVentory/releases/new?tag=v6.0.0
   ```

3. **Fill in the form**:
   - Title: `NesVentory v6.0.0 - Major Release`
   - Description: Copy content from `RELEASE_v6.0.0.md`
   - Check "Set as the latest release"

4. **Click "Publish release"**

## 🐋 After Publishing: Docker Images

Once the release is published, optionally publish Docker images:

1. **Go to Docker publish workflow**:
   ```
   https://github.com/tokendad/NesVentory/actions/workflows/docker-publish.yml
   ```

2. **Click "Run workflow"**:
   - Branch: `main`
   - Leave other fields default
   - Click "Run workflow"

This will build and publish Docker images tagged as:
- `neuman1812/nesventory:latest`
- `neuman1812/nesventory:6.0.0`
- `neuman1812/nesventory:6.0`
- `neuman1812/nesventory:6`

## ✨ What the Release Includes

The v6.0.0 release includes:

**🔌 LLM Plugin System**
- External LLM plugin support for AI-powered item detection
- Priority-based plugin system with automatic fallback to Gemini AI

**🛠️ Maintenance Management**
- Comprehensive maintenance tracking system
- Recurring maintenance schedules and calendar view

**🎥 Video Support**
- Video upload and management for items

**📦 Unified Inventory Page**
- All-in-one view combining stats, locations, and items
- Interactive location browser with dynamic filtering

**⚙️ System Settings Hub**
- Consolidated theme, locale, and service status
- Tabbed interface for better organization

## 📝 Notes

- v6.0.0 consolidates all features from the 5.0 series
- Fully backward compatible with 4.x and 5.x databases
- No database migration required
- Multi-platform Docker images (amd64, arm64)

## 🆘 Troubleshooting

### Workflow not appearing?
- Make sure this PR is merged to `main` first
- Wait a few seconds for GitHub to index the new workflows
- Refresh the Actions page

### Workflow fails?
- Check if release already exists (delete it first if needed)
- Verify VERSION file contains "6.0.0"
- Check workflow run logs for detailed error messages

### Need help?
- See `RELEASE_INSTRUCTIONS.md` for comprehensive documentation
- Check `.github/workflows/publish-v6.0.0.yml` for workflow details
- Use `./create-release-v6.0.0.sh manual` for step-by-step instructions

---

**Quick Command Reference:**

```bash
# View release materials
cat RELEASE_v6.0.0.md

# Create release with script
./create-release-v6.0.0.sh auto

# Manually create and push tag
git tag -a v6.0.0 -F RELEASE_v6.0.0.md && git push origin v6.0.0

# Check if release exists
gh release view v6.0.0

# Trigger workflow via API (requires GITHUB_TOKEN)
python3 trigger-release.py
```

---

**Ready to publish? Use Option 1 above! 🚀**
