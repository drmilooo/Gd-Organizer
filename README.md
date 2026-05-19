# Readme

## Latest Stable: v1.0.0  

## Description
This app helps you to manage instances (like GDPS and Vanilla and Geode in same app) and set presets with user-friendly interface. Also you can download mods without even launching the game.

## Contributing a Translation

Want to see GDOrganizer in your language? You can add it yourself!

### How It Works?

All translations live inside `frontend/locales/`. Each language has its own `.json` file named with a locale code (e.g. `en-EN.json` for English, `ru-RU.json` for Russian). The English file is the base — every key in there is used somewhere in the app. You just need to copy it, translate the values, and submit it.

### Steps

1. **Fork the repository** on GitHub and clone it to your machine.

2. **Go to the `frontend/locales/` folder.** You'll see `en-EN.json` — that's your reference file.

3. **Copy `en-EN.json`** and rename it to match your language. Use the standard locale format:
   - `fr-FR.json` for French
   - `de-DE.json` for German
   - `ja-JP.json` for Japanese
   - `pt-BR.json` for Brazilian Portuguese
   -You can find the full list of locale codes on 
    (https://en.wikipedia.org/wiki/IETF_language_tag)

4. **Open your new file and translate every value.** Don't change the keys (the left side), only change the values (the right side). For example:
   ```json
   "play_now": "Launch"        ← keep the key
   "play_now": "Lancer"        ← translate the value
   ```

5. **Don't skip any keys.** If you leave a value empty, the app will show a blank string in that spot.

6. **Commit your file, push it to your fork, and open a Pull Request.** That's it.

### Things to Keep in Mind

- Keep the JSON format valid. If you're not sure, paste your file into [jsonlint.com](https://jsonlint.com) to check for syntax errors.
- Don't translate the keys, only the values.
- Some values have technical terms like "Geode" or "Geometry Dash" — leave those as-is.
- If a new version adds keys that your translation doesn't have yet, the app will fall back to showing the English text for those missing keys.
