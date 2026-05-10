# GD Organizer - Technical Documentation and User Manual

## Project Overview
GD Organizer is a lightweight launcher and mod management utility for Geometry Dash. Designed with modern software engineering principles, this application provides an optimized environment for managing multiple game instances and centralizing Geode-based mod lifecycles through a streamlined interface.

## Core Functionalities

### 1. Instance and Directory Management
The application allows users to register multiple Geometry Dash directories. Each registered instance is independently audited to verify the presence and integrity of the Geode loader.

### 2. Localization Architecture
The user interface is built upon a scalable localization framework. Regional JSON files located in the `locales/` directory (e.g., `en-EN.json`, `de-DE.json`) facilitate instantaneous language switching without necessitating a full application reload.

---

## Technical Mod Management

GD Organizer implements a dual-layer strategy for toggling mod states to ensure maximum compatibility and reliability:

### 1. Configuration Manipulation (`saved.json`)
The Geode Loader maintains the operational state of mods within its internal data files. The launcher analyzes and modifies the `saved.json` file across multiple potential save points:
- `%LOCALAPPDATA%/GeometryDash/geode/config/geode.loader/saved.json`
- Internal directory: `./geode/save/geode.loader/saved.json`

When a mod is disabled, the specific `should-load-[mod-id]` key within the JSON structure is set to `false`. This ensures the mod is ignored by the loader during the game's startup sequence.

### 2. File Isolation (Physical Displacement)
As an additional layer of security, the launcher physically renames disabled mod files (e.g., `mod_name.geode` -> `mod_name.geode.disabled`). This prevents the loader from identifying the file as a valid asset, further minimizing the risk of accidental loading.

---

## Software Architecture

- **Framework:** Electron (utilizing a clear separation between Main and Renderer processes for enhanced security and performance).
- **Communication:** Facilitated via IPC (Inter-Process Communication) for asynchronous data transfer between the core logic and the UI layer.
- **External Links:** For security compliance, all external URLs are handled by the system shell and opened in the user's default web browser.

---

## Development and Contributions
This project is maintained as a productivity tool for the Geometry Dash community.

**Developer:** drmilooo  
**GitHub:** [github.com/drmilooo](https://github.com/drmilooo)
