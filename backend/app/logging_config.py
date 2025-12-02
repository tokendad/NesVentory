"""
Logging configuration for NesVentory.

This module handles:
- Log file creation on startup
- Log rotation on same-day restart
- Reading and applying log level settings from persisted settings
- Debug/trace log creation only when enabled via admin panel
"""
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


# Default log directory and files
LOG_DIR = Path("/app/data/logs")
LOG_SETTINGS_FILE = LOG_DIR / "log_settings.json"
CURRENT_LOG_FILE = LOG_DIR / "nesventory.log"

# Minimum log file size in bytes to consider for rotation (to avoid rotating empty files)
MIN_LOG_FILE_SIZE_FOR_ROTATION = 10

# Third-party loggers to configure (to avoid duplication)
THIRD_PARTY_LOGGERS = ['uvicorn', 'uvicorn.access', 'uvicorn.error', 'sqlalchemy.engine']


def ensure_log_dir_exists() -> None:
    """Ensure the log directory exists, creating it if necessary."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def load_log_settings() -> dict:
    """Load log settings from file or return defaults."""
    ensure_log_dir_exists()
    if LOG_SETTINGS_FILE.exists():
        try:
            with open(LOG_SETTINGS_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError, OSError):
            pass
    # Default settings
    return {
        "rotation_type": "schedule",
        "rotation_schedule_hours": 24,
        "rotation_size_mb": 10,
        "log_level": "warn_error",
        "retention_days": 30,
        "auto_delete_enabled": False
    }


def get_python_log_level(log_level_setting: str) -> int:
    """Convert admin panel log level setting to Python logging level."""
    if log_level_setting == "trace":
        return logging.DEBUG  # Python doesn't have TRACE, use DEBUG
    elif log_level_setting == "debug":
        return logging.DEBUG
    else:  # "warn_error" or default
        return logging.WARNING


def rotate_current_log_on_startup() -> Optional[str]:
    """
    Rotate the current log file on startup if it exists.
    
    This creates a new rotated log with timestamp: nesventory.log.YYYYMMDD_HHMMSS
    Returns the name of the rotated file, or None if no rotation occurred.
    """
    ensure_log_dir_exists()
    
    if not CURRENT_LOG_FILE.exists():
        return None
    
    # Check if the file is empty or very small
    try:
        if CURRENT_LOG_FILE.stat().st_size < MIN_LOG_FILE_SIZE_FOR_ROTATION:
            # Don't rotate empty or near-empty files
            return None
    except OSError:
        return None
    
    # Create rotated log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    rotated_name = f"nesventory.log.{timestamp}"
    rotated_path = LOG_DIR / rotated_name
    
    try:
        CURRENT_LOG_FILE.rename(rotated_path)
        return rotated_name
    except OSError as e:
        print(f"Warning: Could not rotate log file: {e}", file=sys.stderr)
        return None


def create_log_file() -> None:
    """Create the current log file if it doesn't exist."""
    ensure_log_dir_exists()
    
    if not CURRENT_LOG_FILE.exists():
        try:
            # Create an empty log file
            CURRENT_LOG_FILE.touch()
        except OSError as e:
            print(f"Warning: Could not create log file: {e}", file=sys.stderr)


def setup_logging() -> None:
    """
    Configure Python logging for NesVentory.
    
    This function should be called on application startup. It:
    1. Rotates existing log file (with timestamp)
    2. Creates a new current log file
    3. Configures logging based on persisted settings
    4. Sets up file and console handlers
    """
    # Load settings
    settings = load_log_settings()
    log_level_setting = settings.get("log_level", "warn_error")
    python_log_level = get_python_log_level(log_level_setting)
    
    # Rotate existing log on startup
    rotated_file = rotate_current_log_on_startup()
    if rotated_file:
        print(f"📋 Rotated existing log to: {rotated_file}")
    
    # Create new log file
    create_log_file()
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(python_log_level)
    
    # Remove existing handlers to avoid duplicates on reload
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    simple_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler for main log
    try:
        file_handler = logging.FileHandler(CURRENT_LOG_FILE, mode='a', encoding='utf-8')
        file_handler.setLevel(python_log_level)
        file_handler.setFormatter(detailed_formatter)
        root_logger.addHandler(file_handler)
    except OSError as e:
        print(f"Warning: Could not create file handler: {e}", file=sys.stderr)
    
    # Console handler (always at WARNING level for production)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(simple_formatter)
    root_logger.addHandler(console_handler)
    
    # Configure third-party loggers
    for logger_name in THIRD_PARTY_LOGGERS:
        third_party_logger = logging.getLogger(logger_name)
        third_party_logger.setLevel(python_log_level)
    
    # Log startup information
    logger = logging.getLogger(__name__)
    logger.info(f"NesVentory logging initialized - Level: {log_level_setting}")
    logger.info(f"Log file: {CURRENT_LOG_FILE}")
    
    print(f"📋 Logging initialized - Level: {log_level_setting}, File: {CURRENT_LOG_FILE}")


def reconfigure_logging_level(log_level_setting: str) -> None:
    """
    Reconfigure the logging level at runtime.
    
    This is called when admin changes log settings via the admin panel.
    
    Args:
        log_level_setting: One of "warn_error", "debug", or "trace"
    """
    python_log_level = get_python_log_level(log_level_setting)
    
    # Update root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(python_log_level)
    
    # Update file handlers
    for handler in root_logger.handlers:
        if isinstance(handler, logging.FileHandler):
            handler.setLevel(python_log_level)
    
    # Update third-party loggers
    for logger_name in THIRD_PARTY_LOGGERS:
        logging.getLogger(logger_name).setLevel(python_log_level)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging level changed to: {log_level_setting}")
