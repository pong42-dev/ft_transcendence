# Frontend Internationalization (i18n) for Agents

## Core
- **Library**: `i18next`
- **Config**: `frontend/src/services/i18n.ts`
- **Init function**: `initI18n`
- **Translations**: `frontend/public/locales/{lang}/translation.json`
- **Usage**: `i18next.t('key.name')`

## Language Management
- **Switch command**: `lang <en|ko|ja>`
- **Handler**: `handleLangCommand` in `frontend/src/commands/CommandHandler.ts`
- **Change function**: `changeLanguage(lng: string)` in `frontend/src/services/i18n.ts`

## Adding a Translation Key
1. Add key-value pair to `translation.json` for all languages (`en`, `ko`, `ja`).
   - `frontend/public/locales/en/translation.json`
   - `frontend/public/locales/ko/translation.json`
   - `frontend/public/locales/ja/translation.json`
2. Use in code: `i18next.t('new.key')`.
3. Review the file again to ensure the changes are correct.

## Reviewing for Hardcoded Text
When files are given in the prompt, you must review them file by file to find any text strings that are not internationalized. All user-facing text should use `i18next.t('key.name')` instead of being hardcoded. This specifically applies to user-facing text, not internal messages like console logs. Do not make uninstructed changes.



