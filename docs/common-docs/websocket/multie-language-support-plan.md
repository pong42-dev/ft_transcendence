# Multi-Language Support Implementation Plan

## High-Level Strategy

The core idea is to externalize all user-facing strings into language-specific files (e.g., `en.json`, `ko.json`, `fr.json`) and load the appropriate translations based on user preference. This process is known as internationalization (i18n).

---

## Phase 1: Frontend Implementation (Client-Side)

The frontend will handle the bulk of the translation work. We will use the popular and lightweight `i18next` library to manage translations efficiently.

### Step-by-Step Plan:

1.  **Install i18n Libraries:**
    - Add `i18next` and `i18next-http-backend` to `frontend/package.json`.
    - The user will need to run `npm install` in the `frontend` directory.

2.  **Generate a List of All Client-Side Text:**
    - Before creating translation files, identify all user-facing text strings within the `frontend/src/` directory.
    - Create a comprehensive list, organized by file or module, detailing:
      - The file path.
      - The line number where the text is located.
      - The exact text content.
    - This list will serve as the basis for populating the `translation.json` files.

3.  **Create Translation Files:**
    - Create a new directory: `frontend/public/locales/`.
    - Inside, create subdirectories for each supported language (e.g., `en`, `ko`, `fr`).
    - Each directory will contain a `translation.json` file with key-value pairs.
      - **Example `en/translation.json`:**
        ```json
        {
          "welcome_message": "Welcome to PONG-CLI",
          "login_button": "Login"
        }
        ```
      - **Example `ko/translation.json`:**
        ```json
        {
          "welcome_message": "PONG-CLI에 오신 것을 환영합니다",
          "login_button": "로그인"
        }
        ```

4.  **Develop an i18n Service:**
    - Create a new file `frontend/src/services/i18n.ts`.
    - This service will initialize and configure `i18next` to:
        - Detect the user's language from `localStorage` or the browser's `navigator.language`.
        - Load the corresponding `translation.json` file.
        - Provide a simple `t(key)` function to retrieve translated strings.
        - Set a fallback language (e.g., English).

5.  **Integrate Translations into UI Components:**
    - Refactor all components in `frontend/src/components/` (e.g., `Terminal.ts`, `UserProfile.ts`, modals) to replace hardcoded text with calls to the `i18n.t('key')` function.

6.  **Implement a Language Switcher:**
    - Add a new command to `frontend/src/commands/CommandHandler.ts`, such as `lang <language_code>` (e.g., `lang ko`).
    - This command will change the active language, and `i18next` will automatically reload the UI with the new translations.

7.  **Handle Variable Entries:**
    - When integrating translations, dynamic strings (those with variables) will use `i18next`'s interpolation feature. Placeholders like `{{variableName}}` will be used in `translation.json` files, and dynamic values will be passed as an object to the `t()` function (e.g., `i18n.t('key', { variableName: 'value' })`).

---

## Phase 2: Backend Implementation (Server-Side)

For a complete experience, API responses (like error messages) should also be translated.

### Step-by-Step Plan:

1.  **Language Negotiation Middleware:**
    - Add a Fastify middleware to the backend to detect the user's preferred language from the `Accept-Language` header.
    - Attach the detected language to the `request` object.

2.  **Localize API Responses:**
    - Create a `backend/srcs/locales` directory with translation files, similar to the frontend.
    - Update API routes in `backend/srcs/routes/api/` to return translated messages based on the detected language.

This structured approach will result in a robust and easily maintainable multi-language system.
