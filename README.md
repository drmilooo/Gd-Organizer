# GD Organizer - Changelog (v1.1.0)

List of technical updates and changes made to the GD Organizer project.

### Core Changes
- Migrated the project infrastructure from Vanilla JS to Vue 3 and Vite.
- Replaced PowerShell scripts used for game analysis and version detection with native Go (Golang) code.
- Fixed the white screen flicker that occurred during application startup.

### GDPS and Instance Management
- Implemented a system to detect GDPS (Private Servers) by scanning .exe binaries for server URLs.
- Added automatic downloading and displaying of GDPS logos directly from their server URLs.
- Integrated specific icons and status indicators to distinguish between GDPS, Vanilla, and Geode instances.
- Added an option to close the launcher upon game start, featuring a 3-second delay to allow the game window to initialize.

### UI and Localization
- Redesigned the settings page layout to match the mod list interface.
- Expanded language support (English, Russian, Arabic).
- Fixed button scaling and broken links in the Credits section.
- Improved the visual consistency of icons in the sidebar.

### Technical Stack
- Backend: Go / Wails
- Frontend: Vue 3 / Vite
- Supported Locales: en-EN, ru-RU, ar-EG
### Contact
If you find any bugs, you can contact me on Discord: [drmiloo](https://discord.com/users/drmiloo)
