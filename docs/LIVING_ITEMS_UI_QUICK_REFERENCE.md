# Living Items UI Quick Reference
## Visual Design Guide for Developers

This quick reference complements the full design document (`LIVING_ITEMS_UX_DESIGN.md`) with visual patterns and code snippets ready for implementation.

---

## Color Palette

```css
/* Add to src/styles.css */

/* Living Items Color System */
:root {
  /* Person - Purple */
  --color-person: #a78bfa;
  --color-person-light: rgba(167, 139, 250, 0.15);
  --color-person-border: rgba(167, 139, 250, 0.4);
  
  /* Pet - Orange */
  --color-pet: #fb923c;
  --color-pet-light: rgba(251, 146, 60, 0.15);
  --color-pet-border: rgba(251, 146, 60, 0.4);
  
  /* Plant - Green */
  --color-plant: #4ade80;
  --color-plant-light: rgba(74, 222, 128, 0.15);
  --color-plant-border: rgba(74, 222, 128, 0.4);
}

:root[data-theme="light"] {
  --color-person: #7c3aed;
  --color-pet: #ea580c;
  --color-plant: #16a34a;
}
```

**Color Usage:**
- 👤 **Person:** Purple `#a78bfa` (dark) / `#7c3aed` (light)
- 🐾 **Pet:** Orange `#fb923c` (dark) / `#ea580c` (light)
- 🌱 **Plant:** Green `#4ade80` (dark) / `#16a34a` (light)
- 📦 **Item:** Blue `#38bdf8` (dark) / `#0284c7` (light) - existing

---

## Icon System

```typescript
// Emoji-first approach with semantic meaning

export const LIVING_ITEM_ICONS = {
  // Types
  person: '👤',
  pet: '🐾',
  plant: '🌱',
  item: '📦',
  
  // Context
  phone: '📞',
  email: '📧',
  location: '📍',
  emergency: '🚨',
  medical: '🏥',
  document: '📄',
  photo: '📷',
  calendar: '📅',
  notes: '📝',
  
  // Care
  water: '💧',
  sun: '☀️',
  temperature: '🌡️',
  humidity: '🌫️',
  
  // Animal types
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  fish: '🐠',
  reptile: '🦎',
};
```

**Usage Example:**
```tsx
<span className="icon" role="img" aria-label="Person">
  {LIVING_ITEM_ICONS.person}
</span>
```

---

## Key Components

### 1. Type Selector Cards

```tsx
// Visual grid of cards for selecting what to add

<div className="living-item-type-selector">
  <button className="type-selector-card person-card">
    <span className="type-icon">👤</span>
    <span className="type-label">Person</span>
  </button>
  <button className="type-selector-card pet-card">
    <span className="type-icon">🐾</span>
    <span className="type-label">Pet</span>
  </button>
  <button className="type-selector-card plant-card">
    <span className="type-icon">🌱</span>
    <span className="type-label">Plant</span>
  </button>
</div>
```

**CSS:**
```css
.living-item-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.type-selector-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  background: var(--bg-elevated);
  border: 2px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 140px;
}

.type-selector-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.type-selector-card.person-card:hover {
  border-color: var(--color-person);
  background: var(--color-person-light);
}

.type-selector-card .type-icon {
  font-size: 3rem;
}

.type-selector-card .type-label {
  font-size: 1.125rem;
  font-weight: 600;
}
```

---

### 2. Age Display Component

```tsx
// Auto-calculated age field next to birthdate

export const calculateAge = (birthdate: string | null): string => {
  if (!birthdate) return '';
  
  const birth = new Date(birthdate);
  const today = new Date();
  
  if (isNaN(birth.getTime())) return '';
  
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  const days = today.getDate() - birth.getDate();
  
  let adjustedYears = years;
  if (months < 0 || (months === 0 && days < 0)) {
    adjustedYears--;
  }
  
  if (adjustedYears === 0) {
    const totalMonths = (today.getFullYear() - birth.getFullYear()) * 12 + months;
    if (totalMonths === 0) return 'Less than 1 month';
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }
  
  return `${adjustedYears} year${adjustedYears !== 1 ? 's' : ''}`;
};

// Usage in form
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

**CSS:**
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

### 3. Emergency Contact Manager

```tsx
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notes?: string;
}

const EmergencyContactsManager: React.FC<{
  contacts: EmergencyContact[];
  onChange: (contacts: EmergencyContact[]) => void;
  disabled?: boolean;
}> = ({ contacts, onChange, disabled }) => {
  const addContact = () => {
    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: '',
      phone: '',
      relationship: '',
    };
    onChange([...contacts, newContact]);
  };

  const removeContact = (id: string) => {
    onChange(contacts.filter(c => c.id !== id));
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    onChange(contacts.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  return (
    <div className="emergency-contacts-section">
      <h4>Emergency Contacts</h4>
      
      {contacts.map((contact, index) => (
        <div key={contact.id} className="emergency-contact-card">
          <div className="emergency-contact-header">
            <span>Emergency Contact {index + 1}</span>
            <button
              type="button"
              onClick={() => removeContact(contact.id)}
              disabled={disabled}
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
              onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
              disabled={disabled}
              placeholder="Contact name"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                disabled={disabled}
                placeholder="Phone number"
              />
            </div>
            <div className="form-group">
              <label>Relationship</label>
              <input
                type="text"
                value={contact.relationship}
                onChange={(e) => updateContact(contact.id, 'relationship', e.target.value)}
                disabled={disabled}
                placeholder="e.g., Neighbor"
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={addContact}
        disabled={disabled}
        className="add-emergency-contact-btn"
      >
        + Add Emergency Contact
      </button>
    </div>
  );
};
```

**CSS:**
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
}

.add-emergency-contact-btn {
  width: 100%;
  padding: 0.75rem;
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

### 4. Profile Card Display

```tsx
// For ItemDetails view - shows living item with photo and key info

const ProfileCard: React.FC<{ item: Item }> = ({ item }) => {
  const age = calculateAge(item.birthdate);
  const type = getLivingItemType(item);
  const config = type ? LIVING_ITEM_CONFIG[type] : null;
  
  return (
    <div className="profile-card">
      <div className="profile-photo">
        {item.photos?.[0] ? (
          <img src={item.photos[0].url} alt={item.name} />
        ) : (
          <div className="photo-placeholder">
            {config?.icon || '📦'}
          </div>
        )}
      </div>
      
      <div className="profile-info">
        {age && (
          <div className="info-item">
            <strong>{age}</strong>
          </div>
        )}
        {item.birthdate && (
          <div className="info-item">
            Birthday: {formatDate(item.birthdate)}
          </div>
        )}
        {item.location && (
          <div className="info-item">
            📍 {getLocationPath(item.location)}
          </div>
        )}
      </div>
    </div>
  );
};
```

**CSS:**
```css
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
  border: 3px solid var(--accent-border);
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

@media (max-width: 768px) {
  .profile-card {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .profile-photo {
    margin: 0 auto;
  }
}
```

---

### 5. Type Badge Component

```tsx
// Small badge showing living item type

const LivingItemBadge: React.FC<{ item: Item }> = ({ item }) => {
  if (!item.is_living) return null;
  
  const type = getLivingItemType(item);
  if (!type) return null;
  
  const config = LIVING_ITEM_CONFIG[type];
  
  return (
    <span className={`type-badge ${type}-badge`}>
      <span className="badge-icon" aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
```

**CSS:**
```css
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}

.type-badge .badge-icon {
  font-size: 1rem;
  line-height: 1;
}

.person-badge {
  background: var(--color-person-light);
  color: var(--color-person);
  border: 1px solid var(--color-person-border);
}

.pet-badge {
  background: var(--color-pet-light);
  color: var(--color-pet);
  border: 1px solid var(--color-pet-border);
}

.plant-badge {
  background: var(--color-plant-light);
  color: var(--color-plant);
  border: 1px solid var(--color-plant-border);
}
```

---

### 6. Accordion Section Component

```tsx
// Collapsible section for progressive disclosure

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
        aria-controls={`${title.replace(/\s/g, '-')}-content`}
      >
        <span className="accordion-icon" aria-hidden="true">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="accordion-title">{title}</span>
      </button>
      
      {expanded && (
        <div 
          id={`${title.replace(/\s/g, '-')}-content`}
          className="accordion-content"
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Usage
<AccordionSection title="Basic Information" defaultExpanded>
  <input type="text" name="name" placeholder="Name" />
  <input type="date" name="birthdate" />
</AccordionSection>

<AccordionSection title="Contact Information">
  <input type="tel" name="phone" placeholder="Phone" />
  <input type="email" name="email" placeholder="Email" />
</AccordionSection>
```

**CSS:**
```css
.accordion-section {
  margin-bottom: 1rem;
}

.accordion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-elevated-softer);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.accordion-header:hover {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.accordion-header[aria-expanded="true"] {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.accordion-icon {
  transition: transform 0.2s;
  font-size: 0.75rem;
  color: var(--muted);
}

.accordion-header[aria-expanded="true"] .accordion-icon {
  transform: rotate(90deg);
}

.accordion-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
}

.accordion-content {
  padding: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--accent-border);
  border-top: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Mobile Patterns

### Touch Targets

```css
/* Ensure minimum touch target sizes */

@media (max-width: 768px) {
  /* All interactive elements */
  button,
  a,
  input[type="checkbox"],
  input[type="radio"],
  select {
    min-height: 44px; /* iOS guideline */
    min-width: 44px;
  }
  
  /* Form inputs */
  input[type="text"],
  input[type="email"],
  input[type="tel"],
  input[type="date"],
  textarea,
  select {
    min-height: 44px;
    font-size: 16px; /* Prevents iOS zoom */
    padding: 10px 12px;
  }
  
  /* List items */
  .list-item {
    min-height: 56px;
    padding: 12px 16px;
  }
  
  /* Icon buttons */
  .icon-btn {
    min-height: 48px;
    min-width: 48px;
    padding: 12px;
  }
}
```

### Sticky Footer Actions

```css
/* Sticky action buttons on mobile */

@media (max-width: 768px) {
  .form-actions {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-elevated);
    padding: 1rem;
    border-top: 1px solid var(--border-subtle);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-actions button {
    width: 100%;
    min-height: 48px;
    font-size: 1rem;
  }
}
```

### Responsive Grid

```css
/* Responsive form layout */

.form-row {
  display: grid;
  gap: 1rem;
}

/* Desktop: 2 columns */
@media (min-width: 769px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .form-group.full-width {
    grid-column: 1 / -1;
  }
}

/* Mobile: Single column */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
```

---

## Quick Integration Guide

### Step 1: Add Constants

Create `src/lib/livingItemsConstants.ts`:
```typescript
export const LIVING_ITEM_TYPES = {
  PERSON: 'person',
  PET: 'pet',
  PLANT: 'plant',
} as const;

export const LIVING_ITEM_CONFIG = {
  person: {
    icon: '👤',
    label: 'Person',
    pluralLabel: 'People',
    color: 'var(--color-person)',
    colorLight: 'var(--color-person-light)',
  },
  pet: {
    icon: '🐾',
    label: 'Pet',
    pluralLabel: 'Pets',
    color: 'var(--color-pet)',
    colorLight: 'var(--color-pet-light)',
  },
  plant: {
    icon: '🌱',
    label: 'Plant',
    pluralLabel: 'Plants',
    color: 'var(--color-plant)',
    colorLight: 'var(--color-plant-light)',
  },
};
```

### Step 2: Add CSS Variables

Add to `src/styles.css` (around line 100, after existing color palette):
```css
/* Living Items Color System */
:root {
  --color-person: #a78bfa;
  --color-person-light: rgba(167, 139, 250, 0.15);
  --color-person-border: rgba(167, 139, 250, 0.4);
  
  --color-pet: #fb923c;
  --color-pet-light: rgba(251, 146, 60, 0.15);
  --color-pet-border: rgba(251, 146, 60, 0.4);
  
  --color-plant: #4ade80;
  --color-plant-light: rgba(74, 222, 128, 0.15);
  --color-plant-border: rgba(74, 222, 128, 0.4);
}

:root[data-theme="light"] {
  --color-person: #7c3aed;
  --color-pet: #ea580c;
  --color-plant: #16a34a;
}
```

### Step 3: Add Utility Functions

Create `src/lib/livingItemsUtils.ts`:
```typescript
export const calculateAge = (birthdate: string | null): string => {
  if (!birthdate) return '';
  const birth = new Date(birthdate);
  const today = new Date();
  if (isNaN(birth.getTime())) return '';
  
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  
  if (years === 0) {
    const totalMonths = months;
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }
  
  return `${years} year${years !== 1 ? 's' : ''}`;
};

export const getLivingItemType = (item: Item): 'person' | 'pet' | 'plant' | null => {
  if (!item.is_living) return null;
  const rel = item.relationship_type?.toLowerCase();
  if (rel === 'pet') return 'pet';
  if (rel === 'plant') return 'plant';
  return 'person';
};
```

### Step 4: Update ItemForm

In `src/components/ItemForm.tsx` around line 990 (birthdate field), add age display:
```tsx
<div className="form-row">
  <div className="form-group">
    <label htmlFor="birthdate">Birthdate</label>
    <input
      type="date"
      id="birthdate"
      name="birthdate"
      value={formData.birthdate || ""}
      onChange={handleChange}
      disabled={loading}
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

### Step 5: Update ItemDetails

In `src/components/ItemDetails.tsx`, enhance the living item section (around line 225):
```tsx
{isLivingItem && (
  <div className="living-item-details">
    <div className="profile-card">
      <div className="profile-photo">
        {item.photos?.[0] ? (
          <img src={item.photos[0].url} alt={item.name} />
        ) : (
          <div className="photo-placeholder">
            {getLivingItemIcon(item)}
          </div>
        )}
      </div>
      <div className="profile-info">
        {item.birthdate && (
          <>
            <div className="info-item">
              <strong>{calculateAge(item.birthdate)}</strong>
            </div>
            <div className="info-item">
              Birthday: {formatDate(item.birthdate)}
            </div>
          </>
        )}
      </div>
    </div>
    {/* Rest of living item details */}
  </div>
)}
```

---

## Testing Checklist

Quick testing items for developers:

**Visual Testing:**
- [ ] Color contrast meets WCAG AA (use browser DevTools)
- [ ] Icons display correctly on all browsers
- [ ] Badges render properly in light/dark mode
- [ ] Profile photos are circular and centered
- [ ] Age calculation displays correctly

**Functional Testing:**
- [ ] Age updates when birthdate changes
- [ ] Emergency contacts can be added/removed
- [ ] Accordion sections expand/collapse
- [ ] Type selector cards are clickable
- [ ] Forms save living item data correctly

**Mobile Testing:**
- [ ] Touch targets are at least 44x44px
- [ ] Font size is 16px+ (no iOS zoom)
- [ ] Sticky footer stays in place
- [ ] Cards are tappable without mis-taps
- [ ] Layout works in portrait & landscape

**Accessibility Testing:**
- [ ] Tab navigation works through all fields
- [ ] Screen reader announces sections
- [ ] ARIA labels present on icons
- [ ] Focus indicators are visible
- [ ] Error messages are announced

---

## Resources

**Full Documentation:**
- `LIVING_ITEMS_UX_DESIGN.md` - Complete UX design specification

**Related Files:**
- `src/components/ItemForm.tsx` - Main form component
- `src/components/ItemDetails.tsx` - Details view component
- `src/lib/constants.ts` - Existing constants (RELATIONSHIP_LABELS)
- `src/styles.css` - Global styles

**Design System:**
- Current color palette uses CSS custom properties
- Dark mode is default, light mode uses `[data-theme="light"]`
- Existing accent color: `--accent` (blue)
- Icons: Emoji-first with Unicode support

---

**Last Updated:** 2024  
**Version:** 1.0  
**For:** NesVentory v6.11.2+
