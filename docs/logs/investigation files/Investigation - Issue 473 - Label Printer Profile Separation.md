# Investigation: Issue #473 - Separate Label and Printer Profiles

**Issue:** [#473 - Refactor: Separate label and printer profiles into distinct configuration entities](https://github.com/tokendad/NesVentory/issues/473)

**Investigation Date:** February 1, 2026

**Status:** 🔍 UNDER INVESTIGATION

---

## Problem Statement

Currently, label and printer profiles are **tightly coupled** within a single `PrinterConfig` entity. This makes it difficult to:
- Support multiple label formats without creating multiple printer profiles
- Reuse label configurations across different printers
- Manage label templates independently from printer hardware selection
- Share label presets across users

## Current Architecture Analysis

### Existing Structure

**Database Storage (`backend/app/models.py`, lines 120-122):**
```python
class User(Base):
    niimbot_printer_config = Column(JSON, nullable=True)
```

**PrinterConfig Format:**
```json
{
  "enabled": true,
  "model": "b21",
  "connection_type": "usb",
  "address": "/dev/ttyACM0",
  "density": 3,
  "label_width": null,
  "label_height": null,
  "print_direction": null
}
```

### What's Currently Mixed Together

**Printer-Specific Settings:**
- `enabled` - Whether printing is active
- `model` - Printer hardware model (D11-H, B21, etc.)
- `connection_type` - USB or Bluetooth
- `address` - Serial port or BT address
- `density` - Print intensity (1-3 for D-series, 1-5 for B-series)

**Label-Specific Settings:**
- `label_width` - Label dimension (optional, overrides model default)
- `label_height` - Label dimension (optional, overrides model default)
- `print_direction` - Override printer's default direction

### Label Generation Flow

**Backend (`backend/app/printer_service.py`, lines 89-148):**
1. Creates PIL Image with QR code (124×124 pixels)
2. Positions QR at (6, 5)
3. Adds text below QR with 32px font
4. Uses model-specific dimensions from `PRINTER_MODELS`
5. No rotation for backend

**Frontend (`src/components/QRLabelPrint.tsx`, lines 415-520):**
1. Renders based on printer model specs
2. Supports both "left" and "top" directions natively
3. Includes QR + title + subtitle + item list
4. Scales based on `printheadPixels`
5. Rotates +90° for left-direction printers

### Hard-Coded Limitations

**Label Sizes (`src/components/QRLabelPrint.tsx`, lines 87-94):**
```typescript
const LABEL_SIZES = [
  {
    value: "12x40",
    label: '12x40mm D11-H (0.47" x 1.57")',
    width: 472,
    height: 136
  },
];

const LABEL_MAX_ITEMS: Record<string, number> = {
  "12x40": 2,  // Maximum items to show on label
};
```

**Only one label size supported** - New sizes require code changes

## Proposed Solution

### New Architecture: Separate Profiles

#### 1. Printer Profile
```typescript
interface PrinterProfile {
  id: UUID;
  user_id: UUID;
  name: string;  // e.g., "Home Office D11-H"
  enabled: boolean;
  model: string;  // "d11_h", "b21", etc.
  connection_type: "usb" | "bluetooth";
  address?: string;  // Serial port or BT address
  density: number;  // Printer-specific setting
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### 2. Label Profile
```typescript
interface LabelProfile {
  id: UUID;
  user_id: UUID;
  name: string;  // e.g., "Small Items", "Inventory Standard"
  label_width: number;  // mm or pixels
  label_height: number;  // mm or pixels
  content_layout: "qr_only" | "qr_with_text" | "qr_with_items" | "text_only";
  qr_size: number;  // pixels
  font_size: number;  // pixels
  max_items_display: number;
  orientation: "auto" | "left" | "top";  // auto = detect from printer
  is_template: boolean;  // Shareable preset
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### 3. Printer-Label Binding
```typescript
interface PrinterLabelBinding {
  id: UUID;
  user_id: UUID;
  printer_profile_id: UUID;
  label_profile_id: UUID;
  is_default: boolean;  // Use this label by default with this printer
}
```

### Benefits

| Benefit | Current | Proposed |
|---------|---------|----------|
| **Multiple label formats per printer** | ❌ No | ✅ Yes |
| **Reuse label config** | ❌ No | ✅ Yes |
| **Support multiple label sizes** | ❌ 1 hardcoded size | ✅ Unlimited custom sizes |
| **Share presets** | ❌ No | ✅ Yes |
| **Template system** | ❌ No | ✅ Yes |
| **Independent management** | ❌ No | ✅ Yes |
| **Flexibility** | ⚠️ Limited | ✅ High |

## Implementation Considerations

### Database Changes

**Migration Required:**
1. Create `printer_profiles` table
2. Create `label_profiles` table
3. Create `printer_label_bindings` table
4. Migrate existing `niimbot_printer_config` to new tables
5. Deprecate `niimbot_printer_config` column

### API Endpoint Changes

**New Endpoints:**
```
POST   /api/printer-profiles              - Create printer profile
GET    /api/printer-profiles              - List user's printer profiles
GET    /api/printer-profiles/{id}         - Get specific profile
PUT    /api/printer-profiles/{id}         - Update printer profile
DELETE /api/printer-profiles/{id}         - Delete printer profile

POST   /api/label-profiles                - Create label profile
GET    /api/label-profiles                - List user's label profiles
GET    /api/label-profiles/{id}           - Get specific profile
PUT    /api/label-profiles/{id}           - Update label profile
DELETE /api/label-profiles/{id}           - Delete label profile

POST   /api/printer-label-bindings        - Create printer-label binding
PUT    /api/printer-label-bindings/{id}   - Update binding
DELETE /api/printer-label-bindings/{id}   - Delete binding
```

### UI Component Updates

**Components Affected:**
- `LocationsPage.tsx` - Printer/label selection
- `InventoryPage.tsx` - Printer/label selection
- `QRLabelPrint.tsx` - Label generation
- Settings/Admin pages - Profile management

**New Components Needed:**
- `PrinterProfileManager.tsx` - CRUD for printer profiles
- `LabelProfileManager.tsx` - CRUD for label profiles
- `PrinterLabelBindingSelector.tsx` - Select binding when printing

### Feature Flags/Backwards Compatibility

**Transition Strategy:**
1. Keep `niimbot_printer_config` functional (read-only)
2. Automatically migrate existing config to new tables
3. Provide migration UI for users
4. Deprecate old structure in v7.0

## File Structure After Implementation

```
backend/app/
├── models.py
│   ├── PrinterProfile
│   ├── LabelProfile
│   └── PrinterLabelBinding
├── routers/
│   ├── printer_profiles.py (NEW)
│   ├── label_profiles.py (NEW)
│   └── printer.py (refactored)
├── schemas.py
│   ├── PrinterProfileCreate
│   ├── LabelProfileCreate
│   └── PrinterLabelBindingCreate

src/
├── components/
│   ├── PrinterProfileManager.tsx (NEW)
│   ├── LabelProfileManager.tsx (NEW)
│   ├── PrinterLabelBindingSelector.tsx (NEW)
│   └── QRLabelPrint.tsx (refactored)
└── lib/
    └── api.ts (new interfaces)
```

## Timeline Estimate

| Phase | Tasks | Files |
|-------|-------|-------|
| Phase 1 | Database models, migrations | models.py, migration scripts |
| Phase 2 | Backend API endpoints | routers/*, schemas.py |
| Phase 3 | Profile managers UI | NEW components |
| Phase 4 | Label generation refactor | QRLabelPrint.tsx, printer_service.py |
| Phase 5 | Testing & migration tools | tests/, migration utilities |
| Phase 6 | Backwards compatibility | printer.py, settings pages |

## Risk Assessment

### High Risk Areas
- Database migration for existing users
- Label rendering changes (image quality impact)
- Backwards compatibility during transition

### Mitigation Strategies
- Comprehensive testing on all printer models
- Gradual rollout with feature flag
- Automated migration with verification
- Fallback to old config if needed

## Success Criteria

- [ ] Users can create and manage multiple label profiles
- [ ] Multiple label sizes supported (not hardcoded)
- [ ] Label profiles can be reused with different printers
- [ ] Existing users' configurations migrate seamlessly
- [ ] No regression in print quality
- [ ] All components use new architecture
- [ ] Settings UI for profile management working
- [ ] Documentation updated

## Dependencies

- Issue #474 must be resolved first (D101 quality issues)
- Database migration tools ready
- Testing framework in place

## References

- **Issue:** #473
- **Related:** #471, #474
- **Current Implementation:** `backend/app/printer_service.py`, `src/components/QRLabelPrint.tsx`
- **Models:** `backend/app/models.py` (lines 120-122, 154-241)

---

**Next Step:** Await decision on scope and priority for implementation.
