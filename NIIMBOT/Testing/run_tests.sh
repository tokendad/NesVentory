#!/bin/bash

# Phase 3: Automated Test Runner
# Runs all unit tests, integration tests, and reports results

set -e

# Go to repository root (2 levels up from NIIMBOT/Testing/)
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR/../../"

echo "========================================"
echo "Phase 3: RFID Detection Test Suite"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_command=$2

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $test_name: FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Backend Unit Tests
echo -e "${YELLOW}1. Backend Unit Tests${NC}"
echo "Testing profile detector, RFID parsing, and signature matching..."

if command -v pytest &> /dev/null; then
    run_test_suite \
        "Backend Unit Tests (Profile Detector)" \
        "cd backend && PYTHONPATH=. pytest ../NIIMBOT/Testing/tests/test_rfid_detection.py -v --tb=short && cd .."
else
    echo -e "${YELLOW}⚠ pytest not found, skipping backend unit tests${NC}"
fi

# Backend Integration Tests
echo ""
echo -e "${YELLOW}2. Backend Integration Tests${NC}"
echo "Testing RFID service and API endpoint..."

if command -v pytest &> /dev/null; then
    run_test_suite \
        "Backend Integration Tests (RFID Service)" \
        "cd backend && PYTHONPATH=. pytest ../NIIMBOT/Testing/tests/test_rfid_integration.py -v --tb=short && cd .."
else
    echo -e "${YELLOW}⚠ pytest not found, skipping backend integration tests${NC}"
fi

# Frontend Component Tests
echo ""
echo -e "${YELLOW}3. Frontend Component Tests${NC}"
echo "Testing React UI components and state management..."

if command -v npm &> /dev/null; then
    run_test_suite \
        "Frontend Component Tests (QRLabelPrint RFID)" \
        "npm run test -- NIIMBOT/Testing/tests/QRLabelPrint.rfid.test.tsx --run 2>&1 | tail -20"
else
    echo -e "${YELLOW}⚠ npm not found, skipping frontend tests${NC}"
fi

# Manual Testing Guide
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Manual Testing Guide${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "To run manual tests, follow the checklist:"
echo "  📄 NIIMBOT/Docs/PHASE_3_TESTING_CHECKLIST.md"
echo ""
echo "Quick setup commands:"
echo "  1. Start backend:   docker compose up -d"
echo "  2. Start frontend:  npm run dev"
echo "  3. Open browser:    http://localhost:5173"
echo ""
echo "To test RFID detection:"
echo "  1. Go to any item/location"
echo "  2. Click 'Print QR'"
echo "  3. Ensure 'Server NIIMBOT' is selected"
echo "  4. Click 'Detect Label'"
echo "  5. Verify green banner shows 'B1 50mm'"
echo ""

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
    echo -e "${GREEN}✓ All tests PASSED!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review manual test checklist results"
    echo "  2. Document any issues found"
    echo "  3. Proceed to Phase 4: Hardening"
    echo ""
    exit 0
elif [ $TOTAL_TESTS -eq 0 ]; then
    echo -e "${YELLOW}⚠ No tests were run (missing test dependencies)${NC}"
    echo ""
    echo "To run tests, ensure you have:"
    echo "  - Python + pytest installed (for backend tests)"
    echo "  - Node.js + npm installed (for frontend tests)"
    echo ""
    exit 1
else
    echo -e "${RED}✗ Some tests FAILED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review failed test output above"
    echo "  2. Fix issues in source code"
    echo "  3. Re-run tests with: bash run_tests.sh"
    echo ""
    exit 1
fi
