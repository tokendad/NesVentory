# Contributing to NesVentory

Thank you for your interest in contributing to NesVentory! This document outlines the contribution process and our branching strategy.

## 📋 Table of Contents

- [Branching Strategy](#branching-strategy)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Version Management](#version-management)
- [Release Process](#release-process)

## 🌳 Branching Strategy

NesVentory uses **main** as the primary branch for releases and deployments:

```
Feature branches → main (production)
```

### Branch Descriptions

| Branch | Purpose | Protected |
|--------|---------|-----------|
| `main` | Primary production branch for releases | Yes |
| `feature/*` | Development branches for new features and fixes | No |

### Branch Flow Diagram

```
Feature branches           main
      │                     │
      ├────────────────────►│
      │         PR + CI     │
      │                     │
      │                     ▼
      │              Docker Hub (latest)
      │              GitHub Release
```

## 💻 Development Workflow

### Starting New Work

1. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Commit with conventional commits**:
   ```bash
   git commit -m "feat(component): add new feature"
   ```

4. **Push and create a PR** to `main`:
   ```bash
   git push origin feature/your-feature-name
   ```

### Releasing

When features are ready for release:

1. Create a PR from feature branch → `main`
2. Ensure all CI checks pass
3. Add appropriate labels:
   - `enhancement` or `feature` → Minor version bump
   - `bug` or `fix` → Patch version bump
   - `breaking` → Major version bump
4. Get code review approval
5. Merge the PR

**After merge:**
- Use the manual Release Workflow to create a new release
- Docker image can be published to Docker Hub with version tags using the docker-publish workflow

## 📝 Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages:

```
<type>(<optional-scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix or performance improvement | Patch |
| `docs` | Documentation only | None |
| `style` | Code style (formatting, etc.) | None |
| `refactor` | Code refactoring | None |
| `test` | Adding/updating tests | None |
| `chore` | Maintenance tasks | None |
| `ci` | CI/CD changes | None |
| `build` | Build system changes | None |
| `revert` | Revert previous commit | Varies |

> **Note:** For performance improvements, use the `fix` label to trigger a patch version bump.
### Examples

```bash
# Feature
git commit -m "feat(auth): add Google OAuth support"

# Bug fix
git commit -m "fix(api): handle missing user gracefully"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: remove deprecated endpoints"
```

## 🔄 Pull Request Process

### For Feature/Bug PRs (to `main`)

1. Fill out the PR template
2. Add appropriate labels
3. Request review from maintainers
4. Address review feedback
5. Ensure all CI checks pass
6. Squash and merge

### Required Labels

Add one of these labels to trigger version bumping:

- **`enhancement`** or **`feature`**: Minor version bump (x.Y.0)
- **`bug`** or **`fix`**: Patch version bump (x.y.Z)
- **`breaking`**: Major version bump (X.0.0)

## 📊 Version Management

### Version Files

Version is tracked in multiple files that must stay synchronized:

- `VERSION` - Single source of truth
- `package.json` - Node.js version field
- `CHANGELOG.md` - Version history
- `README.md` - Version badge

### Automatic Version Bumping

When a PR is merged to `main`:

1. GitHub Actions reads PR labels
2. Version is bumped in `VERSION` and `package.json`
3. CHANGELOG.md is updated with PR details
4. README.md version badge is updated
5. Changes are committed with `[skip ci]`

### Manual Version Bumping

For manual version updates:

```bash
# Bump patch version (1.2.3 → 1.2.4)
python .github/scripts/bump_version.py bug

# Bump minor version (1.2.3 → 1.3.0)
python .github/scripts/bump_version.py enhancement
```

## 🚀 Release Process

### Automated Release Flow

```
PR merged to main
       ↓
Version bumped automatically
       ↓
PR created: main → stable
       ↓
PR merged
       ↓
├── GitHub Release created
└── Docker Hub push triggered
       ↓
    Tags created:
    - latest
    - 6.0.0 (full version)
    - 6.0 (major.minor)
    - 6 (major)
```

### Docker Hub Tags

Each release creates these Docker tags:

| Tag | Description |
|-----|-------------|
| `latest` | Most recent release from main branch |
| `6.0.0` | Specific version |
| `6.0` | Latest patch for this minor |
| `6` | Latest for this major version |

### Release Notes

Release notes are automatically generated from:
- CHANGELOG.md entries for the version
- PR titles and descriptions

## 🔧 Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for container testing)

### Local Development

```bash
# Clone the repository
git clone https://github.com/tokendad/NesVentory.git
cd NesVentory

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r backend/requirements.txt

# Start development servers
npm run dev  # Frontend
cd backend && uvicorn app.main:app --reload  # Backend
```

## ❓ Questions?

- **Issues**: [GitHub Issues](https://github.com/tokendad/NesVentory/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tokendad/NesVentory/discussions)

Thank you for contributing to NesVentory! 🏠📦
