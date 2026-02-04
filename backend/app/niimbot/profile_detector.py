"""
RFID Profile Detection for NIIMBOT Printers

Maps RFID label dimensions to known printer profiles with fuzzy matching.
"""

import logging
from dataclasses import dataclass
from typing import Optional, List

logger = logging.getLogger(__name__)


@dataclass
class RfidProfile:
    """Represents a known printer profile for a specific label size."""

    name: str  # Display name (e.g., "B1 50mm")
    model: str  # Printer model identifier (e.g., "b1")
    width_mm: int  # Label width in mm
    height_mm: int  # Label height in mm
    width_px: int  # Width in pixels at native DPI
    height_px: int  # Height in pixels at native DPI
    dpi: int  # Native DPI of printer
    print_direction: str  # "horizontal" or "vertical"
    confidence: float = 1.0  # Match confidence (0.0-1.0)

    def __hash__(self):
        return hash((self.model, self.width_mm, self.height_mm))

    def __eq__(self, other):
        if not isinstance(other, RfidProfile):
            return False
        return (
            self.model == other.model
            and self.width_mm == other.width_mm
            and self.height_mm == other.height_mm
        )


# Hardcoded profiles for common NIIMBOT label sizes
# Format: model, width_mm, height_mm, width_px@dpi, height_px@dpi, dpi, direction

# D-Series (12mm width) - D11, D110, D11-H
D11H_12MM_40MM = RfidProfile(
    name="D11-H 12mm",
    model="d11_h",
    width_mm=12,
    height_mm=40,
    width_px=136,  # At 300 DPI
    height_px=472,
    dpi=300,
    print_direction="horizontal",
)

D110_12MM_40MM = RfidProfile(
    name="D110 12mm",
    model="d110",
    width_mm=12,
    height_mm=40,
    width_px=48,  # At 203 DPI
    height_px=160,
    dpi=203,
    print_direction="horizontal",
)

# D-Series (24mm width) - D101, D102
D101_24MM_40MM = RfidProfile(
    name="D101 24mm",
    model="d101",
    width_mm=24,
    height_mm=40,
    width_px=96,  # At 203 DPI
    height_px=160,
    dpi=203,
    print_direction="horizontal",
)

D101_25MM_50MM = RfidProfile(
    name="D101 25mm",
    model="d101",
    width_mm=25,
    height_mm=50,
    width_px=100,  # At 203 DPI
    height_px=200,
    dpi=203,
    print_direction="horizontal",
)

# B-Series (50mm width) - B1, B21, B21 Pro
B1_50MM_30MM = RfidProfile(
    name="B1 50mm",
    model="b1",
    width_mm=50,
    height_mm=30,
    width_px=384,  # At 203 DPI
    height_px=240,
    dpi=203,
    print_direction="vertical",
)

B1_50MM_40MM = RfidProfile(
    name="B1 50mm",
    model="b1",
    width_mm=50,
    height_mm=40,
    width_px=384,  # At 203 DPI
    height_px=320,
    dpi=203,
    print_direction="vertical",
)

B21_50MM_30MM = RfidProfile(
    name="B21 50mm",
    model="b21",
    width_mm=50,
    height_mm=30,
    width_px=384,  # At 203 DPI
    height_px=240,
    dpi=203,
    print_direction="vertical",
)

# B-Series (75mm width) - B3S
B3S_75MM_40MM = RfidProfile(
    name="B3S 75mm",
    model="b3s",
    width_mm=75,
    height_mm=40,
    width_px=576,  # At 203 DPI
    height_px=320,
    dpi=203,
    print_direction="vertical",
)

# All builtin profiles
BUILTIN_PROFILES = [
    D11H_12MM_40MM,
    D110_12MM_40MM,
    D101_24MM_40MM,
    D101_25MM_50MM,
    B1_50MM_30MM,
    B1_50MM_40MM,
    B21_50MM_30MM,
    B3S_75MM_40MM,
]


class ProfileDetector:
    """Matches RFID label dimensions to known printer profiles."""

    TOLERANCE_MM = 1  # Allow ±1mm variation for fuzzy matching

    @staticmethod
    def get_all_profiles() -> List[RfidProfile]:
        """Return all configured profiles."""
        return BUILTIN_PROFILES

    @staticmethod
    def detect_profile(rfid_data: dict) -> Optional[RfidProfile]:
        """
        Match RFID label dimensions to a known profile.

        Args:
            rfid_data: Dict with keys 'width_mm', 'height_mm', 'type', 'raw_data'

        Returns:
            Matching RfidProfile or None if no match found
        """
        if not rfid_data or "width_mm" not in rfid_data or "height_mm" not in rfid_data:
            logger.warning("Invalid RFID data for profile detection")
            return None

        target_w = rfid_data["width_mm"]
        target_h = rfid_data["height_mm"]

        # Validate dimensions
        if not (10 <= target_w <= 200 and 10 <= target_h <= 200):
            logger.warning(f"RFID dimensions out of valid range: {target_w}x{target_h}mm")
            return None

        # Try exact match first
        for profile in BUILTIN_PROFILES:
            if (
                abs(profile.width_mm - target_w) <= ProfileDetector.TOLERANCE_MM
                and abs(profile.height_mm - target_h) <= ProfileDetector.TOLERANCE_MM
            ):
                confidence = ProfileDetector._calculate_confidence(profile, target_w, target_h)
                profile_copy = RfidProfile(
                    name=profile.name,
                    model=profile.model,
                    width_mm=profile.width_mm,
                    height_mm=profile.height_mm,
                    width_px=profile.width_px,
                    height_px=profile.height_px,
                    dpi=profile.dpi,
                    print_direction=profile.print_direction,
                    confidence=confidence,
                )
                logger.info(f"Profile detected: {profile.name} (confidence: {confidence:.2%})")
                return profile_copy

        logger.warning(
            f"No matching profile found for label {target_w}x{target_h}mm. "
            f"Available profiles: {[p.name for p in BUILTIN_PROFILES]}"
        )
        return None

    @staticmethod
    def _calculate_confidence(profile: RfidProfile, target_w: int, target_h: int) -> float:
        """
        Calculate confidence score for a profile match (0.0-1.0).

        Perfect match = 1.0, ±1mm = ~0.95
        """
        w_diff = abs(profile.width_mm - target_w)
        h_diff = abs(profile.height_mm - target_h)

        # Max difference before confidence drops to 0
        max_diff = ProfileDetector.TOLERANCE_MM

        w_confidence = max(0.0, 1.0 - (w_diff / max_diff) * 0.05)
        h_confidence = max(0.0, 1.0 - (h_diff / max_diff) * 0.05)

        return (w_confidence + h_confidence) / 2

    @staticmethod
    def get_profile_by_model(model: str) -> Optional[RfidProfile]:
        """
        Get default profile for a specific printer model.

        Returns the first matching profile for the model.
        """
        for profile in BUILTIN_PROFILES:
            if profile.model == model:
                return profile
        logger.warning(f"No default profile found for model: {model}")
        return None

    @staticmethod
    def get_profiles_by_model(model: str) -> List[RfidProfile]:
        """Get all profiles available for a specific printer model."""
        return [p for p in BUILTIN_PROFILES if p.model == model]
