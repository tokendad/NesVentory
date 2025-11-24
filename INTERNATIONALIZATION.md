# Internationalization (i18n) Support

NesVentory now supports international formats for monetary values and dates/times, making it accessible to users worldwide.

## Features

### 1. Automatic Locale Detection
- Automatically detects your browser's language and regional settings
- Uses this as the default for formatting dates and currency

### 2. Customizable Locale & Currency Settings
- Choose from 25+ supported locales
- Select from 20+ common currencies
- Settings are saved to your browser and persist across sessions

### 3. Consistent Formatting
All monetary values and dates throughout the application are formatted according to your preferences:
- **Currency**: Purchase prices, estimated values
- **Dates**: Purchase dates, warranty expiration dates, document upload dates

## How to Use

### Accessing Locale Settings

1. Log in to NesVentory
2. Click the globe icon (🌐) in the top-right header
3. The Locale & Currency Settings modal will appear

### Changing Your Settings

1. **Display Language & Format**: Select your preferred locale
   - This controls how dates and numbers are displayed
   - Example: `en-US` uses MM/DD/YYYY, while `en-GB` uses DD/MM/YYYY

2. **Currency**: Select your preferred currency
   - Controls the currency symbol and formatting for monetary values
   - Example: USD ($), EUR (€), GBP (£), JPY (¥)

3. **Preview**: See how your selections will look before saving
   - Preview shows current date and a sample currency value

4. **Save & Apply**: Click to save your preferences
   - The page will reload automatically to apply new formatting

### Resetting to Defaults

Click "Reset to Browser Default" to restore the locale and currency based on your browser's language settings.

## Supported Locales

NesVentory supports the following locales:

| Locale Code | Language & Region |
|------------|-------------------|
| en-US | English (United States) |
| en-GB | English (United Kingdom) |
| en-CA | English (Canada) |
| en-AU | English (Australia) |
| es-ES | Spanish (Spain) |
| es-MX | Spanish (Mexico) |
| fr-FR | French (France) |
| fr-CA | French (Canada) |
| de-DE | German (Germany) |
| it-IT | Italian (Italy) |
| pt-BR | Portuguese (Brazil) |
| pt-PT | Portuguese (Portugal) |
| ja-JP | Japanese (Japan) |
| zh-CN | Chinese (China) |
| zh-TW | Chinese (Taiwan) |
| ko-KR | Korean (South Korea) |
| ru-RU | Russian (Russia) |
| ar-SA | Arabic (Saudi Arabia) |
| hi-IN | Hindi (India) |
| sv-SE | Swedish (Sweden) |
| no-NO | Norwegian (Norway) |
| da-DK | Danish (Denmark) |
| nl-NL | Dutch (Netherlands) |
| pl-PL | Polish (Poland) |
| tr-TR | Turkish (Turkey) |

## Supported Currencies

NesVentory supports the following currencies:

| Currency Code | Currency Name & Symbol |
|--------------|----------------------|
| USD | US Dollar ($) |
| EUR | Euro (€) |
| GBP | British Pound (£) |
| JPY | Japanese Yen (¥) |
| CAD | Canadian Dollar (C$) |
| AUD | Australian Dollar (A$) |
| CHF | Swiss Franc (CHF) |
| CNY | Chinese Yuan (¥) |
| INR | Indian Rupee (₹) |
| MXN | Mexican Peso (MX$) |
| BRL | Brazilian Real (R$) |
| ZAR | South African Rand (R) |
| SEK | Swedish Krona (kr) |
| NOK | Norwegian Krone (kr) |
| DKK | Danish Krone (kr) |
| NZD | New Zealand Dollar (NZ$) |
| SGD | Singapore Dollar (S$) |
| HKD | Hong Kong Dollar (HK$) |
| KRW | South Korean Won (₩) |
| TRY | Turkish Lira (₺) |

## Examples

### Date Formatting Examples

With `en-US` locale:
- March 15, 2024 → **Mar 15, 2024**

With `en-GB` locale:
- 15 March 2024 → **15 Mar 2024**

With `fr-FR` locale:
- 15 mars 2024 → **15 mars 2024**

With `ja-JP` locale:
- 2024年3月15日 → **2024年3月15日**

### Currency Formatting Examples

Value: 1234.56

With `en-US` locale and `USD`:
- **$1,234.56**

With `en-GB` locale and `GBP`:
- **£1,234.56**

With `de-DE` locale and `EUR`:
- **1.234,56 €**

With `ja-JP` locale and `JPY`:
- **¥1,235** (no decimal places for JPY)

## Technical Details

### Implementation
- Uses the native JavaScript `Intl` API (no external dependencies)
- Formatting utilities located in `src/lib/utils.ts`
- Configuration management in `src/lib/locale.ts`
- Settings stored in browser's localStorage
- Supports all standard [ISO 4217 currency codes](https://www.iso.org/iso-4217-currency-codes.html)

### Data Storage
- Locale preferences are stored in localStorage with key: `NesVentory_locale_config`
- Format: `{ "locale": "en-US", "currency": "USD" }`

### Browser Compatibility
- Works in all modern browsers that support the `Intl` API
- IE 11 and older browsers may have limited formatting support

## FAQ

**Q: Will changing my locale affect other users?**
- No, locale settings are stored locally in your browser and only affect your view.

**Q: Can I use a currency different from my locale?**
- Yes! You can select any combination of locale and currency. For example, you can use `en-US` (American English formatting) with `EUR` (Euro currency).

**Q: What happens if I clear my browser data?**
- Your locale preferences are stored in localStorage, so clearing browser data will reset them to the browser's default locale and USD currency.

**Q: Do I need to refresh the page after changing settings?**
- Yes, the page automatically refreshes when you save new settings to ensure all formatting is updated consistently.

**Q: Can I add more locales or currencies?**
- The current implementation supports the most common locales and currencies. Additional ones can be added by modifying `src/lib/locale.ts`.

## Troubleshooting

**Problem**: Dates or currencies aren't displaying correctly
- **Solution**: Check your locale and currency settings by clicking the 🌐 icon
- Clear browser cache and reload the page
- Try resetting to browser defaults

**Problem**: Currency symbol is missing or incorrect
- **Solution**: Ensure you've selected the correct currency in settings
- Some currency codes may not display symbols in all locales (this is a browser limitation)

**Problem**: Settings aren't saving
- **Solution**: Ensure your browser allows localStorage
- Check browser console for errors
- Try a different browser

## Future Enhancements

Potential future improvements:
- Full UI translation (interface text in multiple languages)
- Time zone support for timestamps
- Additional currencies and locales
- Custom date format templates
- Number formatting customization (decimal separators, grouping)

## Support

For issues or questions about internationalization:
- Open an issue on GitHub: https://github.com/tokendad/NesVentory/issues
- Include your browser type and version
- Specify the locale and currency you're trying to use
