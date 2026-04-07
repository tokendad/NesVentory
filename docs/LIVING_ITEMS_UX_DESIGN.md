# Living Items UX/UI Design Review & Recommendations
## NesVentory Home Inventory System

**Date:** 2024  
**Feature:** Living Items (People, Pets, Plants)  
**Version:** 6.11.2+

---

## Executive Summary

The Living Items feature extends NesVentory's inventory capabilities to track people, pets, and plants alongside traditional household items. This review evaluates the current implementation and provides comprehensive UX/UI recommendations for a polished, mobile-first experience.

**Current State:** Basic implementation using tag-based toggling with conditional field display  
**Recommended State:** Dedicated, context-aware forms with visual hierarchy and smart defaults

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [User Experience Issues](#user-experience-issues)
3. [Design Recommendations](#design-recommendations)
4. [Wireframe Descriptions](#wireframe-descriptions)
5. [Mobile-First Patterns](#mobile-first-patterns)
6. [Visual Design System](#visual-design-system)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Current Implementation Analysis

### Backend Structure ✅
The backend is well-designed with proper field support:

```python
# From backend/app/models.py - Item model
is_living = Boolean (default: False)
birthdate = Date (nullable)
contact_info = JSON {phone, email, address, notes}
relationship_type = String(100) {self, spouse, mother, pet, plant, etc.}
is_current_user = Boolean
associated_user_id = UUID (FK to users)
additional_info = JSON (dynamic fields)
```

### Frontend Implementation (ItemForm.tsx - 2,437 lines)

**Strengths:**
- ✅ Proper field separation between living/non-living items
- ✅ Auto-clears irrelevant fields when switching modes
- ✅ Relationship type dropdown with human-readable labels
- ✅ Contact info section for people
- ✅ Checkbox for "This is me" association
- ✅ Visual differentiation with `.living-section` styling

**Current UX Pattern:**
1. User adds/edits an item via ItemForm
2. User selects "Living" tag from tag dropdown
3. Form switches to "living mode" - hides purchase/brand fields
4. Living-specific fields appear (birthdate, relationship, contact info)
5. Form saves with `is_living: true` flag

### ItemDetails Display (ItemDetails.tsx - 732 lines)

**Strengths:**
- ✅ Dedicated "Living Item Details" section
- ✅ Conditional rendering of purchase info (hidden for living items)
- ✅ Contact information subsection
- ✅ Relationship label display
- ✅ Visual styling with `.living-details` class

**Current Display Pattern:**
```tsx
{isLivingItem && (
  <div className="details-section living-details">
    <h3>Living Item Details</h3>
    {/* Relationship, Birthdate, Contact Info */}
  </div>
)}
```

---

## User Experience Issues

### 🔴 Critical Issues

#### 1. **Hidden Entry Point - Tag-Based Discovery**
**Problem:** Users must know to select the "Living" tag to unlock living item fields. There's no clear visual cue or dedicated button for "Add Person," "Add Pet," or "Add Plant."

**User Impact:**
- New users won't discover the feature
- Cognitive load: "How do I add my family members?"
- Not intuitive that a "tag" fundamentally changes the form

**Evidence:**
```tsx
// Current: Living mode triggered by tag selection
const isLivingItemSelected = useMemo(() => {
  if (!livingTagId) return false;
  return (formData.tag_ids || []).includes(livingTagId);
}, [livingTagId, formData.tag_ids]);
```

#### 2. **No Type Differentiation**
**Problem:** All living items use the same relationship dropdown. There's no distinction between:
- **People:** Need emergency contacts, medical info, birthdate
- **Pets:** Need vet info, breed, microchip, vaccination records
- **Plants:** Need species, watering schedule, care instructions, sunlight needs

**User Impact:**
- Generic form doesn't match mental models
- Missing critical fields (e.g., vet info for pets, watering schedule for plants)
- Can't provide specialized workflows

#### 3. **No Age Calculation Display**
**Problem:** Birthdate is captured but not displayed as age/years old.

**User Impact:**
- Users manually calculate: "When was my dog born? How old is she now?"
- Lost opportunity for quick-glance information

#### 4. **Limited Contact Management**
**Current:** Single flat contact info object `{phone, email, address, notes}`

**Missing:**
- Emergency contacts (multiple)
- Relationship-specific contacts (e.g., pet's vet, plant nursery)
- Contact type labels (Home, Work, Mobile)

#### 5. **No Medical/Care Schedule Management**
**Missing Features:**
- Pet vaccination tracking
- Plant watering reminders
- People medical appointment tracking
- Document attachments for medical records, adoption papers

---

### 🟡 Moderate Issues

#### 6. **Inconsistent Visual Hierarchy**
- Living item fields blend into the form without strong visual separation
- No iconography to reinforce "this is different from a regular item"
- Contact info section is nested without clear hierarchy

#### 7. **Mobile Experience Gaps**
- Form already 2,437 lines - may have scroll fatigue on mobile
- No progressive disclosure or step-by-step wizard
- All fields shown at once (cognitive overload)

#### 8. **Relationship Dropdown is Overloaded**
**Current dropdown includes:**
- Family relationships (mother, father, sister, etc.)
- Non-human living things (pet, plant)
- Generic (other)

**Issues:**
- Mixing people and non-people in one dropdown is confusing
- Doesn't allow for type-specific fields
- Can't have "breed" for pets or "species" for plants

---

## Design Recommendations

### 1. **Dedicated Entry Points with Visual Hierarchy**

#### Option A: Segmented Button Group (Recommended)
**Pattern:** Split the "Add Item" action into clear choices

```
┌─────────────────────────────────────────────────┐
│  Add to Inventory                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  📦      │  │  👤      │  │  🐾      │        │
│  │  Item    │  │  Person  │  │  Pet     │        │
│  └─────────┘  └─────────┘  └─────────┘        │
│                                                 │
│  ┌─────────┐                                   │
│  │  🌱      │                                   │
│  │  Plant   │                                   │
│  └─────────┘                                   │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Four large, tappable cards (mobile-first)
- Icons reinforce type
- Launches specialized form based on selection

#### Option B: Dropdown Menu with Icons
**Pattern:** Single "Add" button with expanded menu

```
[ + Add ] ▼
  ├─ 📦 Add Item
  ├─ 👤 Add Person
  ├─ 🐾 Add Pet
  └─ 🌱 Add Plant
```

**Pros:** Less screen space, familiar pattern  
**Cons:** One more click, less discoverable

**Recommendation:** Use Option A for primary interface, Option B for compact views (mobile toolbar)

---

### 2. **Type-Specific Form Layouts**

#### Shared Living Item Fields
All living items share:
- **Name** (required)
- **Photo** (profile photo)
- **Birthdate** (optional, with age display)
- **Location** (where they are/live)
- **Notes/Description**
- **Tags**
- **Documents** (medical records, certificates)

#### Person-Specific Fields

```
┌─────────────────────────────────────────────────┐
│  Add Person                                [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  BASIC INFORMATION                              │
│  ┌─────────────────────────────────────────┐   │
│  │ 📷 Profile Photo                        │   │
│  │    [Tap to upload photo]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Full Name *                                    │
│  [                                      ]       │
│                                                 │
│  Relationship                                   │
│  [⏷ Select...                          ]       │
│  Options: Self, Spouse, Parent, Child,         │
│           Sibling, Extended Family              │
│                                                 │
│  Birthdate                    Age               │
│  [MM/DD/YYYY      ]          [Auto: 42 years]  │
│                                                 │
│  ☐ This is me (link to my account)             │
│                                                 │
│  CONTACT INFORMATION                            │
│  Primary Phone                                  │
│  [                                      ]       │
│                                                 │
│  Email                                          │
│  [                                      ]       │
│                                                 │
│  Address                                        │
│  [                                      ]       │
│  [                                      ]       │
│                                                 │
│  EMERGENCY CONTACTS                             │
│  [+ Add Emergency Contact]                     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Emergency Contact 1                     │   │
│  │ Name:  [                          ]     │   │
│  │ Phone: [                          ]     │   │
│  │ Relationship: [⏷ Select...        ]     │   │
│  │                              [Remove]    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  DOCUMENTS & MEDICAL                            │
│  [+ Upload Document]                           │
│  • Medical records                              │
│  • ID/Passport                                  │
│  • Insurance cards                              │
│                                                 │
│  Current Location                               │
│  [⏷ Select location...                 ]       │
│                                                 │
│  Notes                                          │
│  [                                      ]       │
│  [                                      ]       │
│                                                 │
│         [Cancel]         [Save Person]          │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Large profile photo upload area
- Auto-calculated age display (read-only)
- Multiple emergency contacts
- Document upload with preset categories
- Clear visual sections

#### Pet-Specific Fields

```
┌─────────────────────────────────────────────────┐
│  Add Pet                                   [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  BASIC INFORMATION                              │
│  ┌─────────────────────────────────────────┐   │
│  │ 📷 Pet Photo                            │   │
│  │    [Tap to upload photo]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Pet Name *                                     │
│  [                                      ]       │
│                                                 │
│  Type & Breed                                   │
│  Type:  [⏷ Dog / Cat / Bird / Other    ]       │
│  Breed: [                              ]       │
│                                                 │
│  Birthdate / Adoption Date    Age               │
│  [MM/DD/YYYY          ]      [Auto: 5 years]   │
│                                                 │
│  Gender                                         │
│  ○ Male   ○ Female   ○ Unknown                  │
│                                                 │
│  Microchip ID                                   │
│  [                                      ]       │
│                                                 │
│  VETERINARY INFORMATION                         │
│  Veterinarian Name                              │
│  [                                      ]       │
│                                                 │
│  Clinic Name                                    │
│  [                                      ]       │
│                                                 │
│  Clinic Phone                                   │
│  [                                      ]       │
│                                                 │
│  Clinic Address                                 │
│  [                                      ]       │
│                                                 │
│  MEDICAL RECORDS                                │
│  [+ Upload Document]                           │
│  • Vaccination records                          │
│  • Medical history                              │
│  • Adoption papers                              │
│  • License/registration                         │
│                                                 │
│  CARE REMINDERS (Future Enhancement)            │
│  [+ Add Reminder]                              │
│  • Vet appointments                             │
│  • Vaccination due dates                        │
│  • Medication schedules                         │
│                                                 │
│  Current Location                               │
│  [⏷ Select location...                 ]       │
│                                                 │
│  Notes                                          │
│  [                                      ]       │
│                                                 │
│         [Cancel]          [Save Pet]            │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Pet type selector (affects subsequent options)
- Breed autocomplete (based on type)
- Gender selection
- Dedicated vet information section
- Microchip tracking
- Document presets for pets

#### Plant-Specific Fields

```
┌─────────────────────────────────────────────────┐
│  Add Plant                                 [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  BASIC INFORMATION                              │
│  ┌─────────────────────────────────────────┐   │
│  │ 📷 Plant Photo                          │   │
│  │    [Tap to upload photo]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Plant Name / Nickname *                        │
│  [                                      ]       │
│                                                 │
│  Species / Scientific Name                      │
│  [                                      ]       │
│  Common Name: [                         ]       │
│                                                 │
│  Purchase / Acquired Date                       │
│  [MM/DD/YYYY              ]                    │
│                                                 │
│  Source / Nursery                               │
│  [                                      ]       │
│                                                 │
│  CARE INSTRUCTIONS                              │
│  Sunlight Needs                                 │
│  ○ Full Sun  ○ Partial  ○ Shade                 │
│                                                 │
│  Watering Schedule                              │
│  Frequency: [⏷ Daily / Weekly / Monthly ]       │
│  Amount:    [                          ]       │
│                                                 │
│  Soil Type                                      │
│  [⏷ Select or type...                  ]       │
│                                                 │
│  Temperature Range                              │
│  Min: [    °F]    Max: [    °F]                │
│                                                 │
│  Humidity                                       │
│  [⏷ Low / Medium / High                ]       │
│                                                 │
│  Fertilizer Schedule                            │
│  [⏷ Never / Monthly / Seasonal         ]       │
│  Type: [                               ]       │
│                                                 │
│  CARE REMINDERS (Future Enhancement)            │
│  [+ Add Reminder]                              │
│  • Watering schedule                            │
│  • Fertilizer reminders                         │
│  • Repotting due date                           │
│  • Pruning schedule                             │
│                                                 │
│  Current Location                               │
│  [⏷ Select location...                 ]       │
│  (e.g., Living Room - South Window)            │
│                                                 │
│  Growth Journal / Notes                         │
│  [                                      ]       │
│  [                                      ]       │
│                                                 │
│  PROGRESS PHOTOS                                │
│  [+ Add Growth Photo with Date]                │
│  Track plant growth over time                   │
│                                                 │
│         [Cancel]         [Save Plant]           │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Scientific name + common name fields
- Sunlight/water/soil care parameters
- Care schedule tracking
- Growth journal capability
- Progress photo timeline
- Location tracking (room/window)

---

### 3. **Age/Time Calculation Display**

**Pattern:** Auto-calculated, read-only field adjacent to birthdate

```tsx
// Display Implementation
const calculateAge = (birthdate: string): string => {
  if (!birthdate) return '';
  
  const birth = new Date(birthdate);
  const today = new Date();
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  
  // Adjust for incomplete year
  const adjustedYears = months < 0 || 
    (months === 0 && today.getDate() < birth.getDate()) 
    ? years - 1 
    : years;
  
  if (adjustedYears === 0) {
    // Show months for babies/young pets/plants
    const totalMonths = (today.getFullYear() - birth.getFullYear()) * 12 + months;
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }
  
  return `${adjustedYears} year${adjustedYears !== 1 ? 's' : ''}`;
};

// UI Display
<div className="form-row">
  <div className="form-group">
    <label htmlFor="birthdate">Birthdate</label>
    <input
      type="date"
      id="birthdate"
      value={formData.birthdate || ""}
      onChange={handleChange}
    />
  </div>
  <div className="form-group">
    <label>Age</label>
    <div className="age-display">
      {calculateAge(formData.birthdate)}
    </div>
  </div>
</div>
```

**Visual Style:**
```css
.age-display {
  padding: 0.625rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  color: var(--text);
  font-weight: 500;
  min-height: 42px;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.age-display:empty::after {
  content: '—';
  color: var(--muted);
}
```

---

### 4. **Enhanced Contact Management**

#### Multiple Emergency Contacts (People)

```tsx
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notes?: string;
}

// Add to contact_info JSON structure
contact_info: {
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  emergency_contacts?: EmergencyContact[];
}
```

**UI Component:**
```tsx
<div className="emergency-contacts-section">
  <h4>Emergency Contacts</h4>
  <button 
    type="button" 
    onClick={handleAddEmergencyContact}
    className="add-emergency-contact-btn"
  >
    + Add Emergency Contact
  </button>
  
  {formData.contact_info?.emergency_contacts?.map((contact, index) => (
    <div key={contact.id} className="emergency-contact-card">
      <div className="emergency-contact-header">
        <span>Emergency Contact {index + 1}</span>
        <button 
          type="button" 
          onClick={() => handleRemoveEmergencyContact(contact.id)}
          className="remove-btn"
        >
          Remove
        </button>
      </div>
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={contact.name}
          onChange={(e) => handleEmergencyContactChange(contact.id, 'name', e.target.value)}
          placeholder="Contact name"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => handleEmergencyContactChange(contact.id, 'phone', e.target.value)}
            placeholder="Phone number"
          />
        </div>
        <div className="form-group">
          <label>Relationship</label>
          <input
            type="text"
            value={contact.relationship}
            onChange={(e) => handleEmergencyContactChange(contact.id, 'relationship', e.target.value)}
            placeholder="e.g., Neighbor, Friend"
          />
        </div>
      </div>
    </div>
  ))}
</div>
```

**Styling:**
```css
.emergency-contact-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.emergency-contact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--text);
}

.add-emergency-contact-btn {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--accent-soft);
  border: 1px dashed var(--accent-border);
  border-radius: 6px;
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-emergency-contact-btn:hover {
  background: var(--accent);
  color: white;
  border-style: solid;
}
```

---

### 5. **Visual Iconography System**

#### Icon Mapping

| Type   | Icon | Color Scheme | Use Case |
|--------|------|--------------|----------|
| Regular Item | 📦 | Blue (#38bdf8) | Default inventory items |
| Person | 👤 | Purple (#a78bfa) | Family members, people |
| Pet | 🐾 | Orange (#fb923c) | Pets, animals |
| Plant | 🌱 | Green (#4ade80) | Indoor/outdoor plants |

**Icon Usage:**
1. **Entry point buttons** - Large, centered icon
2. **Form headers** - Icon + title
3. **Item cards** - Small badge in corner
4. **List view** - Icon prefix before name
5. **Details view** - Icon in page header

**Implementation:**
```tsx
const LIVING_ITEM_TYPES = {
  person: {
    icon: '👤',
    label: 'Person',
    color: 'var(--color-person, #a78bfa)',
    colorLight: 'rgba(167, 139, 250, 0.15)',
  },
  pet: {
    icon: '🐾',
    label: 'Pet',
    color: 'var(--color-pet, #fb923c)',
    colorLight: 'rgba(251, 146, 60, 0.15)',
  },
  plant: {
    icon: '🌱',
    label: 'Plant',
    color: 'var(--color-plant, #4ade80)',
    colorLight: 'rgba(74, 222, 128, 0.15)',
  },
};

// Form Header Component
const LivingItemFormHeader: React.FC<{type: 'person' | 'pet' | 'plant'}> = ({type}) => {
  const config = LIVING_ITEM_TYPES[type];
  return (
    <div 
      className="living-item-form-header"
      style={{
        background: config.colorLight,
        borderLeft: `4px solid ${config.color}`,
      }}
    >
      <span className="living-item-icon" style={{fontSize: '2rem'}}>
        {config.icon}
      </span>
      <h2 style={{color: config.color}}>
        Add {config.label}
      </h2>
    </div>
  );
};
```

**CSS Variables:**
```css
:root {
  --color-person: #a78bfa;
  --color-person-light: rgba(167, 139, 250, 0.15);
  --color-pet: #fb923c;
  --color-pet-light: rgba(251, 146, 60, 0.15);
  --color-plant: #4ade80;
  --color-plant-light: rgba(74, 222, 128, 0.15);
}

:root[data-theme="light"] {
  --color-person: #7c3aed;
  --color-pet: #ea580c;
  --color-plant: #16a34a;
}
```

---

### 6. **Mobile-First Responsive Patterns**

#### Principle: Progressive Disclosure
Don't show all fields at once. Use accordion sections or multi-step wizards.

**Pattern A: Accordion Sections (Recommended)**
```
┌─────────────────────────────┐
│ ▼ Basic Information         │ ← Expanded by default
│   • Name                    │
│   • Photo                   │
│   • Birthdate               │
├─────────────────────────────┤
│ ▶ Contact Information       │ ← Collapsed
├─────────────────────────────┤
│ ▶ Emergency Contacts        │ ← Collapsed
├─────────────────────────────┤
│ ▶ Documents & Medical       │ ← Collapsed
├─────────────────────────────┤
│ ▶ Location & Notes          │ ← Collapsed
└─────────────────────────────┘
```

**Implementation:**
```tsx
const AccordionSection: React.FC<{
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultExpanded = false, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="accordion-section">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="accordion-icon">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="accordion-title">{title}</span>
      </button>
      {expanded && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};

// Usage
<AccordionSection title="Basic Information" defaultExpanded>
  {/* Name, Photo, Birthdate fields */}
</AccordionSection>

<AccordionSection title="Contact Information">
  {/* Phone, Email, Address fields */}
</AccordionSection>
```

**Pattern B: Multi-Step Wizard (Alternative for New Entries)**
```
Step 1/4: Basic Info
┌─────────────────────────────┐
│ Name, Photo, Birthdate      │
│                             │
│        [Next →]             │
└─────────────────────────────┘

Step 2/4: Contact Info
┌─────────────────────────────┐
│ Phone, Email, Address       │
│                             │
│ [← Back]      [Next →]      │
└─────────────────────────────┘
```

**Recommendation:** Use Accordion for editing, Wizard for first-time creation

#### Mobile Viewport Optimizations

```css
/* Mobile-first form styling */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
  
  .form-group {
    width: 100%;
    margin-bottom: 1rem;
  }
  
  /* Larger tap targets */
  .form-group input,
  .form-group select,
  .form-group textarea {
    min-height: 44px; /* iOS recommended minimum */
    font-size: 16px; /* Prevents zoom on iOS */
  }
  
  /* Sticky action buttons */
  .form-actions {
    position: sticky;
    bottom: 0;
    background: var(--bg-elevated);
    padding: 1rem;
    border-top: 1px solid var(--border-subtle);
    box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
    z-index: 10;
  }
  
  .form-actions button {
    width: 100%;
    margin-bottom: 0.5rem;
    min-height: 48px;
  }
}

/* Tablet and desktop */
@media (min-width: 769px) {
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .form-group.full-width {
    grid-column: 1 / -1;
  }
}
```

---

### 7. **Item Details Display Enhancements**

#### Current State
```tsx
{isLivingItem && (
  <div className="details-section living-details">
    <h3>Living Item Details</h3>
    {/* Basic fields */}
  </div>
)}
```

#### Enhanced Design with Visual Cards

```
┌─────────────────────────────────────────────────┐
│ 👤 Sarah Johnson (Mom)                          │
│ ┌───────────┐                                   │
│ │  Profile  │  42 years old                     │
│ │  Photo    │  Birthday: June 15, 1982          │
│ │           │                                   │
│ └───────────┘  📍 Master Bedroom                │
├─────────────────────────────────────────────────┤
│ 📞 CONTACT INFORMATION                          │
│ ┌─────────────────────────────────────────┐    │
│ │ Phone:    (555) 123-4567                │    │
│ │ Email:    sarah@email.com               │    │
│ │ Address:  123 Main St, City, ST 12345   │    │
│ └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│ 🚨 EMERGENCY CONTACTS (2)                       │
│ ┌─────────────────────────────────────────┐    │
│ │ Contact 1                               │    │
│ │ John (Neighbor)                         │    │
│ │ (555) 234-5678                          │    │
│ └─────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────┐    │
│ │ Contact 2                               │    │
│ │ Mary (Sister)                           │    │
│ │ (555) 345-6789                          │    │
│ └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│ 📄 DOCUMENTS (3)                                │
│ • Medical Records.pdf                           │
│ • Insurance Card.jpg                            │
│ • ID Scan.pdf                                   │
└─────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
const PersonDetailsView: React.FC<{item: Item}> = ({item}) => {
  const age = calculateAge(item.birthdate);
  
  return (
    <div className="living-item-details person-details">
      {/* Header with icon and type */}
      <div className="living-item-header">
        <span className="living-item-type-icon">👤</span>
        <div className="living-item-title">
          <h2>{item.name}</h2>
          {item.relationship_type && (
            <span className="relationship-badge">
              {getRelationshipLabel(item.relationship_type)}
            </span>
          )}
        </div>
      </div>
      
      {/* Profile card with photo and key info */}
      <div className="profile-card">
        <div className="profile-photo">
          {item.photos?.[0] ? (
            <img src={item.photos[0].url} alt={item.name} />
          ) : (
            <div className="photo-placeholder">👤</div>
          )}
        </div>
        <div className="profile-info">
          {item.birthdate && (
            <>
              <div className="info-item">
                <strong>{age}</strong>
              </div>
              <div className="info-item">
                Birthday: {formatDate(item.birthdate)}
              </div>
            </>
          )}
          {item.location && (
            <div className="info-item">
              📍 {getLocationPath(item.location)}
            </div>
          )}
        </div>
      </div>
      
      {/* Contact Information */}
      {item.contact_info && (
        <div className="detail-section">
          <h3>📞 Contact Information</h3>
          <div className="contact-grid">
            {item.contact_info.phone && (
              <div className="contact-item">
                <span className="label">Phone:</span>
                <a href={`tel:${item.contact_info.phone}`}>
                  {item.contact_info.phone}
                </a>
              </div>
            )}
            {item.contact_info.email && (
              <div className="contact-item">
                <span className="label">Email:</span>
                <a href={`mailto:${item.contact_info.email}`}>
                  {item.contact_info.email}
                </a>
              </div>
            )}
            {item.contact_info.address && (
              <div className="contact-item full-width">
                <span className="label">Address:</span>
                <span>{item.contact_info.address}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Emergency Contacts */}
      {item.contact_info?.emergency_contacts?.length > 0 && (
        <div className="detail-section">
          <h3>🚨 Emergency Contacts ({item.contact_info.emergency_contacts.length})</h3>
          {item.contact_info.emergency_contacts.map((contact, index) => (
            <div key={index} className="emergency-contact-card">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-details">
                {contact.relationship && (
                  <span className="contact-relationship">({contact.relationship})</span>
                )}
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Styling:**
```css
.living-item-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.living-item-type-icon {
  font-size: 3rem;
  line-height: 1;
}

.relationship-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--color-person-light);
  color: var(--color-person);
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.profile-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.profile-photo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  font-size: 3rem;
  color: var(--muted);
}

.profile-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.info-item {
  font-size: 0.95rem;
  color: var(--text);
}

.info-item strong {
  font-size: 1.5rem;
  color: var(--accent);
}

.emergency-contact-card {
  padding: 1rem;
  background: var(--bg-elevated-softer);
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--danger);
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.contact-name {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 0.25rem;
}

.contact-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--muted);
  font-size: 0.9rem;
}

.contact-relationship {
  font-style: italic;
}
```

---

## Wireframe Descriptions

### Wireframe 1: Add Living Item Entry Point

**Location:** Main dashboard or Items page  
**Trigger:** User clicks "Add" button

```
┌─────────────────────────────────────────────────┐
│  NesVentory                             [Menu]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  What would you like to add?                    │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │              │  │              │            │
│  │      📦      │  │      👤      │            │
│  │              │  │              │            │
│  │     Item     │  │    Person    │            │
│  │              │  │              │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │              │  │              │            │
│  │      🐾      │  │      🌱      │            │
│  │              │  │              │            │
│  │      Pet     │  │    Plant     │            │
│  │              │  │              │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│                                    [Cancel]     │
└─────────────────────────────────────────────────┘
```

**Interaction:**
- Large, tappable cards (minimum 100x120px)
- Icon + label clearly differentiates types
- Selecting a type launches the appropriate form
- Cancel returns to previous screen

---

### Wireframe 2: Add Person Form (Mobile)

**Layout:** Single column, scrollable with sticky footer

```
┌─────────────────────────────────────────────────┐
│  ← Add Person                              [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ▼ BASIC INFORMATION                            │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          📷 Tap to add photo            │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Full Name *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Relationship to You                            │
│  ┌─────────────────────────────────────────┐   │
│  │ ⏷ Select...                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Birthdate                                      │
│  ┌──────────────────────┐  ┌────────────────┐  │
│  │ MM/DD/YYYY          │  │ 42 years       │  │
│  └──────────────────────┘  └────────────────┘  │
│                                                 │
│  ☐ This is me (link to my account)             │
│                                                 │
│  ▶ CONTACT INFORMATION                          │
│                                                 │
│  ▶ EMERGENCY CONTACTS                           │
│                                                 │
│  ▶ DOCUMENTS                                    │
│                                                 │
│  ▶ LOCATION & NOTES                             │
│                                                 │
│  [Scroll for more...]                           │
├─────────────────────────────────────────────────┤
│  [Cancel]                    [Save Person]      │
└─────────────────────────────────────────────────┘
```

**Interaction Flow:**
1. Basic Information section expanded by default
2. User fills required fields (Name)
3. Optional: Upload photo, select relationship, enter birthdate
4. Tap sections to expand and add more details
5. Sticky footer buttons always visible
6. "Save Person" validates and creates entry

---

### Wireframe 3: Add Pet Form (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Add Pet                                 [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ▼ BASIC INFORMATION                            │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          📷 Tap to add photo            │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Pet Name *                                     │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Type                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ ⏷ Select type...                        │   │
│  └─────────────────────────────────────────┘   │
│  Options: Dog, Cat, Bird, Reptile, Fish, Other │
│                                                 │
│  Breed                                          │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Birthdate / Adoption Date                      │
│  ┌──────────────────────┐  ┌────────────────┐  │
│  │ MM/DD/YYYY          │  │ 5 years        │  │
│  └──────────────────────┘  └────────────────┘  │
│                                                 │
│  Gender                                         │
│  ○ Male    ○ Female    ○ Unknown                │
│                                                 │
│  Microchip ID                                   │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ▶ VETERINARY INFORMATION                       │
│                                                 │
│  ▶ MEDICAL RECORDS & DOCUMENTS                  │
│                                                 │
│  ▶ CARE REMINDERS                               │
│                                                 │
│  ▶ LOCATION & NOTES                             │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Cancel]                       [Save Pet]      │
└─────────────────────────────────────────────────┘
```

**Pet-Specific Features:**
- Pet type selector drives breed autocomplete
- Gender radio buttons for quick selection
- Microchip ID field prominently displayed
- Vet information in collapsed section
- Medical records document upload

---

### Wireframe 4: Add Plant Form (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Add Plant                               [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ▼ BASIC INFORMATION                            │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          📷 Tap to add photo            │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Plant Name / Nickname *                        │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Species / Scientific Name                      │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Common Name                                    │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Purchase / Acquired Date                       │
│  ┌─────────────────────────────────────────┐   │
│  │ MM/DD/YYYY                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ▶ CARE INSTRUCTIONS                            │
│     • Sunlight needs                            │
│     • Watering schedule                         │
│     • Soil type                                 │
│     • Temperature & humidity                    │
│                                                 │
│  ▶ CARE REMINDERS                               │
│     • Watering reminders                        │
│     • Fertilizer schedule                       │
│     • Repotting dates                           │
│                                                 │
│  ▶ PROGRESS PHOTOS                              │
│     Track growth over time                      │
│                                                 │
│  ▶ LOCATION & NOTES                             │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Cancel]                      [Save Plant]     │
└─────────────────────────────────────────────────┘
```

**Plant-Specific Features:**
- Scientific + common name fields
- Care instruction section with structured fields
- Progress photo timeline capability
- Location tracking (room, window placement)

---

### Wireframe 5: Person Details View (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Details                            [Edit] [⋮] │
├─────────────────────────────────────────────────┤
│                                                 │
│  👤 Sarah Johnson                               │
│      Mom                                        │
│                                                 │
│  ┌────────┐                                     │
│  │        │   42 years old                      │
│  │ Photo  │   Birthday: June 15, 1982           │
│  │        │   📍 Master Bedroom                 │
│  └────────┘                                     │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📞 CONTACT INFORMATION                         │
│  Phone:    (555) 123-4567         [Call]        │
│  Email:    sarah@email.com        [Email]       │
│  Address:  123 Main St, City, ST 12345          │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  🚨 EMERGENCY CONTACTS (2)                      │
│  ┌─────────────────────────────────────────┐   │
│  │ John (Neighbor)                         │   │
│  │ (555) 234-5678              [Call]      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Mary (Sister)                           │   │
│  │ (555) 345-6789              [Call]      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📄 DOCUMENTS (3)                               │
│  📄 Medical Records.pdf          [View]         │
│  📷 Insurance Card.jpg           [View]         │
│  📄 ID Scan.pdf                  [View]         │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📝 NOTES                                       │
│  Allergic to penicillin. Prefers Dr. Smith.    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interaction Features:**
- Call/Email buttons for quick actions
- Expandable emergency contact cards
- Document preview/download
- Edit button launches form with pre-filled data

---

### Wireframe 6: Pet Details View (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Details                            [Edit] [⋮] │
├─────────────────────────────────────────────────┤
│                                                 │
│  🐾 Max                                         │
│      Pet (Golden Retriever)                     │
│                                                 │
│  ┌────────┐                                     │
│  │        │   5 years old                       │
│  │ Photo  │   Birthday: March 10, 2019          │
│  │        │   📍 Living Room                    │
│  └────────┘   ♂ Male                            │
│                                                 │
│  Microchip: 982000123456789                     │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  🏥 VETERINARY INFORMATION                      │
│  Vet Name:     Dr. Emily Brown                  │
│  Clinic:       Happy Paws Veterinary            │
│  Phone:        (555) 987-6543      [Call]       │
│  Address:      456 Oak Ave, City, ST 12345      │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📋 MEDICAL RECORDS (5)                         │
│  💉 Vaccination Record 2024      [View]         │
│  📄 Rabies Certificate           [View]         │
│  📄 Adoption Papers              [View]         │
│  📄 Health Exam (Annual)         [View]         │
│  📄 License Registration         [View]         │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  ⏰ UPCOMING CARE                                │
│  Next Vaccination: Sept 15, 2024 (in 45 days)  │
│  Next Checkup: Dec 1, 2024                      │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📝 NOTES                                       │
│  Friendly with kids. Loves playing fetch.       │
│  Needs grain-free food due to allergies.        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pet-Specific Display:**
- Breed and gender prominently shown
- Microchip ID displayed
- Vet contact with quick call button
- Medical records with type icons
- Upcoming care reminders

---

### Wireframe 7: Plant Details View (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Details                            [Edit] [⋮] │
├─────────────────────────────────────────────────┤
│                                                 │
│  🌱 Monstera Deliciosa                          │
│      Plant                                      │
│                                                 │
│  ┌────────┐                                     │
│  │        │   Swiss Cheese Plant                │
│  │ Photo  │   Acquired: Jan 15, 2023            │
│  │        │   📍 Living Room - South Window     │
│  └────────┘                                     │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  💧 CARE INSTRUCTIONS                           │
│  Sunlight:     ☀️ Bright indirect light         │
│  Water:        🚿 Weekly (when top soil dry)    │
│  Soil:         Well-draining potting mix        │
│  Temperature:  65-85°F                          │
│  Humidity:     🌫️ Medium-High (60-80%)          │
│  Fertilizer:   Monthly (spring/summer)          │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  ⏰ CARE SCHEDULE                                │
│  Next Watering:  Tomorrow (Aug 8)               │
│  Next Fertilizer: Sept 1, 2024                  │
│  Repotting Due:  Spring 2025                    │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📸 GROWTH TIMELINE (8 photos)                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│  │Jan │ │Mar │ │May │ │Aug │  [See All]        │
│  │'23 │ │'23 │ │'24 │ │'24 │                   │
│  └────┘ └────┘ └────┘ └────┘                   │
│                                                 │
│  ────────────────────────────────────────       │
│                                                 │
│  📝 GROWTH JOURNAL                              │
│  Aug 3, 2024: New leaf unfurling! Looking      │
│  healthy. Moved to larger pot.                  │
│                                                 │
│  May 10, 2024: Some yellowing on lower         │
│  leaves - reduced watering frequency.           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Plant-Specific Display:**
- Care parameters with icons
- Care schedule with upcoming tasks
- Growth photo timeline
- Chronological growth journal

---

### Wireframe 8: Living Items List View

```
┌─────────────────────────────────────────────────┐
│  ← Inventory               [Filter] [Search] [+] │
├─────────────────────────────────────────────────┤
│  Filter: Living Items Only                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  👥 PEOPLE (4)                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤  Sarah Johnson              42 yrs   │   │
│  │     Mom • Master Bedroom            →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤  John Johnson               45 yrs   │   │
│  │     Dad • Master Bedroom            →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤  Emma Johnson               16 yrs   │   │
│  │     Daughter • Bedroom #2           →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤  Alex Johnson               14 yrs   │   │
│  │     Son • Bedroom #3                →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🐾 PETS (2)                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 🐾  Max                        5 yrs    │   │
│  │     Dog • Living Room               →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🐾  Whiskers                   3 yrs    │   │
│  │     Cat • Kitchen                   →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🌱 PLANTS (6)                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 🌱  Monstera Deliciosa    1.5 yrs       │   │
│  │     Living Room - South Window      →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🌱  Snake Plant               3 yrs     │   │
│  │     Bedroom #1                      →   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Load More...]                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**List Features:**
- Grouped by type (People, Pets, Plants)
- Icon prefix for visual scanning
- Age display for quick reference
- Location shown as subtitle
- Tap to view details

---

## Mobile-First Patterns

### Touch Target Guidelines

**Minimum sizes:**
- Buttons: 44x44px (iOS), 48x48px (Android)
- Form inputs: 44px height minimum
- List items: 56px minimum height
- Icon buttons: 48x48px

**Implementation:**
```css
/* Mobile touch targets */
.mobile-touch-target {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-input-mobile {
  min-height: 44px;
  font-size: 16px; /* Prevents iOS zoom */
  padding: 10px 12px;
  border-radius: 8px;
}

.list-item-mobile {
  min-height: 56px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### Gesture Interactions

**Swipe Actions on List Items:**
```
┌─────────────────────────────────────┐
│ 👤  Sarah Johnson         42 yrs   │  ← Swipe left
│     Mom • Master Bedroom           │
└─────────────────────────────────────┘
        ↓ Reveals actions
┌─────────────────────────────────────┐
│ 👤  Sarah Johnson     [✏️] [🗑️]    │
│     Mom               Edit Delete   │
└─────────────────────────────────────┘
```

**Pull-to-Refresh:**
- Pull down on list view to refresh data
- Visual indicator with spinner

**Pinch-to-Zoom on Photos:**
- Profile photos support pinch zoom
- Growth timeline photos zoomable

### Progressive Disclosure

**Accordion Sections (Recommended):**
```tsx
const [expandedSections, setExpandedSections] = useState({
  basic: true,
  contact: false,
  emergency: false,
  documents: false,
  location: false,
});

const toggleSection = (section: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [section]: !prev[section]
  }));
};
```

**Visual Indicator:**
```css
.accordion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-elevated-softer);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.accordion-header:active {
  background: var(--accent-soft);
}

.accordion-icon {
  transition: transform 0.2s;
  font-size: 0.875rem;
  color: var(--muted);
}

.accordion-header[aria-expanded="true"] .accordion-icon {
  transform: rotate(90deg);
}
```

### Bottom Navigation Pattern

**For mobile app companion:**
```
┌─────────────────────────────────────┐
│                                     │
│  [Main content area]                │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  📦      👤      🐾      🌱      ⚙️  │
│ Items  People  Pets  Plants  More  │
└─────────────────────────────────────┘
```

---

## Visual Design System

### Color Palette Extensions

```css
/* Living Items Color System */
:root {
  /* Person colors */
  --color-person: #a78bfa;
  --color-person-light: rgba(167, 139, 250, 0.15);
  --color-person-border: rgba(167, 139, 250, 0.4);
  
  /* Pet colors */
  --color-pet: #fb923c;
  --color-pet-light: rgba(251, 146, 60, 0.15);
  --color-pet-border: rgba(251, 146, 60, 0.4);
  
  /* Plant colors */
  --color-plant: #4ade80;
  --color-plant-light: rgba(74, 222, 128, 0.15);
  --color-plant-border: rgba(74, 222, 128, 0.4);
  
  /* Regular item (existing) */
  --color-item: #38bdf8;
  --color-item-light: rgba(56, 189, 248, 0.15);
  --color-item-border: rgba(56, 189, 248, 0.4);
}

/* Light theme adjustments */
:root[data-theme="light"] {
  --color-person: #7c3aed;
  --color-pet: #ea580c;
  --color-plant: #16a34a;
  --color-item: #0284c7;
}
```

### Typography Hierarchy

```css
/* Living Items Typography */
.living-item-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.living-item-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: var(--muted);
  line-height: 1.5;
}

.living-item-metadata {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.4;
}

.age-display {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent);
}

.relationship-badge {
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}
```

### Icon System

**Recommended Icon Library:** Use emoji with fallback to SVG icons

```tsx
const LivingItemIcons = {
  person: '👤',
  pet: '🐾',
  plant: '🌱',
  item: '📦',
  
  // Context icons
  phone: '📞',
  email: '📧',
  location: '📍',
  emergency: '🚨',
  medical: '🏥',
  document: '📄',
  photo: '📷',
  calendar: '📅',
  notes: '📝',
  
  // Care icons
  water: '💧',
  sun: '☀️',
  temperature: '🌡️',
  humidity: '🌫️',
};

// Usage
<span className="icon" role="img" aria-label="Person">
  {LivingItemIcons.person}
</span>
```

### Card Components

```css
/* Living Item Card */
.living-item-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.living-item-card:hover {
  border-color: var(--accent-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.living-item-card.person {
  border-left: 4px solid var(--color-person);
}

.living-item-card.pet {
  border-left: 4px solid var(--color-pet);
}

.living-item-card.plant {
  border-left: 4px solid var(--color-plant);
}

/* List item variant */
.living-item-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.2s;
}

.living-item-list-item:hover,
.living-item-list-item:active {
  background: var(--accent-soft);
}

.living-item-list-item:last-child {
  border-bottom: none;
}
```

### Badge Components

```css
/* Type badges */
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

.type-badge.person {
  background: var(--color-person-light);
  color: var(--color-person);
  border: 1px solid var(--color-person-border);
}

.type-badge.pet {
  background: var(--color-pet-light);
  color: var(--color-pet);
  border: 1px solid var(--color-pet-border);
}

.type-badge.plant {
  background: var(--color-plant-light);
  color: var(--color-plant);
  border: 1px solid var(--color-plant-border);
}

/* Status badges (for care reminders) */
.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.due-soon {
  background: rgba(251, 146, 60, 0.15);
  color: #ea580c;
}

.status-badge.overdue {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.status-badge.completed {
  background: rgba(74, 222, 128, 0.15);
  color: #16a34a;
}
```

### Photo Display Components

```css
/* Profile photo */
.profile-photo-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--accent-border);
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-photo-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo-placeholder {
  font-size: 3rem;
  color: var(--muted);
}

/* List item photo */
.profile-photo-small {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-subtle);
  flex-shrink: 0;
}

/* Growth timeline photos */
.timeline-photo {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-subtle);
  position: relative;
}

.timeline-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline-photo-date {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.625rem;
  padding: 0.25rem;
  text-align: center;
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals:** Establish core infrastructure for living items

**Tasks:**
1. ✅ Review existing implementation (Complete)
2. Create type constants and helpers
3. Add color variables to CSS
4. Build icon mapping system
5. Create age calculation utility
6. Update Item type definitions

**Deliverables:**
- `src/lib/livingItemsConstants.ts` - Type definitions
- `src/lib/livingItemsUtils.ts` - Helper functions
- Updated `src/styles.css` - Color system
- Type definitions in `src/lib/api.ts`

**Code Snippets:**

```typescript
// src/lib/livingItemsConstants.ts
export const LIVING_ITEM_TYPES = {
  PERSON: 'person',
  PET: 'pet',
  PLANT: 'plant',
} as const;

export type LivingItemType = typeof LIVING_ITEM_TYPES[keyof typeof LIVING_ITEM_TYPES];

export const LIVING_ITEM_CONFIG = {
  person: {
    icon: '👤',
    label: 'Person',
    pluralLabel: 'People',
    color: 'var(--color-person)',
    colorLight: 'var(--color-person-light)',
    colorBorder: 'var(--color-person-border)',
  },
  pet: {
    icon: '🐾',
    label: 'Pet',
    pluralLabel: 'Pets',
    color: 'var(--color-pet)',
    colorLight: 'var(--color-pet-light)',
    colorBorder: 'var(--color-pet-border)',
  },
  plant: {
    icon: '🌱',
    label: 'Plant',
    pluralLabel: 'Plants',
    color: 'var(--color-plant)',
    colorLight: 'var(--color-plant-light)',
    colorBorder: 'var(--color-plant-border)',
  },
};

export const PET_TYPES = [
  'Dog',
  'Cat',
  'Bird',
  'Reptile',
  'Fish',
  'Small Mammal',
  'Other',
];

export const SUNLIGHT_LEVELS = [
  { value: 'full', label: 'Full Sun' },
  { value: 'partial', label: 'Partial Sun' },
  { value: 'shade', label: 'Shade' },
];

export const WATERING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
];
```

```typescript
// src/lib/livingItemsUtils.ts
export const calculateAge = (birthdate: string | null | undefined): string => {
  if (!birthdate) return '';
  
  const birth = new Date(birthdate);
  const today = new Date();
  
  // Check if date is valid
  if (isNaN(birth.getTime())) return '';
  
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  const days = today.getDate() - birth.getDate();
  
  // Adjust for incomplete year
  let adjustedYears = years;
  let adjustedMonths = months;
  
  if (months < 0 || (months === 0 && days < 0)) {
    adjustedYears--;
    adjustedMonths = 12 + months;
  }
  
  // For very young living items (< 1 year), show months
  if (adjustedYears === 0) {
    const totalMonths = adjustedMonths;
    if (totalMonths === 0) return 'Less than 1 month';
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }
  
  return `${adjustedYears} year${adjustedYears !== 1 ? 's' : ''}`;
};

export const getLivingItemType = (item: Item): LivingItemType | null => {
  if (!item.is_living) return null;
  
  const relationship = item.relationship_type?.toLowerCase();
  
  if (relationship === 'pet') return LIVING_ITEM_TYPES.PET;
  if (relationship === 'plant') return LIVING_ITEM_TYPES.PLANT;
  
  // Default to person for family relationships
  if (relationship && ['self', 'spouse', 'mother', 'father', 'sister', 'brother', 
      'daughter', 'son', 'grandmother', 'grandfather', 'aunt', 'uncle', 
      'cousin', 'niece', 'nephew', 'partner'].includes(relationship)) {
    return LIVING_ITEM_TYPES.PERSON;
  }
  
  return LIVING_ITEM_TYPES.PERSON; // Default
};

export const getLivingItemIcon = (item: Item): string => {
  const type = getLivingItemType(item);
  return type ? LIVING_ITEM_CONFIG[type].icon : '📦';
};

export const getLivingItemColor = (item: Item): string => {
  const type = getLivingItemType(item);
  return type ? LIVING_ITEM_CONFIG[type].color : 'var(--accent)';
};
```

### Phase 2: Entry Points (Week 3)

**Goals:** Create dedicated entry points for adding living items

**Tasks:**
1. Create `AddLivingItemModal` component
2. Add type selector cards UI
3. Update "Add Item" button to show modal
4. Add routing/navigation logic
5. Wire up to existing ItemForm

**Deliverables:**
- `src/components/AddLivingItemModal.tsx`
- Updated `src/components/ItemsPage.tsx` or dashboard

**Component Structure:**

```tsx
// src/components/AddLivingItemModal.tsx
import React, { useState } from 'react';
import { LIVING_ITEM_CONFIG, LIVING_ITEM_TYPES } from '../lib/livingItemsConstants';

interface AddLivingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'person' | 'pet' | 'plant' | 'item') => void;
}

const AddLivingItemModal: React.FC<AddLivingItemModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-living-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>What would you like to add?</h2>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="living-item-type-selector">
          <button
            className="type-selector-card item-card"
            onClick={() => onSelectType('item')}
          >
            <span className="type-icon">📦</span>
            <span className="type-label">Item</span>
          </button>
          
          <button
            className="type-selector-card person-card"
            onClick={() => onSelectType('person')}
          >
            <span className="type-icon">{LIVING_ITEM_CONFIG.person.icon}</span>
            <span className="type-label">{LIVING_ITEM_CONFIG.person.label}</span>
          </button>
          
          <button
            className="type-selector-card pet-card"
            onClick={() => onSelectType('pet')}
          >
            <span className="type-icon">{LIVING_ITEM_CONFIG.pet.icon}</span>
            <span className="type-label">{LIVING_ITEM_CONFIG.pet.label}</span>
          </button>
          
          <button
            className="type-selector-card plant-card"
            onClick={() => onSelectType('plant')}
          >
            <span className="type-icon">{LIVING_ITEM_CONFIG.plant.icon}</span>
            <span className="type-label">{LIVING_ITEM_CONFIG.plant.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLivingItemModal;
```

**Styling:**

```css
/* Add Living Item Modal */
.add-living-item-modal {
  max-width: 500px;
  padding: 2rem;
}

.living-item-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}

.type-selector-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  background: var(--bg-elevated);
  border: 2px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 140px;
}

.type-selector-card:hover,
.type-selector-card:focus {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.type-selector-card .type-icon {
  font-size: 3rem;
  line-height: 1;
}

.type-selector-card .type-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

/* Type-specific hover colors */
.type-selector-card.person-card:hover {
  border-color: var(--color-person);
  background: var(--color-person-light);
}

.type-selector-card.pet-card:hover {
  border-color: var(--color-pet);
  background: var(--color-pet-light);
}

.type-selector-card.plant-card:hover {
  border-color: var(--color-plant);
  background: var(--color-plant-light);
}

.type-selector-card.item-card:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* Mobile responsive */
@media (max-width: 480px) {
  .living-item-type-selector {
    grid-template-columns: 1fr;
  }
  
  .type-selector-card {
    flex-direction: row;
    justify-content: flex-start;
    padding: 1.5rem;
    min-height: auto;
  }
  
  .type-selector-card .type-icon {
    font-size: 2rem;
  }
}
```

### Phase 3: Specialized Forms (Week 4-5)

**Goals:** Build type-specific form sections

**Tasks:**
1. Create `PersonForm` component
2. Create `PetForm` component
3. Create `PlantForm` component
4. Add emergency contacts management
5. Add care instructions UI
6. Integrate with existing ItemForm

**Approach:** Create specialized form sections that can be conditionally rendered within ItemForm based on living item type.

**Deliverables:**
- `src/components/PersonFormFields.tsx`
- `src/components/PetFormFields.tsx`
- `src/components/PlantFormFields.tsx`
- `src/components/EmergencyContactsManager.tsx`
- Updated `src/components/ItemForm.tsx`

### Phase 4: Details Views (Week 6)

**Goals:** Enhanced display of living items

**Tasks:**
1. Create `PersonDetailsView` component
2. Create `PetDetailsView` component
3. Create `PlantDetailsView` component
4. Add age calculation display
5. Add care schedule display
6. Update `ItemDetails.tsx` to use new components

**Deliverables:**
- `src/components/PersonDetailsView.tsx`
- `src/components/PetDetailsView.tsx`
- `src/components/PlantDetailsView.tsx`
- Updated `src/components/ItemDetails.tsx`

### Phase 5: List Views & Filtering (Week 7)

**Goals:** Better list organization for living items

**Tasks:**
1. Add living item type badges to list items
2. Add filter by living item type
3. Create grouped list view (People/Pets/Plants sections)
4. Add age display in list view
5. Update search to include relationship types

**Deliverables:**
- Updated `src/components/ItemsTable.tsx`
- New filter options in items page

### Phase 6: Mobile Optimization (Week 8)

**Goals:** Perfect mobile experience

**Tasks:**
1. Implement accordion sections for forms
2. Add touch-friendly tap targets
3. Optimize photo upload on mobile
4. Add swipe gestures for list items
5. Test on various mobile devices
6. Ensure iOS/Android native app compatibility

**Deliverables:**
- Mobile-optimized CSS
- Touch gesture handlers
- Device testing report

### Phase 7: Advanced Features (Future)

**Nice-to-have features for future releases:**

1. **Care Reminders System**
   - Watering schedules for plants
   - Vet appointment reminders for pets
   - Birthday notifications for people

2. **Timeline/History View**
   - Growth progress for plants (photo timeline)
   - Medical history for pets
   - Life events for people

3. **Relationship Graph**
   - Family tree visualization for people
   - Relationship connections between items

4. **Quick Actions**
   - "Call" button for people/vets
   - "Email" button for contacts
   - "Water plant" quick log

5. **Import/Export**
   - Import contacts from phone
   - Export to vCard (people)
   - Export to calendar (care schedules)

6. **Integration with External Services**
   - Pet vaccination tracking integration
   - Plant care API (e.g., Plantnet)
   - Contact sync with phone contacts

---

## Accessibility Considerations

### ARIA Labels & Semantic HTML

```tsx
// Living item type selector
<button
  className="type-selector-card person-card"
  onClick={() => onSelectType('person')}
  aria-label="Add a person to your inventory"
>
  <span className="type-icon" aria-hidden="true">👤</span>
  <span className="type-label">Person</span>
</button>

// Age display
<div 
  className="age-display" 
  aria-label={`Age: ${calculateAge(birthdate)}`}
>
  {calculateAge(birthdate)}
</div>

// Emergency contact
<div 
  className="emergency-contact-card"
  role="article"
  aria-label={`Emergency contact: ${contact.name}`}
>
  {/* Contact details */}
</div>
```

### Keyboard Navigation

```tsx
// Ensure all interactive elements are keyboard accessible
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAddEmergencyContact();
    }
  }}
  onClick={handleAddEmergencyContact}
>
  + Add Emergency Contact
</button>

// Accordion section keyboard support
<button
  className="accordion-header"
  onClick={() => toggleSection('contact')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSection('contact');
    }
  }}
  aria-expanded={expandedSections.contact}
  aria-controls="contact-section"
>
  <span className="accordion-icon" aria-hidden="true">▶</span>
  <span>Contact Information</span>
</button>
```

### Screen Reader Support

```tsx
// Announce dynamic content changes
const [announcement, setAnnouncement] = useState('');

const addEmergencyContact = () => {
  const newContact = createEmergencyContact();
  setEmergencyContacts([...emergencyContacts, newContact]);
  setAnnouncement(`Emergency contact added. Total contacts: ${emergencyContacts.length + 1}`);
};

// Live region for announcements
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>
```

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Text on background: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Testing:**
```css
/* Verify contrast ratios */
:root {
  --color-person: #a78bfa; /* vs white: 3.24:1 (large text OK) */
  --color-pet: #fb923c; /* vs white: 2.63:1 (use darker shade for text) */
  --color-plant: #4ade80; /* vs white: 1.92:1 (use darker shade for text) */
}

/* Dark mode (better contrast) */
:root[data-theme="dark"] {
  --text: #e5e7eb; /* vs dark bg: 12.63:1 */
}
```

---

## Testing Checklist

### Functional Testing

- [ ] Can create person with all fields
- [ ] Can create pet with all fields
- [ ] Can create plant with all fields
- [ ] Age calculation displays correctly
- [ ] Emergency contacts can be added/removed
- [ ] Documents upload properly
- [ ] Photos display in profile area
- [ ] Edit form pre-populates correctly
- [ ] Delete removes living item
- [ ] Search finds living items by name
- [ ] Filter by living item type works
- [ ] List view displays correct icons
- [ ] Details view shows all information
- [ ] Relationship labels display correctly

### Mobile Testing

- [ ] Touch targets are 44x44px minimum
- [ ] Form inputs don't trigger zoom on iOS
- [ ] Accordion sections work on touch
- [ ] Photo upload works from camera
- [ ] Swipe gestures function properly
- [ ] Sticky footer buttons stay visible
- [ ] Landscape orientation supported
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Works in companion mobile app

### Accessibility Testing

- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Skip links available
- [ ] ARIA labels present

### Cross-Browser Testing

- [ ] Chrome (desktop & mobile)
- [ ] Firefox
- [ ] Safari (desktop & iOS)
- [ ] Edge
- [ ] Samsung Internet (Android)

---

## Success Metrics

### User Adoption
- % of users who create at least one living item
- % of inventory that consists of living items
- Time to create first living item (target: < 2 minutes)

### User Satisfaction
- NPS score for living items feature
- Support tickets related to living items
- User feedback on forms (collected via in-app survey)

### Technical Performance
- Page load time for ItemForm with living item (target: < 1s)
- Time to display details view (target: < 500ms)
- Mobile app sync time for living items
- Photo upload success rate (target: > 95%)

---

## Conclusion

The Living Items feature represents a significant UX enhancement to NesVentory, extending its value proposition from physical inventory to comprehensive household management including people, pets, and plants.

**Key Recommendations Summary:**

1. **Dedicated Entry Points:** Replace tag-based discovery with clear, visual type selectors
2. **Specialized Forms:** Create context-aware forms for each living item type
3. **Age Calculation:** Display calculated age alongside birthdate for quick reference
4. **Enhanced Contact Management:** Support multiple emergency contacts for people
5. **Type-Specific Features:** Add vet info for pets, care schedules for plants
6. **Visual Differentiation:** Use color-coded icons and badges throughout the UI
7. **Mobile-First Design:** Implement progressive disclosure with accordion sections
8. **Polished Details Views:** Create rich, card-based layouts for viewing living items

**Implementation Priority:**
1. Foundation & constants (Week 1-2) - **CRITICAL**
2. Entry points modal (Week 3) - **HIGH**
3. Age calculation display (Week 3) - **HIGH**
4. Specialized form fields (Week 4-5) - **MEDIUM**
5. Enhanced details views (Week 6) - **MEDIUM**
6. List improvements (Week 7) - **LOW**
7. Mobile optimization (Week 8) - **MEDIUM**
8. Advanced features (Future) - **NICE-TO-HAVE**

This design provides a solid foundation for tracking living items while maintaining consistency with NesVentory's existing design system. The mobile-first approach ensures compatibility with the companion mobile app, and the modular component structure allows for incremental implementation.

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** UI Designer Agent  
**Feedback:** Please submit UX feedback via GitHub issues
