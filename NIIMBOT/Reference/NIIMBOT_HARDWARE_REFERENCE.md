# Niimbot Printer Hardware Reference

> **Source:** `GET https://print.niimbot.com/api/hardware/list`  
> **Last Updated:** Generated from API  
> **Total Models:** 73

## Table of Contents
- [Printer Models Overview](#printer-models-overview)
- [Detailed Printer Specifications](#detailed-printer-specifications)
- [Paper Type Codes](#paper-type-codes)
- [Material Types](#material-types)
- [Print Methods](#print-methods)

---

## Printer Models Overview

| Model Name | Series | Print Type | Resolution | Max Width×Height (mm) | RFID | WiFi |
|------------|--------|------------|------------|----------------------|------|------|
| B1 Pro | B1 | Thermal | 300 DPI | 50×200 | ✓ | ✗ |
| B1 | B1 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B2 | B2系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B3S_P | B3S 系列 | Thermal | 203 DPI | 75×350 | ✓ | ✗ |
| B4 | B4 | Thermal | 203 DPI | 108×350 | ✓ | ✗ |
| B2 Pro | B2系列 | Thermal | 300 DPI | 200×200 | ✓ | ✗ |
| Z401 | B32 系列 | Thermal Transfer | 300 DPI | 75×240 | ✓ | ✗ |
| N1 | B18 & N1 | Thermal Transfer | 203 DPI | 15×120 | ✓ | ✗ |
| EP3M | M3 | Thermal Transfer | 300 DPI | 78×350 | ✓ | ✗ |
| Fust | D11 系列 | Thermal | 203 DPI | 15×200 | ✓ | ✗ |
| B21_Pro | B21系列 | Thermal | 300 DPI | 50×200 | ✓ | ✗ |
| H1S | 一小台H1S | Thermal | 203 DPI | 15×200 | ✓ | ✗ |
| H1 | 一小台H1 | Thermal | 203 DPI | 15×200 | ✓ | ✗ |
| B31 | B31 | Thermal | 203 DPI | 77×350 | ✓ | ✗ |
| JCB3S | B3S 系列 | Thermal | 203 DPI | 75×200 | ✗ | ✗ |
| A8_P | B3S 系列 | Thermal | 203 DPI | 75×200 | ✓ | ✗ |
| S6_P | B3S 系列 | Thermal | 203 DPI | 75×200 | ✓ | ✗ |
| A8 | B3S 系列 | Thermal | 203 DPI | 75×200 | ✗ | ✗ |
| S6 | B3S 系列 | Thermal | 203 DPI | 75×200 | ✗ | ✗ |
| B3S | B3S 系列 | Thermal | 203 DPI | 75×200 | ✗ | ✗ |
| D11_Pro | D11 系列 | Thermal | 300 DPI | 15×200 | ✓ | ✗ |
| Hi-NB-D11 | D11 系列 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| Hi-D110 | D110 系列 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| D11_H | D11 系列 | Thermal | 300 DPI | 15×200 | ✓ | ✗ |
| D110_M | D110 系列 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| D11S | D11 系列 | Thermal | 203 DPI | 15×75 | ✓ | ✗ |
| Dxx | D11 系列 | Thermal | 203 DPI | 15×200 | ✓ | ✗ |
| D41 | D11 系列 | Thermal | 203 DPI | 15×75 | ✓ | ✗ |
| D61 | D11 系列 | Thermal | 203 DPI | 15×75 | ✓ | ✗ |
| D11 | D11 系列 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| D110 | D110 系列 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| B21S-C2B | B21系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B21S | B21系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B21-L2B | B21系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B21-C2B | B21系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B21 | B21系列 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B18 | B18 & N1 | Thermal Transfer | 203 DPI | 15×120 | ✓ | ✗ |
| B18S | B18 & N1 | Thermal Transfer | 203 DPI | 15×120 | ✓ | ✗ |
| A20 | B203 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| M3 | M3 | Thermal Transfer | 300 DPI | 78×350 | ✓ | ✗ |
| A203 | B203 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| B203 | B203 | Thermal | 203 DPI | 50×200 | ✓ | ✗ |
| S1 | B11 系列 | Thermal | 203 DPI | 50×200 | ✗ | ✗ |
| JC-M90 | B11 系列 | Thermal | 203 DPI | 50×200 | ✗ | ✗ |
| S3 | B11 系列 | Thermal | 203 DPI | 50×200 | ✗ | ✗ |
| B11 | B11 系列 | Thermal | 203 DPI | 50×200 | ✗ | ✗ |
| M2_H | M2 | Thermal Transfer | 300 DPI | 50×240 | ✓ | ✗ |
| MP3K_W | K3 系列 | Thermal | 203 DPI | 82×300 | ✓ | ✓ |
| K3_W | K3 系列 | Thermal | 203 DPI | 82×300 | ✓ | ✓ |
| EP2M_H | M2 | Thermal Transfer | 300 DPI | 200×200 | ✓ | ✗ |
| D101 | D101 系列 | Thermal | 203 DPI | 25×100 | ✓ | ✗ |
| Betty | D101 系列 | Thermal | 203 DPI | 25×200 | ✓ | ✗ |
| MP3K | K3 系列 | Thermal | 203 DPI | 82×300 | ✓ | ✗ |
| K3 | K3 系列 | Thermal | 203 DPI | 82×300 | ✓ | ✗ |
| K2 | K2 | Thermal | 203 DPI | 60×300 | ✓ | ✗ |
| C1 | C1 | Thermal Transfer | 300 DPI | 50×50 | ✓ | ✗ |
| B3 | B3 系列 | Thermal | 203 DPI | 75×200 | ✗ | ✗ |
| T2S | T2 | Thermal | 203 DPI | 107×280 | ✗ | ✗ |
| TP2M_H | M2 | Thermal Transfer | 300 DPI | 50×240 | ✓ | ✗ |
| T8S | B32 系列 | Thermal Transfer | 300 DPI | 75×120 | ✗ | ✗ |
| A63 | B32 系列 | Thermal Transfer | 300 DPI | 75×240 | ✓ | ✗ |
| P1 | P1S | Thermal Transfer | 300 DPI | 80×150 | ✓ | ✗ |
| P18 | P1S | Thermal Transfer | 300 DPI | 87×150 | ✓ | ✗ |
| P1S | P1S | Thermal Transfer | 300 DPI | 87×150 | ✓ | ✗ |
| B16 | 萌印 | Thermal | 203 DPI | 15×100 | ✓ | ✗ |
| B32R | B32 系列 | Thermal Transfer | 300 DPI | 75×240 | ✓ | ✗ |
| B32 | B32 系列 | Thermal Transfer | 300 DPI | 75×240 | ✓ | ✗ |
| T6 | B50 系列 | Thermal Transfer | 203 DPI | 50×200 | ✗ | ✗ |
| B50W | B50 系列 | Thermal Transfer | 203 DPI | 50×200 | ✗ | ✗ |
| T7 | B50 系列 | Thermal Transfer | 203 DPI | 50×200 | ✗ | ✗ |
| T8 | T8 系列 | Thermal Transfer | 300 DPI | 50×200 | ✗ | ✗ |
| B50 | B50 系列 | Thermal Transfer | 203 DPI | 50×200 | ✗ | ✗ |
| ET10 | ET10 | Thermal Transfer | 203 DPI | 200×200 | ✗ | ✗ |

---

## Detailed Printer Specifications

### B1 Pro (B1)

**Model ID:** `10040` | **Codes:** `[4097]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-红黑双色** (Code: `29`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-灰阶** (Code: `70`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-厚款** (Code: `64`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B1 (B1)

**Model ID:** `10003` | **Codes:** `[4096]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B2 (B2系列)

**Model ID:** `10038` | **Codes:** `[6913]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B3S_P (B3S 系列)

**Model ID:** `10025` | **Codes:** `[272]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×350mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 烟草价签 (`CP004`)
- 进销存 (`CP006`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Density: 3
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Density: 3
  - Print Mode: 热敏打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-厚款** (Code: `64`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`
- **热敏合成纸-红色字迹** (Code: `28`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`

---

### B4 (B4)

**Model ID:** `10033` | **Codes:** `[6656]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 108×350mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 104mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B2 Pro (B2系列)

**Model ID:** `10042` | **Codes:** `[6912]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 200×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-红黑双色(厚款)** (Code: `80`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-红黑双色** (Code: `29`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-灰阶** (Code: `70`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### Z401 (B32 系列)

**Model ID:** `45` | **Codes:** `[2051]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 15
- Default: 10
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PP-缠绕标签** (Code: `22`)
  - Density: 13
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### N1 (B18 & N1)

**Model ID:** `10032` | **Codes:** `[3586]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×120mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,11,5,10,3`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PE** (Code: `14`)
  - Print Mode: 热转印打印
  - 热缩管 (Code: `11`) - Blind Zone: `0.0|0.0|1.0|1.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **液氮** (Code: `23`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **丝带** (Code: `37`)
  - Print Mode: 热转印打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PP-通用** (Code: `55`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PVC-静电贴** (Code: `103`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|2.0|0.0`

---

### EP3M (M3)

**Model ID:** `10041` | **Codes:** `[6402]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 78×350mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,5,2,10`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑黑PET** (Code: `18`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PET卡纸** (Code: `35`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### Fust (D11 系列)

**Model ID:** `42` | **Codes:** `[513]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`
- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`

---

### B21_Pro (B21系列)

**Model ID:** `10027` | **Codes:** `[785]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.0|0.5|0.5`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.5|1.0|0.5|0.5`
  - 连续纸 (Code: `3`) - Blind Zone: `0.5|1.0|0.5|0.5`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|1.0|0.5|0.5`
- **热敏合成纸-红黑双色** (Code: `29`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.0|0.5|0.5`
  - 黑标纸 (Code: `2`) - Blind Zone: `2.5|2.5|0.5|0.5`

---

### H1S (一小台H1S)

**Model ID:** `10010` | **Codes:** `[4352]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×15mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 8mm to 12mm

**Supported Paper Types:** `1,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `2.0|2.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### H1 (一小台H1)

**Model ID:** `10005` | **Codes:** `[3840]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 8mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B31 (B31)

**Model ID:** `10028` | **Codes:** `[5632]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 77×350mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 75mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|1.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-红色字迹** (Code: `28`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-低温** (Code: `31`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### JCB3S (B3S 系列)

**Model ID:** `12` | **Codes:** `[256]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 2
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `5.0|1.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### A8_P (B3S 系列)

**Model ID:** `10031` | **Codes:** `[273]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### S6_P (B3S 系列)

**Model ID:** `10030` | **Codes:** `[274]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 75mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### A8 (B3S 系列)

**Model ID:** `10013` | **Codes:** `[256]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `2,1,3`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 烟草管家 (`CP008`)
- 烟草管家-非烟 (`CP011`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `5.0|1.0|0.0|0.0`
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `5.0|1.0|0.0|0.0`

---

### S6 (B3S 系列)

**Model ID:** `41` | **Codes:** `[261, 259, 258, 257]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `5.0|1.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`

---

### B3S (B3S 系列)

**Model ID:** `18` | **Codes:** `[256, 260, 262]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - Density: 3
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - Density: 3
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Density: 5
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Density: 3
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `6.0|1.0|0.0|0.0`

---

### D11_Pro (D11 系列)

**Model ID:** `10039` | **Codes:** `[531]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `5,1`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **透明PET** (Code: `5`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `1.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `1.0|0.0|0.0|0.0`

---

### Hi-NB-D11 (D11 系列)

**Model ID:** `46` | **Codes:** `[512]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 12×30mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 15mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)
- 华为FA快应用 (`CP014`)
- 华为智慧生活 (`CP015`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### Hi-D110 (D110 系列)

**Model ID:** `52` | **Codes:** `[2305]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 3
- Type: 1

**Width Settings:**
- Range: 12mm to 15mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)
- 华为FA快应用 (`CP014`)
- 华为智慧生活 (`CP015`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### D11_H (D11 系列)

**Model ID:** `10023` | **Codes:** `[528]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `1.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `1.0|0.0|0.0|0.0`

---

### D110_M (D110 系列)

**Model ID:** `10024` | **Codes:** `[2320]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `1.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `1.0|0.0|0.0|0.0`

---

### D11S (D11 系列)

**Model ID:** `49` | **Codes:** `[514]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×75mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`

---

### Dxx (D11 系列)

**Model ID:** `28` | **Codes:** `[]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### D41 (D11 系列)

**Model ID:** `26` | **Codes:** `[]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×75mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### D61 (D11 系列)

**Model ID:** `24` | **Codes:** `[]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×75mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### D11 (D11 系列)

**Model ID:** `20` | **Codes:** `[512]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.0|0.0|0.0|0.0`

---

### D110 (D110 系列)

**Model ID:** `39` | **Codes:** `[2304, 2305]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`

---

### B21S-C2B (B21系列)

**Model ID:** `50` | **Codes:** `[776]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`

---

### B21S (B21系列)

**Model ID:** `51` | **Codes:** `[777]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 10mm to 48mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Density: 4
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **旧版** (Code: `N/A`)
  - Density: 1
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B21-L2B (B21系列)

**Model ID:** `31` | **Codes:** `[769]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B21-C2B (B21系列)

**Model ID:** `32` | **Codes:** `[771, 775]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 10mm to 48mm

**Supported Paper Types:** `1,3,5,2`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`

---

### B21 (B21系列)

**Model ID:** `27` | **Codes:** `[768]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `1.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|0.5|0.0|0.0`

---

### B18 (B18 & N1)

**Model ID:** `47` | **Codes:** `[3584]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×120mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5,10,11,3`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **液氮** (Code: `23`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PE** (Code: `14`)
  - Print Mode: 热转印打印
  - 热缩管 (Code: `11`) - Blind Zone: `0.0|0.0|1.0|1.0`
- **丝带** (Code: `37`)
  - Print Mode: 热转印打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PP-通用** (Code: `55`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B18S (B18 & N1)

**Model ID:** `10018` | **Codes:** `[3585]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×120mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5,10,11,3`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **液氮** (Code: `23`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **白色PE** (Code: `14`)
  - Print Mode: 热转印打印
  - 热缩管 (Code: `11`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **丝带** (Code: `37`)
  - Print Mode: 热转印打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### A20 (B203)

**Model ID:** `10009` | **Codes:** `[2817]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 烟草价签 (`CP004`)
- 烟草管家 (`CP008`)
- 烟草管家-非烟 (`CP011`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### M3 (M3)

**Model ID:** `10037` | **Codes:** `[6400]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 78×350mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,5,2,10`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PET卡纸** (Code: `35`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### A203 (B203)

**Model ID:** `10017` | **Codes:** `[2818]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|1.5|0.5|0.5`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.5|1.5|0.5|0.5`
  - 透明纸 (Code: `5`) - Blind Zone: `0.5|1.5|0.5|0.5`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.5|1.5|0.5|0.5`

---

### B203 (B203)

**Model ID:** `48` | **Codes:** `[2816]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### S1 (B11 系列)

**Model ID:** `14` | **Codes:** `[51458]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### JC-M90 (B11 系列)

**Model ID:** `13` | **Codes:** `[51461]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### S3 (B11 系列)

**Model ID:** `8` | **Codes:** `[51460]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B11 (B11 系列)

**Model ID:** `2` | **Codes:** `[51457]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 10mm to 48mm

**Supported Paper Types:** `1,2,3,4,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### M2_H (M2)

**Model ID:** `10019` | **Codes:** `[4608]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,5,2,10`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Density: 3
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Density: 3
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP卡纸** (Code: `12`)
  - Density: 3
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Density: 3
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PVC** (Code: `10`)
  - Density: 3
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Density: 3
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Density: 3
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸-书写** (Code: `67`)
  - Density: 4
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-书写** (Code: `65`)
  - Density: 4
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### MP3K_W (K3 系列)

**Model ID:** `10022` | **Codes:** `[4867]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 82×300mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** Yes
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 80mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### K3_W (K3 系列)

**Model ID:** `10015` | **Codes:** `[4865]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 82×300mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** Yes
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 80mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### EP2M_H (M2)

**Model ID:** `10036` | **Codes:** `[4610]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 200×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,5,2,10`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP卡纸** (Code: `12`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PVC** (Code: `10`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **烫印** (Code: `21`)
  - Print Mode: 热转印打印
  - 黑标间隙 (Code: `10`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### D101 (D101 系列)

**Model ID:** `44` | **Codes:** `[2560]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×25mm
- **Maximum Size:** 25×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 24mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### Betty (D101 系列)

**Model ID:** `10008` | **Codes:** `[2561]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 30×25mm
- **Maximum Size:** 25×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 24mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|1.0|1.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|1.0|1.0`

---

### MP3K (K3 系列)

**Model ID:** `10021` | **Codes:** `[4866]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 82×300mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 80mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### K3 (K3 系列)

**Model ID:** `10014` | **Codes:** `[4864]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 82×300mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 80mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### K2 (K2)

**Model ID:** `10034` | **Codes:** `[6144]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 60×300mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 56mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明热敏** (Code: `19`)
  - Print Mode: 热敏打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **三防热敏纸** (Code: `11`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### C1 (C1)

**Model ID:** `10035` | **Codes:** `[5120]`

**Print Specifications:**
- **Type:** 线号机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 12×40mm
- **Maximum Size:** 50×50mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 2

**Width Settings:**
- Range: 12mm to 15mm

**Supported Paper Types:** `3`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热缩管** (Code: `53`)
  - Density: 3
  - Print Mode: 热转印打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **线号管** (Code: `54`)
  - Density: 3
  - Print Mode: 热转印打印
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B3 (B3 系列)

**Model ID:** `1` | **Codes:** `[52993]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×200mm
- **Print Method:** 居左 (code: 1)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 75mm

**Supported Paper Types:** `1,2,3,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### T2S (T2)

**Model ID:** `10012` | **Codes:** `[53250]`

**Print Specifications:**
- **Type:** 热敏及热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 107×280mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 20
- Default: 15
- Type: 1

**Width Settings:**
- Range: 20mm to 104mm

**Supported Paper Types:** `1,2`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - Print Mode: 热敏打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **铜版纸** (Code: `6`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **珠光合成纸** (Code: `15`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **铜板卡纸** (Code: `7`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP卡纸** (Code: `12`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **热敏卡纸** (Code: `4`)
  - Print Mode: 热敏打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PET卡纸** (Code: `35`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### TP2M_H (M2)

**Model ID:** `10029` | **Codes:** `[4609]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 3
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,5`

**Compatible Applications:**
- 全部 (`*`)

**Supported Consumables:**

- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP卡纸** (Code: `12`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PE** (Code: `13`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### T8S (B32 系列)

**Model ID:** `10006` | **Codes:** `[2053]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×120mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### A63 (B32 系列)

**Model ID:** `10007` | **Codes:** `[2054]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,5,2`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 烟草价签 (`CP004`)
- 烟草管家 (`CP008`)
- 烟草管家-非烟 (`CP011`)

**Supported Consumables:**

- **PP合成纸** (Code: `3`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Print Mode: 热转印打印
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **铜版纸** (Code: `6`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **铜板卡纸** (Code: `7`)
  - Print Mode: 热转印打印
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Print Mode: 热转印打印
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### P1 (P1S)

**Model ID:** `30` | **Codes:** `[1024]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 80×150mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 2

**Width Settings:**
- Range: 20mm to 59mm

**Supported Paper Types:** `6`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 标牌 (Code: `6`) - Blind Zone: `1.5|1.5|1.5|1.5`
- **标牌** (Code: `2`)
  - 标牌 (Code: `6`) - Blind Zone: `1.5|1.5|1.5|1.5`

---

### P18 (P1S)

**Model ID:** `10016` | **Codes:** `[1026]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 87×150mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 56mm

**Supported Paper Types:** `6`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **标牌** (Code: `2`)
  - Print Mode: 热转印打印
  - 标牌 (Code: `6`) - Blind Zone: `1.5|1.5|1.5|1.5`

---

### P1S (P1S)

**Model ID:** `34` | **Codes:** `[1025]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 90° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 87×150mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 5
- Default: 3
- Type: 1

**Width Settings:**
- Range: 20mm to 56mm

**Supported Paper Types:** `6`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 标牌 (Code: `6`) - Blind Zone: `1.5|1.5|1.5|1.5`
- **标牌** (Code: `2`)
  - 标牌 (Code: `6`) - Blind Zone: `1.5|1.5|1.5|1.5`

---

### B16 (萌印)

**Model ID:** `10` | **Codes:** `[1792]`

**Print Specifications:**
- **Type:** 热敏打印机
- **Resolution:** 203 DPI
- **Print Direction:** 270° rotation
- **Default Size:** 30×12mm
- **Maximum Size:** 15×100mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 1
- **Error Print Strategy:** `LOW_DENSITY_2`

**Density Settings:**
- Range: 1 to 3
- Default: 2
- Type: 1

**Width Settings:**
- Range: 12mm to 12mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)
- 臣印 (`CP002`)

**Supported Consumables:**

- **热敏合成纸-通用** (Code: `1`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`
- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `1.5|1.5|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `1.5|1.5|0.0|0.0`

---

### B32R (B32 系列)

**Model ID:** `38` | **Codes:** `[2050]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 15
- Default: 10
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **透明PET** (Code: `5`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.5|0.5|0.0|0.0`
- **白色PET** (Code: `9`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B32 (B32 系列)

**Model ID:** `37` | **Codes:** `[2049]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 75×240mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** Yes
- **WiFi Support:** No
- **RFID Type:** 2
- **Error Print Strategy:** `FORBID`

**Density Settings:**
- Range: 1 to 15
- Default: 10
- Type: 2

**Width Settings:**
- Range: 20mm to 72mm

**Supported Paper Types:** `1,5`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PET** (Code: `5`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 透明纸 (Code: `5`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - Density: 10
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **透明PP-缠绕标签** (Code: `22`)
  - Density: 13
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### T6 (B50 系列)

**Model ID:** `22` | **Codes:** `[51715]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B50W (B50 系列)

**Model ID:** `15` | **Codes:** `[51714]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### T7 (B50 系列)

**Model ID:** `21` | **Codes:** `[51717]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **白色PET** (Code: `9`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### T8 (T8 系列)

**Model ID:** `7` | **Codes:** `[51718]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 300 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 48mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### B50 (B50 系列)

**Model ID:** `3` | **Codes:** `[51713]`

**Print Specifications:**
- **Type:** 热转印打印机
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 50×30mm
- **Maximum Size:** 50×200mm
- **Print Method:** 居右 (code: 3)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 6 to 15
- Default: 10
- Type: 1

**Width Settings:**
- Range: 20mm to 50mm

**Supported Paper Types:** `1,2,3,4`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **旧版** (Code: `N/A`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 定孔纸 (Code: `4`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **PP合成纸** (Code: `3`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`
- **哑银PET** (Code: `8`)
  - 间隙纸 (Code: `1`) - Blind Zone: `0.0|0.0|0.0|0.0`
  - 黑标纸 (Code: `2`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

### ET10 (ET10)

**Model ID:** `10020` | **Codes:** `[5376]`

**Print Specifications:**
- **Type:** 电子价签
- **Resolution:** 203 DPI
- **Print Direction:** 0° rotation
- **Default Size:** 200×200mm
- **Maximum Size:** 200×200mm
- **Print Method:** 居中 (code: 2)

**Features:**
- **Calibration Support:** No
- **WiFi Support:** No
- **RFID Type:** 0
- **Error Print Strategy:** `NORMAL`

**Density Settings:**
- Range: 3 to 3
- Default: 3
- Type: 1

**Width Settings:**
- Range: 10mm to 200mm

**Supported Paper Types:** `3`

**Compatible Applications:**
- 精臣云打印 (`CP001`)

**Supported Consumables:**

- **标牌** (Code: `2`)
  - 连续纸 (Code: `3`) - Blind Zone: `0.0|0.0|0.0|0.0`

---

## Paper Type Codes

Common paper type codes found across Niimbot printers:

| Code | Name | Description |
|------|------|-------------|
| 1 | 间隙纸 (Gap Paper) | Labels with gaps between them |
| 2 | 黑标纸 (Black Mark Paper) | Labels with black marks for positioning |
| 3 | 连续纸 (Continuous Paper) | Continuous roll without gaps |
| 4 | 定孔纸 (Hole-punched Paper) | Paper with positioning holes |
| 5 | 透明纸 (Transparent Paper) | Clear/transparent labels |
| 10 | 黑标间隙 (Black Mark Gap) | Combination format |
| 11 | 热缩管 (Heat Shrink Tube) | Heat shrink tubing |

---

## Material Types

Common material types and their codes:

| Code | Name (Chinese) | Name (English) | Print Mode |
|------|----------------|----------------|------------|
| 1 | 热敏合成纸-通用 | Thermal Synthetic Paper - Universal | Thermal |
| 3 | PP合成纸 | PP Synthetic Paper | Thermal Transfer |
| 4 | 热敏卡纸 | Thermal Cardstock | Thermal |
| 5 | 透明PET | Transparent PET | Thermal/Transfer |
| 8 | 哑银PET | Matte Silver PET | Thermal Transfer |
| 9 | 白色PET | White PET | Thermal Transfer |
| 11 | 三防热敏纸 | Three-proof Thermal Paper | Thermal |
| 14 | 白色PE | White PE | Thermal Transfer |
| 18 | 哑黑PET | Matte Black PET | Thermal Transfer |
| 19 | 透明热敏 | Transparent Thermal | Thermal |
| 21 | 烫印 | Hot Stamping | Thermal Transfer |
| 22 | 透明PP-缠绕标签 | Transparent PP - Wrap Label | Thermal Transfer |
| 23 | 液氮 | Liquid Nitrogen | Thermal Transfer |
| 28 | 热敏合成纸-红色字迹 | Thermal Synthetic - Red Print | Thermal |
| 29 | 热敏合成纸-红黑双色 | Thermal Synthetic - Red/Black | Thermal |
| 31 | 热敏合成纸-低温 | Thermal Synthetic - Low Temp | Thermal |
| 35 | PET卡纸 | PET Cardstock | Thermal Transfer |
| 37 | 丝带 | Ribbon | Thermal Transfer |
| 55 | 透明PP-通用 | Transparent PP - Universal | Thermal Transfer |
| 64 | 热敏合成纸-厚款 | Thermal Synthetic - Thick | Thermal |
| 70 | 热敏合成纸-灰阶 | Thermal Synthetic - Grayscale | Thermal |
| 80 | 热敏合成纸-红黑双色(厚款) | Thermal Synthetic - Red/Black (Thick) | Thermal |
| 103 | 透明PVC-静电贴 | Transparent PVC - Static Cling | Thermal Transfer |

---

## Print Methods

| Code | Name | Description |
|------|------|-------------|
| 1 | 居左 | Left Aligned |
| 2 | 居中 | Center Aligned |
| 3 | 居右 | Right Aligned |

---

## Error Print Strategies

- **FORBID** - Prohibit printing on error
- **LOW_DENSITY_2** - Print at reduced density level 2
- **NORMAL** - Continue normal printing

---

## Notes

- **Blind Zone Format:** Values are in format `top|bottom|left|right` (in mm)
- **RFID Types:** 
  - 0 = No RFID support
  - 1 = Standard RFID
  - 2 = Advanced RFID
  - 3 = Professional RFID
- **Security Actions:** Some models have enhanced security features
- **Interface Types:** Most use interface type 1 (精臣-全系列)

---

## API Information

**Endpoint:** `GET https://print.niimbot.com/api/hardware/list`

**Response Format:**
```json
{
  "data": {
    "total": 73,
    "page": 1,
    "limit": 10000,
    "list": [...]
  }
}
```

This reference document is automatically generated from the Niimbot API and may be updated as new printer models are released.
