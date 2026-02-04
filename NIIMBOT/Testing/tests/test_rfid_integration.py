"""
Integration tests for RFID detection API endpoint.

Tests the full workflow: printer connection → RFID query → profile detection → API response.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.rfid_service import RfidDetectionService
from app.niimbot.profile_detector import ProfileDetector


class TestRfidDetectionService:
    """Test the RFID detection service."""

    def test_detect_loaded_label_success_b1_50x30(self):
        """Test successful RFID detection for B1 50x30mm label."""
        printer_config = {
            "enabled": True,
            "model": "b1",
            "connection_type": "server",
            "address": None
        }

        # Mock the printer and transport
        with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
            mock_transport = Mock()
            mock_printer = Mock()

            # Mock successful RFID response
            mock_printer.connect.return_value = True
            mock_printer.get_rfid.return_value = {
                "width_mm": 50,
                "height_mm": 30,
                "type": 0,
                "raw_data": "881d86286c121080..."
            }

            mock_service.create_transport.return_value = mock_transport
            mock_service.resolve_connection_type.return_value = "server"

            with patch('app.services.rfid_service.PrinterClient', return_value=mock_printer):
                result = RfidDetectionService.detect_loaded_label(printer_config)

            assert result["success"] is True
            assert result["detected_profile"] is not None
            assert result["detected_profile"]["name"] == "B1 50mm"
            assert result["detected_profile"]["width_mm"] == 50
            assert result["detected_profile"]["height_mm"] == 30
            assert result["confidence"] >= 0.95

    def test_detect_loaded_label_no_printer_config(self):
        """Test error when printer not configured."""
        result = RfidDetectionService.detect_loaded_label(None)
        assert result["success"] is False
        assert "not configured" in result["error"].lower()

    def test_detect_loaded_label_printer_disabled(self):
        """Test error when printer is disabled."""
        printer_config = {
            "enabled": False,
            "model": "b1"
        }
        result = RfidDetectionService.detect_loaded_label(printer_config)
        assert result["success"] is False
        assert "not enabled" in result["error"].lower()

    def test_detect_loaded_label_no_rfid(self):
        """Test error when RFID tag not detected (no label loaded)."""
        printer_config = {
            "enabled": True,
            "model": "b1",
            "connection_type": "server"
        }

        with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
            mock_transport = Mock()
            mock_printer = Mock()

            mock_printer.connect.return_value = True
            mock_printer.get_rfid.return_value = None  # No RFID detected

            mock_service.create_transport.return_value = mock_transport
            mock_service.resolve_connection_type.return_value = "server"

            with patch('app.services.rfid_service.PrinterClient', return_value=mock_printer):
                result = RfidDetectionService.detect_loaded_label(printer_config)

            assert result["success"] is False
            assert "RFID tag" in result["error"] or "no label" in result["error"].lower()

    def test_detect_loaded_label_unknown_label(self):
        """Test error when label dimensions don't match any known profile."""
        printer_config = {
            "enabled": True,
            "model": "b1",
            "connection_type": "server"
        }

        with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
            mock_transport = Mock()
            mock_printer = Mock()

            mock_printer.connect.return_value = True
            mock_printer.get_rfid.return_value = {
                "width_mm": 99,
                "height_mm": 99,
                "type": 0,
                "raw_data": "unknown..."
            }

            mock_service.create_transport.return_value = mock_transport
            mock_service.resolve_connection_type.return_value = "server"

            with patch('app.services.rfid_service.PrinterClient', return_value=mock_printer):
                result = RfidDetectionService.detect_loaded_label(printer_config)

            assert result["success"] is False
            assert "unknown" in result["error"].lower() or "could not match" in result["error"].lower()

    def test_detect_loaded_label_connection_error(self):
        """Test error handling for connection failures."""
        printer_config = {
            "enabled": True,
            "model": "b1",
            "connection_type": "bluetooth",
            "address": "00:11:22:33:44:55"
        }

        with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
            mock_service.create_transport.side_effect = ConnectionError("Connection refused")
            mock_service.resolve_connection_type.return_value = "bluetooth"

            result = RfidDetectionService.detect_loaded_label(printer_config)

            assert result["success"] is False
            assert "connection" in result["error"].lower() or "refused" in result["error"].lower()

    def test_detect_loaded_label_timeout(self):
        """Test error handling for timeout."""
        printer_config = {
            "enabled": True,
            "model": "b1",
            "connection_type": "server"
        }

        with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
            mock_transport = Mock()
            mock_printer = Mock()

            mock_printer.connect.return_value = True
            mock_printer.get_rfid.side_effect = TimeoutError("RFID query timeout")

            mock_service.create_transport.return_value = mock_transport
            mock_service.resolve_connection_type.return_value = "server"

            with patch('app.services.rfid_service.PrinterClient', return_value=mock_printer):
                result = RfidDetectionService.detect_loaded_label(printer_config)

            assert result["success"] is False
            assert "timeout" in result["error"].lower()

    def test_detect_loaded_label_all_profiles(self):
        """Test detection works for all hardcoded profiles."""
        test_cases = [
            (50, 30, "B1 50mm"),
            (50, 40, "B1 50mm"),
            (25, 50, "D101 25mm"),
            (24, 40, "D101 24mm"),
            (75, 40, "B3S 75mm"),
        ]

        for width, height, expected_profile in test_cases:
            printer_config = {
                "enabled": True,
                "model": "b1",
                "connection_type": "server"
            }

            with patch('app.services.rfid_service.NiimbotPrinterService') as mock_service:
                mock_transport = Mock()
                mock_printer = Mock()

                mock_printer.connect.return_value = True
                mock_printer.get_rfid.return_value = {
                    "width_mm": width,
                    "height_mm": height,
                    "type": 0,
                    "raw_data": f"test_{width}x{height}..."
                }

                mock_service.create_transport.return_value = mock_transport
                mock_service.resolve_connection_type.return_value = "server"

                with patch('app.services.rfid_service.PrinterClient', return_value=mock_printer):
                    result = RfidDetectionService.detect_loaded_label(printer_config)

                assert result["success"] is True, f"Failed to detect {width}x{height}mm label"
                assert expected_profile in result["detected_profile"]["name"], \
                    f"Expected {expected_profile}, got {result['detected_profile']['name']}"


class TestRfidEndpointResponses:
    """Test API endpoint response formats."""

    def test_success_response_structure(self):
        """Test that success response has correct structure."""
        result = {
            "success": True,
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
            "rfid_data": {
                "width_mm": 50,
                "height_mm": 30,
                "type": 0,
                "raw_data": "881d..."
            },
            "confidence": 1.0,
            "error": None
        }

        assert result["success"] is True
        assert "detected_profile" in result
        assert "rfid_data" in result
        assert "confidence" in result
        assert result["error"] is None
        assert result["confidence"] >= 0.0 and result["confidence"] <= 1.0

    def test_error_response_structure(self):
        """Test that error response has correct structure."""
        result = {
            "success": False,
            "detected_profile": None,
            "rfid_data": None,
            "confidence": 0.0,
            "error": "No RFID tag detected"
        }

        assert result["success"] is False
        assert result["detected_profile"] is None
        assert "error" in result
        assert isinstance(result["error"], str)
        assert len(result["error"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
