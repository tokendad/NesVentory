#File purpose- Quick reference guide for most common models

**D11 / D110 / H1S15mmD-Series (Standard)**

• 12x22mm, 12x30mm, 12x40mm
• 14x22mm, 14x30mm, 14x40mm, 14x50mm
• 15mm Cable Flags (T-Shape)
• 12.5x109mm Cable Tails
• 13mm Round

**D10125mmD-Series (Hybrid)**
**All D11/D110 sizes above (requires divider)**
 **PLUS D101 Exclusives:**
• 20x30mm, 20x40mm, 20x45mm, 20x75mm
• 25x30mm, 25x40mm, 25x50mm, 25x60mm
• 25mm Round

B1 / B21 / B20350mmB-Series (Commercial)
• 20x10mm, 25x15mm
• 30x20mm, 30x30mm, 30x40mm
• 40x20mm, 40x30mm, 40x60mm
• 50x30mm, 50x50mm, 50x70mm, 50x80mm
• Jewelry Tags (Type F/T)
• Cable Labels (25x38mm)

**B3S75mmB-Series (Wide)**
**All B1/B21 sizes above**
**PLUS Wide Exclusives:**
• 60x40mm, 70x40mm
• 70x80mm, 72x105mm
• 100x150mm (Limited support, check firmware)

**B1815mm Thermal Transfer**
**Requires Ribbon Cartridge - NOT compatible with above labels**
• 14x25mm, 14x30mm, 14x50mm
• 14x22mm (PET material)
• 12.5x65mm Cable Label

**M254mmThermal Transfer**
**Requires Ribbon Cartridge - NOT compatible with above labels**
• 20mm - 50mm widths (PET/Silver/Matte)


**Quick Reference Rules**

D101 Owners: You can use ANY label from the "D11/D110" section (using the plastic divider) AND any label from the "D101" section (removing the divider).

B-Series Owners: The B1, B21, and B203 use the exact same rolls.

The Chip: All official Niimbot rolls contain an RFID chip in the paper core that tells the printer the size automatically. If you buy third-party generic labels, you must manually select the template in the app.

B18 / M2: These are special "Thermal Transfer" printers. They use a carbon ribbon and plastic (PET) labels. Do not buy standard thermal paper for these; it will not work.


**Niimblue reference websites:**
##Niimblue Printers protocol: https://printers.niim.blue/interfacing/proto/
Niimbot tag dumps:https://github.com/ywaf/niimbot_tag_dumps
Niimbot tag cloning: https://github.com/ywaf/niimbot_tag_dumps/issues/1

**Niimblue Full hardware references **
### information pull from the niimbot website on 2/3/2026
  - docs/niimbott/NIIMBOT_HARDWARE_REFERENCES.MD

  API Information
  Endpoint: GET https://print.niimbot.com/api/hardware/list
  Response Format:
  json{
    "data": {
      "total": 73,
      "page": 1,
      "limit": 10000,
      "list": [...]
    }
  }
## Additional API endpoints
 - docs/niimbot/NIIMBOT_API_ENDPOINTS.MD
 

**Example RFID information**
###Printer model used: b1 printer.  Lable type t50x230 White Label

RFID information:
Tage Type: ISO 14443-3a
NXP - Mifare Ultralight

Technologies Available:
NfcA

Serial Number:
1d:86:28:6C:12:10:80

ATQA:
0x0044

SAK:
0x0044
