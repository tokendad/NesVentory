# Fix for "Workflow does not exist or does not have a workflow_dispatch trigger" Error

## Problem Identified

The 5.0 docker publish workflow file in the `5.0-upgrade` branch is named without a `.yml` extension:
- Current name: `.github/workflows/5.0 docker publish` ❌
- Required name: `.github/workflows/publish-5.0.yml` ✓

GitHub Actions only recognizes workflow files that end with `.yml` or `.yaml`. Without the proper extension, the workflow is invisible to GitHub Actions, resulting in the error:
> "Workflow does not exist or does not have a workflow_dispatch trigger in this branch."

## Solution

**Rename the file in the `5.0-upgrade` branch:**

```bash
# In the 5.0-upgrade branch
cd .github/workflows/
git mv "5.0 docker publish" "publish-5.0.yml"
git commit -m "fix: rename workflow file to include .yml extension for GitHub Actions recognition"
git push origin 5.0-upgrade
```

## Manual Steps (If Preferred)

1. Switch to the `5.0-upgrade` branch on GitHub or locally
2. Navigate to `.github/workflows/`
3. Rename the file `5.0 docker publish` to `publish-5.0.yml`
4. Commit and push the change

## Verification

After applying the fix:

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. In the left sidebar, you should see "Publish Docker image (5.0 from 5.0-upgrade)"
4. Click **Run workflow** button
5. In the "Use workflow from" dropdown, select **5.0-upgrade**
6. The workflow should now be available to trigger ✓

## Why This Happens

GitHub Actions workflows must:
- Be located in `.github/workflows/` directory
- Have a `.yml` or `.yaml` file extension
- Contain a valid workflow definition

The file had the correct content and location but was missing the required `.yml` extension.

## Note

The `main` branch already has this workflow file properly named as `publish-5.0.yml`, which is why the issue only occurs when trying to trigger the workflow from the `5.0-upgrade` branch.
