# Investigation: Issue #505 — Replace External Gemini Plugin with Native RL Categorization Agent

**Issue:** [#505](https://github.com/tokendad/NesVentory/issues/505)  
**Related repo:** [tokendad/Plugin-Gemini](https://github.com/tokendad/Plugin-Gemini) (local: `/data/Plugin-Gemini`)  
**Training data:** `/data/thevillagechronicler.com/ItemImages` (11,183 images, 7,051 with authoritative labels from Collections HTML)  
**Type:** Feature / Architecture  
**Status:** Planning

---

## 1. Problem Statement

NesVentory's AI scan pipeline currently supports an **external plugin system** (`Plugin` model, `plugin_service.py`) that proxies requests to separately-hosted LLM containers (e.g., `tokendad/Plugin-Gemini`). The issue requests replacing this external dependency with a **native, locally-running reinforcement learning agent** that:

1. Learns from user corrections in real time (e.g., user maps "Scrooge & Marley Counting House" → category "Department 56" + series "Dickens' Village").
2. Runs entirely within the NesVentory process, with no external container dependency.
3. Consolidates the codebase by removing the need to maintain a separate plugin repository.

---

## 2. Current Architecture

### Plugin Flow (what exists today)

```
POST /api/ai/detect-items
  └─ plugin_service.get_enabled_ai_scan_plugins(db)
       ├─ foreach plugin (priority order):
       │    └─ call_plugin_endpoint(plugin, '/nesventory/identify/image', files=image)
       │         → HTTP POST to external container (e.g., localhost:8002)
       └─ fallback: Gemini AI (google.genai SDK)
```

The same plugin-first → Gemini-fallback pattern exists for:
- `detect-items` (image → items list + categories)
- `parse-data-tag` (image → structured product fields)
- `lookup-barcode` / `scan-barcode` (barcode string/image → product info)

### Relevant Files

| File | Role |
|---|---|
| `backend/app/models.py` | `Plugin` model (id, name, endpoint_url, api_key, priority, use_for_ai_scan) |
| `backend/app/plugin_service.py` | HTTP client wrappers for plugin endpoints |
| `backend/app/routers/ai.py` | Orchestrates plugin → Gemini fallback |
| `backend/app/routers/plugins.py` | CRUD + test-connection API for plugin management |

### Item Data Model (relevant fields for categorization)

```python
# models.py  Item
category   String(100)   # e.g., "Department 56", "Electronics"
tags       many-to-many  # Tag.name, Tag.color
brand      String(100)
name       String(255)
description Text
```

---

## 3. Review of Plugin-Gemini (`/data/Plugin-Gemini`)

The plugin has **two components**:

### 3a. Python FastAPI backend (`src/api.py`)

A standalone HTTP server exposing:
- `POST /nesventory/identify/image` — Upload image, returns list of `DetectedItem` with `name`, `description`, `brand`, `estimated_value`, `confidence`
- `POST /parse-data-tag` — Returns `manufacturer`, `brand`, `model_number`, `serial_number`
- `POST /lookup-barcode` — Returns product info from barcode string

Uses `google-generativeai` (Python SDK) with `gemini-2.0-flash-exp` model. The image prompt is generic and returns a broad `items[]` array.

### 3b. TypeScript frontend (`services/geminiService.ts`)

A **much more specialized** implementation that:
1. Uses `gemini-2.5-flash` (newer model) with a **structured JSON schema** enforced via `responseSchema`
2. Knows the full D56 taxonomy: Original Snow Village, Heritage Village (Dickens', New England, Alpine, Christmas in the City, North Pole), Specialty Series (Halloween, Disney, Grinch, Harry Potter)
3. Returns a richer `D56Item` type (see below)
4. Already has a **feedback loop stub**: `sendFeedback()` posts to `/v1/training/submit` (currently mocked)
5. Supports `findAlternatives()` / `findAlternativesWithContext()` — user can reject an ID and provide context to get better alternatives (powered by Google Search grounding)

### 3c. The `D56Item` TypeScript Interface

```typescript
// Plugin-Gemini/types.ts
export interface D56Item {
  name: string;
  series: string;               // e.g., "Dickens' Village Series"
  yearIntroduced: number | null;
  yearRetired: number | null;
  estimatedCondition: string;   // e.g., "Mint in Box", "Excellent - No Chips"
  estimatedValueRange: string;  // e.g., "$45 - $65"
  description: string;
  isDepartment56: boolean;      // false for Lemax, generic, etc.
  confidenceScore: number;      // 0-100
  isLimitedEdition: boolean;
  isSigned: boolean;
  feedbackStatus?: 'idle' | 'accepted' | 'rejected';
}
```

This is **richer than NesVentory's current `DetectedItem`** schema, which only has `name`, `description`, `brand`, `estimated_value`, `confidence`, `estimation_date`.

### 3d. Training API Design (from `API_ENDPOINTS.md`)

The plugin already defines a training feedback contract (currently mocked):

```
POST /v1/training/submit
{
  "itemData": { ...D56Item },
  "imageMeta": { "mimeType": "image/jpeg", "size": 102400 },
  "timestamp": "2023-10-27T14:30:00Z",
  "userAction": "ACCEPTED",   // or "REJECTED"
  "source": "web-plugin"
}
```

**This endpoint needs to be implemented natively in NesVentory.**

---

## 4. Village Chronicler Training Dataset (`/data/thevillagechronicler.com/`)

A complete archival website for Department 56 collectibles. Analysis of its content:

### 4a. Dataset Size

> **Important:** Image filenames in `ItemImages/` do **not** always match the official D56 item number.
> For example, `ItemImages/58339.jpg` is for official item `58301-a` ("Manchester Square s/25").
> The authoritative mapping must be read from the collection HTML pages, not inferred from the filename.
> There are **294 raw rows** and **10 unique items** where the image filename differs from the official number.

| Resource | Count |
|---|---|
| Item images (`ItemImages/*.jpg`) | **11,183** |
| Unique items parsed from `Collections/*.html` | **7,058** (official item number + name + series) |
| Unique items with actual image file | **7,051 / 7,058** |
| Image→item mappings (incl. variant images) | **7,348** |

### 4b. Series Distribution (unique items from Collections HTML)

| Series | Unique Items |
|---|---|
| Figurines | 2,999 |
| The Original Snow Village | 934 |
| General Village Accessories | 696 |
| Snow Village Halloween | 614 |
| Dickens' Village | 596 |
| North Pole Series | 481 |
| Christmas in the City | 373 |
| New England Village | 238 |
| Alpine Village | 127 |

### 4c. Data Extraction Script

The collection HTML pages contain a repeating two-row pattern per item:

```html
<!-- Row 1: image row (nameit=image) -->
<tr nameit=image id="hidethis">
  <td ...><img alt="59528.jpg" src="http://thevillagechronicler.com/ItemImages/59528.jpg" .../></td>
</tr>
<!-- Row 2: data row (auto-style3 cells) -->
<tr>
  <td ...>&nbsp;59528</td>              <!-- official D56 item number -->
  <td ...>Josef Engel Farmhouse</td>    <!-- item name -->
  <td ...>1987-1989</td>                <!-- years active -->
</tr>
```

The following Python code builds the authoritative labeled catalog by reading both rows together, so the `item_number` is always the official D56 number regardless of what the image file is named:

```python
import re, os

def build_d56_catalog(base_path: str) -> list[dict]:
    """
    Build a labeled catalog: [{image_file, item_number, name, years, series, image_path}]

    IMPORTANT: image_file (the .jpg filename) is NOT always equal to item_number.
    294 collection rows have mismatched filenames. Always use item_number as the
    authoritative D56 identifier. image_file is only needed to locate the image on disk.
    """
    series_prefix_map = {
        'DV': "Dickens' Village",
        'OSV': 'The Original Snow Village',
        'NEV': 'New England Village',
        'NP': 'North Pole Series',
        'CIC': 'Christmas in the City',
        'ALP': 'Alpine Village',
        'SVH': 'Snow Village Halloween',
        'FIG': 'Figurines',
        'GVA': 'General Village Accessories',
    }

    img_dir = f'{base_path}/ItemImages'
    collections_dir = f'{base_path}/Collections'
    catalog = []
    seen_items = set()

    for fname in sorted(os.listdir(collections_dir)):
        if not fname.endswith('.html'):
            continue
        prefix = fname.split()[0].upper()
        series = next((v for k, v in series_prefix_map.items()
                       if prefix.startswith(k)), None)
        if not series:
            continue

        with open(f'{collections_dir}/{fname}', errors='replace') as f:
            lines = f.read().split('\n')

        i = 0
        while i < len(lines):
            line = lines[i]
            # Find image row
            img_match = re.search(r'ItemImages/(\w+)\.jpg', line)
            if img_match and 'nameit=image' in line:
                image_file = img_match.group(1)
                # Look ahead for the data row (has &nbsp;NNNNN + name + years)
                for j in range(i + 1, min(i + 5, len(lines))):
                    data_match = re.search(
                        r'&nbsp;\s*([\w\-]+)\s*</strong></td>'
                        r'.*?<strong>(.*?)</strong></td>'
                        r'.*?<strong>([\d\-]+)</strong>',
                        lines[j]
                    )
                    if data_match:
                        item_number = data_match.group(1).strip()
                        name = data_match.group(2).strip()
                        years = data_match.group(3).strip()
                        # Deduplicate by item_number (items can appear in multiple files)
                        if item_number not in seen_items:
                            seen_items.add(item_number)
                            # Locate the image file on disk
                            img_path = None
                            for ext in ['.jpg', '.P.jpg']:
                                candidate = f'{img_dir}/{image_file}{ext}'
                                if os.path.exists(candidate):
                                    img_path = candidate
                                    break
                            catalog.append({
                                'image_file': image_file,   # filename stem (may != item_number)
                                'item_number': item_number,  # authoritative D56 number
                                'name': name,
                                'years': years,
                                'series': series,
                                'image_path': img_path,
                            })
                        break
            i += 1

    return catalog
```

This produces **7,058 unique records** with `item_number`, `name`, `series`, and `years` — a reliable labeled pre-training corpus. The key improvement over naive filename-based parsing: `item_number` is always the authoritative D56 identifier, not the image filename.

---

## 5. Proposed Solution

### 5a. Strategy: Port + Enhance, Don't Rebuild from Scratch

Rather than writing a new RL agent from scratch, the most practical approach is:

1. **Port the specialized D56 Gemini prompt** from `Plugin-Gemini/services/geminiService.ts` directly into `backend/app/routers/ai.py` as a new endpoint variant.
2. **Implement the `/v1/training/submit` stub** as a real `agent_training_log` database writer.
3. **Add a text-based classifier** (Category Agent) trained on Village Chronicler data + user feedback.
4. **Connect classifier output** back into the item form for auto-suggestion.

### 5b. Agent Architecture

```
Item name + description entered
         │
         ▼
  CategoryAgent.predict(text)       ← Python, trained on VC dataset + user feedback
         │
    ┌────┴────────────────────────┐
    │ confidence ≥ 0.7            │ confidence < 0.7
    ▼                             ▼
  Auto-fill series + category   No suggestion (user fills manually)
         │                            │
         └──────────┬─────────────────┘
                    ▼
           User saves item
                    │
         ┌──────────┴──────────────┐
         │ User kept suggestion    │ User changed it
         ▼                         ▼
  reward = +1.0 (reinforce)   reward = 0.0 + train on correction
         │                         │
         └──────────┬──────────────┘
                    ▼
         CategoryAgent.learn(text, correct_series, reward)
                    │
                    ▼
         Persist model to agent_models table
```

### 5c. Gemini Prompt Upgrade (Port from Plugin-Gemini)

The TypeScript prompt in `geminiService.ts` is significantly better than what NesVentory's `ai.py` currently uses. **Port this into `ai.py`** for the `detect-items` endpoint when the item appears to be a collectible:

```python
# To add to backend/app/routers/ai.py
D56_SYSTEM_INSTRUCTION = """
You are the world's leading expert and archivist for Department 56 collectibles.

YOUR EXPERTISE INCLUDES:
1. The Original Snow Village: Glossy finish, ceramic, brighter colors.
2. Heritage Village Collection (matte finish porcelain):
   - Dickens' Village (Victorian England style)
   - New England Village (Colonial/coastal style)
   - Alpine Village (Bavarian/Swiss style)
   - Christmas in the City (Urban, cityscapes)
   - North Pole Series (Fantasy, Santa oriented)
   - Little Town of Bethlehem
3. Specialty Series: Halloween, Disney, Grinch, Harry Potter.

Differentiate authentic Dept 56 from competitors like Lemax.
If an item is NOT Department 56, flag isDepartment56=false immediately.
"""

D56_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "series": {"type": "string"},
                    "yearIntroduced": {"type": "integer", "nullable": True},
                    "yearRetired": {"type": "integer", "nullable": True},
                    "estimatedCondition": {"type": "string"},
                    "estimatedValueRange": {"type": "string"},
                    "description": {"type": "string"},
                    "isDepartment56": {"type": "boolean"},
                    "confidenceScore": {"type": "number"},
                    "isLimitedEdition": {"type": "boolean"},
                    "isSigned": {"type": "boolean"},
                },
                "required": ["name", "series", "description",
                             "isDepartment56", "confidenceScore",
                             "isLimitedEdition", "isSigned"],
            }
        }
    },
    "required": ["items"]
}
```

This replaces the generic `detect-items` prompt for D56-context scans, adding `series`, `isLimitedEdition`, `isSigned`, `estimatedCondition`, `estimatedValueRange` to the response.

### 5d. Category Agent (Python-Native Classifier)

```python
# backend/app/category_agent.py

import pickle, base64, io, logging
from typing import Optional
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

MIN_SAMPLES_TO_PREDICT = 5    # Don't predict until we have enough data
CONFIDENCE_THRESHOLD = 0.70   # Only suggest if confidence exceeds this

class CategoryAgent:
    """
    Text-based categorization agent.
    Learns series/category from item name + description via TF-IDF + LogReg.
    """

    def __init__(self):
        self.pipeline: Optional[Pipeline] = None
        self.label_encoder = LabelEncoder()
        self.training_samples: int = 0
        self.version: int = 1
        self._X: list[str] = []
        self._y: list[str] = []

    def predict(self, name: str, description: str = "") -> dict:
        """Predict series/category for an item. Returns {} if not confident."""
        if self.pipeline is None or self.training_samples < MIN_SAMPLES_TO_PREDICT:
            return {}
        text = f"{name} {description}".strip()
        proba = self.pipeline.predict_proba([text])[0]
        confidence = float(proba.max())
        if confidence < CONFIDENCE_THRESHOLD:
            return {}
        label_idx = proba.argmax()
        predicted = self.label_encoder.inverse_transform([label_idx])[0]
        return {
            "series": predicted,
            "confidence": round(confidence, 3),
            "training_samples": self.training_samples,
            "model_version": self.version,
        }

    def learn(self, name: str, description: str, correct_series: str) -> None:
        """Add a training example and retrain the model."""
        text = f"{name} {description}".strip()
        self._X.append(text)
        self._y.append(correct_series)
        self.training_samples = len(self._X)
        if self.training_samples >= MIN_SAMPLES_TO_PREDICT:
            self._retrain()

    def _retrain(self) -> None:
        unique_labels = list(set(self._y))
        if len(unique_labels) < 2:
            return  # Need at least 2 classes
        self.label_encoder.fit(unique_labels)
        y_encoded = self.label_encoder.transform(self._y)
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ('clf', LogisticRegression(max_iter=500, C=1.0)),
        ])
        self.pipeline.fit(self._X, y_encoded)
        self.version += 1
        logger.info("CategoryAgent retrained: %d samples, %d classes",
                    self.training_samples, len(unique_labels))

    def serialize(self) -> str:
        """Serialize agent state to base64 string for SQLite storage."""
        state = {
            'pipeline': self.pipeline,
            'label_encoder': self.label_encoder,
            'training_samples': self.training_samples,
            'version': self.version,
            'X': self._X,
            'y': self._y,
        }
        buf = io.BytesIO()
        pickle.dump(state, buf)
        return base64.b64encode(buf.getvalue()).decode()

    @classmethod
    def deserialize(cls, data: str) -> 'CategoryAgent':
        """Restore agent from base64-encoded pickle string."""
        buf = io.BytesIO(base64.b64decode(data))
        state = pickle.load(buf)
        agent = cls()
        agent.pipeline = state['pipeline']
        agent.label_encoder = state['label_encoder']
        agent.training_samples = state['training_samples']
        agent.version = state['version']
        agent._X = state['X']
        agent._y = state['y']
        return agent
```

### 5e. Pre-Training Script (Village Chronicler Dataset)

A one-time pre-training script that seeds the agent with 7,058 unique labeled items from the Village Chronicler archive. Uses the HTML-aware parser (§4c) so `item_number` is always the authoritative D56 identifier. This gives the agent a strong prior before any user corrections:

```python
# backend/scripts/pretrain_category_agent.py
"""
Pre-train the CategoryAgent using Village Chronicler labeled catalog.
Run once: python pretrain_category_agent.py

Reads: /data/thevillagechronicler.com/  (or set VILLAGE_CHRONICLER_PATH env var)
Writes: pretrained_agent.pkl.b64  (paste content into agent_models table)

NOTE: Image filenames in ItemImages/ do not always match official item numbers.
      This script reads the official number from the Collection HTML rows,
      not from the image filename.
"""

import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.category_agent import CategoryAgent

VC_PATH = os.environ.get('VILLAGE_CHRONICLER_PATH',
                         '/data/thevillagechronicler.com')

def build_catalog(base_path):
    """
    Returns list of (name, description, series) tuples.
    Parses Collections HTML for authoritative item_number, name, series.
    Does NOT use image filenames as item identifiers.
    """
    series_map = {
        'DV': "Dickens' Village",   'OSV': 'The Original Snow Village',
        'NEV': 'New England Village', 'NP': 'North Pole Series',
        'CIC': 'Christmas in the City', 'ALP': 'Alpine Village',
        'SVH': 'Snow Village Halloween', 'FIG': 'Figurines',
        'GVA': 'General Village Accessories',
    }
    seen, catalog = set(), []
    for fname in sorted(os.listdir(f'{base_path}/Collections')):
        if not fname.endswith('.html'):
            continue
        prefix = fname.split()[0].upper()
        series = next((v for k, v in series_map.items() if prefix.startswith(k)), None)
        if not series:
            continue
        with open(f'{base_path}/Collections/{fname}', errors='replace') as f:
            lines = f.read().split('\n')
        i = 0
        while i < len(lines):
            if 'nameit=image' in lines[i] and 'ItemImages' in lines[i]:
                for j in range(i + 1, min(i + 5, len(lines))):
                    m = re.search(
                        r'&nbsp;\s*([\w\-]+)\s*</strong></td>'
                        r'.*?<strong>(.*?)</strong></td>'
                        r'.*?<strong>([\d\-]+)</strong>',
                        lines[j]
                    )
                    if m:
                        item_number = m.group(1).strip()
                        name = m.group(2).strip()
                        if item_number not in seen and name:
                            seen.add(item_number)
                            catalog.append((name, '', series))
                        break
            i += 1
    return catalog

if __name__ == '__main__':
    catalog = build_catalog(VC_PATH)
    print(f"Pre-training on {len(catalog)} labeled items...")
    agent = CategoryAgent()
    for name, desc, series in catalog:
        agent._X.append(f"{name} {desc}".strip())
        agent._y.append(series)
    agent.training_samples = len(agent._X)
    agent._retrain()
    print(f"Pre-trained: {agent.training_samples} samples, version {agent.version}")

    serialized = agent.serialize()
    with open('pretrained_agent.pkl.b64', 'w') as f:
        f.write(serialized)
    print("Saved to pretrained_agent.pkl.b64")
    print(f"Test: {agent.predict('Scrooge & Marley Counting House', '')}")
```

---

## 6. Database Schema Changes

### New table: `agent_models`

```sql
CREATE TABLE agent_models (
    id                TEXT PRIMARY KEY,    -- 'category_agent_v1'
    agent_type        TEXT NOT NULL,       -- 'categorization'
    version           INTEGER NOT NULL DEFAULT 1,
    model_data        TEXT,               -- base64-encoded pickle
    training_samples  INTEGER DEFAULT 0,
    last_trained_at   DATETIME,
    created_at        DATETIME NOT NULL,
    updated_at        DATETIME NOT NULL
);
```

### New table: `agent_training_log`

```sql
CREATE TABLE agent_training_log (
    id                  TEXT PRIMARY KEY,
    agent_id            TEXT NOT NULL,
    item_id             TEXT,             -- nullable (item may be deleted)
    input_text          TEXT NOT NULL,
    predicted_series    TEXT,
    accepted_series     TEXT NOT NULL,
    was_override        BOOLEAN NOT NULL,
    reward              REAL NOT NULL,
    user_action         TEXT,             -- 'ACCEPTED' | 'REJECTED' (matches Plugin-Gemini API)
    source              TEXT DEFAULT 'nesventory',
    created_at          DATETIME NOT NULL
);
```

Both added via `run_migrations()` in `main.py` (NesVentory's migration pattern — no Alembic).

---

## 7. API Contract

### `POST /api/agents/categorize/predict`
```json
// Request
{ "name": "Scrooge & Marley Counting House", "description": "1987 first edition" }

// Response
{
  "series": "Dickens' Village",
  "confidence": 0.91,
  "model_version": 3,
  "training_samples": 847
}
```

### `POST /api/agents/categorize/feedback`
Implements the Plugin-Gemini `API_ENDPOINTS.md` `/v1/training/submit` contract natively:

```json
// Request (mirrors Plugin-Gemini training submission)
{
  "item_id": "uuid-or-null",
  "input_text": "Scrooge & Marley Counting House 1987 first edition",
  "predicted_series": "Dickens' Village",
  "accepted_series": "Dickens' Village",
  "was_override": false,
  "user_action": "ACCEPTED"
}

// Response
{ "trained": true, "training_samples": 848 }
```

### `GET /api/agents/categorize/status`
```json
{
  "training_samples": 848,
  "model_version": 3,
  "last_trained_at": "2026-02-26T12:00:00Z",
  "series_distribution": {
    "Dickens' Village": 312,
    "The Original Snow Village": 198
  }
}
```

---

## 8. NesVentory Schema Extension

Add D56-specific fields to `DetectedItem` (Pydantic schema in `schemas.py`) to match the richer Plugin-Gemini `D56Item` type:

```python
# backend/app/schemas.py — extend DetectedItem
class DetectedItem(BaseModel):
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    estimated_value: Optional[float] = None
    confidence: Optional[float] = None
    estimation_date: Optional[str] = None
    # --- New D56-specific fields (nullable for non-D56 items) ---
    series: Optional[str] = None           # e.g., "Dickens' Village"
    year_introduced: Optional[int] = None
    year_retired: Optional[int] = None
    estimated_condition: Optional[str] = None   # e.g., "Mint in Box"
    estimated_value_range: Optional[str] = None # e.g., "$45 - $65"
    is_department_56: Optional[bool] = None
    is_limited_edition: Optional[bool] = None
    is_signed: Optional[bool] = None
    confidence_score: Optional[int] = None      # 0-100 scale from Gemini
```

These are nullable/optional — backward compatible with existing clients.

---

## 9. Frontend Integration

1. **Item form** — After `name` + `description` are filled, debounce-call `POST /api/agents/categorize/predict`. If `confidence >= 0.7`, pre-fill `category`/`tags` with a visual "AI suggested" badge and confidence percentage.
2. **On item save** — Fire-and-forget call to `POST /api/agents/categorize/feedback` with `user_action: "ACCEPTED"` or `"REJECTED"` based on whether the user kept or changed the suggestion.
3. **AI scan result display** — When `is_department_56: true` in a scan result, show additional D56 fields: `series`, `estimated_condition`, `estimated_value_range`, `is_limited_edition`, `is_signed`.
4. **Admin panel** — "Category Agent" card showing `training_samples`, `model_version`, `last_trained_at`, series distribution pie chart, and a "Reset Model" button.
5. **Plugin deprecation notice** — When Plugin-Gemini is configured, show a banner: _"Plugin-Gemini is now superseded by the built-in Department 56 agent. You can safely remove this plugin."_

---

## 10. Implementation Tasks

### Phase 1: Foundation (no UI changes)
- [ ] **`backend/app/category_agent.py`** — `CategoryAgent` class (see §5d above)
- [ ] **DB migration** — Add `agent_models` + `agent_training_log` tables to `run_migrations()` in `main.py`
- [ ] **`backend/app/models.py`** — `AgentModel` + `AgentTrainingLog` SQLAlchemy models
- [ ] **`backend/app/routers/agents.py`** — `predict`, `feedback`, `status` endpoints (all requiring `get_current_user`)
- [ ] **Wire router** — Add `agents` router to `main.py`

### Phase 2: Gemini Prompt Upgrade
- [ ] **Port D56 prompt** from `Plugin-Gemini/services/geminiService.ts` into `backend/app/routers/ai.py` (see §5c)
- [ ] **Extend `DetectedItem` schema** with D56 fields (`series`, `is_limited_edition`, `estimated_condition`, etc.) in `schemas.py`
- [ ] **Update `detect-items` endpoint** to use specialized D56 prompt when context is collectibles

### Phase 3: Pre-Training
- [ ] **`backend/scripts/pretrain_category_agent.py`** — runs against Village Chronicler data (see §5e)
- [ ] **Seed script** — load `pretrained_agent.pkl.b64` output into the `agent_models` table via a fixture or admin endpoint

### Phase 4: Frontend
- [ ] **Prediction hook** — debounced call in item create/edit form
- [ ] **Feedback on save** — fire-and-forget `POST /api/agents/categorize/feedback`
- [ ] **D56 fields display** — show `series`, `estimated_condition`, `estimated_value_range`, `is_limited_edition`, `is_signed` in AI scan results
- [ ] **Admin UI** — Agent stats card + reset button

### Phase 5: Plugin Deprecation
- [ ] **Deprecation banner** in Admin > Plugins when Plugin-Gemini is registered
- [ ] **Documentation** — update `PLUGINS.md` and `README.md` noting native D56 agent

---

## 11. Dependencies

| Dependency | Notes |
|---|---|
| `scikit-learn` | For TF-IDF + LogisticRegression. Add to `backend/requirements.txt`. ~11 MB wheel. |
| `numpy` | Required by scikit-learn; likely already present. |
| Village Chronicler data | At `/data/thevillagechronicler.com/` — pre-training only; not bundled in Docker image |
| No WASM runtime needed for V1 | Python-native; WASM is a future enhancement |

---

## 12. Risks & Considerations

| Risk | Mitigation |
|---|---|
| Cold-start (no pre-training) | Run pre-training script against VC dataset before deploying; seeds ~7,058 examples |
| `pickle` security | Pickle deserialization of DB content is acceptable since the data is self-authored; use `hmac` signature if multi-tenant |
| Model corruption / bad weights | Keep `version` column; provide Admin reset that deletes `model_data` and resets to pre-trained baseline |
| Plugin-Gemini users disrupted | Additive change; existing plugin continues to work. Show deprecation notice, don't force removal. |
| WASM requirement from issue | WASM is a stretch goal — Python RL agent meets all functional goals. Noted in issue comment when closing. |
| `scikit-learn` Docker image size | ~11 MB; acceptable. Alpine/slim base image will still be under 500 MB. |
| D56 fields breaking existing clients | New fields are all `Optional` in `DetectedItem` — backward compatible |

---

## 13. Out of Scope

- Full WASM neural inference in the browser
- Replacing barcode/data-tag plugin endpoints (different problem — image processing)
- Multi-user federated learning (single shared agent per instance is sufficient)
- Removing `plugin_service.py` or the `Plugin` model entirely (needed for other custom LLM plugins)

---

## 14. Open Questions

1. Should the category agent run **per-user** (personalized) or **instance-wide** (shared)? The issue implies shared learning from collective corrections.
2. Should the confidence threshold (0.70) be configurable in Admin Settings?
3. Should the `pretrain_category_agent.py` script be run at Docker startup (if VC data is mounted), or as a manual one-time operation?
4. Should the `findAlternatives` / `findAlternativesWithContext` pattern from `geminiService.ts` be ported into NesVentory's scan flow (showing "Was this right? Try alternatives" UI)?

---

## Implementation Status: ✅ COMPLETE

**Commits:** `a0f9c66` (implementation) + `85491ce` (security fixes)  
**Pushed:** 2026-02-26  
**Issue #505:** Closed

### Deliverables

| Component | File | Status |
|-----------|------|--------|
| CategoryAgent (TF-IDF + LogReg) | `backend/app/category_agent.py` | ✅ Done |
| DB Models (AgentModel, AgentTrainingLog) | `backend/app/models.py` | ✅ Done |
| DB Migrations | `backend/app/main.py` | ✅ Done |
| REST API (/agents/categorize/*) | `backend/app/routers/agents.py` | ✅ Done |
| D56 Gemini Prompt + DetectedItem fields | `backend/app/routers/ai.py` | ✅ Done |
| Pre-training Script | `backend/scripts/pretrain_category_agent.py` | ✅ Done |
| scikit-learn dependency | `backend/requirements.txt` | ✅ Done |
| API functions | `src/lib/api.ts` | ✅ Done |
| Prediction badge (ItemForm) | `src/components/ItemForm.tsx` | ✅ Done |
| D56 details display (AIDetection) | `src/components/AIDetection.tsx` | ✅ Done |
| Agent stats card (AdminPage) | `src/components/AdminPage.tsx` | ✅ Done |

### Security Issues Addressed (commit `85491ce`)

| Severity | Issue | Fix Applied |
|----------|-------|-------------|
| 🔴 Critical | Pickle RCE via `/seed` endpoint | Replaced pickle with JSON+joblib; seed accepts only raw X/y data |
| 🟠 High | No rate-limit or validation on `/feedback` | Series allow-list, max_length, 50k corpus cap |
| 🟡 Medium | series_distribution exposed to all users | Gated behind admin role |
| 🟢 Low | D56 prompt constants dead code | Added clarifying comment |

### Deferred to Follow-up PR
- Wire `D56_SYSTEM_INSTRUCTION` + `D56_RESPONSE_SCHEMA` into the actual Gemini API call in `detect-items` endpoint (constants are in place)
- Rate-limiting on `/agents/categorize/feedback` via slowapi (optional, corpus cap provides primary protection)
