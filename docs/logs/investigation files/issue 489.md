# Investigation: Issue #489 — First Login Fail (401 After Successful POST /api/token)

**Date:** 2026-02-20  
**Reporter:** @benchdoos  
**GitHub:** https://github.com/tokendad/NesVentory/issues/489  
**Status:** Open — fix required  

---

## Summary

Users self-hosting NesVentory over plain HTTP (e.g. `http://192.168.31.18:8181`) cannot stay logged in. The `POST /api/token` returns `200 OK` and the user is authenticated, but all subsequent requests (e.g. `GET /api/users/me`) immediately return `401 Unauthorized`. The frontend then attempts to call `POST /api/auth/logout` and receives `405 Method Not Allowed`.

---

## Root Cause Analysis

### Bug 1 — `secure=True` cookie on HTTP deployments (primary cause of 401)

**File:** `backend/app/routers/auth.py`  
**Lines:** ~261–268 (password login) and ~228–235 (Google OAuth login)

After a successful login, the token endpoint sets the session cookie as:

```python
response.set_cookie(
    key="access_token",
    value=result["access_token"],
    httponly=True,
    secure=True,       # <-- ROOT CAUSE
    samesite="strict",
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
)
```

`secure=True` is a browser directive that instructs the browser to **only transmit this cookie over HTTPS connections**. When a user accesses the app over plain HTTP:

1. The `POST /api/token` succeeds — the server sets the `Set-Cookie: access_token=...; Secure` header.
2. The browser **stores** the cookie but marks it as HTTPS-only.
3. On every subsequent HTTP request (`GET /api/users/me`, etc.) the browser **silently omits the cookie** from the request headers.
4. The backend receives requests with no `access_token` cookie and no `Authorization` header, so `get_current_user()` raises `401 Unauthorized`.

This is confirmed by the reporter's browser inspection: *"next requests do not have `access_token` in cookies"*.

The same `secure=True` issue exists on the Google OAuth cookie set in `@router.post("/auth/google")`.

**Why the CORS fix didn't help:** CORS was never the real issue. The cookie was being set and the `Origin` header was being reflected correctly, but the browser was refusing to send the cookie on HTTP because of `Secure`.

---

### Bug 2 — Missing `POST /api/auth/logout` endpoint (405 Method Not Allowed)

When the frontend detects the 401 on `GET /api/users/me`, it calls `POST /api/auth/logout` to gracefully clear state and redirect to the login page. That endpoint **does not exist anywhere in the codebase** — no route is registered for `/api/auth/logout` with any HTTP method — resulting in `405 Method Not Allowed`.

---

## Evidence from Logs

```
POST /api/token → 200 OK          ✅ Login succeeds, cookie set with Secure flag
GET  /api/users/me → 401          ❌ Cookie not sent by browser (HTTP + Secure cookie)
POST /api/auth/logout → 405       ❌ Endpoint does not exist
```

The reporter's browser screenshot confirms the `access_token` cookie is absent from the headers of the follow-up requests, despite being present after the login response.

---

## Affected Code Locations

| File | Location | Issue |
|---|---|---|
| `backend/app/routers/auth.py` | `@router.post("/token")` ~L261 | `secure=True` on cookie |
| `backend/app/routers/auth.py` | `@router.post("/auth/google")` ~L228 | `secure=True` on cookie |
| `backend/app/routers/auth.py` | *(missing)* | No `POST /api/auth/logout` route |

---

## Proposed Fix

### Fix 1 — Conditional `secure` flag on cookies

Detect whether the incoming request is HTTPS and only set `secure=True` when it is. `samesite="lax"` is also recommended over `"strict"` for better compatibility (strict blocks the cookie on top-level navigations from external pages):

```python
@router.post("/token")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    result = perform_password_login(db, form_data.username, form_data.password)
    is_https = request.url.scheme == "https"

    response = JSONResponse(content={
        "token_type": result["token_type"],
        "must_change_password": result.get("must_change_password", False)
    })
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=is_https,   # Only enforce Secure on HTTPS deployments
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return response
```

Apply the same pattern to the Google OAuth cookie in `@router.post("/auth/google")`.

### Fix 2 — Add `POST /api/auth/logout` endpoint

```python
@router.post("/auth/logout")
async def logout():
    """Clear the auth cookie and log the user out."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    return response
```

---

## Notes

- The `DynamicCORSMiddleware` added in commit `8c59e21` is a correct improvement but does not address this bug. CORS was a red herring — the cookie was being set, the CORS headers were being echoed, but the browser-level `Secure` attribute silently dropped the cookie on HTTP.
- Self-hosted deployments on plain HTTP are a legitimate and common use case for a home-inventory app; `secure=True` should only apply when the app is actually behind TLS.

======================

Codex review:

# Research Summary: Issue #489 ("First login fail")

## Issue link
- https://github.com/tokendad/NesVentory/issues/489

## Reported behavior
- Login request (`POST /api/token`) returns `200 OK`.
- Immediately after login, authenticated requests (especially `GET /api/users/me`) fail with `401 Unauthorized`.
- Additional endpoints (`/api/items`, `/api/locations`, `/api/tags`) show `307` redirects and then continue, but user session is effectively unauthenticated.

## Most likely root cause
The strongest root cause appears to be **auth cookie policy mismatch**, not purely CORS:

1. **Auth cookie is always set with `secure=True`** in backend login flows.
   - Browsers will not send secure cookies over plain HTTP.
   - Self-hosted LAN access patterns in the issue (e.g. `http://192.168.x.x:8181`) are therefore vulnerable to post-login 401s.

2. **Frontend login call does not include `credentials: 'include'`**.
   - For cross-origin deployments, this can prevent cookie persistence on the login response.
   - Later requests do use `credentials: 'include'`, but that does not help if cookie storage failed during login.

3. **Current middleware already supports dynamic CORS reflection mode** when `CORS_ORIGINS` is not set.
   - This reduces likelihood that CORS alone explains the failure in current code.

## Why existing workaround may seem to help sometimes
Setting `CORS_ORIGINS` can reduce cross-origin mismatch in some deployments, but does not address all cookie transport constraints (especially secure cookie over HTTP).

## Practical conclusion
Issue #489 is most likely a **cookie transport/auth session problem** (Secure + credentialed requests + deployment origin/protocol), with CORS being a secondary factor.

## Commands and files inspected
### Commands
- `rg -n "CORS_ORIGINS|cors|CORSMiddleware|SameSite|samesite|secure cookie|set_cookie|access_token|users/me|307" backend src -S`
- `nl -ba backend/app/routers/auth.py | sed -n '210,290p'`
- `nl -ba backend/app/middleware/cors.py | sed -n '1,170p'`
- `nl -ba backend/app/auth.py | sed -n '170,250p'`
- `nl -ba src/lib/api.ts | sed -n '270,360p'`
- Browser capture of issue page title/content via Playwright

### Key files
- `backend/app/routers/auth.py`
- `backend/app/middleware/cors.py`
- `backend/app/auth.py`
- `src/lib/api.ts`

