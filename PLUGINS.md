# NesVentory Plugin System

This document describes how to integrate external LLM plugins with NesVentory for AI-powered item detection and identification.

## Overview

NesVentory supports external LLM plugins that can provide AI-powered assistance for:
- **Item Detection from Images**: Analyze photos to identify household items
- **Item Identification**: Match user descriptions to known collectibles or items
- **Specialized Collections**: Plugins can be pre-trained on specific collections (e.g., Department 56 villages, Lego sets, etc.)

## How It Works

1. When a user uploads an image for AI scan, NesVentory tries enabled plugins in priority order (lower priority number = tried first)
2. If a plugin successfully identifies items, its response is used
3. If all plugins fail or none are configured, NesVentory falls back to Google Gemini AI
4. This allows specialized plugins to handle their domain (e.g., collectibles) while general items use Gemini

## Plugin API Specification

### Required Endpoints

Plugins must implement the following endpoints:

#### 1. Health Check (Optional but Recommended)
```
GET /health
GET /connection/test  (more detailed)
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

#### 2. Image Identification (Required)
```
POST /nesventory/identify/image
```

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: File upload with field name `file`
- Optional Headers: `Authorization: Bearer <api_key>` (if plugin requires authentication)

**Response Format (Option 1 - Single Item):**
```json
{
  "identified": true,
  "confidence": 0.85,
  "item": {
    "name": "Victorian House",
    "description": "Dickens Village Victorian style house",
    "brand": "Department 56",
    "estimated_value": 45.0,
    "collection": "Dickens Village"
  },
  "alternatives": [
    {
      "name": "Georgian Cottage",
      "description": "Small cottage from Dickens Village",
      "brand": "Department 56",
      "estimated_value": 35.0
    }
  ]
}
```

**Response Format (Option 2 - Multiple Items):**
```json
{
  "items": [
    {
      "name": "Samsung 55-inch TV",
      "description": "Flat screen smart TV",
      "brand": "Samsung",
      "estimated_value": 500,
      "confidence": 0.9
    }
  ]
}
```

**Response Format (Option 3 - Image Search Format):**
```json
{
  "matched_items": [
    {
      "name": "Item Name",
      "description": "Item description",
      "estimated_value": 100,
      "score": 0.85
    }
  ]
}
```

### Field Mappings

NesVentory supports various field names for compatibility:

| NesVentory Field | Accepted Plugin Fields |
|------------------|----------------------|
| `name` | `name`, `item_name` |
| `description` | `description`, `desc` |
| `brand` | `brand`, `manufacturer` |
| `estimated_value` | `estimated_value`, `value` |
| `confidence` | `confidence`, `score` |

## Configuring Plugins

### Via Admin Panel (Recommended)

1. Navigate to **Admin** > **Plugins**
2. Click **Add Plugin**
3. Fill in the plugin details:
   - **Name**: Display name (e.g., "Department 56 LLM Plugin")
   - **Endpoint URL**: Base URL of the plugin (e.g., `http://192.168.1.100:8002`)
   - **API Key**: Optional authentication key
   - **Enabled**: Whether to use this plugin
   - **Priority**: Lower number = higher priority (default: 100)
   - **Supports Image Processing**: Whether this plugin can process images

4. Click **Test Connection** to verify the plugin is accessible
5. Click **Save**

### Via Database

Plugins are stored in the `plugins` table:

```sql
INSERT INTO plugins (
    id,
    name,
    endpoint_url,
    api_key,
    enabled,
    priority,
    supports_image_processing,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Department 56 LLM Plugin',
    'http://192.168.1.100:8002',
    NULL,
    true,
    10,
    true,
    NOW(),
    NOW()
);
```

## Plugin Priority

When multiple plugins are configured, they are tried in order of priority:

1. Priority 10 plugin (tried first)
2. Priority 20 plugin
3. Priority 100 plugin
4. Gemini AI (fallback if all plugins fail)

Example use case:
- Priority 10: Department 56 collectibles plugin (specialized)
- Priority 20: Lego sets plugin (specialized)
- Priority 100: General household items plugin
- Fallback: Gemini AI (catch-all)

## Example Plugin: Plugin-Nesventory-LLM

See [Plugin-Nesventory-LLM](https://github.com/tokendad/Plugin-Nesventory-LLM) for a reference implementation that provides:
- Department 56 Village collectibles identification
- Semantic search with image support
- Pre-trained knowledge base
- RESTful API compatible with NesVentory

### Quick Start with Plugin-Nesventory-LLM

```bash
# Clone and run the plugin
git clone https://github.com/tokendad/Plugin-Nesventory-LLM.git
cd Plugin-Nesventory-LLM
docker-compose up -d

# The plugin will be available at http://localhost:8002
```

Then in NesVentory:
1. Go to Admin > Plugins
2. Add new plugin:
   - Name: "Department 56 Plugin"
   - Endpoint URL: "http://localhost:8002" (or your Docker host IP)
   - Priority: 10
   - Enabled: ✓
   - Supports Image Processing: ✓

## Docker Networking

⚠️ **Important**: When NesVentory and plugins run in separate Docker containers, you cannot use `localhost` or `127.0.0.1` for the endpoint URL.

### Options:

1. **Use Host Machine IP** (Recommended for separate containers)
   ```
   http://192.168.1.100:8002
   ```

2. **Use Docker Container Name** (if on same Docker network)
   ```yaml
   # docker-compose.yml
   services:
     nesventory:
       # ...
       networks:
         - nesventory-network
     
     nesventory-llm:
       # ...
       networks:
         - nesventory-network
   
   networks:
     nesventory-network:
   ```
   
   Then use: `http://nesventory-llm:8002`

3. **Use Docker Bridge Network**
   Find container IP: `docker inspect nesventory-llm | grep IPAddress`
   
## Troubleshooting

### Connection Test Fails

1. Check if plugin is running: `curl http://<plugin-url>/health`
2. Verify firewall rules allow traffic between containers/hosts
3. Check Docker network configuration if using Docker
4. Verify endpoint URL doesn't use `localhost` when running in Docker

### Plugin Not Being Called

1. Check plugin is enabled in Admin > Plugins
2. Verify `supports_image_processing` is set to `true`
3. Check plugin priority - lower numbers are tried first
4. Review NesVentory logs for plugin errors

### Plugin Returns No Results

1. Check plugin logs for errors
2. Verify image format is supported by the plugin
3. Test plugin directly with curl:
   ```bash
   curl -X POST http://<plugin-url>/nesventory/identify/image \
     -F "file=@test-image.jpg"
   ```

## Security Considerations

- **API Keys**: Store sensitive API keys in the database, not in code
- **Network Access**: Limit plugin access to trusted networks
- **Input Validation**: Plugins should validate all inputs
- **HTTPS**: Use HTTPS for production deployments
- **Authentication**: Consider requiring API keys for plugin access

## Developing Your Own Plugin

To create a custom plugin:

1. Implement the required endpoints (see API Specification above)
2. Return responses in one of the supported formats
3. Provide health check endpoint for connection testing
4. Document any special configuration requirements
5. Submit to the community!

### Template Code (Python/FastAPI)

```python
from fastapi import FastAPI, File, UploadFile

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/nesventory/identify/image")
async def identify_image(file: UploadFile = File(...)):
    # Process image
    image_data = await file.read()
    
    # Your AI logic here
    items = analyze_image(image_data)
    
    return {
        "items": [
            {
                "name": "Item Name",
                "description": "Item description",
                "estimated_value": 100,
                "confidence": 0.85
            }
        ]
    }
```

## Contributing

We welcome community plugins! To share your plugin:
1. Create a GitHub repository for your plugin
2. Include documentation and examples
3. Submit a PR to add your plugin to this list

## Community Plugins

- [Plugin-Nesventory-LLM](https://github.com/tokendad/Plugin-Nesventory-LLM) - Department 56 Village collectibles

*Your plugin here!*
