#!/bin/bash
# Script to create GitHub Release for v6.0.0
# This script can be run to create the release using multiple methods
#
# Usage:
#   ./create-release-v6.0.0.sh [method]
#
# Methods:
#   auto    - Try all methods automatically (default)
#   workflow - Trigger the release-workflow.yml
#   gh      - Use gh CLI to create release
#   api     - Use curl to call GitHub API
#   manual  - Show manual instructions

set -e

VERSION="6.0.0"
TAG="v${VERSION}"
RELEASE_TITLE="NesVentory v${VERSION} - Major Release"
RELEASE_NOTES_FILE="RELEASE_v6.0.0.md"
REPO_OWNER="tokendad"
REPO_NAME="NesVentory"
WORKFLOW_FILE="release-workflow.yml"

METHOD="${1:-auto}"

# Functions
print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
    echo ""
}

print_success() {
    echo "✓ $1"
}

print_error() {
    echo "✗ $1"
}

print_info() {
    echo "ℹ $1"
}

check_requirements() {
    print_header "Checking Requirements"
    
    # Check if we're in the right directory
    if [ ! -f "VERSION" ]; then
        print_error "VERSION file not found. Please run this script from the repository root."
        exit 1
    fi
    print_success "Found VERSION file"
    
    # Check if the release notes file exists
    if [ ! -f "${RELEASE_NOTES_FILE}" ]; then
        print_error "${RELEASE_NOTES_FILE} not found."
        exit 1
    fi
    print_success "Found release notes file: ${RELEASE_NOTES_FILE}"
    
    # Check current version
    CURRENT_VERSION=$(cat VERSION | tr -d '[:space:]')
    print_info "Current version: ${CURRENT_VERSION}"
}

create_tag() {
    # Check if tag already exists
    if git rev-parse "${TAG}" >/dev/null 2>&1; then
        print_info "Tag ${TAG} already exists locally"
        return 0
    fi
    
    print_info "Creating git tag ${TAG}..."
    if git tag -a "${TAG}" -F "${RELEASE_NOTES_FILE}"; then
        print_success "Created tag ${TAG}"
        return 0
    else
        print_error "Failed to create tag ${TAG}"
        return 1
    fi
}

push_tag() {
    print_info "Pushing tag to GitHub..."
    if git push origin "${TAG}" 2>&1; then
        print_success "Tag pushed successfully"
        return 0
    else
        print_error "Failed to push tag"
        return 1
    fi
}

trigger_workflow() {
    print_header "Method 1: Trigger Release Workflow"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "GITHUB_TOKEN not set"
        print_info "Set GITHUB_TOKEN environment variable and try again"
        return 1
    fi
    
    print_info "Triggering release-workflow.yml on main branch..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches" \
        -d '{
            "ref": "main",
            "inputs": {
                "bump_type": "patch",
                "release_title": "Major Release - Plugin Support, Maintenance, and Video Features",
                "release_notes": "Version 6.0.0 consolidates all features from the 5.0 series including LLM plugin system, maintenance management, video support, unified inventory page, and system settings hub.",
                "breaking_changes": "",
                "upgrade_notes": "If upgrading from version 4.x: Review the new unified Inventory page layout and System Settings."
            }
        }')
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "204" ]; then
        print_success "Workflow triggered successfully!"
        print_info "Monitor at: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}"
        return 0
    else
        print_error "Failed to trigger workflow (HTTP $HTTP_CODE)"
        echo "$RESPONSE" | head -n-1
        return 1
    fi
}

use_gh_cli() {
    print_header "Method 2: Use GitHub CLI"
    
    if ! command -v gh >/dev/null 2>&1; then
        print_error "gh CLI not found"
        return 1
    fi
    
    if ! gh auth status >/dev/null 2>&1; then
        print_error "gh CLI not authenticated"
        print_info "Run: gh auth login"
        return 1
    fi
    
    create_tag || return 1
    push_tag || return 1
    
    print_info "Creating release on GitHub..."
    if gh release create "${TAG}" \
        --title "${RELEASE_TITLE}" \
        --notes-file "${RELEASE_NOTES_FILE}" \
        --latest; then
        print_success "Release created successfully!"
        print_info "View at: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${TAG}"
        return 0
    else
        print_error "Failed to create release"
        return 1
    fi
}

use_api() {
    print_header "Method 3: Use GitHub API"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "GITHUB_TOKEN not set"
        return 1
    fi
    
    create_tag || return 1
    push_tag || return 1
    
    print_info "Creating release via API..."
    
    # Read release notes
    NOTES=$(cat "${RELEASE_NOTES_FILE}" | jq -Rs .)
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases" \
        -d "{
            \"tag_name\": \"${TAG}\",
            \"name\": \"${RELEASE_TITLE}\",
            \"body\": ${NOTES},
            \"draft\": false,
            \"prerelease\": false
        }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "201" ]; then
        print_success "Release created successfully!"
        HTML_URL=$(echo "$RESPONSE" | head -n-1 | jq -r '.html_url')
        print_info "View at: ${HTML_URL}"
        return 0
    else
        print_error "Failed to create release (HTTP $HTTP_CODE)"
        echo "$RESPONSE" | head -n-1
        return 1
    fi
}

show_manual() {
    print_header "Manual Release Instructions"
    
    echo "Since automated methods are not available, please follow these steps:"
    echo ""
    echo "1. Create and push the git tag:"
    echo "   git tag -a ${TAG} -F ${RELEASE_NOTES_FILE}"
    echo "   git push origin ${TAG}"
    echo ""
    echo "2. Go to GitHub and create the release:"
    echo "   https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/new?tag=${TAG}"
    echo ""
    echo "3. Fill in the release form:"
    echo "   - Title: ${RELEASE_TITLE}"
    echo "   - Description: Copy content from ${RELEASE_NOTES_FILE}"
    echo "   - Check 'Set as the latest release'"
    echo ""
    echo "4. Click 'Publish release'"
    echo ""
    echo "5. Optionally, trigger Docker Hub publish:"
    echo "   https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/docker-publish.yml"
    echo ""
}

# Main logic
print_header "NesVentory Release v${VERSION}"
print_info "Repository: ${REPO_OWNER}/${REPO_NAME}"
print_info "Tag: ${TAG}"
print_info "Method: ${METHOD}"

check_requirements

case "${METHOD}" in
    workflow)
        trigger_workflow && exit 0 || exit 1
        ;;
    gh)
        use_gh_cli && exit 0 || exit 1
        ;;
    api)
        use_api && exit 0 || exit 1
        ;;
    manual)
        show_manual
        exit 0
        ;;
    auto)
        print_info "Trying all available methods..."
        
        # Try workflow first (preferred for this workflow-based setup)
        if trigger_workflow 2>/dev/null; then
            print_success "Release process initiated via workflow!"
            exit 0
        fi
        
        # Try gh CLI
        if use_gh_cli 2>/dev/null; then
            print_success "Release created via gh CLI!"
            exit 0
        fi
        
        # Try API
        if use_api 2>/dev/null; then
            print_success "Release created via API!"
            exit 0
        fi
        
        # All methods failed, show manual instructions
        print_error "All automated methods failed"
        show_manual
        exit 1
        ;;
    *)
        print_error "Unknown method: ${METHOD}"
        echo "Usage: $0 [auto|workflow|gh|api|manual]"
        exit 1
        ;;
esac
