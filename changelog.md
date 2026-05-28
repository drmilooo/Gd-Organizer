# GD Organizer - Changelog (v1.2.0)
List of technical updates and optimizations made since v1.1.0.

### 🛡️ Core & Performance
- **Deep Sleep System:** Implemented a smart memory management system that unloads live wallpapers from RAM when the window is blurred or minimized. This reduced idle RAM usage from ~800MB to ~100MB.
- **WebM Transition:** Converted all background video assets from MP4 to WebM (VP9 codec). This significantly reduced the application size and improved video decoding efficiency.
- **Build Stabilization:** Refined the Go-to-Wails bridge to ensure more reliable launch commands and resource cleanup.

### ⚙️ Preset & Mod Management
- **Instant Sync:** Mod toggling inside a preset now renames files on disk immediately. You no longer need to start the game to apply preset changes.
- **Search-Index Fix:** Resolved a critical bug where toggling a mod while using the search bar would affect the wrong mod due to indexing errors.
- **New Mod Awareness:** Newly installed mods are now automatically detected and integrated into the active preset configuration.
- **Geode Interaction:** Improved the reliability of the Geode mod enable/disable mechanism by forcing file-system consistency checks before launch.

### 🌎 Localization & UX
- **Spanish LATAM Support:** Added a full translation for Spanish (es-419).
- **Terminology Update:** In the Spanish translation, "Instances" has been renamed to **"Profiles" (Perfiles)** for a more intuitive user experience.
- **Refined Branding:** Updated internal branding references to **GDOrganizer** for consistency across the website and application.
- **UI Bugfixes:** Fixed a legacy issue where theme classes (like `kocmoc` or `heliopolis`) would stack, causing visual glitches when switching themes rapidly.

### 🚀 GDO-Lite (New Standalone App)
- **Native Launcher:** Created a separate, ultra-lightweight WinForms application (`GDO-Lite.exe`) for users on extremely low-end hardware or legacy Windows versions (7/8/10). 
- **Zero-Web Dependency:** GDO-Lite uses 100% native Windows controls, offering the fastest possible launch times without a web runtime.

---

### Previous: GD Organizer - Changelog (v1.1.0)
- Migrated infrastructure to Vue 3 and Vite.
- Replaced PowerShell analysis with native Go code.
- Fixed white screen flicker on startup.
- Added GDPS URL binary scanning and auto-branding.
- Added "Close on Launch" feature.
- Redesigned settings and added English/Russian/Arabic support.
