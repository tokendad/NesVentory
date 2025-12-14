# ⚡ TRIGGER WORKFLOW NOW - Quick Instructions

## ✅ All release materials are ready! Follow these simple steps:

### Step 1: Merge this PR (if not already merged)
This PR contains all the release materials and the workflow to publish v6.0.0.

### Step 2: Trigger the Workflow

**Option A: Trigger from the copilot/publish-new-release branch (Current)**

1. Go to: https://github.com/tokendad/NesVentory/actions/workflows/publish-v6.0.0.yml
2. You should see the "Publish Release v6.0.0" workflow
3. Click the **"Run workflow"** button (top right)
4. In the dropdown:
   - Select branch: `copilot/publish-new-release`
   - In the "confirm" field, type: `yes`
5. Click the green **"Run workflow"** button
6. Wait ~30-60 seconds for completion

**Option B: Trigger after merging to main (Recommended)**

1. Merge this PR to `main` branch first
2. Go to: https://github.com/tokendad/NesVentory/actions/workflows/publish-v6.0.0.yml
3. Click **"Run workflow"**
4. Select branch: `main`
5. Type `yes` in confirmation
6. Click **"Run workflow"**

**Option C: Auto-trigger on merge**

Simply merge this PR to `main` - the `auto-release-v6.0.0.yml` workflow will automatically publish the release!

### Step 3: Verify

Check the release was created:
https://github.com/tokendad/NesVentory/releases/tag/v6.0.0

---

## 🐛 Troubleshooting

**Can't see the workflow?**
- The workflow file must be on the target branch to appear
- This PR adds the workflow, so it's available on `copilot/publish-new-release`
- After merge to `main`, it will appear for the main branch too

**Workflow exists but can't trigger?**
- Only repository admins/maintainers can trigger workflows
- Make sure you have write access to the repository

**Want to do it manually instead?**
```bash
# Create and push tag
git checkout main  # or current branch with release materials
git tag -a v6.0.0 -F RELEASE_v6.0.0.md
git push origin v6.0.0

# Then create release at:
# https://github.com/tokendad/NesVentory/releases/new?tag=v6.0.0
# Copy content from RELEASE_v6.0.0.md
```

---

## 📋 What Will Happen

When you trigger the workflow, it will:

1. ✅ Check if v6.0.0 release already exists (skip if it does)
2. ✅ Verify RELEASE_v6.0.0.md and VERSION files exist
3. ✅ Create git tag `v6.0.0` with full release notes
4. ✅ Push the tag to GitHub
5. ✅ Create GitHub Release with:
   - Title: "NesVentory v6.0.0 - Major Release"
   - Full release notes from RELEASE_v6.0.0.md
   - Marked as latest release
   - Auto-generated release notes included
6. ✅ Display success message with links

**Duration:** ~30-60 seconds

**Result:** v6.0.0 release published with complete release notes! 🎉

---

## 📦 After Publishing

Optionally publish Docker images:

1. Go to: https://github.com/tokendad/NesVentory/actions/workflows/docker-publish.yml
2. Click "Run workflow"
3. Select branch: `main`
4. Click "Run workflow"

This publishes:
- `neuman1812/nesventory:latest`
- `neuman1812/nesventory:6.0.0`
- `neuman1812/nesventory:6.0`
- `neuman1812/nesventory:6`

---

## 🎯 TL;DR - Fastest Path

1. Go to: https://github.com/tokendad/NesVentory/actions/workflows/publish-v6.0.0.yml
2. Click "Run workflow"
3. Select branch (copilot/publish-new-release or main after merge)
4. Type "yes"
5. Click "Run workflow"
6. Done! 🚀

---

**Everything is ready. Just click the button! ✨**
