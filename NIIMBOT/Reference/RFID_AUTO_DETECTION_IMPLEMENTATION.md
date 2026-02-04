# RFID Auto-Profile Detection Implementation Plan

**Feature**: Automatic label size detection via RFID with manual override capability
**Status**: Phase 1-2 Complete, Phase 3-4 Planned
**Last Updated**: February 3, 2026

---

## Table of Contents
1. [Phases 1-2 Summary (Completed)](#phases-1-2-summary-completed)
2. [Phase 3: Polish & Testing (Planned)](#phase-3-polish--testing-planned)
3. [Phase 4: Hardening (Planned)](#phase-4-hardening-planned)
4. [Testing Strategy](#testing-strategy)
5. [Known Limitations & Future Work](#known-limitations--future-work)

---

## Phases 1-2 Summary (Completed)

### Phase 1: Backend RFID Detection ✓
**Files Created/Modified:**
- `backend/app/niimbot/printer.py` - Added `get_rfid()` method
- `backend/app/niimbot/profile_detector.py` - NEW: Profile mapping & fuzzy matching
- `backend/app/services/rfid_service.py` - NEW: RFID detection service
- `backend/app/routers/printer.py` - Added `/api/printer/detect-rfid` endpoint

**Functionality:**
- Sends GET_RFID command (0x1A) to printer
- Parses RFID response (width_mm, height_mm, type)
- Fuzzy matches dimensions to 8 hardcoded profiles (±1mm tolerance)
- Returns confidence score, detected profile, and raw RFID data

**Profiles Implemented:**
- D11-H 12mm (300 DPI)
- D110 12mm (203 DPI)
- D101 24mm (203 DPI)
- D101 25mm (203 DPI)
- **B1 50mm 30mm** (203 DPI) ← Your test label
- B1 50mm 40mm (203 DPI)
- B21 50mm (203 DPI)
- B3S 75mm (203 DPI)

### Phase 2: Frontend UI ✓
**Files Created/Modified:**
- `src/lib/api.ts` - Added types & `detectRfidProfile()` function
- `src/components/QRLabelPrint.tsx` - Added detection UI & handlers

**Functionality:**
- "Detect Label" button (server printing only)
- Displays detected profile with confidence score
- Auto-selects correct printer model
- Two-step override confirmation with warning
- Clear error messages and user guidance
- Shows detected vs selected profile when override active

---

## Phase 3: Polish & Testing (Planned)

### 3.1 Unit Tests - Backend

**File**: `backend/testing/test_rfid_detection.py`

```python
# Test cases to implement:

def test_get_rfid_success():
    """Test successful RFID query from printer"""
    # Mock printer response with valid RFID data
    # Assert correct parsing of width, height, type

def test_get_rfid_no_label():
    """Test RFID query when no label loaded"""
    # Mock empty/null RFID response
    # Assert returns None gracefully

def test_profile_detection_exact_match():
    """Test profile matching with exact dimensions"""
    # Test B1 50×30mm detection
    # Assert matches "B1 50mm" profile

def test_profile_detection_fuzzy_match():
    """Test profile matching with ±1mm tolerance"""
    # Test 50×31mm (B1 is 50×30mm)
    # Assert still matches with slightly lower confidence

def test_profile_detection_no_match():
    """Test handling of unknown label dimensions"""
    # Test 99×99mm
    # Assert returns None

def test_rfid_service_end_to_end():
    """Test complete RFID detection workflow"""
    # Mock printer connection
    # Mock RFID response
    # Assert returns complete detection result

def test_rfid_service_connection_error():
    """Test error handling on connection failure"""
    # Mock connection timeout
    # Assert returns error dict with helpful message

def test_rfid_service_unsupported_label():
    """Test handling of unrecognized RFID data"""
    # Mock RFID response for unknown label size
    # Assert returns success=False with guidance
```

### 3.2 Component Tests - Frontend

**File**: `src/__tests__/QRLabelPrint.rfid.test.tsx`

```typescript
// Test cases to implement:

describe("RFID Detection UI", () => {
  test("shows detect button only for server connection", () => {
    // Render with server connection
    // Assert button visible
    // Render with bluetooth connection
    // Assert button not visible
  });

  test("shows detect button only when printer configured", () => {
    // Render with enabled printer config
    // Assert button visible
    // Render with disabled printer config
    // Assert button hidden
  });

  test("disables detect button while detecting", async () => {
    // Click detect button
    // Assert button disabled and shows "Detecting..."
    // Wait for request to complete
    // Assert button re-enabled
  });

  test("displays detected profile after successful detection", async () => {
    // Mock successful RFID detection API response
    // Click detect button
    // Assert shows "✓ Detected: B1 50mm"
    // Assert shows confidence score
    // Assert shows dimensions
  });

  test("displays error message on detection failure", async () => {
    // Mock failed RFID detection
    // Click detect button
    // Assert shows error message
  });

  test("auto-selects detected printer model", async () => {
    // Mock detection of B1 50mm
    // Click detect button
    // Assert selectedPrinterModel changed to "b1"
  });

  test("shows override option after detection", async () => {
    // Successfully detect profile
    // Assert "Override detected profile" link visible
  });

  test("two-step override confirmation workflow", async () => {
    // Successfully detect profile
    // Click "Override"
    // Assert shows warning dialog
    // Click "Cancel"
    // Assert override not enabled
    // Click "Override" again
    // Assert warning shows
    // Click "I understand"
    // Assert override enabled
  });

  test("shows override active indicator with model selector", async () => {
    // Enable override
    // Assert shows detected vs selected profiles
    // Assert profile selector appears
    // Change to different model
    // Assert selectedPrinterModel updated
  });

  test("clears detection state on connection type change", async () => {
    // Detect profile for server
    // Change to bluetooth
    // Assert detection UI hidden
    // Change back to server
    // Assert needs to detect again (state cleared)
  });
});
```

### 3.3 Integration Tests

**File**: `backend/testing/test_rfid_integration.py`

```python
# Test cases to implement:

def test_detect_rfid_endpoint_success():
    """Test POST /api/printer/detect-rfid endpoint"""
    # Create authenticated request
    # Mock printer RFID response
    # Assert endpoint returns correct structure

def test_detect_rfid_endpoint_no_printer_config():
    """Test endpoint when printer not configured"""
    # Make request with no printer config
    # Assert returns 400 error

def test_detect_rfid_endpoint_printer_disabled():
    """Test endpoint when printer is disabled"""
    # Make request with disabled printer config
    # Assert returns 400 error

def test_detect_rfid_endpoint_unauthenticated():
    """Test endpoint without authentication"""
    # Make unauthenticated request
    # Assert returns 401 error

def test_detect_rfid_with_all_printer_models():
    """Test detection with all 8 hardcoded profiles"""
    # For each profile:
    #   - Mock RFID response with profile dimensions
    #   - Assert correct profile detected
    #   - Assert confidence >= 0.95
```

### 3.4 Manual Testing Checklist

**Pre-Testing Setup:**
- [ ] Backend running with RFID detection endpoint
- [ ] Frontend built with detection UI
- [ ] B1 printer powered on and connected
- [ ] B1 printer loaded with 50×30mm label roll
- [ ] User authenticated and logged into app
- [ ] Printer configured in settings (enabled, B1 model)

**Test Execution:**

```
✓ Test 1: Basic Detection
  [ ] Navigate to item/location
  [ ] Click "Print QR"
  [ ] Select "Server NIIMBOT"
  [ ] Click "Detect Label"
  [ ] Wait for detection to complete
  [ ] Verify shows "✓ Detected: B1 50mm"
  [ ] Verify dimensions show "50×30mm"
  [ ] Verify confidence >= 90%
  [ ] Verify printer model auto-selected to "b1"

✓ Test 2: No Label Error
  [ ] Unload label roll from printer
  [ ] Click "Detect Label" again
  [ ] Verify shows error: "No RFID tag detected"
  [ ] Load label back in
  [ ] Detection should work again

✓ Test 3: Manual Override
  [ ] After successful detection
  [ ] Click "Override detected profile"
  [ ] Read warning message
  [ ] Click "Cancel"
  [ ] Override should NOT be enabled
  [ ] Click "Override" again
  [ ] Click "I understand, enable override"
  [ ] Verify override indicator appears
  [ ] Verify shows "Detected: B1 50mm"

✓ Test 4: Override Model Selection
  [ ] With override enabled
  [ ] Open model dropdown
  [ ] Select "D110 12mm"
  [ ] Verify indicator shows "Selected: d110"
  [ ] Click "Print"
  [ ] Print should complete with warning
  [ ] Verify output (will be misaligned - expected)

✓ Test 5: Clear Override
  [ ] After override test
  [ ] Reload page
  [ ] Override should be cleared
  [ ] Detection should work normally again

✓ Test 6: Browser Behavior
  [ ] Test in Chrome/Chromium
  [ ] Test in Firefox
  [ ] Test on mobile browser
  [ ] Verify UI responsive on mobile

✓ Test 7: Error Cases
  [ ] Printer offline during detection → timeout error
  [ ] Network interruption → connection error
  [ ] RFID read fails (bad label) → unsupported label error
  [ ] Each should show helpful error message
```

### 3.5 Edge Cases to Handle

**Implementation Notes:**

1. **Dimension Validation**
   - Validate RFID dimensions are 10-200mm range
   - Log suspicious readings
   - Reject out-of-range values

2. **Confidence Scoring**
   - Exact match: 1.0 (100%)
   - ±0.5mm: ~0.98 (98%)
   - ±1.0mm: ~0.95 (95%)
   - >±1mm: 0.0 (no match)

3. **Multiple Matching Profiles**
   - If multiple profiles match, return first match
   - Log all candidates for debugging
   - Consider adding "accept alternative" UI

4. **RFID Data Format Variations**
   - Handle different byte orders (big-endian vs little-endian)
   - Handle variable-length responses
   - Handle missing optional fields

5. **Connection Stability**
   - Retry RFID query up to 3 times on failure
   - Add backoff between retries
   - Timeout after 10 seconds

6. **UI State Consistency**
   - Clear detection state when changing connection type
   - Reset override when user changes printer
   - Persist detection state in localStorage (optional)

---

## Phase 4: Hardening (Planned)

### 4.1 Error Recovery & Fallback

**Implement in `backend/app/services/rfid_service.py`:**

```python
# Add retry logic with exponential backoff
@staticmethod
def detect_loaded_label_with_retry(printer_config: dict, max_retries: int = 3):
    """Detect label with automatic retry on transient failures"""
    for attempt in range(max_retries):
        try:
            result = RfidDetectionService.detect_loaded_label(printer_config)
            if result['success']:
                return result
            # Don't retry on permanent failures (no label, unknown type)
            if 'Unknown label' in result.get('error', ''):
                return result
        except TimeoutError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise

    return {
        'success': False,
        'error': 'RFID detection failed after multiple retries'
    }

# Add suggestion for likely profiles
@staticmethod
def get_profile_suggestions(rfid_data: dict, max_suggestions: int = 3):
    """Get closest matching profiles for unknown labels"""
    target_w = rfid_data['width_mm']
    target_h = rfid_data['height_mm']

    # Calculate distance to all profiles
    distances = []
    for profile in BUILTIN_PROFILES:
        dist = abs(profile.width_mm - target_w) + abs(profile.height_mm - target_h)
        distances.append((dist, profile))

    # Return closest matches
    distances.sort(key=lambda x: x[0])
    return [p[1] for p in distances[:max_suggestions]]
```

### 4.2 Logging & Analytics

**Add to `backend/app/services/rfid_service.py`:**

```python
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Log all RFID operations
def detect_loaded_label(printer_config: dict):
    start_time = datetime.now()

    try:
        result = ...
        elapsed = (datetime.now() - start_time).total_seconds()

        if result['success']:
            logger.info(
                f"RFID detection success: "
                f"profile={result['detected_profile']['name']}, "
                f"confidence={result['confidence']:.2%}, "
                f"time={elapsed:.2f}s"
            )
        else:
            logger.warning(
                f"RFID detection failed: {result['error']}, "
                f"time={elapsed:.2f}s"
            )

        return result
    except Exception as e:
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.error(
            f"RFID detection exception: {e}, "
            f"time={elapsed:.2f}s",
            exc_info=True
        )
        raise
```

### 4.3 User Feedback & Tooltips

**Update in `src/components/QRLabelPrint.tsx`:**

```typescript
// Add contextual help based on detection state
const getDetectionHelpText = (): string => {
  if (isDetecting) return "Querying printer RFID...";
  if (detectionError) return "Check printer is powered on and label is loaded";
  if (detectedProfile && !manualOverride) return "Auto-detected - ready to print";
  if (manualOverride) return "Using manual override - verify settings before printing";
  return "Load a labeled roll and click Detect to auto-configure";
};

// Add keyboard shortcuts
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Alt+D to trigger detect
    if (e.altKey && e.key === 'd' && connectionType === 'server') {
      handleDetectRfid();
    }
    // Esc to cancel override
    if (e.key === 'Escape' && overrideWarningDismissed) {
      setOverrideWarningDismissed(false);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [connectionType, overrideWarningDismissed]);
```

### 4.4 Performance Optimization

**Implement Profile Caching:**

```python
# In profile_detector.py
from functools import lru_cache

@lru_cache(maxsize=100)
def detect_profile_cached(width_mm: int, height_mm: int) -> Optional[RfidProfile]:
    """Cached version of profile detection"""
    return ProfileDetector.detect_profile({
        'width_mm': width_mm,
        'height_mm': height_mm,
        'type': 0,
        'raw_data': ''
    })
```

**Implement Response Caching:**

```typescript
// In QRLabelPrint.tsx
const detectionCache = useRef<{
  profile: RfidProfile | null;
  timestamp: number;
} | null>(null);

const handleDetectRfid = async () => {
  // Check cache (valid for 5 minutes)
  if (detectionCache.current &&
      Date.now() - detectionCache.current.timestamp < 5 * 60 * 1000) {
    setDetectedProfile(detectionCache.current.profile);
    return;
  }

  // ... normal detection flow ...

  // Cache result
  detectionCache.current = {
    profile: detectedProfile,
    timestamp: Date.now()
  };
};
```

### 4.5 Advanced Features (Future)

**Planned for later iterations:**

1. **Template Management**
   - Save custom profile overrides as "templates"
   - Quick-access to frequently used overrides
   - Share templates between users

2. **Multi-Label Support**
   - Detect and suggest multiple profiles for split rolls
   - Handle rolls with mixed label sizes

3. **RFID Analytics**
   - Track which labels users print most
   - Suggest profiles based on usage patterns
   - Monitor RFID read success rates

4. **Smart Defaults**
   - Learn user preferences
   - Auto-suggest override based on history
   - Different profiles for different locations

5. **Label Inventory**
   - Track consumed label stock via RFID history
   - Alert when running low
   - Suggest reorder points

---

## Testing Strategy

### Test Environment
- Backend: Python 3.10+, FastAPI
- Frontend: React 18+, TypeScript
- Database: SQLite (can switch to PostgreSQL)
- Printer: B1 with 50×30mm labels (primary), other models if available

### Test Levels

**Level 1: Unit Tests** (Phase 3)
- Profile detector matching logic
- RFID data parsing
- Confidence scoring
- Component state management

**Level 2: Integration Tests** (Phase 3)
- API endpoint responses
- Service workflow
- Database interactions
- Authentication & authorization

**Level 3: Manual Testing** (Phase 3)
- End-to-end detection flow
- Error scenarios
- UI responsiveness
- Browser compatibility

**Level 4: Real-World Testing** (Phase 4)
- Multiple printer models
- Various label sizes
- Network latency/failures
- Concurrent users

### Coverage Goals
- Backend: 80%+ code coverage
- Frontend: 70%+ component coverage
- Critical paths: 100% coverage

---

## Known Limitations & Future Work

### Current Limitations

1. **Single Printer Model**
   - Currently assumes one printer model per user
   - Multi-printer support planned for v7.0

2. **RFID Format Assumptions**
   - Assumes standard RFID byte order
   - May not work with non-standard RFID implementations
   - Custom RFID parsing may be needed for some printers

3. **Fixed Profile List**
   - Hardcoded 8 profiles
   - Dynamic profile management planned

4. **No Historical Data**
   - Doesn't learn from past detections
   - No suggestion based on usage patterns

5. **No Offline Mode**
   - Requires network for API call
   - Local caching planned

### Future Enhancements

| Feature | Priority | Target Version |
|---------|----------|-----------------|
| Dynamic profile management | Medium | v7.0 |
| Multi-printer support | Medium | v7.0 |
| Template management | Low | v7.1 |
| RFID analytics | Low | v7.1 |
| Smart defaults/learning | Low | v7.2 |
| Offline detection caching | Low | v7.2 |
| Mobile app integration | Medium | v7.2 |

---

## Completion Checklist

### Phase 1: Backend RFID Detection
- [x] Implement `get_rfid()` method in PrinterClient
- [x] Create ProfileDetector with fuzzy matching
- [x] Create RfidDetectionService wrapper
- [x] Add `/api/printer/detect-rfid` endpoint
- [x] Handle all 8 common label profiles
- [x] Validate RFID data and dimensions
- [x] Add error handling and logging

### Phase 2: Frontend UI
- [x] Add RFID detection types to API
- [x] Create `detectRfidProfile()` API function
- [x] Add state variables to QRLabelPrint
- [x] Implement detection handlers
- [x] Add detection UI (button, banner, results)
- [x] Implement override confirmation
- [x] Show detected vs selected profile
- [x] Add model selector for override
- [x] Verify TypeScript compilation

### Phase 3: Polish & Testing
- [ ] Write unit tests for profile detector
- [ ] Write backend integration tests
- [ ] Write frontend component tests
- [ ] Create manual testing checklist
- [ ] Test all 8 profiles (if available)
- [ ] Test error scenarios
- [ ] Test browser compatibility
- [ ] Get user feedback from testing

### Phase 4: Hardening
- [ ] Add retry logic with backoff
- [ ] Implement profile suggestion for unknown labels
- [ ] Add comprehensive logging/analytics
- [ ] Implement response caching
- [ ] Performance testing & optimization
- [ ] Security review
- [ ] Final user testing
- [ ] Documentation & deployment

---

## References

- **NIIMBOT Protocol**: https://printers.niim.blue/interfacing/proto/
- **RFID Docs**: docs/nimmbott/NIIMBOT_API_ENDPOINTS.md
- **Hardware Reference**: docs/nimmbott/NIIMBOT_HARDWARE_REFERENCE.md
- **Issue #474**: Printer image quality improvements
- **Issue #478**: Less data to QR codes (related feature)

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-02-03 | 1.0 | Claude | Initial plan document, Phases 1-4 detailed |

