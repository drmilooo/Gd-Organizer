# GD Organizer - Changelog (v1.2.0)
List of technical updates and optimizations made since v1.3.0.

### 🛡️ Core & Performance
- **Deep Sleep System:** Implemented a smart memory management system that unloads live wallpapers from RAM when the window is blurred or minimized.
- **Resource Optimization:** Optimized all WebM background videos from 1080p to 720p with VP9 extreme compression. Reduced video asset size from ~30MB to ~3MB per file.
- **Enhanced Loading:** Added a native loading screen with an opaque background, progress bar, and branding to ensure a smooth transition during start-up.
- **Build Stabilization:** Refined the Go-to-Wails bridge for more reliable launch commands and resource cleanup.

### ⚙️ Preset & Mod Management
- **Mod Icons:** Backend now extracts and serves mod icons (`logo.png`/`icon.png`) directly from `.geode` files for better visual identification.
- **View Modes:** Added a persistent toggle to switch between **List** and **Grid** views for the mod management section.
- **Mod Sorting:** Integrated a sorting system (Name, Enabled status, Version) for the installed mods list.
- **Update All:** Added a "Toplu Güncelleme" feature that detects and installs updates for all Geode mods simultaneously.
- **Instant Sync:** Mod toggling inside a preset now renames files on disk immediately.
- **Search-Index Fix:** Resolved indexing errors when using the search bar.

### 🌎 Localization & UX
- **Log Viewer:** Added an integrated Geode log viewer (`latest.log`) to debug crashes without leaving the app.
- **Spanish LATAM & Thai Support:** Added full translations for Spanish and Thai languages.
- **Terminology Update:** In Spanish, "Instances" is now **"Profiles" (Perfiles)**.
- **Refined Branding:** Updated internal branding references to **GDOrganizer**.
- **UI Bugfixes:** Fixed visual glitches when switching themes rapidly.

### 🚀 GDO-Lite (New Standalone App)
- **Native Launcher:** Created a separate, ultra-lightweight WinForms application (`GDO-Lite.exe`) for users on extremely low-end hardware or legacy Windows versions (7/8/10). 
- **Zero-Web Dependency:** GDO-Lite uses 100% native Windows controls, offering the fastest possible launch times without a web runtime.

---

### Previous: GD Organizer - Changelog (v1.3.0)
- Migrated infrastructure to Vue 3 and Vite.
- Replaced PowerShell analysis with native Go code.
- Fixed white screen flicker on startup.
- Added GDPS URL binary scanning and auto-branding.
- Added "Close on Launch" feature.
- Redesigned settings and added English/Russian/Arabic support.
