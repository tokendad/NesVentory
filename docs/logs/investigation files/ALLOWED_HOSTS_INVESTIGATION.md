# Issue #463: Make ALLOWED_HOSTS Configurable

**Date**: 2026-01-26
**Issue**: #463
**Related Issues**: #290 (PR that added URL upload), #284 (original feature request)
**Status**: IMPLEMENTED

---

## Problem Statement

When users try to add a document from an external URL, they receive the error:
```
Failed to save file: 400: Host not allowed
```

The `ALLOWED_HOSTS` filter is hardcoded in `backend/app/routers/documents.py` with a placeholder value `{"example.com"}`, making the URL document upload feature effectively unusable for most real-world scenarios.

---

## Current Implementation Analysis

### Location
`backend/app/routers/documents.py`

### Current Code (Problematic)

```python
# Line 20
ALLOWED_HOSTS = {"example.com"}  # TODO: Replace with your allowed host(s)

# Lines 204-207 (active check)
sld = get_sld(hostname)
if sld not in ALLOWED_HOSTS and hostname not in ALLOWED_HOSTS:
    raise HTTPException(status_code=400, detail="Host not allowed")
```

### Issues Found

1. **Hardcoded Placeholder**: `ALLOWED_HOSTS = {"example.com"}` is a placeholder that blocks all real URLs
2. **Duplicate Code**: Lines 157-162 have a commented-out check, but lines 204-207 have an active check
3. **No Configuration**: No way to configure allowed hosts without editing source code
4. **No Disable Option**: No way to disable the host filter entirely

### Security Context

The ALLOWED_HOSTS check is one of several SSRF (Server-Side Request Forgery) protections:

1. **Scheme validation** (lines 139-143): Only HTTP/HTTPS allowed
2. **IP validation** (lines 164-181): Blocks private, loopback, and link-local IPs
3. **Host allowlist** (lines 204-207): Blocks hosts not in ALLOWED_HOSTS
4. **Redirect limit** (line 215): Max 3 redirects
5. **Timeout** (line 215): 30 second timeout

The IP validation (item 2) provides the core SSRF protection. The host allowlist (item 3) is an additional restriction that may be overly restrictive for typical home inventory use cases.

---

## Requested Changes

From issue #463:
1. Make ALLOWED_HOSTS configurable via admin panel (or configuration file / environment variable)
2. Allow this host validation to be disabled entirely

---

## Proposed Solution

### Option A: Environment Variable Configuration (Recommended)

Add environment variables to control the host filter:

```python
# In config.py or settings
DOCUMENT_URL_ALLOWED_HOSTS: str = ""  # Comma-separated list, empty = allow all public hosts
DOCUMENT_URL_HOST_VALIDATION_ENABLED: bool = True  # Set to False to disable entirely
```

**Pros:**
- Simple to configure via docker-compose.yml
- No database changes required
- Consistent with other security settings

**Cons:**
- Requires container restart to change
- No per-user configuration

### Option B: Admin Panel Configuration

Add to the admin settings in the database:

```python
# New settings in admin panel
document_url_allowed_hosts: list[str] = []  # Empty = allow all
document_url_host_validation_enabled: bool = True
```

**Pros:**
- Can be changed without restart
- UI for non-technical users

**Cons:**
- Requires database migration
- More complex implementation

### Option C: Hybrid (Environment + Admin Override)

Environment variable sets defaults, admin panel can override.

---

## Recommended Implementation (Option A)

### 1. Add Configuration to `backend/app/config.py`

```python
# Document URL security settings
DOCUMENT_URL_HOST_VALIDATION: bool = True  # Set False to allow any public host
DOCUMENT_URL_ALLOWED_HOSTS: str = ""  # Comma-separated list of allowed hosts/domains
```

### 2. Update `backend/app/routers/documents.py`

```python
from ..config import settings

# Replace hardcoded ALLOWED_HOSTS with config-driven logic
def is_host_allowed(hostname: str) -> bool:
    """Check if hostname is allowed for document URL downloads."""
    # If host validation is disabled, allow all (SSRF IP check still applies)
    if not settings.DOCUMENT_URL_HOST_VALIDATION:
        return True

    # If no allowed hosts configured, allow all
    allowed_hosts_str = settings.DOCUMENT_URL_ALLOWED_HOSTS
    if not allowed_hosts_str or allowed_hosts_str.strip() == "":
        return True

    # Parse comma-separated list
    allowed_hosts = {h.strip().lower() for h in allowed_hosts_str.split(",") if h.strip()}

    # Check exact hostname and second-level domain
    sld = get_sld(hostname)
    return hostname.lower() in allowed_hosts or sld in allowed_hosts
```

### 3. Update `docker-compose.yml` Documentation

```yaml
environment:
  # Document URL Security (for uploading documents from URLs)
  # Set to 'false' to allow documents from any public URL (recommended for home use)
  # DOCUMENT_URL_HOST_VALIDATION: false
  # Or specify allowed hosts (comma-separated)
  # DOCUMENT_URL_ALLOWED_HOSTS: "github.com,githubusercontent.com,dropbox.com"
```

---

## Security Considerations

### With Host Validation Disabled

Even with ALLOWED_HOSTS disabled, these protections remain:
- ✅ Private IP blocking (10.x, 172.16.x, 192.168.x)
- ✅ Loopback blocking (127.x, localhost)
- ✅ Link-local blocking (169.254.x)
- ✅ Scheme validation (HTTP/HTTPS only)
- ✅ Redirect limiting (max 3)
- ✅ Timeout protection (30s)
- ✅ Content-type validation (PDF/TXT only)

### Risk Assessment

**Risk Level**: LOW for home inventory use

The primary SSRF concern is accessing internal network resources, which is blocked by IP validation. The host allowlist adds defense-in-depth but creates usability issues for legitimate use cases (downloading manuals from manufacturer sites, etc.).

---

## Implementation Checklist

- [x] Add `DOCUMENT_URL_HOST_VALIDATION` to config.py (default: True)
- [x] Add `DOCUMENT_URL_ALLOWED_HOSTS` to config.py (default: "")
- [x] Update documents.py to use config instead of hardcoded set
- [x] Add helper function `is_host_allowed()` for cleaner logic
- [x] Remove duplicate/commented code (lines 157-162)
- [x] Update docker-compose.yml with example configuration (set to false by default for usability)
- [ ] Test with validation enabled + specific hosts
- [ ] Test with validation disabled
- [ ] Test that SSRF IP blocking still works when validation disabled

---

## Files to Modify

1. `backend/app/config.py` - Add new settings
2. `backend/app/routers/documents.py` - Use config, add helper function
3. `docker-compose.yml` - Add example environment variables
4. `docs/` - Document the new settings

---

## Test Cases

1. **Default behavior** (validation enabled, no hosts): Should block all URLs
2. **Validation disabled**: Should allow any public URL
3. **Specific hosts allowed**: Should allow only those hosts
4. **Private IP attempt**: Should always be blocked regardless of settings
5. **Localhost attempt**: Should always be blocked regardless of settings
