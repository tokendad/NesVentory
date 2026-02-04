# Niimbot Cloud API Endpoints Reference

> **Base URL:** `https://print.niimbot.com`  
> **Alternative/Test URL:** `https://print.jc-test.cn`  
> **Last Updated:** February 2026 (based on community documentation)

## Table of Contents
- [Authentication & Headers](#authentication--headers)
- [Hardware & Printer Information](#hardware--printer-information)
- [RFID & Consumables](#rfid--consumables)
- [Template & Label Management](#template--label-management)
- [Firmware Updates](#firmware-updates)
- [Logging & Analytics](#logging--analytics)
- [Common Response Formats](#common-response-formats)

---

## Authentication & Headers

Most endpoints require the following headers:

```http
Content-Type: application/json
niimbot-user-agent: OS/Android AppVersionName/999.0.0 DeviceId/xxx referer/CP001Mobile count/1111111
Authorization: [Token]
languageCode: zh-cn
Accept-Language: en-CA;q=1, zh-Hans-CA;q=0.9
Cookie: [Session Cookie]
```

**Note:** The `niimbot-user-agent` header format varies by endpoint and client type.

---

## Hardware & Printer Information

### Get All Printer Models

**Endpoint:** `GET /api/hardware/list`

**Description:** Retrieves a comprehensive list of all available Niimbot printer models with detailed specifications.

**Request:**
```http
GET https://print.niimbot.com/api/hardware/list HTTP/1.1
```

**Response:**
```json
{
  "data": {
    "total": 73,
    "page": 1,
    "limit": 10000,
    "list": [
      {
        "id": "10040",
        "seriesId": "10003",
        "seriesName": "B1",
        "codes": [4097],
        "name": "B1 Pro",
        "modelName": "热敏打印机",
        "printDirection": 0,
        "defaultWidth": 50,
        "defaultHeigth": 30,
        "maxPrintWidth": 50,
        "maxPrintHeight": 200,
        "paccuracy": 9,
        "paccuracyName": "300",
        "isSupportCalibration": true,
        "isSupportWifi": false,
        "rfidType": 1,
        "consumables": [...],
        "paperType": "1,2,5",
        ...
      }
    ]
  }
}
```

**Key Fields:**
- `codes` - Model identification codes
- `consumables` - Supported label materials and formats
- `paperType` - Compatible paper type codes
- `rfidType` - RFID support level (0=none, 1=standard, 2=advanced, 3=professional)

---

## RFID & Consumables

### Get RFID Print Strategy

**Endpoint:** `POST /api/rfid/getRfidPrintStrategy`

**Description:** Retrieves the print policy for non-RFID labels based on printer ID.

**Request:**
```http
POST /api/rfid/getRfidPrintStrategy HTTP/1.1
Host: print.niimbot.com
Content-Type: application/x-www-form-urlencoded

bluetoothNumber=BXX-XXXXXXXXX&type=1
```

**Response:**
```json
{
  "code": 1,
  "data": {
    "rfidStatus": {
      "status": true,
      "enableStartTime": null,
      "enableDeadlineTime": null
    },
    "printConfig": [
      {
        "status": true,
        "enabled": true,
        "id": 3,
        "typeName": "非法纸张打印策略",
        "type": 1,
        "value": -2,
        "name": "-2浓度打印"
      }
    ],
    "bluetoothNumber": "BXX-XXXXXXXXX"
  },
  "message": "成功",
  "status_code": 1
}
```

**Print Config Options:**
- `value: 0` - Print at density 0
- `value: -1` - Print at density -1
- `value: -2` - Print at density -2 (reduced)
- `value: null` - Prohibit printing / No restriction / Prohibit batch printing

---

### Get RFID Information

**Endpoint:** `POST /api/rfid/getRfid`

**Description:** Retrieves label remaining prints and usage information by serial number. If `materialUsed` > `allowNum`, the app will stop printing.

**Request:**
```http
POST /api/rfid/getRfid HTTP/1.1
Host: print.niimbot.com
Content-Type: application/json
niimbot-user-agent: OS/Android AppVersionName/999.0.0 DeviceId/xxx referer/CP001Mobile count/1111111

{
  "serialNumber": "PZ1G311330000385"
}
```

**Alternative Format (URL-encoded):**
```http
Content-Type: application/x-www-form-urlencoded

serialNumber=881d728314870000
```

**Response:**
```json
{
  "data": [
    {
      "allowNum": 276,
      "fixedAllowNum": 276,
      "rfidStatus": false,
      "serialNumber": "881d728314870000",
      "materialUsed": 282,
      "usedType": 1,
      "carbonColor": "",
      "paperColor": "0.0.0",
      "batchSn": "PC0F629160004839",
      "statusCode": "B2"
    }
  ],
  "code": 1,
  "status_code": 1,
  "message": "成功"
}
```

**Note:** Response is encrypted in some versions.

**Key Fields:**
- `allowNum` - Total allowed prints
- `materialUsed` - Number of prints already used
- `rfidStatus` - Whether RFID is active
- `batchSn` - Batch serial number

---

## Template & Label Management

### Get Cloud Template by One Code

**Endpoint:** `POST /api/template/getCloudTemplateByOneCode`

**Description:** Retrieves template information using a one-code identifier.

**Request:**
```http
POST /api/template/getCloudTemplateByOneCode HTTP/1.1
Host: print.niimbot.com
Content-Type: application/json
niimbot-user-agent: AppVersionName/999.0.0

{
  "oneCode": "02282280"
}
```

**Response:** Template data (format varies)

---

### Get Cloud Template by Scan Code (Barcode)

**Endpoint:** `POST /api/template/getCloudTemplateByScanCode`

**Description:** Retrieves label details using the barcode from RFID. This is how the app auto-detects printer label size.

**Request:**
```http
POST /api/template/getCloudTemplateByScanCode HTTP/1.1
Host: print.niimbot.com
Content-Type: application/x-www-form-urlencoded

oneCode=6972842748577
```

**Response:**
```json
{
  "data": {
    "id": 80006400,
    "name": "T50*30-230特价(10卷)",
    "barcode": "6972842748577",
    "backgroundImage": "https://oss-print.niimbot.com/public_resources/labels/DN202211050002-*.png",
    "paperType": 1,
    "consumableType": 1,
    "consumableTypeTextId": "app01230",
    "height": 30,
    "width": 50,
    "margin": [0, 0, 0, 0],
    "sticky": false,
    "machineIdList": ["8", "10028", "27", ...],
    "supportedEditors": ["GENERAL"],
    "visibility": {
      "languageCodes": [...]
    },
    "profile": {
      "keyword": "特价(10卷)",
      "barcode": "6972842748577",
      "machineId": "8,10028,27,2,18,41,...",
      "machineName": "S3,B31,B21,B11,B3S,...",
      "extrain": {
        "materialModelSn": "30050",
        "commodityCategoryId": 40,
        "industryId": 39,
        ...
      }
    }
  },
  "code": 1,
  "status_code": 1,
  "message": "成功"
}
```

**Key Fields:**
- `height` / `width` - Label dimensions in mm
- `machineIdList` - Compatible printer IDs
- `consumableType` - Material type code
- `paperType` - Paper format code

---

## Firmware Updates

### Get Machine Firmware Details (Cascade)

**Endpoint:** `POST /api/firmware/machineCascadeDetail`

**Description:** Checks for firmware updates and retrieves printer characteristics.

**Request:**
```http
POST /api/firmware/machineCascadeDetail HTTP/1.1
Host: print.niimbot.com
Content-Type: application/json
niimbot-user-agent: AppVersionName/999.0.0

{
  "machineName": "B1",
  "firmVersion": "5.10"
}
```

**Alternative Test Server:**
```http
POST /api/firmware/machineCascadeDetail HTTP/1.1
Host: print.jc-test.cn
Content-Type: application/json
niimbot-user-agent: AppVersionName/999.0.0

{
  "machineName": "B1",
  "firmVersion": "5.20"
}
```

**Response:** Firmware update information and printer characteristics.

---

## Logging & Analytics

### Print Log Submission

**Endpoint:** `POST /logstores/print-bison-content/shards/lb`

**Base URL:** `https://niimbot-pro.cn-hangzhou.log.aliyuncs.com`

**Description:** After each print job completes, the app sends print logs to this endpoint. The server analyzes the log and increments the `materialUsed` counter for the RFID UUID.

**Purpose:**
- Track print usage
- Update RFID consumable counts
- Analytics and monitoring

**Note:** This is an Aliyun (Alibaba Cloud) logging service endpoint.

---

## Common Response Formats

### Success Response

```json
{
  "code": 1,
  "status_code": 1,
  "message": "成功",
  "data": { ... }
}
```

### Error Response

```json
{
  "code": 0,
  "status_code": 0,
  "message": "Error message in Chinese",
  "data": null
}
```

---

## Data Type Reference

### Paper Type Codes

| Code | Chinese Name | English Name |
|------|-------------|--------------|
| 1 | 间隙纸 | Gap Paper |
| 2 | 黑标纸 | Black Mark Paper |
| 3 | 连续纸 | Continuous Paper |
| 4 | 定孔纸 | Hole-punched Paper |
| 5 | 透明纸 | Transparent Paper |
| 10 | 黑标间隙 | Black Mark Gap |
| 11 | 热缩管 | Heat Shrink Tube |

### Consumable Type Codes

Refer to the main hardware reference for complete material type codes (1-103).

### RFID Types

| Code | Description |
|------|-------------|
| 0 | No RFID support |
| 1 | Standard RFID |
| 2 | Advanced RFID |
| 3 | Professional RFID |

---

## Application Codes

Common application identifiers found in compatibility lists:

| Code | Name |
|------|------|
| CP001 | 精臣云打印 (Niimbot Cloud Print) |
| CP002 | 臣印 (Chen Yin) |
| CP004 | 烟草价签 (Tobacco Price Tag) |
| CP005 | 固定资产 (Fixed Assets) |
| CP006 | 进销存 (Inventory Management) |
| CP007 | 国网电表 (State Grid Meter) |
| CP008 | 烟草管家 (Tobacco Manager) |
| CP009 | 可多价签 (Multi-price Tag) |
| CP010 | 电网标签打印 (Grid Label Print) |
| CP011 | 烟草管家-非烟 (Tobacco Manager - Non-tobacco) |
| CP012 | 标识云打印 (ID Cloud Print) |
| CP013 | 标识云 (ID Cloud) |
| CP014 | 华为FA快应用 (Huawei FA Quick App) |
| CP015 | 华为智慧生活 (Huawei Smart Life) |
| * | 全部 (All) |

Suffixes: `Mobile`, `PC`, `Pad` indicate platform variants.

---

## Additional Endpoints (Inferred/Unconfirmed)

Based on common API patterns, these endpoints likely exist but are not fully documented:

### Potential User/Account Endpoints
- `/api/user/login`
- `/api/user/register`
- `/api/user/profile`
- `/api/user/logout`

### Potential Template Management
- `/api/template/list`
- `/api/template/create`
- `/api/template/update`
- `/api/template/delete`

### Potential Settings
- `/api/settings/get`
- `/api/settings/update`

---

## Notes & Best Practices

1. **Character Encoding:** All Chinese text should be UTF-8 encoded.

2. **User Agent:** The `niimbot-user-agent` header format is important for proper API functioning. Format varies by client:
   - Mobile: `OS/Android AppVersionName/999.0.0 DeviceId/xxx referer/CP001Mobile count/1111111`
   - Simple: `AppVersionName/999.0.0`

3. **Language Codes:** Supported languages include `zh-cn`, `zh-cn-t`, `en`, `ja`, `ko`, `de`, `fr`, `es`, `it`, `ru`, `pt`, `ar`, `th`, and more.

4. **Internationalization:** Many fields use i18n keys like `app00280`, `app01230` for multi-language support.

5. **RFID Security:** Some responses are encrypted to protect RFID information.

6. **Rate Limiting:** Unknown, but likely exists. Be respectful with API calls.

7. **Testing:** Use `print.jc-test.cn` for testing firmware-related operations.

---

## Resources

- **Community Wiki:** https://printers.niim.blue/other/niimbot-cloud/
- **GitHub Discussions:** Multiple open-source projects document these endpoints
- **Official Website:** https://www.niimbot.com

---

## Disclaimer

This documentation is compiled from community reverse-engineering efforts and is not officially provided by Niimbot. Use at your own risk. The API structure may change without notice.

For official integrations, contact Niimbot directly at service@niimbot.com.

---

*Last updated: February 2026*
*Compiled from community sources and reverse engineering*
