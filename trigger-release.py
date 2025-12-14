#!/usr/bin/env python3
"""
Script to trigger the release-workflow.yml GitHub Actions workflow
to publish version 6.0.0 of NesVentory
"""

import json
import os
import sys
import urllib.request
import urllib.error

# Configuration
GITHUB_API_URL = "https://api.github.com"
REPO_OWNER = "tokendad"
REPO_NAME = "NesVentory"
WORKFLOW_FILE = "release-workflow.yml"
REF = "main"  # Branch to run the workflow on

# Release information for v6.0.0
# Note: This script is for reference. Since v6.0.0 is already prepared,
# use publish-v6.0.0.yml workflow instead of release-workflow.yml
WORKFLOW_INPUTS = {
    "bump_type": "patch",  # Would bump to 6.0.1 - use publish-v6.0.0.yml instead
    "release_title": "Major Release - Plugin Support, Maintenance, and Video Features",
    "release_notes": """This release consolidates all features from the 5.0 series:

🔌 **LLM Plugin System** - External LLM plugin support with priority-based fallback
🛠️ **Maintenance Management** - Comprehensive maintenance tracking with calendar view  
🎥 **Video Support** - Upload and manage video files for items
📦 **Unified Inventory Page** - All-in-one view with customizable display
⚙️ **System Settings Hub** - Consolidated configuration interface

See RELEASE_NOTES.md and docs/releases/RELEASE_NOTES_v6.0.0.md for complete details.""",
    "breaking_changes": "",
    "upgrade_notes": """If upgrading from version 4.x:
- Review the new unified Inventory page layout
- Check the new System Settings for configuration options
- Review PLUGINS.md if using external LLM services
- Maintenance tracking is now available in the sidebar

No database migration required. Fully compatible with 4.x and 5.x databases."""
}


def trigger_workflow(token):
    """
    Trigger the release workflow using GitHub API
    
    Args:
        token (str): GitHub Personal Access Token or GITHUB_TOKEN
        
    Returns:
        bool: True if successful, False otherwise
    """
    url = f"{GITHUB_API_URL}/repos/{REPO_OWNER}/{REPO_NAME}/actions/workflows/{WORKFLOW_FILE}/dispatches"
    
    payload = {
        "ref": REF,
        "inputs": WORKFLOW_INPUTS
    }
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}",
        "Content-Type": "application/json",
        "User-Agent": "NesVentory-Release-Script"
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 204:
                return True
            else:
                print(f"Unexpected response status: {response.status}")
                print(response.read().decode('utf-8'))
                return False
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """Main function"""
    print("=" * 60)
    print("NesVentory Release Workflow Trigger")
    print("=" * 60)
    print()
    print("⚠️  WARNING: This triggers release-workflow.yml which bumps version.")
    print("   For v6.0.0, use publish-v6.0.0.yml workflow instead!")
    print()
    print(f"Repository: {REPO_OWNER}/{REPO_NAME}")
    print(f"Workflow: {WORKFLOW_FILE}")
    print(f"Branch: {REF}")
    print()
    print("Release Information:")
    print(f"  Bump Type: {WORKFLOW_INPUTS['bump_type']}")
    print(f"  Title: {WORKFLOW_INPUTS['release_title']}")
    print()
    
    # Get GitHub token
    token = os.environ.get('GITHUB_TOKEN')
    
    if not token:
        print("ERROR: GITHUB_TOKEN environment variable not set")
        print()
        print("Please set the GITHUB_TOKEN environment variable:")
        print("  export GITHUB_TOKEN=your_token_here")
        print()
        print("Or run with:")
        print(f"  GITHUB_TOKEN=your_token python3 {sys.argv[0]}")
        print()
        print("You can create a token at:")
        print("  https://github.com/settings/tokens/new")
        print()
        print("Required scopes: repo, workflow")
        sys.exit(1)
    
    print("Triggering workflow...")
    print()
    
    if trigger_workflow(token):
        print("✓ Workflow triggered successfully!")
        print()
        print("Monitor the workflow run at:")
        print(f"  https://github.com/{REPO_OWNER}/{REPO_NAME}/actions/workflows/{WORKFLOW_FILE}")
        print()
        print("The workflow will:")
        print("  1. Bump the version")
        print("  2. Update VERSION, package.json, CHANGELOG.md, README.md")
        print("  3. Generate release notes")
        print("  4. Create a GitHub release")
        print("  5. Commit and push changes")
        print()
        return 0
    else:
        print("✗ Failed to trigger workflow")
        print()
        print("You can manually trigger the workflow at:")
        print(f"  https://github.com/{REPO_OWNER}/{REPO_NAME}/actions/workflows/{WORKFLOW_FILE}")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
