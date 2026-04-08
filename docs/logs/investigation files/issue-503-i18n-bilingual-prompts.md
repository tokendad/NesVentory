# Investigation — Issue #503: Internationalization, Bilingual Descriptions, and Customizable LLM Prompts

**Date:** 2026-02-25
**Status:** Investigation
**Author:** Documentation Agent (Swarm)

---

## 1. Issue Summary

Issue #503 requests four related but independently deliverable features:

1. **Frontend interface localization** via external translation files (react-i18next), targeting English, German, French, Ukrainian, and Russian as initial languages. All UI strings currently hardcoded in JSX must be extractable and replaced with translation keys.

2. **Bilingual storage of item descriptions** — items should store a `description_i18n` field containing per-language variants (e.g. `{"en": "Red leather sofa", "de": "Rotes Ledersofa"}`), while keeping the existing `description` column for backward compatibility and as the fallback.

3. **LLM prompts adapted for the user's target language** — when AI detects items, parses data tags, or looks up barcodes, it should be instructed to respond in the user's selected UI language (e.g. producing German descriptions for a German-language user).

4. **User-editable LLM prompts in Admin → AI Settings** — admins should be able to view, edit, and reset to default each system prompt used for AI inference, without redeploying the application.

**Why it matters:** NesVentory is used internationally (locales listed in `src/lib/locale.ts` include Russian, Ukrainian, German, French, Japanese, and more). Users expect AI-generated content to be in their language, and power users want to tune prompt behavior for their domain (e.g. vintage collectibles vs. standard home appliances). Additionally, translating the entire UI is a significant usability improvement for non-English speakers.

---

## 2. Current State

### 2.1 Frontend i18n Infrastructure

**No i18n library is installed.** The root `package.json` (at `/data/NesVentory/package.json`, line 9) lists only four runtime dependencies:

```json
"react": "^19.2.3",
"react-dom": "^19.2.4",
"qrcode": "^1.5.4",
"@types/qrcode": "^1.5.6"
```

Neither `react-i18next`, `i18next`, nor any alternative (e.g. `react-intl`, `lingui`) is present.

**Partial locale infrastructure exists** — but only for number/date/currency formatting, not for UI string translation:

- `/data/NesVentory/src/lib/locale.ts` — defines `LocaleConfig` with `locale`, `currency`, `currencySymbolPosition`, `dateFormat`. Persisted via `localStorage` key `NesVentory_locale_config`. Provides `COMMON_LOCALES` with 25 locale codes including `de-DE`, `fr-FR`, `ru-RU`, `uk-UA` (Ukrainian is listed as `uk-UA` indirectly via `COMMON_LOCALES`; specifically `ru-RU` for Russian). This file is exclusively about number/date formatting, not UI language.

- `/data/NesVentory/src/components/LocaleSettings.tsx` — a settings panel (modal or embedded) that lets users change `locale`, `currency`, `currencySymbolPosition`, and `dateFormat`. All its own label strings are hardcoded English.

**All UI strings are hardcoded.** Spot checks in `AdminPage.tsx` confirm string literals like `"Loading AI providers..."`, `"Configure AI providers for intelligent features..."`, `"Save Schedule Settings"`, `"Running valuation..."` are all inline JSX strings with no i18n wrapper.

### 2.2 Backend i18n Infrastructure

No i18n packages are present in `/data/NesVentory/backend/requirements.txt`. The 29-line requirements file contains no reference to `babel`, `gettext`, `python-i18n`, `lingua`, or any translation library.

No `language` or `locale` field exists on the `User` model (`/data/NesVentory/backend/app/models.py`).

No `language` or `locale` field exists in `SystemSettings` (`models.py`, lines 441–465).

### 2.3 Hardcoded AI Prompt Inventory

All prompts are inline string literals within `/data/NesVentory/backend/app/routers/ai.py`. There is no prompt-constant file, no database-backed prompt storage, and no per-language variant system.

| # | Prompt Key (proposed) | Location | Line Range | Function/Endpoint |
|---|---|---|---|---|
| 1 | `detect_items` | `ai.py` | 798–815 | `detect_items()` / `POST /ai/detect-items` |
| 2 | `parse_data_tag` | `ai.py` | 935–967 | `parse_data_tag()` / `POST /ai/parse-data-tag` |
| 3 | `barcode_lookup` | `ai.py` | 1190–1226 | `lookup_barcode()` / `POST /ai/barcode-lookup` |
| 4 | `scan_qr` | `ai.py` | 1513–1531 | `scan_qr_code()` / `POST /ai/scan-qr` |
| 5 | `scan_barcode` | `ai.py` | 1695–1718 | `scan_barcode_image()` / `POST /ai/scan-barcode` |
| 6 | `estimate_value` | `ai.py` | 1815–1823 | `estimate_item_value_with_ai()` (bulk valuation) |
| 7 | `enrich_data_tag` | `ai.py` | 2026–2042 | `enrich_item_from_data_tag_photo()` (bulk enrichment) |

Additionally, a duplicate of the barcode-lookup prompt exists in `/data/NesVentory/backend/app/upc_service.py`, lines 156–192, used by the `GeminiUPCDatabase.lookup()` method for the multi-database barcode lookup path.

**Total unique prompts requiring i18n adaptation: 7 in `ai.py` + 1 near-duplicate in `upc_service.py`.**

Prompts #4 (`scan_qr`) and #5 (`scan_barcode`) extract machine-readable codes (URLs, digit strings) rather than natural language — these do **not** need language adaptation. That leaves **5 prompts** (#1, #2, #3, #6, #7) where the AI's natural-language output (descriptions, product names) should be in the user's language.

### 2.4 Data Model Fields Requiring Bilingual Support

The following free-text fields could carry bilingual content. Priority for `description_i18n` is the `Item.description` field; others are lower priority.

| Model | Field Name | SQLAlchemy Type | Line in models.py | Priority |
|---|---|---|---|---|
| `Item` | `description` | `Text, nullable=True` | 255 | High — directly AI-generated |
| `Item` | `name` | `String(255), nullable=False` | 254 | Medium — often brand/model name, less benefit |
| `Location` | `description` | `Text, nullable=True` | 180 | Low — user-authored, not AI-generated |
| `MaintenanceTask` | `name` | `String(255), nullable=False` | 398 | Low |
| `MaintenanceTask` | `description` | `Text, nullable=True` | 399 | Low |
| `Plugin` | `description` | `Text, nullable=True` | 479 | Very low — admin-only content |
| `LabelProfile` | `description` | `Text, nullable=True` | 541 | Very low |

**Recommendation:** Scope Phase 1 of bilingual storage to `Item.description` only. Other fields can be added later with the same pattern.

### 2.5 Current AdminPage AI Settings Section

`AdminPage.tsx` has a tab structure (`MainTabType`, line 100). The `'ai-settings'` tab is rendered by `renderAISettingsTab()` (line 2801). The current AI Settings tab contains:

- **AI Provider Settings** (lines 2809–2940): enable/disable providers, set priority, enter API keys. Providers include Gemini (with model selector and API key input) and others.
- **AI Valuation Settings** (lines 2488–2605): visible only when `configStatus?.gemini_configured`. Includes schedule toggle, interval selector, "Run AI Valuation Now" and "Enrich from Data Tags" buttons.
- **UPC Database Priority** (from line 2607 onward): enable/disable UPC databases, reorder priority, enter API keys.

**There is no prompt-editing UI** — no `<textarea>` for editing prompt text, no "Reset to Default" button, no prompt preview.

### 2.6 Language/Locale on the User Model

The `User` model (`models.py`, lines 76–138) has **no `language` or `locale` field**. The `LocaleConfig` is stored exclusively in browser `localStorage` (key `NesVentory_locale_config`, `src/lib/locale.ts`, line 12). This means the server has no knowledge of the user's preferred language.

---

## 3. Scope Assessment

### 3.1 Frontend i18n (react-i18next)

**Complexity: High**
**Risk: Medium** (no backend changes needed, but very high number of files affected)

The entire frontend is written in English inline JSX strings. Every visible user-facing string in every component must be replaced with `t('key')` calls. Based on the component directory listing (`src/components/`), at least 30 component files are affected:

`AIDetection.tsx`, `AddItemModal.tsx`, `AdminPage.tsx`, `CSVImport.tsx`, `Calendar.tsx`, `DashboardCards.tsx`, `EncircleImport.tsx`, `EnrichmentModal.tsx`, `InsuranceTab.tsx`, `InventoryPage.tsx`, `ItemDetails.tsx`, `ItemForm.tsx`, `ItemsTable.tsx`, `Layout.tsx`, `LocaleSettings.tsx`, `LocationDetailsModal.tsx`, `LocationsPage.tsx`, `LocationsTree.tsx`, `LoginForm.tsx`, `MaintenanceTab.tsx`, `MediaManagement.tsx`, `OIDCCallback.tsx`, `PhotoModal.tsx`, `QRLabelPrint.tsx`, `RegisterForm.tsx`, `SetPasswordModal.tsx`, `Status.tsx`, `ThemeSettings.tsx`, `UserSettings.tsx`, plus `App.tsx`.

**Affected files count: ~31 component files + `main.tsx` + `App.tsx` for provider setup**

Initial translation file count: 5 locale files (`en`, `de`, `fr`, `uk`, `ru`), each containing all translation keys. Conservative estimate: 300–600 translation keys.

The existing `LocaleSettings.tsx` component would need to be extended (or a new `LanguageSettings` section added) to also control the UI language (as distinct from the number formatting locale).

### 3.2 Bilingual Data Storage

**Complexity: Medium**
**Risk: High** (database schema change on the `items` table, which is the core table)

Adding a JSON column `description_i18n` to the `items` table is additive and backward-compatible. The existing `description` column stays as the primary/fallback. However:
- The `items` table is the most-queried table in the system.
- Any schema change requires updating `models.py`, `schemas.py`, and the `run_migrations()` whitelist in `main.py`.
- The API response changes (adding the field to `ItemBase`) affect all clients including potential mobile apps.
- The AI write-path must populate `description_i18n` as well as `description`.

### 3.3 LLM Language Adaptation

**Complexity: Low–Medium**
**Risk: Low** (prompt string changes only, no schema changes)

This involves prepending a language instruction to 5 of the 7 AI prompts. The user's preferred language must be passed from the frontend to the backend on AI requests. The cleanest mechanism is a request header (`Accept-Language` or a custom header like `X-Language`) on the 5 affected endpoints, since the language preference is currently only in `localStorage`.

Alternatively, a `language` field on the User model (persisted to DB) would allow the server to know the user's language without any header, making bulk operations (scheduled valuation runs) work correctly without a frontend caller.

### 3.4 User-Editable LLM Prompts

**Complexity: Medium**
**Risk: Low** (admin-only feature, new table, no change to existing tables)

This requires:
- A new `custom_prompts` table with `(id, key, language_code, content, is_default, created_at, updated_at)`
- 3 new API endpoints under `/api/ai/prompts/`
- A `get_prompt(key, language, db)` service function
- Frontend UI additions in the `ai-settings` tab

This can be done with zero impact on existing functionality because the new code only replaces the inline string when a custom prompt exists in DB; otherwise it falls back to the hardcoded constant.

---

## 4. Recommended Architecture

### 4.1 Frontend Localization

**Library:** `react-i18next` (backed by `i18next`). This is the most widely used, best-maintained React i18n library with React 19 support.

**Installation:**
```bash
npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

**File Structure:**
```
/data/NesVentory/public/locales/
  en/
    translation.json
  de/
    translation.json
  fr/
    translation.json
  uk/
    translation.json
  ru/
    translation.json
```

Translation files are served as static assets by Vite and loaded lazily at runtime. Vite serves files from `public/` at the root path.

**i18n initialization file** — create `/data/NesVentory/src/lib/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'uk', 'ru'],
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nesventory_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**App entry point** — `/data/NesVentory/src/main.tsx` should import `./lib/i18n` before rendering the app (import side-effect only). No `I18nextProvider` wrapper is needed when using `initReactI18next`.

**Language persistence:** `localStorage` key `nesventory_lang` (distinct from the existing `NesVentory_locale_config` key which controls number/date formatting).

**Language switcher location:** Embed in the existing `LocaleSettings.tsx` component (or a new "Language" section). Add a new `language` field to `LocaleConfig` in `src/lib/locale.ts` and persist it there, or use i18next's built-in `localStorage` detection with key `nesventory_lang`. A dropdown in `UserSettings.tsx` would be the most discoverable placement for end users.

**Migration approach for hardcoded strings:**
1. Create `public/locales/en/translation.json` with all English strings extracted from components.
2. Run through components alphabetically, replacing `"string"` in JSX with `{t('key')}`, importing `useTranslation` from `react-i18next`.
3. Translate `en/translation.json` into the other four languages to produce the remaining locale files.
4. Components that already use dynamic string content (e.g. error messages assembled with template literals) need parameterized keys: `t('errors.failedToUpdate', { field: 'role' })`.

**Key naming convention:**
```json
{
  "nav": { "inventory": "Inventory", "admin": "Admin" },
  "items": { "addItem": "Add Item", "noItems": "No items found" },
  "ai": { "runValuation": "Run AI Valuation Now", "running": "Running valuation..." },
  "errors": { "failedToUpdate": "Failed to update {{field}}" }
}
```

### 4.2 Bilingual Description Storage

**Recommendation: Option A — JSON column on the `items` table**

Option B (a separate `item_translations` table) is more normalized but adds join complexity to every item fetch and is significantly more migration risk for what is likely a narrow use case initially. Option A is additive, requires no join, and follows the established pattern already used in `items.additional_info`, `users.upc_databases`, and `users.ai_providers`.

**SQL Schema (new column):**
```sql
ALTER TABLE items ADD COLUMN description_i18n JSON;
```

Format: `{"en": "Red leather sofa", "de": "Rotes Ledersofa", "fr": "Canapé en cuir rouge"}`

**SQLAlchemy model change** in `backend/app/models.py`, after line 255:
```python
description = Column(Text, nullable=True)
description_i18n = Column(JSON, nullable=True)  # Bilingual: {"en": "...", "de": "..."}
```

**Migration** — add to `run_migrations()` in `backend/app/main.py`:
```python
# Item model: bilingual description storage
("items", "description_i18n", "JSON"),
```
Also add `"description_i18n"` to `ALLOWED_COLUMNS` (line 39) and `"JSON"` is already in `ALLOWED_TYPES` (line 44).

**Pydantic schema change** in `backend/app/schemas.py`, add to `ItemBase` (after line 419):
```python
description: Optional[str] = None
description_i18n: Optional[dict] = None  # {"en": "...", "de": "..."}
```
Also add to `ItemUpdate` (after line 453) as `Optional[dict] = None`.

**API backward compatibility:** The existing `description` field remains the canonical field. Clients that do not understand `description_i18n` continue to work unchanged. New clients can read `description_i18n[user_lang] or description` as the display value.

**Write behavior:** When the AI generates a description in language X, the endpoint writes:
- `item.description = description_text` (always, as the canonical value)
- `item.description_i18n = {lang_code: description_text}` (new, adds the language variant)

Subsequent AI calls in other languages can add additional keys to the JSON without overwriting existing ones.

### 4.3 LLM Language Adaptation

**Language preference source:** Since the user's preferred language is not currently stored on the backend `User` model, the frontend must pass it on each AI request. Two options:

- **Option A (header, no backend model change):** Frontend sends `Accept-Language: de` (or custom header `X-UI-Language: de`) on AI requests. Backend reads it per-request. Does not work for background/scheduled tasks (no HTTP request).
- **Option B (User.language field, persistent):** Add `language = Column(String(10), nullable=True, default='en')` to the `User` model. User sets it in settings. Background jobs use it automatically. This is the correct long-term approach.

**Recommendation:** Implement Option B (User.language field) for Phase 2, even though it requires a migration entry. The language preference belongs on the User model for consistency with how `upc_databases`, `ai_providers`, and other per-user preferences are stored.

**Prompt language injection — wrapper function approach:**

Create a helper in `backend/app/routers/ai.py` (or a new `prompt_service.py`):
```python
LANGUAGE_NAMES = {
    "en": "English", "de": "German", "fr": "French",
    "uk": "Ukrainian", "ru": "Russian", "es": "Spanish",
    "ja": "Japanese", "zh": "Chinese",
}

def inject_language(prompt: str, lang_code: str) -> str:
    """Prepend language instruction to a prompt."""
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    if lang_code == "en":
        return prompt  # No prefix needed for English
    return f"Respond in {lang_name}. All text fields in your JSON response must be in {lang_name}.\n\n" + prompt
```

**Prompts that need language injection (5 of 7):**

| Prompt | Line | Needs Language? | Rationale |
|---|---|---|---|
| `detect_items` | 798 | **Yes** | Returns `description` text |
| `parse_data_tag` | 935 | **Yes** | No natural language output but `manufacturer`/`brand` might localize |
| `barcode_lookup` | 1190 | **Yes** | Returns `description` text |
| `scan_qr` | 1513 | **No** | Extracts URL/machine text, language-independent |
| `scan_barcode` | 1695 | **No** | Extracts digit string, language-independent |
| `estimate_value` | 1815 | **No** | Returns only a numeric JSON field |
| `enrich_data_tag` | 2026 | **No** | Returns structured fields, no free-text description |

Additionally, the duplicate barcode-lookup prompt in `upc_service.py` line 156 should be updated when `barcode_lookup` in `ai.py` is updated.

**Cross-language description translation endpoint (optional, future):**
A new endpoint `POST /api/ai/translate-description` accepting `{item_id, target_language}` could use Gemini to translate an existing description into a new language and append it to `description_i18n`. This is out of scope for the initial implementation.

### 4.4 User-Editable LLM Prompts

#### New `CustomPrompt` Model

Add to `/data/NesVentory/backend/app/models.py`:

```python
class CustomPrompt(Base):
    __tablename__ = "custom_prompts"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), nullable=False, index=True)  # e.g. "detect_items"
    language_code = Column(String(10), nullable=False, default="en")  # e.g. "en", "de"
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("key", "language_code", name="unique_prompt_key_lang"),
    )
```

This table is created by SQLAlchemy's `create_all()` on first startup (new table, no migration needed). The `(key, language_code)` unique constraint ensures one prompt per key per language.

**Default prompt constants file** — create `/data/NesVentory/backend/app/prompt_constants.py`:
```python
"""Default LLM prompt strings. These are used when no custom prompt is found in the database."""

DETECT_ITEMS_PROMPT = """Analyze this image and identify all visible household items..."""
PARSE_DATA_TAG_PROMPT = """Analyze this image of a product data tag..."""
BARCODE_LOOKUP_PROMPT = """Look up the product associated with this UPC/barcode: {upc_clean}..."""
SCAN_QR_PROMPT = """Analyze this image and look for any QR code..."""
SCAN_BARCODE_PROMPT = """Analyze this image and look for any barcode or UPC code..."""
ESTIMATE_VALUE_PROMPT = """Based on the following item details, estimate its current market value in USD..."""
ENRICH_DATA_TAG_PROMPT = """Analyze this image of a product data tag..."""

PROMPT_KEYS = {
    "detect_items": DETECT_ITEMS_PROMPT,
    "parse_data_tag": PARSE_DATA_TAG_PROMPT,
    "barcode_lookup": BARCODE_LOOKUP_PROMPT,
    "estimate_value": ESTIMATE_VALUE_PROMPT,
    "enrich_data_tag": ENRICH_DATA_TAG_PROMPT,
    # scan_qr and scan_barcode excluded — not user-editable (machine output)
}

PROMPT_DESCRIPTIONS = {
    "detect_items": "Item detection from photos — identifies household items in an image",
    "parse_data_tag": "Data tag parsing — extracts manufacturer, model, serial from product labels",
    "barcode_lookup": "Barcode/UPC lookup — identifies a product from its barcode number",
    "estimate_value": "Item valuation — estimates market value from item details",
    "enrich_data_tag": "Bulk enrichment — extracts details from data tag photos during batch processing",
}
```

**`get_prompt()` service function** — in `/data/NesVentory/backend/app/prompt_service.py`:
```python
from sqlalchemy.orm import Session
from . import models
from .prompt_constants import PROMPT_KEYS

def get_prompt(key: str, language_code: str = "en", db: Session = None) -> str:
    """
    Retrieve the effective prompt for the given key and language.
    Priority: DB custom prompt for (key, language) → DB custom prompt for (key, 'en') → hardcoded default.
    """
    if db is not None:
        # Try language-specific custom prompt
        custom = db.query(models.CustomPrompt).filter(
            models.CustomPrompt.key == key,
            models.CustomPrompt.language_code == language_code,
            models.CustomPrompt.is_active == True
        ).first()
        if custom:
            return custom.content
        # Try English fallback in DB
        if language_code != "en":
            custom_en = db.query(models.CustomPrompt).filter(
                models.CustomPrompt.key == key,
                models.CustomPrompt.language_code == "en",
                models.CustomPrompt.is_active == True
            ).first()
            if custom_en:
                return custom_en.content
    # Fall back to hardcoded constant
    return PROMPT_KEYS.get(key, "")
```

#### New API Endpoints

Add a new file `/data/NesVentory/backend/app/routers/prompts.py` with prefix `/ai/prompts`:

```
GET    /api/ai/prompts              — List all prompt keys with current content (default + custom)
GET    /api/ai/prompts/{key}        — Get a specific prompt (default + custom for each language)
PUT    /api/ai/prompts/{key}        — Create or update a custom prompt for (key, language_code)
DELETE /api/ai/prompts/{key}        — Delete custom prompt (revert to default)
```

All endpoints require admin role. Request body for `PUT`:
```json
{
  "content": "...",
  "language_code": "en"
}
```

**Security — prompt injection risk:**
- Validate `content` length: max 4000 characters (prompts are instruction text, not user-facing content).
- Validate `key` against the whitelist in `PROMPT_KEYS` to prevent creation of arbitrary prompt keys.
- All prompts are admin-only; do not expose prompt content to non-admin users via API.
- The backend always controls the JSON output format instructions at the end of each prompt — the custom prompt replaces only the "instruction" portion, not the "format" portion. Consider splitting prompts into `instruction_part` (editable) and `format_part` (hardcoded suffix that enforces JSON schema).

#### Frontend UI — New Prompts Section in AI Settings Tab

Add a collapsible section in `renderAISettingsTab()` in `AdminPage.tsx`, after the AI Valuation Settings section (after line 2605). Structure:

```jsx
<div className="form-group">
  <label>LLM Prompt Customization</label>
  <small>Edit the prompts used for AI-powered features. Changes take effect immediately.</small>

  {PROMPT_KEYS.map(({ key, description }) => (
    <div key={key} className="prompt-editor">
      <div className="prompt-header">
        <strong>{description}</strong>
        <button onClick={() => handleResetPrompt(key)}>Reset to Default</button>
      </div>
      <textarea
        value={promptValues[key] || ''}
        onChange={(e) => handlePromptChange(key, e.target.value)}
        maxLength={4000}
        rows={8}
      />
      <button onClick={() => handleSavePrompt(key)}>Save</button>
    </div>
  ))}
</div>
```

---

## 5. Key Files to Modify

| File Path | What Changes | Estimated Lines Changed |
|---|---|---|
| `/data/NesVentory/package.json` | Add `react-i18next`, `i18next`, `i18next-browser-languagedetector`, `i18next-http-backend` dependencies | 4 |
| `/data/NesVentory/src/main.tsx` | Import `./lib/i18n` (side-effect import before render) | 1 |
| `/data/NesVentory/src/lib/locale.ts` | Add `language` field to `LocaleConfig`; update `COMMON_LOCALES` to include `uk-UA` explicitly | 10 |
| `/data/NesVentory/src/components/LocaleSettings.tsx` | Add language selector using i18next `changeLanguage()` | 30 |
| `/data/NesVentory/src/components/AdminPage.tsx` | Add prompt editor section to `renderAISettingsTab()`; add state/handlers for prompt CRUD; add API function calls | 150–200 |
| `/data/NesVentory/src/lib/api.ts` | Add TypeScript interfaces + 4 API functions for custom prompts (`getPrompts`, `getPrompt`, `savePrompt`, `resetPrompt`) | 60 |
| `/data/NesVentory/backend/app/models.py` | Add `CustomPrompt` model class; add `description_i18n` column to `Item` model | 25 |
| `/data/NesVentory/backend/app/schemas.py` | Add `description_i18n: Optional[dict]` to `ItemBase` and `ItemUpdate`; add `CustomPromptCreate`, `CustomPromptResponse`, `CustomPromptUpdate` schemas | 40 |
| `/data/NesVentory/backend/app/main.py` | Register `prompts` router; add `"description_i18n"` to `ALLOWED_COLUMNS`; add `("items", "description_i18n", "JSON")` to migrations list; add `"custom_prompts"` to `ALLOWED_TABLES` | 10 |
| `/data/NesVentory/backend/app/routers/ai.py` | Replace 5 inline prompt strings with `get_prompt()` calls + `inject_language()` wrapper; read language from user model or request header | 30 |
| `/data/NesVentory/backend/app/upc_service.py` | Replace inline barcode-lookup prompt at line 156 with `get_prompt()` call | 5 |
| **All 30+ `src/components/*.tsx` files** | Replace hardcoded English strings with `t('key')` calls; import `useTranslation` | ~50–100 per file |

---

## 6. New Files to Create

| File Path | Purpose |
|---|---|
| `/data/NesVentory/src/lib/i18n.ts` | i18next initialization: backend loader, language detection, supported languages |
| `/data/NesVentory/public/locales/en/translation.json` | English translation strings (source of truth for all keys) |
| `/data/NesVentory/public/locales/de/translation.json` | German translations |
| `/data/NesVentory/public/locales/fr/translation.json` | French translations |
| `/data/NesVentory/public/locales/uk/translation.json` | Ukrainian translations |
| `/data/NesVentory/public/locales/ru/translation.json` | Russian translations |
| `/data/NesVentory/backend/app/prompt_constants.py` | Hardcoded default prompt strings extracted from `ai.py`; `PROMPT_KEYS` dict; `PROMPT_DESCRIPTIONS` dict |
| `/data/NesVentory/backend/app/prompt_service.py` | `get_prompt(key, language_code, db)` function; `LANGUAGE_NAMES` mapping; `inject_language(prompt, lang_code)` helper |
| `/data/NesVentory/backend/app/routers/prompts.py` | FastAPI router with `GET/PUT/DELETE /api/ai/prompts[/{key}]` endpoints (admin only) |

---

## 7. Database Migration Plan

NesVentory uses SQLAlchemy's `create_all()` for new tables and a custom `run_migrations()` function in `main.py` for adding columns to existing tables. There is no Alembic. The migration approach is:

**Step 1 — New table `custom_prompts`:**
- Add `CustomPrompt` class to `models.py`.
- `Base.metadata.create_all(engine)` (called in `main.py` startup) will create the new table automatically on next startup.
- No manual SQL needed; no migration entry needed.

**Step 2 — New column `items.description_i18n`:**
- Add `description_i18n = Column(JSON, nullable=True)` to the `Item` model in `models.py` after line 255.
- Add to `ALLOWED_COLUMNS` set in `main.py` line 39: `"description_i18n"`.
- Add to `ALLOWED_TABLES` set if `"items"` is not already there (it is, line 38).
- Add migration tuple to the `migrations` list in `run_migrations()`:
  ```python
  ("items", "description_i18n", "JSON"),
  ```
- On next container restart, `run_migrations()` detects the column is missing and executes:
  ```sql
  ALTER TABLE items ADD COLUMN description_i18n JSON;
  ```

**Step 3 — New column `users.language` (for Phase 2/3):**
- Add `language = Column(String(10), nullable=True)` to `User` model.
- Add `"language"` to `ALLOWED_COLUMNS` in `main.py`.
- Add `"VARCHAR(10)"` to `ALLOWED_TYPES` if not present.
- Add migration tuple: `("users", "language", "VARCHAR(10)")`.

**Rollback strategy:**
- SQLite does not support `DROP COLUMN` in versions before 3.35.0. If rollback is needed, it requires recreating the table. The Docker image uses a modern enough SQLite.
- For production, take a backup of `nesventory.db` before deploying the migration.
- The `description_i18n` column is `nullable=True` with no default — existing rows get `NULL`, which is handled gracefully by `description_i18n = item.description_i18n or {}` in code.

---

## 8. Implementation Order (Phased Delivery)

### Phase 1: User-Editable LLM Prompts (Lowest Risk, No i18n Dependency)

This phase can be shipped independently. It requires no schema change to existing tables and is admin-only.

**New files to create:**
- `/data/NesVentory/backend/app/prompt_constants.py`
- `/data/NesVentory/backend/app/prompt_service.py`
- `/data/NesVentory/backend/app/routers/prompts.py`

**Files to modify:**
- `/data/NesVentory/backend/app/models.py` — add `CustomPrompt` class
- `/data/NesVentory/backend/app/schemas.py` — add prompt schemas
- `/data/NesVentory/backend/app/main.py` — register prompts router, import
- `/data/NesVentory/backend/app/routers/ai.py` — replace 7 inline prompt strings with `get_prompt()` calls (language_code hardcoded to `"en"` for now)
- `/data/NesVentory/backend/app/upc_service.py` — replace 1 inline prompt
- `/data/NesVentory/src/components/AdminPage.tsx` — add prompt editor UI section
- `/data/NesVentory/src/lib/api.ts` — add prompt CRUD API functions

**Validation:** Admin can edit the `detect_items` prompt in the UI, submit a photo, and see the custom prompt's behavior reflected in the results. "Reset to Default" removes the DB record and reverts to `prompt_constants.py`.

### Phase 2: LLM Language Adaptation (Depends on Phase 1)

Phase 1 must be complete so that `get_prompt()` is the single point of control.

**New files to create:**
- None (language injection logic goes in `prompt_service.py` which already exists)

**Files to modify:**
- `/data/NesVentory/backend/app/models.py` — add `language = Column(String(10), nullable=True)` to `User` model
- `/data/NesVentory/backend/app/main.py` — add `("users", "language", "VARCHAR(10)")` to migrations, add `"language"` to `ALLOWED_COLUMNS`, add `"VARCHAR(10)"` to `ALLOWED_TYPES`
- `/data/NesVentory/backend/app/schemas.py` — add `language: Optional[str] = "en"` to `User` and `UserRead` schemas
- `/data/NesVentory/backend/app/routers/ai.py` — pass `current_user.language or "en"` to `get_prompt()` / `inject_language()` on the 5 language-sensitive prompts
- `/data/NesVentory/backend/app/routers/users.py` — add language field to user update endpoint
- `/data/NesVentory/src/lib/api.ts` — add language to user update API call
- `/data/NesVentory/src/components/UserSettings.tsx` — add language selector (may overlap with Phase 3 UI, coordinate)
- `/data/NesVentory/src/components/LocaleSettings.tsx` — wire UI language selector to `User.language` update API (not just localStorage)

**Validation:** A user with `language = "de"` runs "Run AI Valuation" or scans a photo; returned descriptions are in German.

### Phase 3: Frontend i18n (Large but Isolated)

Can be done in parallel with Phase 2 since it touches only frontend files.

**New files to create:**
- `/data/NesVentory/src/lib/i18n.ts`
- `/data/NesVentory/public/locales/en/translation.json` (and de, fr, uk, ru variants)

**Files to modify:**
- `/data/NesVentory/package.json` — add i18n dependencies
- `/data/NesVentory/src/main.tsx` — import `./lib/i18n`
- **All ~31 component files** — replace hardcoded strings with `t('key')` calls
- `/data/NesVentory/src/lib/locale.ts` — add `language` to `LocaleConfig`
- `/data/NesVentory/src/components/LocaleSettings.tsx` — add language selector

**Suggested component migration order** (smallest/simplest first to build pattern):
1. `LoginForm.tsx`, `RegisterForm.tsx` (simple, few strings)
2. `SetPasswordModal.tsx`, `OIDCCallback.tsx`
3. `Layout.tsx` (navigation labels)
4. `ThemeSettings.tsx`, `LocaleSettings.tsx`
5. `UserSettings.tsx`
6. `Status.tsx`
7. `ItemForm.tsx`, `AddItemModal.tsx`
8. `ItemDetails.tsx`, `ItemsTable.tsx`
9. `InventoryPage.tsx`
10. `AdminPage.tsx` (largest, ~3800 lines — do last)

**Validation:** Switch UI to German; all labels, buttons, and error messages render in German. Numbers/dates still formatted using `LocaleConfig.locale`.

### Phase 4: Bilingual Data Storage (Highest Risk, Deliver Last)

**New files to create:**
- None

**Files to modify:**
- `/data/NesVentory/backend/app/models.py` — add `description_i18n` to `Item`
- `/data/NesVentory/backend/app/schemas.py` — add `description_i18n` to `ItemBase`, `ItemUpdate`
- `/data/NesVentory/backend/app/main.py` — add migration entry
- `/data/NesVentory/backend/app/routers/ai.py` — populate `description_i18n` when AI generates a description
- `/data/NesVentory/src/lib/api.ts` — add `description_i18n?: Record<string, string>` to `Item` interface
- `/data/NesVentory/src/components/ItemDetails.tsx` — display language-specific description when available
- `/data/NesVentory/src/components/ItemForm.tsx` — optionally show `description_i18n` fields for manual editing

**Validation:** Run AI item detection with language set to German; the created item has `description_i18n: {"de": "Rotes Ledersofa"}` and `description: "Rotes Ledersofa"`. Switch UI to English; item shows `description_i18n.en` if available, otherwise falls back to `description`.

---

## 9. Open Questions

1. **Language switcher vs. locale selector:** Currently `LocaleSettings.tsx` controls number/date formatting via `Intl`. Should the UI language (i18n) be a separate setting, or merged into the same screen? If merged, the `LocaleConfig` in `locale.ts` needs a `language` field and the storage key `nesventory_lang` either merges with or replaces `NesVentory_locale_config`. Decision needed before Phase 3 starts.

2. **Scope of `description_i18n`:** The issue mentions bilingual item descriptions, but `Location.description`, `MaintenanceTask.description`, and `MaintenanceTask.name` are also free-text fields. Should `description_i18n` be added to locations and maintenance tasks as well, or scoped to `Item` only for the initial implementation?

3. **Bulk AI operations and language:** The scheduled AI valuation (`run_ai_valuation`) and the bulk enrichment (`enrich_items_from_data_tags`) are backend-triggered without a frontend caller. If we add `User.language` to the model (Phase 2), should bulk operations use the triggering user's language preference? Or always use English for structured outputs? Clarification needed.

4. **Custom prompt security model:** Should prompt editing be available to all admin users, or only to a super-admin role? Currently all admin users have equal access. A malicious or misconfigured prompt could cause the AI to output incorrect JSON, breaking the item detection flow. Should there be a prompt syntax validation step (e.g. require the prompt to include `Return ONLY a JSON`)?

5. **Translation file maintenance:** Who is responsible for translating the `en/translation.json` into `de`, `fr`, `uk`, `ru`? Will translations be maintained in the repository, crowd-sourced, or machine-translated initially? This affects the timeline for Phase 3 significantly. If machine translation is used initially, a contributor workflow for corrections should be established.

6. **i18n and RTL languages:** The current CSS does not handle right-to-left text direction. Arabic (`ar-SA`) and Hebrew are in scope for `COMMON_LOCALES`. Should Phase 3 scope only LTR languages? If Arabic is included, CSS changes to `dir="rtl"` are needed in the document root.

7. **Prompt templates with placeholders:** The `barcode_lookup` prompt (line 1190 in `ai.py`) and `estimate_value` prompt (line 1815) contain dynamic content interpolated via f-strings (UPC code, item details). The `CustomPrompt.content` must support placeholder syntax. If admins edit these prompts, they need to know which placeholders are mandatory (e.g. `{upc_clean}`, `{item_description}`). A documentation or UI hint mechanism is needed.

8. **Backward compatibility for mobile apps:** The project mentions `GET /token` root-level endpoint for mobile app compatibility (API docs line 63). If `description_i18n` is added to the `Item` API response, will any existing mobile clients break on unexpected fields? Pydantic response models filter by default, but if clients are strict about schema, a versioned API path or feature flag may be needed.

---

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Phase 3 scope creep — string extraction is more work than expected.** The ~3800-line `AdminPage.tsx` alone likely contains 200+ distinct strings. Translating 31 files while maintaining the app in parallel creates long-lived feature branches. | High | Medium | Split Phase 3 into sub-phases by component group. Use automated extraction (`i18next-parser`) to generate the initial key list rather than manual extraction. Establish a `i18next-scanner` pre-commit hook to catch untranslated strings. |
| **Custom prompt breaks JSON output contract.** An admin might accidentally delete the `Return ONLY a JSON` instruction from a prompt, causing the parser to fail and returning HTTP 500 to all users. | Medium | High | Enforce prompt validation: require that saved prompts contain the expected JSON format instruction (a required suffix). Alternatively, split prompts into an editable `instruction` segment and a hardcoded `format_instruction` suffix that is always appended by `get_prompt()`. Add a "Test Prompt" dry-run button in the UI that fires a test request and shows the raw AI response. |
| **`items.description_i18n` migration fails on existing databases.** SQLite `ALTER TABLE ADD COLUMN` with `JSON` type may behave differently depending on SQLite version embedded in the Docker image. | Low | High | Test the migration on a copy of a production database before deploying. The `run_migrations()` handler already catches exceptions gracefully (line 124) and prints a warning rather than crashing, so a failed column add does not break startup. Verify SQLite version in the Dockerfile. |
| **Language stored only in `localStorage` breaks server-side operations.** If Phase 2 (language in `User.language`) is not implemented, background valuation jobs and any future server-side rendering will have no language context. | High (if skipped) | Medium | Implement `User.language` as part of Phase 2. Do not rely solely on localStorage/headers for language state. |
| **Translation quality degrades user trust.** Machine-translated strings in a professional inventory application may contain errors that confuse or embarrass users. | Medium | Medium | Ship Phase 3 with English only initially, plus a clear language selector that shows "Community translations" as a label. Establish a GitHub-based translation contribution workflow using i18n standards (XLIFF or JSON PRs). Do not ship German/French/Ukrainian/Russian until reviewed by a native speaker. |

---

## 11. Line Reference Table

| File | Line Range | Content |
|---|---|---|
| `/data/NesVentory/package.json` | 9–13 | Runtime dependencies — no i18n libs present |
| `/data/NesVentory/backend/requirements.txt` | 1–29 | All backend deps — no i18n packages |
| `/data/NesVentory/backend/app/models.py` | 76–138 | `User` model — no `language` field |
| `/data/NesVentory/backend/app/models.py` | 250–315 | `Item` model — `description: Text` at line 255, no `description_i18n` |
| `/data/NesVentory/backend/app/models.py` | 161–247 | `Location` model — `description: Text` at line 180 |
| `/data/NesVentory/backend/app/models.py` | 392–425 | `MaintenanceTask` model — `name: String(255)` line 398, `description: Text` line 399 |
| `/data/NesVentory/backend/app/models.py` | 441–465 | `SystemSettings` model — no language/locale fields |
| `/data/NesVentory/backend/app/models.py` | 468–506 | `Plugin` model — `description: Text` at line 479 |
| `/data/NesVentory/backend/app/schemas.py` | 415–489 | `ItemBase`, `ItemUpdate`, `Item` schemas — `description: Optional[str]` at line 419, no `description_i18n` |
| `/data/NesVentory/backend/app/schemas.py` | 169–188 | `SystemSettings` schema — no language field |
| `/data/NesVentory/backend/app/settings_service.py` | 1–113 | Settings service — pattern to follow for `get_prompt()` service |
| `/data/NesVentory/backend/app/config.py` | 18–82 | `Settings` class — no `LANGUAGE` or `LOCALE` env var |
| `/data/NesVentory/backend/app/routers/ai.py` | 1–67 | Imports, constants, throttling — no prompt constants |
| `/data/NesVentory/backend/app/routers/ai.py` | 114–214 | Schema classes (`DetectedItem`, `DataTagInfo`, etc.) |
| `/data/NesVentory/backend/app/routers/ai.py` | 726–862 | `detect_items()` endpoint — prompt at lines **798–815** |
| `/data/NesVentory/backend/app/routers/ai.py` | 865–1016 | `parse_data_tag()` endpoint — prompt at lines **935–967** |
| `/data/NesVentory/backend/app/routers/ai.py` | 1109–1271 | `lookup_barcode()` endpoint — prompt at lines **1190–1226** |
| `/data/NesVentory/backend/app/routers/ai.py` | 1474–1558 | `scan_qr_code()` endpoint — prompt at lines **1513–1531** |
| `/data/NesVentory/backend/app/routers/ai.py` | 1614–1766 | `scan_barcode_image()` endpoint — prompt at lines **1695–1718** |
| `/data/NesVentory/backend/app/routers/ai.py` | 1769–1856 | `estimate_item_value_with_ai()` function — prompt at lines **1815–1823** |
| `/data/NesVentory/backend/app/routers/ai.py` | 1968–2089 | `enrich_item_from_data_tag_photo()` function — prompt at lines **2026–2042** |
| `/data/NesVentory/backend/app/upc_service.py` | 144–205 | `GeminiUPCDatabase.lookup()` — duplicate barcode-lookup prompt at lines **156–192** |
| `/data/NesVentory/backend/app/main.py` | 28–125 | `run_migrations()` — pattern to follow for new migration entries |
| `/data/NesVentory/backend/app/main.py` | 36–44 | `ALLOWED_TABLES`, `ALLOWED_COLUMNS`, `ALLOWED_TYPES` whitelists |
| `/data/NesVentory/backend/app/main.py` | 47–89 | Migrations list — where to add new column migrations |
| `/data/NesVentory/src/lib/locale.ts` | 1–136 | `LocaleConfig`, `COMMON_LOCALES`, localStorage key `NesVentory_locale_config` — no i18n language key |
| `/data/NesVentory/src/components/LocaleSettings.tsx` | 1–214 | Locale settings UI — controls formatting only, no UI language selector |
| `/data/NesVentory/src/components/AdminPage.tsx` | 1–66 | Imports — no i18n imports |
| `/data/NesVentory/src/components/AdminPage.tsx` | 100 | `MainTabType` — `'ai-settings'` tab exists |
| `/data/NesVentory/src/components/AdminPage.tsx` | 181–231 | State declarations for AI settings — no prompt state |
| `/data/NesVentory/src/components/AdminPage.tsx` | 2488–2605 | AI Valuation Settings section in tab |
| `/data/NesVentory/src/components/AdminPage.tsx` | 2607–2795 | UPC Database section in tab |
| `/data/NesVentory/src/components/AdminPage.tsx` | 2801–2940 | `renderAISettingsTab()` — AI Provider Settings with Gemini model selector |
| `/data/NesVentory/src/App.tsx` | 1–60 | App entry point — no i18n provider |
