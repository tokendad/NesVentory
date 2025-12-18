"""
AI Provider Service

Provides configuration and management for multiple AI providers
(Gemini, ChatGPT, Alexa+) with priority-based selection.

Available providers:
- Gemini AI: Google's Gemini for vision and text processing
- ChatGPT: OpenAI's GPT models for text processing
- Alexa+: Amazon Alexa Smart Properties API
"""

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


# Available AI provider definitions
AVAILABLE_AI_PROVIDERS = [
    {
        "id": "gemini",
        "name": "Google Gemini AI",
        "description": "Google's Gemini AI for vision and text processing",
        "requires_api_key": True,
        "api_key_url": "https://aistudio.google.com/app/apikey"
    },
    {
        "id": "chatgpt",
        "name": "ChatGPT (OpenAI)",
        "description": "OpenAI's GPT models for text and image processing",
        "requires_api_key": True,
        "api_key_url": "https://platform.openai.com/api-keys"
    },
    {
        "id": "alexa_plus",
        "name": "Alexa+ (Amazon Smart Properties)",
        "description": "Amazon Alexa Smart Properties API for voice and device integration",
        "requires_api_key": True,
        "api_key_url": "https://developer.amazon.com/en-US/docs/alexa/alexa-smart-properties/endpoint-settings-api.html"
    }
]


def get_available_providers() -> List[dict]:
    """Get list of available AI providers with their configuration info."""
    return AVAILABLE_AI_PROVIDERS


def get_default_ai_provider_config() -> List[dict]:
    """
    Get default AI provider configuration.
    First provider (Gemini) is enabled by default, others are disabled.
    Priority is assigned based on order in the list.
    """
    return [
        {
            "id": provider["id"],
            "enabled": index == 0,  # Only first provider enabled by default
            "priority": index + 1,
            "api_key": None
        }
        for index, provider in enumerate(AVAILABLE_AI_PROVIDERS)
    ]


def validate_ai_provider_config(config: List[dict]) -> bool:
    """
    Validate AI provider configuration.
    
    Args:
        config: List of provider configurations
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(config, list):
        return False
    
    available_ids = {p["id"] for p in AVAILABLE_AI_PROVIDERS}
    
    for item in config:
        if not isinstance(item, dict):
            return False
        if "id" not in item or item["id"] not in available_ids:
            return False
        if "enabled" not in item or not isinstance(item["enabled"], bool):
            return False
        if "priority" not in item or not isinstance(item["priority"], int):
            return False
    
    return True


def sort_providers_by_priority(providers: List[dict]) -> List[dict]:
    """
    Sort providers by priority (lower number = higher priority).
    
    Args:
        providers: List of provider configurations
        
    Returns:
        Sorted list of providers
    """
    return sorted(providers, key=lambda x: x.get("priority", 999))


def get_enabled_providers(providers: List[dict]) -> List[dict]:
    """
    Filter and return only enabled providers, sorted by priority.
    
    Args:
        providers: List of provider configurations
        
    Returns:
        List of enabled providers sorted by priority
    """
    enabled = [p for p in providers if p.get("enabled", False)]
    return sort_providers_by_priority(enabled)
