# Investigation: Issue #502 — Feature: Dynamically Load Available Gemini Models via API

**Issue:** #502 — Feature: Dynamically load available Gemini models via API in AI Settings
**Investigation Date:** February 25, 2026
**Status:** READY FOR IMPLEMENTATION

---

## 1. Issue Summary

The Gemini model selector in Admin > AI Settings currently shows a hardcoded list of five models
defined in `backend/app/config.py` (`AVAILABLE_GEMINI_MODELS`, lines 88–114). This list goes stale
as Google releases or retires models. The feature request asks that, when a valid Gemini API key is
already saved (or just saved), the frontend fetches the live model list from:

```
GET https://generativelanguage.googleapis.com/v1beta/models?key=<KEY>
```

Only models with `"generateContent"` in their `supportedGenerationMethods` array are shown. The user
selects a model from a populated dropdown. The selection is persisted to `SystemSettings.gemini_model`
via the existing `PUT /api/config-status/api-keys` endpoint. A fallback to manual text input is shown
when the API fetch fails.

---

## 2. Current State

### 2.1 Backend — Model List Source

**File:** `backend/app/config.py` (lines 88–114)

The module-level constant `AVAILABLE_GEMINI_MODELS` is a hardcoded Python list of dicts:

```python
AVAILABLE_GEMINI_MODELS = [
    {"id": "gemini-2.0-flash-exp",  "name": "Gemini 2.0 Flash (Experimental)", "description": "..."},
    {"id": "gemini-1.5-flash",      "name": "Gemini 1.5 Flash",                 "description": "..."},
    {"id": "gemini-1.5-flash-8b",   "name": "Gemini 1.5 Flash-8B",              "description": "..."},
    {"id": "gemini-1.5-pro",        "name": "Gemini 1.5 Pro",                   "description": "..."},
    {"id": "gemini-exp-1206",       "name": "Gemini Experimental (1206)",        "description": "..."},
]
```

### 2.2 Backend — `GET /api/config-status` Endpoint

**File:** `backend/app/routers/status.py` (lines 249–305)

The endpoint calls `get_effective_gemini_model(db)` and passes `AVAILABLE_GEMINI_MODELS` directly
into the response:

```python
from ..config import AVAILABLE_GEMINI_MODELS
...
return ConfigStatusResponse(
    ...
    available_gemini_models=AVAILABLE_GEMINI_MODELS,   # ← hardcoded list
    ...
)
```

### 2.3 Backend — Model Validation on Save

**File:** `backend/app/routers/status.py` (lines 352–358, `update_api_keys` handler)

When saving a model selection, the backend validates against the same hardcoded list:

```python
valid_model_ids = [model["id"] for model in AVAILABLE_GEMINI_MODELS]
if api_keys.gemini_model and api_keys.gemini_model not in valid_model_ids:
    raise HTTPException(status_code=400, detail=f"Invalid Gemini model. Must be one of: ...")
```

This validation **will reject any model fetched dynamically from the API** that is not already in the
hardcoded list. This validation gate must be relaxed as part of this feature.

### 2.4 Backend — Model Persistence

**File:** `backend/app/settings_service.py` (lines 79–105, `get_effective_gemini_model`)

Priority chain: `GEMINI_MODEL` env var → `SystemSettings.gemini_model` in SQLite → config default
(`gemini-2.0-flash-exp`). The column already exists in the database. **No schema migration needed.**

### 2.5 Frontend — `ConfigStatusResponse` Interface

**File:** `src/lib/api.ts` (lines 1769–1810)

The TypeScript interface already has the correct shape:

```typescript
export interface GeminiModel {
  id: string;
  name: string;
  description: string;
}

export interface ConfigStatusResponse {
  ...
  gemini_model: string | null;
  available_gemini_models: GeminiModel[] | null;
  gemini_model_from_env: boolean;
  ...
}
```

### 2.6 Frontend — AdminPage Gemini Section

**File:** `src/components/AdminPage.tsx`

Key state variables (lines 185–188):
- `geminiApiKeyInput: string` — typed API key value
- `geminiModelInput: string` — selected model id

`loadConfigStatus()` (line 284) is called on mount when the user navigates to `ai-settings` or
`server` tab. The dropdown is populated from `configStatus?.available_gemini_models` (lines 3002–3006).

`handleSaveGeminiApiKey()` (line 1120) calls `updateApiKeys({ gemini_api_key, gemini_model })` then
calls `loadConfigStatus()` to refresh.

**Key UI region (lines 2940–3101):** The Gemini model sub-section lives inside the
`provider.id === 'gemini'` block.

### 2.7 No Existing `/api/ai/gemini-models` Endpoint

A search of all route decorators in `backend/app/routers/ai.py` confirms there is no `/gemini-models`
endpoint today. This endpoint is entirely new.

### 2.8 `httpx` Is Already a Dependency

`backend/requirements.txt` line 15: `httpx==0.28.1`. Already used in `ai.py` (line 622) for the
OpenAI connection test. Reuse it for the outbound Gemini REST call.

---

## 3. Key Files to Modify

| File | What Changes |
|------|-------------|
| `backend/app/routers/ai.py` | Add `GET /api/ai/gemini-models` endpoint |
| `backend/app/schemas.py` | Add `GeminiModelInfo` and `GeminiModelsResponse` Pydantic schemas |
| `backend/app/routers/status.py` | Relax hardcoded model validation in `update_api_keys` (lines 352–358) |
| `src/lib/api.ts` | Add `fetchGeminiModels()` function and interfaces |
| `src/components/AdminPage.tsx` | Dynamic fetch, loading state, error state, fallback input |

---

## 4. Backend Plan

### 4.1 New Endpoint: `GET /api/ai/gemini-models`

**Location:** Add to `backend/app/routers/ai.py` after the existing `GET /ai/status` endpoint
(around line 478, before `POST /ai/test-connection`).

**Auth:** Requires `Depends(auth.get_current_user)` — same as all other AI endpoints.

**What it does:**
1. Retrieves the effective Gemini API key via `get_effective_gemini_api_key(db)`.
2. If no key is configured, returns HTTP 400 with a clear message.
3. Makes an outbound `GET https://generativelanguage.googleapis.com/v1beta/models?key=<KEY>` using
   `httpx.AsyncClient` with a 10-second timeout.
4. Filters to only entries where `"generateContent"` is in `supportedGenerationMethods`.
5. Strips the `"models/"` prefix from `name` to match the existing short-form convention.
6. Returns the list sorted alphabetically by `display_name`.
7. Handles errors with appropriate HTTP status codes.

**Implementation sketch:**

```python
@router.get("/gemini-models", response_model=GeminiModelsResponse)
async def list_gemini_models(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fetch the list of Gemini models available for the configured API key.
    Only models supporting generateContent are returned.
    """
    api_key = get_effective_gemini_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Gemini API key is not configured. Save a valid API key first."
        )

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504,
            detail="Timed out fetching Gemini model list. Check network connectivity.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502,
            detail=f"Network error fetching Gemini model list.")

    if response.status_code in (400, 401, 403):
        raise HTTPException(status_code=400,
            detail="Authentication failed. The API key is invalid or revoked.")
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail=QUOTA_EXCEEDED_MESSAGE)
    if response.status_code == 503:
        raise HTTPException(status_code=503, detail=SERVICE_UNAVAILABLE_MESSAGE)
    if response.status_code != 200:
        raise HTTPException(status_code=502,
            detail=f"Google API returned unexpected status {response.status_code}.")

    data = response.json()
    raw_models = data.get("models", [])

    filtered = [
        GeminiModelInfo(
            id=m["name"].removeprefix("models/"),   # strip prefix for consistency
            display_name=m.get("displayName", m["name"])
        )
        for m in raw_models
        if "generateContent" in m.get("supportedGenerationMethods", [])
    ]
    filtered.sort(key=lambda m: m.display_name)

    return GeminiModelsResponse(models=filtered, source="live")
```

### 4.2 New Pydantic Schemas

**File:** `backend/app/schemas.py` — add after `AIConnectionTestResponse` (around line 210):

```python
class GeminiModelInfo(BaseModel):
    """A single Gemini model returned from the live API."""
    id: str            # short form e.g. "gemini-2.5-flash"
    display_name: str  # e.g. "Gemini 2.5 Flash"

class GeminiModelsResponse(BaseModel):
    """Response from GET /api/ai/gemini-models."""
    models: List[GeminiModelInfo]
    source: str        # "live"
```

### 4.3 Error Handling Reference

| Condition | HTTP Status | Message |
|-----------|-------------|---------|
| No API key saved | 400 | "Gemini API key is not configured. Save a valid API key first." |
| Invalid/revoked key (Google 400/401/403) | 400 | "Authentication failed. The API key is invalid or revoked." |
| Quota exceeded (Google 429) | 429 | Reuse `QUOTA_EXCEEDED_MESSAGE` constant |
| Service unavailable (Google 503) | 503 | Reuse `SERVICE_UNAVAILABLE_MESSAGE` constant |
| Network timeout | 504 | "Timed out fetching Gemini model list." |
| Other network error | 502 | "Network error fetching Gemini model list." |
| Unexpected HTTP status | 502 | "Google API returned unexpected status {code}." |

### 4.4 Relax Model Validation in `update_api_keys`

**File:** `backend/app/routers/status.py` (lines 352–358)

**Current code to replace:**
```python
valid_model_ids = [model["id"] for model in AVAILABLE_GEMINI_MODELS]
if api_keys.gemini_model and api_keys.gemini_model not in valid_model_ids:
    raise HTTPException(
        status_code=400,
        detail=f"Invalid Gemini model. Must be one of: {', '.join(valid_model_ids)}"
    )
```

**Replace with a lightweight format check:**
```python
if api_keys.gemini_model is not None:
    model_str = api_keys.gemini_model.strip()
    if model_str and len(model_str) > 200:
        raise HTTPException(status_code=400, detail="Gemini model name is too long.")
```

The SDK will surface a clear error if an invalid model is used at inference time.

### 4.5 Model Persistence

No database migration needed. `SystemSettings.gemini_model` column already exists. The save flow
via `PUT /api/config-status/api-keys` already works. The only change is the validation relaxation
above.

---

## 5. Frontend Plan

### 5.1 New API Function

**File:** `src/lib/api.ts` — add after `updateApiKeys` (line 1823):

```typescript
export interface GeminiModelInfo {
  id: string;
  display_name: string;
}

export interface GeminiModelsApiResponse {
  models: GeminiModelInfo[];
  source: string;
}

export async function fetchGeminiModels(): Promise<GeminiModelsApiResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/gemini-models`, {
    headers: { "Accept": "application/json", ...authHeaders() },
  });
  return handleResponse<GeminiModelsApiResponse>(res);
}
```

### 5.2 New State Variables

**File:** `src/components/AdminPage.tsx` — add near existing Gemini state (around line 185):

```typescript
const [geminiModels, setGeminiModels] = useState<GeminiModelInfo[]>([]);
const [geminiModelsLoading, setGeminiModelsLoading] = useState(false);
const [geminiModelsError, setGeminiModelsError] = useState<string | null>(null);
const [geminiModelFallback, setGeminiModelFallback] = useState(false);
```

### 5.3 New `loadGeminiModels()` Function

Add near `loadConfigStatus()` (around line 284):

```typescript
async function loadGeminiModels() {
  setGeminiModelsLoading(true);
  setGeminiModelsError(null);
  setGeminiModelFallback(false);
  try {
    const result = await fetchGeminiModels();
    setGeminiModels(result.models);
    // Pre-select currently-saved model if present in live list
    if (!geminiModelInput && configStatus?.gemini_model) {
      const found = result.models.find(m => m.id === configStatus.gemini_model);
      if (found) setGeminiModelInput(configStatus.gemini_model);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch model list";
    setGeminiModelsError(message);
    setGeminiModelFallback(true);
  } finally {
    setGeminiModelsLoading(false);
  }
}
```

### 5.4 Auto-Fetch Trigger Points

**Trigger 1 — Page loads with an existing API key** (`loadConfigStatus`, line 284):
```typescript
setConfigStatus(status);
if (status.gemini_configured) {
  loadGeminiModels();
}
```

**Trigger 2 — After saving a new API key** (`handleSaveGeminiApiKey`, line 1120):
```typescript
await loadConfigStatus();
await loadGeminiModels();  // ← add this line
```

### 5.5 UI — Three-State Model Selector

Replace the current static dropdown in the Gemini model sub-section (lines 2982–3042):

**State A — Loading:**
```tsx
{geminiModelsLoading && (
  <div style={{ fontSize: "0.8rem", color: "var(--muted)", padding: "0.5rem" }}>
    Fetching available models...
  </div>
)}
```

**State B — Loaded, show dropdown:**
```tsx
{!geminiModelsLoading && !geminiModelFallback && geminiModels.length > 0 && (
  <>
    <select
      value={geminiModelInput || configStatus?.gemini_model || ""}
      onChange={(e) => setGeminiModelInput(e.target.value)}
      disabled={configStatus?.gemini_model_from_env}
    >
      <option value="" disabled>-- Select a model --</option>
      {/* Preserve deprecated saved model that no longer appears in live list */}
      {configStatus?.gemini_model &&
       !geminiModels.find(m => m.id === configStatus.gemini_model) && (
        <option value={configStatus.gemini_model}>
          {configStatus.gemini_model} (current — not in live list)
        </option>
      )}
      {geminiModels.map((model) => (
        <option key={model.id} value={model.id}>
          {model.display_name}
        </option>
      ))}
    </select>
    <small style={{ color: "var(--muted)", fontSize: "0.7rem", marginTop: "0.25rem", display: "block" }}>
      {geminiModels.length} models available · Filtered for text generation
    </small>
  </>
)}
```

**State C — Error / Fallback, show manual text input:**
```tsx
{!geminiModelsLoading && (geminiModelFallback || geminiModels.length === 0) && (
  <>
    {geminiModelsError && (
      <div style={{ fontSize: "0.75rem", color: "#e65100", marginBottom: "0.25rem" }}>
        Could not load model list: {geminiModelsError}
      </div>
    )}
    <input
      type="text"
      value={geminiModelInput || configStatus?.gemini_model || ""}
      onChange={(e) => setGeminiModelInput(e.target.value)}
      placeholder="e.g. gemini-2.0-flash-exp"
      disabled={configStatus?.gemini_model_from_env}
      style={{ fontFamily: "monospace" }}
    />
    <small style={{ color: "var(--muted)", fontSize: "0.7rem", marginTop: "0.25rem", display: "block" }}>
      Enter the model ID manually
    </small>
    <button type="button" className="btn-outline" onClick={loadGeminiModels}
      style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
      Retry
    </button>
  </>
)}
```

**Add a Refresh button in the non-editing view** (around line 3034):
```tsx
{configStatus?.gemini_configured && !configStatus?.gemini_model_from_env && (
  <button type="button" className="btn-outline" onClick={loadGeminiModels}
    disabled={geminiModelsLoading} style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
    {geminiModelsLoading ? "Refreshing..." : "Refresh Model List"}
  </button>
)}
```

### 5.6 Cancel Handler Update

In `handleCancelGeminiEdit()` (line 1164), add:
```typescript
setGeminiModelsError(null);
setGeminiModelFallback(false);
// Note: keep geminiModels — avoid a re-fetch on next edit open
```

---

## 6. Filter Logic

The Google API returns all model types. Only models compatible with `client.models.generate_content()`
are relevant to NesVentory.

**Include:** `"generateContent"` in `supportedGenerationMethods`

**This excludes automatically:**
- Embedding models (`"embedContent"` only — e.g. `gemini-embedding-001`)
- TTS/audio models (`"bidiGenerateContent"` only)
- Image/video generation (`"predict"`, `"predictLongRunning"` — Imagen, Veo)
- AQA models (`"generateAnswer"` only)

**Backend filter:**
```python
"generateContent" in m.get("supportedGenerationMethods", [])
```

No additional frontend filtering needed — the backend returns only eligible models.

---

## 7. Edge Cases and Risks

### 7.1 `models/` Prefix Inconsistency
The Google API returns `"name": "models/gemini-2.5-flash"`. Existing stored values use the short
form `"gemini-2.0-flash-exp"`. The SDK accepts both, but mixing them in the database creates
confusion. **Fix:** strip `"models/"` prefix in the backend endpoint using `.removeprefix("models/")`.

### 7.2 Saved Model Not In Live List
A user may have saved a now-retired model. The dropdown must preserve it as a visible deprecated
option so the user is aware and can make an explicit change. See State B UI above.

### 7.3 Environment-Variable-Locked Model
When `GEMINI_MODEL` is set via env var, `gemini_model_from_env` is `true`. All model inputs must
remain `disabled`. Still fetch the live list for display purposes.

### 7.4 No API Key Yet (First Save)
The user is entering a new key for the first time. `GET /api/ai/gemini-models` will return 400
since no key is in the DB yet. The model list should only be fetched **after** the key is saved
(Trigger 2, not Trigger 1). Show a hint: *"Save your API key first to load the available model list."*

### 7.5 Key Sourced From Environment
When the key is from the environment, the "Edit" button may be hidden. `loadGeminiModels()` must
still be called on page load (Trigger 1) since the key IS valid and the dropdown should be
populated for display.

### 7.6 Large Model Lists
Google currently returns ~30–50 models. No pagination is needed.

### 7.7 No CORS Issues
The model list fetch is server-to-server (backend → Google). The API key is never exposed to
the browser.

### 7.8 `description` Field Removal
The hardcoded `AVAILABLE_GEMINI_MODELS` has a `description` per model. The Google API does not
return one. The existing `GeminiModel` TypeScript interface has `description: string`. Make it
`optional` (`description?: string`) in the interface so dynamically-fetched entries are compatible
without a description field.

---

## 8. Suggested Implementation Order

1. Add `GeminiModelInfo` and `GeminiModelsResponse` to `backend/app/schemas.py`.
2. Add `GET /api/ai/gemini-models` endpoint in `backend/app/routers/ai.py` (after line 478).
3. Test the new endpoint manually with `curl` and a real key. Confirm prefix stripping and filter.
4. Relax model validation in `backend/app/routers/status.py` (lines 352–358).
5. Add `fetchGeminiModels()` and interfaces to `src/lib/api.ts`.
6. Add four new state variables to `AdminPage.tsx`.
7. Add `loadGeminiModels()` function to `AdminPage.tsx`.
8. Wire both auto-fetch triggers (`loadConfigStatus` and `handleSaveGeminiApiKey`).
9. Replace the static dropdown with the three-state loading/dropdown/fallback UI (lines 2982–3042).
10. Add the Refresh button to the non-editing model display (around line 3034).
11. Update `handleCancelGeminiEdit()` to reset error/fallback state.
12. End-to-end manual test: page load with existing key → dropdown populates; save new key →
    refreshes; invalid key → fallback input appears; env-locked → disabled dropdown.
13. Update `docs/Guides/API_ENDPOINTS.md` with the new `GET /api/ai/gemini-models` entry.

---

## 9. Open Questions

1. **Short vs. full model ID format:** Recommendation is to strip `"models/"` prefix for consistency
   with existing convention. Confirm `client.models.generate_content(model="gemini-2.5-flash", ...)`
   works identically to the full form before finalising.

2. **Admin-only vs. any authenticated user:** `GET /api/ai/gemini-models` is read-only and only
   visible on the admin settings page. Using `get_current_user` (not an admin-only guard) matches
   the pattern of `GET /api/config-status`. No change needed.

3. **Backend caching:** A 1-hour in-memory cache on the model list would avoid hitting Google on
   every page load. Likely overkill for v1 — revisit if performance reports arise.

4. **`description` field:** Make `description` optional in the existing `GeminiModel` TypeScript
   interface to avoid breaking changes. Dynamically-fetched entries will omit the description in
   the UI.

5. **`available_gemini_models` in `ConfigStatusResponse`:** After this feature lands, this field
   is redundant (frontend fetches directly). Keep for backward compatibility for now; can be
   deprecated in a future cleanup.

---

## 10. File and Line Reference Summary

| Location | Lines | Purpose |
|----------|-------|---------|
| `backend/app/config.py` | 88–114 | `AVAILABLE_GEMINI_MODELS` hardcoded list (stays, for fallback reference) |
| `backend/app/routers/status.py` | 249–305 | `GET /api/config-status` passes hardcoded list |
| `backend/app/routers/status.py` | 352–358 | Model whitelist validation — **relax this** |
| `backend/app/routers/status.py` | 308–405 | `PUT /api/config-status/api-keys` saves model |
| `backend/app/settings_service.py` | 79–105 | `get_effective_gemini_model()` priority chain |
| `backend/app/routers/ai.py` | 478 | Insert new endpoint after `GET /ai/status` |
| `backend/app/routers/ai.py` | 621–623 | `httpx` pattern to copy for outbound call |
| `backend/app/routers/ai.py` | 29–39 | `QUOTA_EXCEEDED_MESSAGE`, `SERVICE_UNAVAILABLE_MESSAGE` to reuse |
| `backend/app/schemas.py` | ~210 | After `AIConnectionTestResponse` — add new schemas |
| `src/lib/api.ts` | 1769–1773 | Existing `GeminiModel` interface — make `description` optional |
| `src/lib/api.ts` | 1823 | Add `fetchGeminiModels()` after `updateApiKeys` |
| `src/components/AdminPage.tsx` | 1–66 | Imports — add `fetchGeminiModels`, `GeminiModelInfo` |
| `src/components/AdminPage.tsx` | 185–188 | Existing Gemini state vars — add 4 new state vars |
| `src/components/AdminPage.tsx` | 284 | `loadConfigStatus()` — add auto-fetch trigger |
| `src/components/AdminPage.tsx` | 1120 | `handleSaveGeminiApiKey()` — add fetch after save |
| `src/components/AdminPage.tsx` | 1164 | `handleCancelGeminiEdit()` — reset error/fallback state |
| `src/components/AdminPage.tsx` | 2982–3042 | Gemini model sub-section — full UI replacement |
| `src/components/AdminPage.tsx` | ~3034 | Non-edit model display — add Refresh button |
| `docs/Guides/API_ENDPOINTS.md` | — | Document new `GET /api/ai/gemini-models` endpoint |
