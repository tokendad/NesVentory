# Item Enrichment Feature Testing Guide

## Overview
The Item Enrichment feature allows users to enhance item details using configured AI providers. This feature queries AI to suggest missing or improved information like descriptions, brand names, model numbers, and estimated values.

## Testing Steps

### 1. Prerequisites
- Have at least one item in the database
- Configure a Gemini API key (either in environment variable `GEMINI_API_KEY` or in admin settings)
- Ensure user has AI providers configured (Gemini should be enabled by default)

### 2. Manual Testing via UI

1. **Navigate to Item Details**
   - Go to the Inventory page
   - Click on any item to open its details panel

2. **Click "Enrich Data" Button**
   - Look for the "Enrich Data" button in the bottom action bar (between Delete and Close buttons)
   - Click the button
   - System will query configured AI providers for enrichment suggestions

3. **Review Enrichment Results**
   - A modal will appear showing enrichment suggestions
   - View the confidence score (High/Medium/Low)
   - Review suggested changes:
     - Description
     - Brand
     - Model Number
     - Serial Number
     - Estimated Value
   - See current values displayed below suggested values for comparison

4. **Accept or Reject Suggestions**
   - Click "Accept & Apply" to update the item with the suggested data
   - Click "Show Next Suggestion" if multiple suggestions are available
   - Click "Close" to dismiss without changes

### 3. API Testing via cURL

```bash
# Get authentication token
TOKEN="your_jwt_token_here"

# Enrich an item (replace {item_id} with actual UUID)
curl -X POST "http://localhost:8000/api/items/{item_id}/enrich" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "item_id": "uuid-here",
  "enriched_data": [
    {
      "description": "Enhanced description",
      "brand": "Brand Name",
      "model_number": "Model XYZ",
      "serial_number": null,
      "estimated_value": 150.00,
      "estimated_value_ai_date": "12/18/25",
      "confidence": 0.85,
      "source": "Google Gemini AI"
    }
  ],
  "message": "Found 1 enrichment suggestion(s)"
}
```

### 4. Expected Behavior

**Success Cases:**
- Item with minimal data (e.g., just a name) should get enriched with description, brand, and value
- Existing values should not be overwritten unless user accepts
- Confidence scores should be displayed clearly
- Multiple AI provider results should be sorted by confidence

**Edge Cases:**
- Item with complete data: Should still get suggestions, but user can reject them
- No AI providers configured: Should show error message
- AI API quota exceeded: Should show appropriate error
- Item not found: Should return 404 error

### 5. Troubleshooting

**"No AI providers configured" error:**
- Check that Gemini API key is set in environment or admin settings
- Verify user's AI provider configuration in user settings

**"No enrichment data available" message:**
- Check that the item has at least a name
- Verify AI provider is responding (check logs)
- May occur if AI cannot determine additional information

**Enrichment takes too long:**
- AI queries can take 5-15 seconds depending on the provider
- Check network connectivity to AI provider API

## Feature Limitations

- Currently only supports Google Gemini AI
- Serial numbers are not guessed by AI for security reasons
- Enrichment does not analyze photos automatically (use data tag scanning for that)
- Only fills in missing fields; does not overwrite existing data without user acceptance
