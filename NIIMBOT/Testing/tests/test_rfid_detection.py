"""
Unit tests for RFID profile detection.

Tests the profile detector, RFID response parsing, and signature matching.
"""

import pytest
from app.niimbot.profile_detector import ProfileDetector, RfidProfile


class TestProfileDetectorBasics:
    """Test basic profile detector functionality."""

    def test_get_all_profiles(self):
        """Test that all profiles are available."""
        profiles = ProfileDetector.get_all_profiles()
        assert len(profiles) >= 8, "Should have at least 8 profiles"
        assert all(isinstance(p, RfidProfile) for p in profiles)

    def test_profile_attributes(self):
        """Test that profiles have required attributes."""
        profiles = ProfileDetector.get_all_profiles()
        for profile in profiles:
            assert profile.name, f"Profile {profile} missing name"
            assert profile.model, f"Profile {profile.name} missing model"
            assert 10 <= profile.width_mm <= 200, f"Invalid width for {profile.name}"
            assert 10 <= profile.height_mm <= 200, f"Invalid height for {profile.name}"
            assert profile.dpi in (203, 300), f"Unexpected DPI for {profile.name}: {profile.dpi}"
            assert profile.print_direction in ("horizontal", "vertical")
            assert 0.0 <= profile.confidence <= 1.0


class TestProfileDetectionExactMatch:
    """Test exact profile matching."""

    def test_detect_b1_50x30(self):
        """Test detecting B1 50x30mm label."""
        rfid_data = {
            "width_mm": 50,
            "height_mm": 30,
            "type": 0,
            "raw_data": "881d86286c121080..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None, "Should detect B1 50x30 profile"
        assert profile.name == "B1 50mm"
        assert profile.width_mm == 50
        assert profile.height_mm == 30
        assert profile.confidence >= 0.95

    def test_detect_d101_24x40(self):
        """Test detecting D101 24x40mm label."""
        rfid_data = {
            "width_mm": 24,
            "height_mm": 40,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None
        assert "D101" in profile.name
        assert profile.width_mm == 24
        assert profile.height_mm == 40

    def test_detect_d110_12x40(self):
        """Test detecting D110 12x40mm label."""
        rfid_data = {
            "width_mm": 12,
            "height_mm": 40,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None
        assert profile.height_mm == 40
        # Could match D11-H or D110 (both are 12x40)
        assert profile.width_mm == 12

    def test_detect_d101_25x50(self):
        """Test detecting D101 25x50mm label."""
        rfid_data = {
            "width_mm": 25,
            "height_mm": 50,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None
        assert profile.name == "D101 25mm"

    def test_detect_b3s_75x40(self):
        """Test detecting B3S 75x40mm label."""
        rfid_data = {
            "width_mm": 75,
            "height_mm": 40,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None
        assert "B3S" in profile.name
        assert profile.width_mm == 75


class TestProfileDetectionFuzzyMatch:
    """Test fuzzy matching with tolerance."""

    def test_fuzzy_match_within_tolerance(self):
        """Test that dimensions within ±1mm still match."""
        # B1 50x30 with +0.5mm variance
        rfid_data = {
            "width_mm": 50.5,
            "height_mm": 30.5,
            "type": 0,
            "raw_data": "..."
        }
        # Note: We're using integers for width_mm/height_mm,
        # so we test with integer boundaries
        rfid_data_int = {
            "width_mm": int(50.5),
            "height_mm": int(30.5),
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data_int)
        assert profile is not None
        assert profile.width_mm == 50

    def test_fuzzy_match_at_boundary(self):
        """Test matching at ±1mm boundary."""
        # 51x31 (B1 50x30 + 1mm on each dimension)
        rfid_data = {
            "width_mm": 51,
            "height_mm": 31,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is not None
        assert profile.name == "B1 50mm"

    def test_no_match_outside_tolerance(self):
        """Test that dimensions outside tolerance don't match."""
        # 52x32 (B1 50x30 + 2mm - outside ±1mm tolerance)
        rfid_data = {
            "width_mm": 52,
            "height_mm": 32,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        # Might match a different profile, or return None
        if profile:
            # If it matches, verify it's a different label type
            assert not (profile.width_mm == 50 and profile.height_mm == 30)


class TestProfileDetectionEdgeCases:
    """Test edge cases and error handling."""

    def test_unknown_label_dimensions(self):
        """Test handling of unknown label dimensions."""
        rfid_data = {
            "width_mm": 99,
            "height_mm": 99,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None, "Should not match unknown dimensions"

    def test_out_of_range_dimensions(self):
        """Test handling of out-of-range dimensions."""
        rfid_data = {
            "width_mm": 999,
            "height_mm": 999,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None

    def test_zero_dimensions(self):
        """Test handling of zero/invalid dimensions."""
        rfid_data = {
            "width_mm": 0,
            "height_mm": 0,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None

    def test_negative_dimensions(self):
        """Test handling of negative dimensions."""
        rfid_data = {
            "width_mm": -50,
            "height_mm": -30,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None

    def test_missing_rfid_data_fields(self):
        """Test handling of incomplete RFID data."""
        # Missing width_mm
        rfid_data = {
            "height_mm": 30,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None

        # Missing height_mm
        rfid_data = {
            "width_mm": 50,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile is None

        # Completely empty
        profile = ProfileDetector.detect_profile({})
        assert profile is None

        # None
        profile = ProfileDetector.detect_profile(None)
        assert profile is None

    def test_invalid_data_types(self):
        """Test handling of invalid data types."""
        rfid_data = {
            "width_mm": "50",  # String instead of int
            "height_mm": 30,
            "type": 0,
            "raw_data": "..."
        }
        # Should either handle gracefully or raise ValueError
        try:
            profile = ProfileDetector.detect_profile(rfid_data)
            assert profile is None  # If no exception, should return None
        except (TypeError, ValueError):
            pass  # This is also acceptable


class TestConfidenceScoring:
    """Test confidence score calculation."""

    def test_exact_match_high_confidence(self):
        """Test that exact matches have high confidence."""
        rfid_data = {
            "width_mm": 50,
            "height_mm": 30,
            "type": 0,
            "raw_data": "..."
        }
        profile = ProfileDetector.detect_profile(rfid_data)
        assert profile.confidence >= 0.95, "Exact match should have high confidence"

    def test_fuzzy_match_lower_confidence(self):
        """Test that fuzzy matches have lower confidence."""
        exact = ProfileDetector.detect_profile({
            "width_mm": 50,
            "height_mm": 30,
            "type": 0,
            "raw_data": "..."
        })

        fuzzy = ProfileDetector.detect_profile({
            "width_mm": 51,
            "height_mm": 30,
            "type": 0,
            "raw_data": "..."
        })

        if fuzzy and exact:
            # Fuzzy match should have lower confidence than exact
            assert fuzzy.confidence <= exact.confidence


class TestGetProfileByModel:
    """Test getting profile by model identifier."""

    def test_get_profile_b1(self):
        """Test getting B1 model profile."""
        profile = ProfileDetector.get_profile_by_model("b1")
        assert profile is not None
        assert "B1" in profile.name

    def test_get_profile_d101(self):
        """Test getting D101 model profile."""
        profile = ProfileDetector.get_profile_by_model("d101")
        assert profile is not None
        assert "D101" in profile.name

    def test_get_profile_d110(self):
        """Test getting D110 model profile."""
        profile = ProfileDetector.get_profile_by_model("d110")
        assert profile is not None

    def test_get_profiles_by_model(self):
        """Test getting all profiles for a model."""
        profiles = ProfileDetector.get_profiles_by_model("b1")
        assert len(profiles) > 0
        assert all("B1" in p.name or "b1" in p.model for p in profiles)

    def test_nonexistent_model(self):
        """Test getting profile for non-existent model."""
        profile = ProfileDetector.get_profile_by_model("nonexistent")
        assert profile is None


class TestRfidProfileDataclass:
    """Test RfidProfile dataclass functionality."""

    def test_profile_equality(self):
        """Test that profiles with same dimensions are equal."""
        p1 = RfidProfile(
            name="B1 50mm",
            model="b1",
            width_mm=50,
            height_mm=30,
            width_px=384,
            height_px=240,
            dpi=203,
            print_direction="vertical"
        )
        p2 = RfidProfile(
            name="B1 50mm",
            model="b1",
            width_mm=50,
            height_mm=30,
            width_px=384,
            height_px=240,
            dpi=203,
            print_direction="vertical"
        )
        assert p1 == p2

    def test_profile_inequality(self):
        """Test that profiles with different dimensions are not equal."""
        p1 = RfidProfile(
            name="B1 50mm",
            model="b1",
            width_mm=50,
            height_mm=30,
            width_px=384,
            height_px=240,
            dpi=203,
            print_direction="vertical"
        )
        p2 = RfidProfile(
            name="D101 25mm",
            model="d101",
            width_mm=25,
            height_mm=50,
            width_px=100,
            height_px=200,
            dpi=203,
            print_direction="horizontal"
        )
        assert p1 != p2

    def test_profile_hashable(self):
        """Test that profiles can be used in sets/dicts."""
        p1 = RfidProfile(
            name="B1 50mm",
            model="b1",
            width_mm=50,
            height_mm=30,
            width_px=384,
            height_px=240,
            dpi=203,
            print_direction="vertical"
        )
        profile_set = {p1}
        assert p1 in profile_set


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
