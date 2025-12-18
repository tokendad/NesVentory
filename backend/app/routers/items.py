from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timezone
import logging
from .. import models, schemas, auth
from ..deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=List[schemas.Item])
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()


@router.post("/", response_model=schemas.Item, status_code=status.HTTP_201_CREATED)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    # Extract tag_ids from payload
    tag_ids = payload.tag_ids
    payload_dict = payload.model_dump(exclude={'tag_ids'})
    
    item = models.Item(**payload_dict)
    
    # Add tags if provided
    if tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        item.tags = tags
    
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=schemas.Item)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=schemas.Item)
def update_item(
    item_id: UUID,
    payload: schemas.ItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Extract tag_ids from payload
    tag_ids = payload.tag_ids
    data = payload.model_dump(exclude_unset=True, exclude={'tag_ids'})
    
    for key, value in data.items():
        setattr(item, key, value)
    
    # Update tags if provided
    if tag_ids is not None:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        item.tags = tags

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return None


@router.post("/bulk-delete", response_model=schemas.BulkDeleteResponse)
def bulk_delete_items(
    payload: schemas.BulkDeleteRequest,
    db: Session = Depends(get_db),
):
    """Delete multiple items at once."""
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    deleted_count = len(items)
    
    for item in items:
        db.delete(item)
    
    db.commit()
    return schemas.BulkDeleteResponse(
        deleted_count=deleted_count,
        message=f"Successfully deleted {deleted_count} item(s)"
    )


@router.post("/bulk-update-tags", response_model=schemas.BulkUpdateTagsResponse)
def bulk_update_tags(
    payload: schemas.BulkUpdateTagsRequest,
    db: Session = Depends(get_db),
):
    """Update tags on multiple items at once."""
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    tags = db.query(models.Tag).filter(models.Tag.id.in_(payload.tag_ids)).all()
    
    updated_count = 0
    for item in items:
        if payload.mode == "replace":
            item.tags = tags
        elif payload.mode == "add":
            existing_tag_ids = {tag.id for tag in item.tags}
            for tag in tags:
                if tag.id not in existing_tag_ids:
                    item.tags.append(tag)
        elif payload.mode == "remove":
            item.tags = [tag for tag in item.tags if tag.id not in payload.tag_ids]
        updated_count += 1
    
    db.commit()
    return schemas.BulkUpdateTagsResponse(
        updated_count=updated_count,
        message=f"Successfully updated tags on {updated_count} item(s)"
    )


@router.post("/bulk-update-location", response_model=schemas.BulkUpdateLocationResponse)
def bulk_update_location(
    payload: schemas.BulkUpdateLocationRequest,
    db: Session = Depends(get_db),
):
    """Update location on multiple items at once."""
    # Verify location exists if provided
    if payload.location_id:
        location = db.query(models.Location).filter(
            models.Location.id == payload.location_id
        ).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
    
    items = db.query(models.Item).filter(models.Item.id.in_(payload.item_ids)).all()
    
    updated_count = 0
    for item in items:
        item.location_id = payload.location_id
        updated_count += 1
    
    db.commit()
    return schemas.BulkUpdateLocationResponse(
        updated_count=updated_count,
        message=f"Successfully updated location on {updated_count} item(s)"
    )


@router.post("/{item_id}/enrich", response_model=schemas.ItemEnrichmentResult)
async def enrich_item(
    item_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enrich an item's data using configured AI providers.
    
    This endpoint:
    1. Retrieves the item and its existing data
    2. Queries enabled AI providers in priority order
    3. Returns enriched data with confidence scores
    4. User can then accept or reject the suggestions
    
    The enrichment includes:
    - Missing description details
    - Brand information
    - Model number
    - Serial number (if data tag photos exist)
    - Estimated value
    """
    from ..settings_service import get_effective_gemini_api_key
    from ..ai_provider_service import get_enabled_providers
    
    # Get the item
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get user's AI provider configuration or use default
    ai_providers = current_user.ai_providers
    if not ai_providers:
        from ..ai_provider_service import get_default_ai_provider_config
        ai_providers = get_default_ai_provider_config()
    
    # Get enabled providers sorted by priority
    enabled_providers = get_enabled_providers(ai_providers)
    
    if not enabled_providers:
        raise HTTPException(
            status_code=400,
            detail="No AI providers configured. Please configure AI providers in settings."
        )
    
    enriched_results = []
    
    # Try each provider in priority order
    for provider_config in enabled_providers:
        provider_id = provider_config.get("id")
        api_key = provider_config.get("api_key")
        
        try:
            # Currently, we only support Gemini
            if provider_id == "gemini":
                # Use environment key if provider doesn't have one
                if not api_key:
                    api_key = get_effective_gemini_api_key(db)
                
                if not api_key:
                    logger.warning(f"Gemini provider enabled but no API key configured")
                    continue
                
                # Try to enrich the item using Gemini
                result = await _enrich_item_with_gemini(item, api_key, db)
                if result:
                    enriched_results.append(result)
            
            # Future: Add support for other providers (ChatGPT, Alexa+)
            # elif provider_id == "chatgpt":
            #     result = await _enrich_item_with_chatgpt(item, api_key, db)
            #     if result:
            #         enriched_results.append(result)
                        
        except Exception as e:
            logger.warning(f"Failed to enrich item with provider {provider_id}: {e}")
            continue
    
    # Sort results by confidence (highest first)
    enriched_results.sort(key=lambda x: x.confidence or 0.0, reverse=True)
    
    if not enriched_results:
        return schemas.ItemEnrichmentResult(
            item_id=item_id,
            enriched_data=[],
            message="No enrichment data available. Please check your AI provider configuration."
        )
    
    return schemas.ItemEnrichmentResult(
        item_id=item_id,
        enriched_data=enriched_results,
        message=f"Found {len(enriched_results)} enrichment suggestion(s)"
    )


async def _enrich_item_with_gemini(
    item: models.Item,
    api_key: str,
    db: Session
) -> schemas.EnrichedItemData:
    """
    Use Gemini AI to enrich item data.
    
    Returns enriched data with confidence score, or None if enrichment fails.
    """
    try:
        import google.generativeai as genai
        from ..settings_service import get_effective_gemini_model
        import re
        import json
        from decimal import Decimal
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        gemini_model = get_effective_gemini_model(db)
        model = genai.GenerativeModel(gemini_model)
        
        # Build item context for the prompt
        item_context = []
        if item.name:
            item_context.append(f"Name: {item.name}")
        if item.description:
            item_context.append(f"Current description: {item.description}")
        if item.brand:
            item_context.append(f"Current brand: {item.brand}")
        if item.model_number:
            item_context.append(f"Current model number: {item.model_number}")
        if item.serial_number:
            item_context.append(f"Current serial number: {item.serial_number}")
        if item.purchase_price:
            item_context.append(f"Purchase price: ${item.purchase_price}")
        if item.purchase_date:
            item_context.append(f"Purchase date: {item.purchase_date}")
        
        if not item_context:
            logger.info(f"Item {item.id} has no data to enrich from")
            return None
        
        context_str = "\n".join(item_context)
        
        # Create the enrichment prompt
        prompt = f"""Based on the following item information, provide enriched details:

{context_str}

Please provide:
1. An enhanced description (if current description is missing or incomplete)
2. The brand name (if not already provided or if it can be more specific)
3. The model number (if not already provided or if it can be more specific)
4. An estimated current market value in USD
5. Your confidence in this information (0.0 to 1.0)

Return ONLY a JSON object with these fields:
{{
  "description": "Enhanced description of the item",
  "brand": "Brand name",
  "model_number": "Model number",
  "estimated_value": 150.00,
  "confidence": 0.85
}}

Important:
- Only include fields where you can provide useful additional information
- Use null for any field you cannot confidently determine
- Be conservative with confidence scores
- Estimated value should be current market/replacement value"""

        # Generate response
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Parse JSON response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            logger.warning(f"Could not find JSON in Gemini response for item {item.id}")
            return None
        
        parsed = json.loads(json_match.group())
        
        # Extract fields
        description = parsed.get("description")
        brand = parsed.get("brand")
        model_number = parsed.get("model_number")
        estimated_value = None
        
        # Parse estimated value
        value_str = parsed.get("estimated_value")
        if value_str is not None:
            try:
                if isinstance(value_str, (int, float)):
                    estimated_value = Decimal(str(value_str))
                else:
                    # Remove currency symbols and parse
                    clean_value = re.sub(r'[^\d.]', '', str(value_str))
                    if clean_value:
                        estimated_value = Decimal(clean_value)
            except (ValueError, TypeError):
                pass
        
        # Parse confidence
        confidence = parsed.get("confidence")
        if confidence is not None:
            try:
                confidence = float(confidence)
                # Normalize to 0-1 if given as percentage
                if confidence > 1:
                    confidence = confidence / 100
            except (ValueError, TypeError):
                confidence = 0.5  # Default moderate confidence
        else:
            confidence = 0.5
        
        # Add estimation date if there's an estimated value
        estimation_date = None
        if estimated_value is not None:
            estimation_date = datetime.now(timezone.utc).strftime("%m/%d/%y")
        
        return schemas.EnrichedItemData(
            description=description,
            brand=brand,
            model_number=model_number,
            serial_number=None,  # Serial numbers typically not guessable by AI
            estimated_value=estimated_value,
            estimated_value_ai_date=estimation_date,
            confidence=confidence,
            source="Google Gemini AI"
        )
        
    except ImportError:
        logger.error("google-generativeai package not installed")
        return None
    except Exception as e:
        logger.exception(f"Error enriching item {item.id} with Gemini: {e}")
        return None

