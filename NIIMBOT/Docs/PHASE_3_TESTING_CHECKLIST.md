# Phase 3: Testing Checklist & Manual Test Cases

**Status**: Ready for Testing
**Date**: February 3, 2026
**Test Environment**: Local Docker with B1 Printer + 50x30mm Labels

---

## Pre-Testing Setup

### Prerequisites
- [ ] Backend running in Docker (`docker compose up`)
- [ ] Frontend running (`npm run dev`)
- [ ] B1 printer powered on and connected
- [ ] B1 loaded with 50×30mm labels
- [ ] User authenticated in app
- [ ] Printer configured in User Settings
- [ ] Browser DevTools available (F12)

### Test Data
- **Printer Model**: B1
- **Label Size**: 50×30mm
- **Label RFID Signature**: `881d86286c121080`
- **Product Code**: `10262260`

---

## Unit Test Execution

### Backend Unit Tests

```bash
# Run RFID profile detector tests
pytest backend/tests/test_rfid_detection.py -v

*** Results:**


**Test Categories:**
- ✓ Profile matching (exact match)
- ✓ Profile matching (fuzzy match ±1mm)
- ✓ Edge cases (unknown labels, out of range, zero values)
- ✓ Data types and validation
- ✓ Confidence scoring
- ✓ Model lookup functions
- ✓ Dataclass functionality

### Backend Integration Tests

```bash
# Run RFID service integration tests
pytest backend/tests/test_rfid_integration.py -v

# Expected Results:
# - 10+ test cases
# - All tests should PASS
# - Coverage: ~90%+ of rfid_service.py
```

**Test Categories:**
- ✓ Successful detection workflow
- ✓ Error scenarios (no config, disabled printer, no label)
- ✓ Unknown label handling
- ✓ Connection errors
- ✓ Timeout handling
- ✓ All profile detection
- ✓ Response format validation

### Frontend Component Tests

```bash
# Run React component tests
npm run test -- QRLabelPrint.rfid.test.tsx

# Expected Results:
# - 20+ test cases
# - All tests should PASS
# - Coverage: ~85%+ of RFID UI code
```

**Test Categories:**
- ✓ Detection button visibility
- ✓ Detection button behavior
- ✓ Successful detection UI
- ✓ Error handling UI
- ✓ Override workflow
- ✓ UI state consistency

---

## Manual Test Execution

### Test 1: Basic RFID Detection

**Scenario**: User opens print dialog and detects label

**Steps:**
1. [ x] Navigate to any item/location
2. [ x] Click "Print QR"
3. [ x] Ensure "Server NIIMBOT (Recommended)" is selected
4. [ x] Click "Detect Label" button
5. [ x] Wait 3-5 seconds for detection

**Expected Results:**
- [x ] Button shows "Detecting..." during query
- [x ] Green banner appears: "✓ Detected: B1 50mm"
- [x ] Shows "50×30mm @ 203 DPI"
- [x ] Shows "Confidence: 100%"
- [x ] Printer model auto-selected to "b1"
- [x ] "Override detected profile" link visible
- [x ] No errors in browser console

**Actual Results:**
```
  results as expected, Printer detected and Proper label applied.
```

**Status**:  PASS


### Test 2: No Label Error

**Scenario**: User tries to detect when no label is loaded

**Steps:**
1. [x ] Unload label roll from printer
2. [ x] Click "Detect Label"
3. [ x] Observe error message

**Expected Results:**
- [ x] Red error banner appears
- [x ] Error message: "No RFID tag detected. Ensure label roll is properly loaded."
- [ x] Detection UI remains visible for retry
- [ x] Can reload label and detect again

**Actual Results:**
```
results as expected.
```
**Status**: PASS

---

### Test 3: Override Workflow

**Scenario**: User manually overrides detected profile

**Steps:**
1. [ x] Detect label successfully (see Test 1)
2. [ x] Click "Override detected profile (advanced users only)"
3. [ x] Read the warning dialog
4. [ x] Click "Cancel" first
5. [ x] Verify override is NOT enabled
6. [ x] Click "Override" again
7. [ x] Click "I understand, enable override"
8. [ x] Verify override is NOW enabled

**Expected Results:**
- [x ] Warning dialog shows orange styling
- [x ] Shows detected profile: "B1 50mm"
- [x ] Shows detected dimensions: "50×30mm"
- [x ] Cancel button works and closes dialog
- [x ] Second confirmation enables override
- [x ] Red "Profile Override Active" banner appears
- [x ] Shows "Detected: B1 50mm" vs "Selected: [model]"
- [x ] Model dropdown selector appears

**Actual Results:**
```
as expected - passed
```

**Status**: ☐ PASS

---

### Test 4: Override Model Selection

**Scenario**: User selects different profile while override active

**Steps:**
1. [x ] Enable override (see Test 3)
2. [x ] Open "Select Override Profile" dropdown
3. [x ] Select "D110 12mm" (different profile)
4. [x ] Observe warning indicator

**Expected Results:**
- [x ] Dropdown shows available profiles
- [x ] Selection changes to D110
- [x ] Warning shows mismatch:
  ```
  Detected: B1 50mm
  Selected: d110
  ```
- [x ] Red "Profile Override Active" indicator remains

**Actual Results:**
```
as expected- PASS
```

**Status**: PASS

---

### Test 5: Print with Override

**Scenario**: User prints with mismatched profile

**Steps:**
1. [ ] Keep override enabled with D110 selected
2. [ ] Click "Print"
3. [ ] Observe print output

**Expected Results:**
- [ ] Print proceeds despite mismatch
- [ ] Output prints (though likely misaligned due to wrong profile)
- [ ] Warning message shows before print (if implemented)

**Actual Results:**
```
[Document your actual observations here]
```

**Status**: ☐ PASS ☐ FAIL

---

### Test 6: Clear Override on Page Reload

**Scenario**: User reloads page after override

**Steps:**
1. [ ] Enable override
2. [ ] Reload the page (F5 or Ctrl+R)
3. [ ] Return to print dialog
4. [ ] Observe if override state persists

**Expected Results:**
- [ ] Override should be cleared after reload
- [ ] Detection should work normally again
- [ ] No "Profile Override Active" banner shown

**Actual Results:**
```
[Document your actual observations here]
```

**Status**: ☐ PASS ☐ FAIL

---

### Test 7: Connection Type Switch

**Scenario**: User switches connection types

**Steps:**
1. [ ] Detect label successfully with Server
2. [ ] Switch connection type to "Bluetooth"
3. [ ] Switch back to "Server"
4. [ ] Observe detection UI

**Expected Results:**
- [ ] Detection UI disappears when switching away from Server
- [ ] Detection UI reappears when switching back
- [ ] Previous detection cleared
- [ ] User must detect again

**Actual Results:**
```
[Document your actual observations here]
```

**Status**: ☐ PASS ☐ FAIL

---

### Test 8: Browser Compatibility

**Scenario**: Test on different browsers

**Steps:**
1. [ ] Test in Chrome/Chromium
2. [ ] Test in Firefox
3. [ ] Test on mobile browser (if available)
4. [ ] Check responsive layout

**Expected Results:**
- [ ] All UI elements visible
- [ ] Buttons responsive to clicks
- [ ] Text readable
- [ ] Layout adapts to screen size
- [ ] No console errors

**Chrome/Chromium:**
```
[Document observations]
Status: ☐ PASS ☐ FAIL
```

**Firefox:**
```
[Document observations]
Status: ☐ PASS ☐ FAIL
```

**Mobile/Tablet:**
```
[Document observations]
Status: ☐ PASS ☐ FAIL
```

---

### Test 9: Error Recovery

**Scenario**: Recover from various error states

**Steps:**
1. [ ] Trigger "No RFID" error (unload label)
2. [ ] Reload label
3. [ ] Detect again successfully
4. [ ] Trigger connection error (stop printer)
5. [ ] Restart printer
6. [ ] Detect again successfully

**Expected Results:**
- [ ] Error messages clear on retry
- [ ] Detection works after error recovery
- [ ] No stuck states
- [ ] UI remains responsive

**Actual Results:**
```
[Document observations]
```

**Status**: ☐ PASS ☐ FAIL

---

### Test 10: Performance

**Scenario**: Check detection performance

**Steps:**
1. [ ] Note system time before clicking detect
2. [ ] Click "Detect Label"
3. [ ] Note time when detection completes
4. [ ] Calculate total time
5. [ ] Repeat 3 times and average

**Expected Results:**
- [ ] Detection completes in 2-5 seconds
- [ ] Response time is acceptable
- [ ] No timeout errors

**Run 1**: _____ seconds
**Run 2**: _____ seconds
**Run 3**: _____ seconds
**Average**: _____ seconds

**Status**: ☐ PASS ☐ FAIL

---

## Browser Console Check

### JavaScript Console Errors

**Steps:**
1. [ ] Open DevTools (F12)
2. [ ] Go to Console tab
3. [ ] Perform all test scenarios
4. [ ] Note any red errors

**Expected Results:**
- [ ] No red error messages
- [ ] No "Uncaught" exceptions
- [ ] No network 404/500 errors
- [ ] Warnings are acceptable

**Observations:**
```
[Document any console errors/warnings]
```

**Status**: ☐ PASS ☐ FAIL

---

### Network Activity

**Steps:**
1. [ x] Open DevTools Network tab
2. [ x] Click "Detect Label"
3. [ x] Observe network request

**Expected Results:**
- [ ] POST `/api/printer/detect-rfid` request
- [ ] Response status: 200 OK
- [ ] Response time: < 5 seconds
- [ ] Response contains:
  ```json
  {
    "success": true,
    "detected_profile": { ... },
    "rfid_data": { ... },
    "confidence": 0.95
  }
  ```

**Actual Response:**
```
"success": true,
"rfid_data": {
    "width_mm": 50,
    "height_mm": 30,
    "type": 0,
    "raw_data": "881d86286c12108008313032363232363010505a31483630343332323030333638370114000701",
    "product_code": "10262260",
    "response_signature": "881d8628"
},
"detected_profile": {
    "name": "B1 50mm",
    "model": "b1",
    "width_mm": 50,
    "height_mm": 30,
    "width_px": 384,
    "height_px": 240,
    "dpi": 203,
    "print_direction": "vertical"
},
"confidence": 1.0,
"error": null
}
```

**Status**:  PASS

---

## Summary

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Basic Detection | ☐ PASS ☐ FAIL | |
| 2. No Label Error | ☐ PASS ☐ FAIL | |
| 3. Override Workflow | ☐ PASS ☐ FAIL | |
| 4. Model Selection | ☐ PASS ☐ FAIL | |
| 5. Print Override | ☐ PASS ☐ FAIL | |
| 6. Clear Override | ☐ PASS ☐ FAIL | |
| 7. Connection Switch | ☐ PASS ☐ FAIL | |
| 8. Browser Compat | ☐ PASS ☐ FAIL | |
| 9. Error Recovery | ☐ PASS ☐ FAIL | |
| 10. Performance | ☐ PASS ☐ FAIL | |

### Overall Result

**Total Tests**: 4  + Console output.
**Passed**: _____
**Failed**: _____
**Success Rate**: _____%

### Issues Found

```
[Document any issues, bugs, or unexpected behavior]
```

### Recommendations

```
Move all Niimbot files into a new folder to consolidate
   nesventory/NIIMBOT
    - Docs
    - Testing
    - Reference material

  The "Niimprinters References" folder can be added to the "NIIMBOT/Reference material" folder  

```

### Sign-Off

- **Tested By**: _______________________
- **Date**: _______________________
- **Status**: ☐ APPROVED ☐ NEEDS FIXES

---

## Next Steps

If all tests PASS:
- [ ] Proceed to Phase 4: Hardening
- [ ] Document RFID signature for other label types (if available)
- [ ] Commit work to git

If tests FAIL:
- [ ] Document issues in GitHub
- [ ] Fix bugs
- [ ] Re-run failing tests
- [ ] Update this checklist

---

## Appendix: Quick Commands

```bash
# Run backend unit tests
pytest backend/tests/test_rfid_detection.py -v

# Run integration tests
pytest backend/tests/test_rfid_integration.py -v

# Run frontend tests
npm run test -- QRLabelPrint.rfid.test.tsx

# Check logs in real-time
docker logs nesventory5 -f | grep RFID

# Get last RFID detection logs
docker logs nesventory5 2>&1 | grep "RFID detected" | tail -5

# Restart containers
docker compose restart
```
