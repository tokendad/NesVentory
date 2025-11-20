# Item Fields Documentation

This document describes all available fields for items in NesVentory.

## Standard Item Fields

### Basic Information
- **name** (string, required): The name/title of the item
- **description** (text, optional): Detailed description of the item

### Manufacturer Information
- **manufacturer** (string, optional): The manufacturer or brand name (e.g., "Samsung", "Apple", "DeWalt")
- **model_number** (string, optional): The model number/identifier (e.g., "UN65RU8000", "MK1E3LL/A")
- **serial_number** (string, optional): The unique serial number of the item
- **manufacture_date** (date, optional): When the item was manufactured (YYYY-MM-DD format)

### Purchase Information
- **purchase_date** (date, optional): When the item was purchased (YYYY-MM-DD format)
- **purchase_price** (decimal, optional): Original purchase price
- **estimated_value** (decimal, optional): Current estimated value
- **retailer** (string, optional): Where the item was purchased (e.g., "Best Buy", "Amazon")

### Identification
- **upc** (string, optional): UPC/barcode number for the item

### Location
- **location_id** (UUID, optional): Links the item to a specific location in your inventory

### Warranties
- **warranties** (JSON array, optional): Array of warranty objects. Each warranty can include:
  - `type`: "manufacturer" or "extended"
  - `expiration_date`: When the warranty expires (YYYY-MM-DD)
  - `description`: Details about the warranty coverage

Example:
```json
[
  {
    "type": "manufacturer",
    "expiration_date": "2025-03-15",
    "description": "1-year manufacturer warranty"
  },
  {
    "type": "extended",
    "expiration_date": "2027-03-15",
    "description": "3-year extended warranty from Best Buy"
  }
]
```

### Custom Fields
- **custom_fields** (JSON object, optional): User-defined fields for storing any additional information specific to your needs

Example:
```json
{
  "smart_features": "Netflix, Hulu, Prime Video",
  "screen_type": "LED",
  "refresh_rate": "120Hz",
  "color": "Black",
  "wifi_enabled": true
}
```

## Multiple Photos

Items support multiple photos through the Photo model:
- **is_primary** (boolean): Mark one photo as the primary/default image
- **is_data_tag** (boolean): Mark a photo as the asset tag/data label photo

You can upload as many photos as needed for each item, including:
- Overall item photos
- Close-up detail shots
- Asset tag photos
- Documentation photos
- Condition photos

## API Examples

### Creating an Item with All Fields

```bash
curl -X POST "http://localhost:8001/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Samsung 65\" 4K TV",
    "description": "Smart TV with HDR and built-in streaming apps",
    "manufacturer": "Samsung",
    "model_number": "UN65RU8000",
    "serial_number": "ABC123456789",
    "manufacture_date": "2022-02-01",
    "purchase_date": "2022-03-15",
    "purchase_price": 799.99,
    "estimated_value": 650.00,
    "retailer": "Best Buy",
    "upc": "887276318356",
    "location_id": "uuid-of-location",
    "warranties": [
      {
        "type": "manufacturer",
        "expiration_date": "2023-03-15",
        "description": "1-year manufacturer warranty"
      }
    ],
    "custom_fields": {
      "smart_features": "Netflix, Hulu, Prime Video",
      "screen_type": "LED",
      "refresh_rate": "120Hz"
    }
  }'
```

### Updating an Item

You can update any field individually or multiple fields at once:

```bash
curl -X PUT "http://localhost:8001/items/{item_id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "estimated_value": 600.00,
    "custom_fields": {
      "condition": "excellent",
      "last_serviced": "2024-01-15"
    }
  }'
```

## Database Migration

If you're upgrading from an older version of NesVentory, run the migration script:

```bash
psql -U nesventory -d nesventory -f backend/migrations/001_add_item_fields.sql
```

See [backend/migrations/README.md](backend/migrations/README.md) for more details.
