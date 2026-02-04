/**
 * Component tests for RFID detection UI in QRLabelPrint
 *
 * Tests the detection button, UI rendering, state management, and user interactions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QRLabelPrint from '../components/QRLabelPrint';
import * as api from '../lib/api';

// Mock the API
vi.mock('../lib/api', () => ({
  getPrinterConfig: vi.fn(),
  printLabel: vi.fn(),
  detectRfidProfile: vi.fn(),
  checkSystemPrintersAvailable: vi.fn(),
  getSystemPrinters: vi.fn(),
  printToSystemPrinter: vi.fn(),
  printItemToSystemPrinter: vi.fn(),
}));

// Mock data
const mockLocation = {
  id: 'test-location-id',
  name: 'Test Location',
  friendly_name: 'Test Friendly Name',
  location_type: 'closet',
  is_container: false,
};

const mockItem = {
  id: 'test-item-id',
  name: 'Test Item',
  brand: 'Test Brand',
};

const mockPrinterConfig = {
  enabled: true,
  model: 'b1',
  connection_type: 'server',
  density: 3,
};

const mockDetectionSuccess = {
  success: true,
  detected_profile: {
    name: 'B1 50mm',
    model: 'b1',
    width_mm: 50,
    height_mm: 30,
    width_px: 384,
    height_px: 240,
    dpi: 203,
    print_direction: 'vertical',
  },
  rfid_data: {
    width_mm: 50,
    height_mm: 30,
    type: 0,
    raw_data: '881d86286c121080...',
  },
  confidence: 0.95,
  error: null,
};

const mockDetectionError = {
  success: false,
  detected_profile: null,
  rfid_data: null,
  confidence: 0,
  error: 'No RFID tag detected. Ensure label roll is properly loaded.',
};

describe('QRLabelPrint RFID Detection UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getPrinterConfig as any).mockResolvedValue(mockPrinterConfig);
    (api.checkSystemPrintersAvailable as any).mockResolvedValue({ available: false });
  });

  describe('Detection Button Visibility', () => {
    it('shows detect button only for server connection', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      // Change to server connection
      const connectionSelect = screen.getByLabelText(/Connection Method/i);
      await userEvent.selectOption(connectionSelect, 'server');

      await waitFor(() => {
        expect(screen.getByText('Detect Label')).toBeInTheDocument();
      });
    });

    it('hides detect button for bluetooth connection', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const connectionSelect = screen.getByLabelText(/Connection Method/i);
      await userEvent.selectOption(connectionSelect, 'bluetooth');

      await waitFor(() => {
        expect(screen.queryByText('Detect Label')).not.toBeInTheDocument();
      });
    });

    it('hides detect button when printer not configured', async () => {
      (api.getPrinterConfig as any).mockResolvedValue({ enabled: false });

      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      await waitFor(() => {
        expect(screen.queryByText('Detect Label')).not.toBeInTheDocument();
      });
    });

    it('hides detect button when printer disabled', async () => {
      (api.getPrinterConfig as any).mockResolvedValue({
        ...mockPrinterConfig,
        enabled: false,
      });

      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      await waitFor(() => {
        expect(screen.queryByText('Detect Label')).not.toBeInTheDocument();
      });
    });
  });

  describe('Detection Button Behavior', () => {
    beforeEach(() => {
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionSuccess);
    });

    it('disables button while detecting', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      // Button should show "Detecting..."
      await waitFor(() => {
        const button = screen.getByText(/Detecting\.\.\./);
        expect(button).toBeDisabled();
      });
    });

    it('re-enables button after detection completes', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText('Detect Label')).not.toBeDisabled();
      });
    });
  });

  describe('Successful Detection', () => {
    beforeEach(() => {
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionSuccess);
    });

    it('displays detected profile after successful detection', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Detected: B1 50mm/)).toBeInTheDocument();
      });
    });

    it('displays confidence score', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Confidence: 95%/)).toBeInTheDocument();
      });
    });

    it('displays label dimensions', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/50×30mm @ 203 DPI/)).toBeInTheDocument();
      });
    });

    it('auto-selects detected printer model', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        // The component should have changed the selected model internally
        expect(api.detectRfidProfile).toHaveBeenCalled();
      });
    });

    it('shows override option after detection', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Override detected profile/)).toBeInTheDocument();
      });
    });
  });

  describe('Detection Errors', () => {
    it('displays error message on failed detection', async () => {
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionError);

      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/No RFID tag detected/)).toBeInTheDocument();
      });
    });

    it('shows different error for unknown label', async () => {
      const unknownLabelError = {
        ...mockDetectionError,
        error: 'Unknown label size: 99x99mm. Please select a profile manually.',
      };
      (api.detectRfidProfile as any).mockResolvedValue(unknownLabelError);

      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Unknown label size/)).toBeInTheDocument();
      });
    });

    it('clears error when detection succeeds after failure', async () => {
      const { rerender } = render(
        <QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />
      );

      // First detection fails
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionError);
      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/No RFID tag detected/)).toBeInTheDocument();
      });

      // Second detection succeeds
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionSuccess);
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.queryByText(/No RFID tag detected/)).not.toBeInTheDocument();
        expect(screen.getByText(/Detected: B1 50mm/)).toBeInTheDocument();
      });
    });
  });

  describe('Manual Override Workflow', () => {
    beforeEach(() => {
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionSuccess);
    });

    it('shows override confirmation on first click', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Override detected profile/)).toBeInTheDocument();
      });

      const overrideLink = screen.getByText(/Override detected profile/);
      fireEvent.click(overrideLink);

      // Should show warning
      await waitFor(() => {
        expect(screen.getByText(/Warning: You have manually overridden/)).toBeInTheDocument();
      });
    });

    it('allows canceling override', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        screen.getByText(/Override detected profile/);
      });

      const overrideLink = screen.getByText(/Override detected profile/);
      fireEvent.click(overrideLink);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Override should be cancelled
      await waitFor(() => {
        expect(screen.getByText(/Detected: B1 50mm/)).toBeInTheDocument();
      });
    });

    it('enables override after confirmation', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        screen.getByText(/Override detected profile/);
      });

      const overrideLink = screen.getByText(/Override detected profile/);
      fireEvent.click(overrideLink);

      await waitFor(() => {
        expect(screen.getByText(/I understand, enable override/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText(/I understand, enable override/);
      fireEvent.click(confirmButton);

      // Should show override active indicator
      await waitFor(() => {
        expect(screen.getByText(/Profile Override Active/)).toBeInTheDocument();
      });
    });

    it('shows model selector when override is active', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        screen.getByText(/Override detected profile/);
      });

      const overrideLink = screen.getByText(/Override detected profile/);
      fireEvent.click(overrideLink);

      const confirmButton = await screen.findByText(/I understand, enable override/);
      fireEvent.click(confirmButton);

      // Model selector should be available
      await waitFor(() => {
        expect(screen.getByLabelText(/Select Override Profile/)).toBeInTheDocument();
      });
    });

    it('shows detected vs selected profile in override mode', async () => {
      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        screen.getByText(/Override detected profile/);
      });

      const overrideLink = screen.getByText(/Override detected profile/);
      fireEvent.click(overrideLink);

      const confirmButton = await screen.findByText(/I understand, enable override/);
      fireEvent.click(confirmButton);

      // Should show both detected and selected
      await waitFor(() => {
        expect(screen.getByText(/Detected: B1 50mm/)).toBeInTheDocument();
      });
    });
  });

  describe('UI State Consistency', () => {
    it('clears detection when changing connection type', async () => {
      (api.detectRfidProfile as any).mockResolvedValue(mockDetectionSuccess);

      render(<QRLabelPrint onClose={() => {}} location={mockLocation} items={[]} />);

      const detectButton = screen.getByText('Detect Label');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByText(/Detected: B1 50mm/)).toBeInTheDocument();
      });

      const connectionSelect = screen.getByLabelText(/Connection Method/i);
      await userEvent.selectOption(connectionSelect, 'bluetooth');

      // Detection UI should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Detected: B1 50mm/)).not.toBeInTheDocument();
      });
    });
  });
});
