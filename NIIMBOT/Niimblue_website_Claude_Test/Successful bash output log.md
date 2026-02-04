### bash output from successful print

$ sudo node print-test.mjs print "01:08:03:82:81:4d"
[sudo: authenticate] Password:

🖨️  Niimbot B1 Test Print
══════════════════════════════════════════════════
   Printer Address: 01:08:03:82:81:4d
   QR Content: Hello from Niimbot!
   Label Size: 384x240px
   Density: 3
══════════════════════════════════════════════════

📝 Step 1: Creating label image...
📱 Generating QR code for: "Hello from Niimbot!"
   ✅ Preview saved to: /data/NesVentory/NIIMBOT/Niim.blue - Claude created test/niimbot-test/label-preview.png

🔌 Step 2: Connecting to printer...
>> 03 55 55 c1 01 01 c1 aa aa (Connect)
<< 55 55 c2 01 03 c0 aa aa (In_Connect)
>> 55 55 a5 01 01 a5 aa aa (PrinterStatusData)
<< 55 55 b5 10 30 30 03 20 00 c8 00 00 00 0f 01 02 04 01 98 00 df aa aa (In_PrinterStatusData)
>> 55 55 40 01 08 49 aa aa (PrinterInfo)
<< 55 55 48 02 10 00 5a aa aa (In_PrinterInfoPrinterCode)
>> 55 55 40 01 0b 4a aa aa (PrinterInfo)
<< 55 55 4b 0a 48 38 30 31 30 33 31 35 38 38 37 aa aa (In_PrinterInfoSerialNumber)
>> 55 55 40 01 0d 4c aa aa (PrinterInfo)
<< 55 55 4d 06 01 08 03 82 81 4d 0f aa aa (In_PrinterInfoBluetoothAddress)
>> 55 55 40 01 0a 4b aa aa (PrinterInfo)
<< 55 55 4a 01 02 49 aa aa (In_PrinterInfoChargeLevel)
>> 55 55 40 01 07 46 aa aa (PrinterInfo)
<< 55 55 47 01 03 45 aa aa (In_PrinterInfoAutoShutDownTime)
>> 55 55 40 01 03 42 aa aa (PrinterInfo)
<< 55 55 43 01 01 43 aa aa (In_PrinterInfoLabelType)
>> 55 55 40 01 0c 4d aa aa (PrinterInfo)
<< 55 55 4c 02 05 0a 41 aa aa (In_PrinterInfoHardWareVersion)
>> 55 55 40 01 09 48 aa aa (PrinterInfo)
<< 55 55 49 02 05 16 58 aa aa (In_PrinterInfoSoftWareVersion)
Connected
   ✅ Connected to printer
   📋 Printer Model: 4096
   📋 Firmware: 0x0516 (5.22 or 13.02)

🔄 Step 3: Processing image...

📦 Step 4: Encoding image for printer...
   ✅ Encoded 384x240 pixels

🖨️  Step 5: Printing...
>> 55 55 21 01 03 23 aa aa (SetDensity)
<< 55 55 31 01 01 31 aa aa (In_SetDensity)
>> 55 55 23 01 01 23 aa aa (SetLabelType)
<< 55 55 33 01 01 33 aa aa (In_SetLabelType)
>> 55 55 01 07 00 01 00 00 00 00 00 07 aa aa (PrintStart)
<< 55 55 02 01 01 02 aa aa (In_PrintStart)
>> 55 55 03 01 01 03 aa aa (PageStart)
<< 55 55 04 01 01 04 aa aa (In_PageStart)
>> 55 55 13 06 00 f0 01 80 00 01 65 aa aa (SetPageSize)
<< 55 55 14 02 01 00 17 aa aa (In_SetPageSize)
>> 55 55 84 03 00 00 12 95 aa aa (PrintEmptyRow)
>> 55 55 85 36 00 12 1c 6b 1d 07 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff ff ff ff ff 01 ff ff ff ff ff f0 1f ff c0 7f ff ff ff ff ff f8 00 00 00 00 00 00 00 00 00 00 00 00 95 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 19 07 3d 07 08 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 00 00 00 00 ff 00 01 ff ff ff ff f0 00 3f c0 7f 80 00 00 00 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 85 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 21 14 30 15 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 00 00 00 07 ff f0 00 00 00 00 7f 80 ff ff fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 db aa aa (PrintBitmapRow)
>> 55 55 85 36 00 28 14 4e 15 08 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 01 ff ff f8 07 ff f0 00 3f c0 7f 80 ff ff fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 a5 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 30 14 47 15 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 01 fe 00 00 00 0f ff ff ff c0 7f 80 ff ff fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 7a aa aa (PrintBitmapRow)
>> 55 55 85 36 00 37 07 2e 07 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 00 00 00 00 ff 01 ff fc 00 00 0f ff e0 00 00 7f 80 00 00 00 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 ab aa aa (PrintBitmapRow)
>> 55 55 85 36 00 3e 1c 54 1d 08 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff ff ff ff ff 01 fe 03 f8 07 f0 0f e0 3f c0 7f ff ff ff ff ff f8 00 00 00 00 00 00 00 00 00 00 00 00 44 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 46 00 34 00 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 ff ff ff ff f0 0f e0 3f c0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 27 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 4d 07 59 0e 08 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 00 00 3f 80 ff ff ff fc 00 07 ff ff e0 00 3f ff ff ff fe 00 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 d7 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 55 07 33 0e 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1f c0 3f ff 00 fe 00 00 00 00 00 0f ff ff c0 00 00 ff ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 09 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 5c 0f 5a 0e 07 00 00 00 00 00 00 00 00 00 00 00 00 00 1f ff c0 3f 80 ff ff fe 03 ff f8 0f ff ff c0 00 7f ff ff ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 65 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 63 00 41 07 08 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f ff 00 fe 00 00 07 ff ff f0 1f c0 00 00 7f fe 01 fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 f4 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 6b 1c 45 16 07 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff ff c0 00 ff fe 00 03 ff ff ff f0 1f c0 00 7f ff 00 01 ff ff f8 00 00 00 00 00 00 00 00 00 00 00 00 0b aa aa (PrintBitmapRow)
>> 55 55 85 36 00 72 15 3e 0e 08 00 00 00 00 00 00 00 00 00 00 00 00 0f ff e0 3f ff ff 00 01 fe 00 00 00 0f ff ff ff c0 00 00 ff ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 f0 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 7a 07 33 0e 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1f c0 00 7f ff 00 01 ff f8 00 00 00 1f c0 3f 80 00 ff ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 31 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 81 06 34 0f 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f ff 80 00 00 00 03 f8 07 f0 0f ff ff ff 80 00 00 01 ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 36 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 88 16 68 07 08 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff c0 3f 80 ff ff fe 03 ff f8 0f ff ff ff ff ff ff fe 01 fc 00 00 00 00 00 00 00 00 00 00 00 00 00 00 cc aa aa (PrintBitmapRow)
>> 55 55 85 36 00 90 00 26 15 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 fe 03 f8 07 f0 00 00 3f c0 00 00 ff ff fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 1c aa aa (PrintBitmapRow)
>> 55 55 85 36 00 97 1c 5c 00 08 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff ff ff ff ff 01 ff fc 07 ff ff ff e0 3f c0 7f 80 fe 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 87 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 9f 07 36 15 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 00 00 00 00 ff 00 01 ff ff f8 0f f0 00 3f c0 00 00 ff ff fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 e1 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 a6 14 54 0e 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 01 ff fc 00 07 ff f0 00 3f ff ff ff fe 01 fc 03 f8 00 00 00 00 00 00 00 00 00 00 00 00 e1 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 ad 14 3d 0f 08 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 00 01 fc 00 00 0f ff ff c0 3f ff 80 00 00 03 ff f8 00 00 00 00 00 00 00 00 00 00 00 00 c9 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 b5 14 2e 16 07 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 1f ff ff 80 ff 00 00 03 f8 00 00 00 1f c0 3f 80 7f 01 ff ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 bb aa aa (PrintBitmapRow)
>> 55 55 85 36 00 bc 07 33 0f 08 00 00 00 00 00 00 00 00 00 00 00 00 0f e0 00 00 00 00 ff 00 00 03 f8 07 f0 0f ff c0 00 7f 80 fe 01 ff fc 00 00 00 00 00 00 00 00 00 00 00 00 00 13 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 c4 1c 4c 16 07 00 00 00 00 00 00 00 00 00 00 00 00 0f ff ff ff ff ff ff 01 ff fc 07 f8 0f ff ff c0 00 00 00 fe 01 ff ff f8 00 00 00 00 00 00 00 00 00 00 00 00 0c aa aa (PrintBitmapRow)
>> 55 55 84 03 00 cb 13 5f aa aa (PrintEmptyRow)
>> 55 55 85 36 00 de 00 0f 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1f e0 00 20 3f 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 83 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 df 00 07 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 00 00 20 21 80 00 10 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 f8 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e0 00 1d 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 0f 1e 70 20 9d bf 38 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 17 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e1 00 13 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 11 31 20 20 99 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 7b aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e2 00 12 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 10 b0 20 23 11 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 72 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e3 00 1b 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 3f 9e 20 3e 11 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 66 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e4 00 0f 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 10 03 20 20 11 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 d9 aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e5 00 0e 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 10 01 20 20 11 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 db aa aa (PrintBitmapRow)
>> 55 55 85 36 00 e6 00 14 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 19 33 30 20 11 b1 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 e9 aa aa (PrintBitmapRow)
>> 55 55 83 12 00 e7 00 06 00 01 00 ad 00 ae 00 b4 00 b5 00 bb 00 db 13 aa aa (PrintBitmapRowIndexed)
>> 55 55 84 03 00 e8 08 67 aa aa (PrintEmptyRow)
>> 55 55 e3 01 01 e3 aa aa (PageEnd)
<< 55 55 d3 03 00 ef 01 3e aa aa (In_PrinterCheckLine)
<< 55 55 e4 01 01 e4 aa aa (In_PageEnd)
Page 1/1, Page print 0%, Page feed 0%
>> 55 55 a3 01 01 a3 aa aa (PrintStatus)
<< 55 55 b3 0a 00 00 1e 00 03 02 00 01 00 00 a7 aa aa (In_PrintStatus)
Page 0/1, Page print 30%, Page feed 0%
>> 55 55 a3 01 01 a3 aa aa (PrintStatus)
<< 55 55 b3 0a 00 00 64 0d 03 1f 00 01 00 00 cd aa aa (In_PrintStatus)
Page 0/1, Page print 100%, Page feed 13%
>> 55 55 dc 01 01 dc aa aa (Heartbeat)
<< 55 55 dd 0d 1e 3c 00 5d 00 5d 00 00 49 00 02 00 01 b8 aa aa (In_HeartbeatAdvanced1)
>> 55 55 a3 01 01 a3 aa aa (PrintStatus)
<< 55 55 b3 0a 00 01 64 64 03 1f 00 00 00 00 a4 aa aa (In_PrintStatus)
Page 1/1, Page print 100%, Page feed 100%
>> 55 55 f3 01 01 f3 aa aa (PrintEnd)
<< 55 55 f4 01 01 f4 aa aa (In_PrintEnd)

✅ Print job completed successfully!
Disconnected
🔌 Disconnected from printer
