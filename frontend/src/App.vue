<script setup>
import { onMounted, watch } from 'vue';
import { store } from './store.js';
import Sidebar from './components/Sidebar.vue';
import * as App from '../wailsjs/go/main/App';
import * as runtime from '../wailsjs/runtime';

window.backend = {
  analyzeGame: (path) => App.AnalyzeGame(path),
  getMods: (path) => App.GetMods(path),
  toggleMod: (path, id, enabled, file) => App.ToggleMod(path, id, enabled, file),
  launchGame: async (path) => { await App.LaunchGame(path); return {success: true}; },
  openFolder: () => App.OpenFolder(),
  openFile: (filters) => App.OpenFile(filters),
  deleteMod: (path, file) => App.DeleteMod(path, file),
  installMod: (target, source) => App.InstallMod(target, source),
  getSingleModInfo: (path) => App.GetSingleModInfo(path),
  fetchModInfo: (id) => App.FetchModInfo(id),
  browseCatalog: (page, query, ver) => App.BrowseCatalog(page, query, ver),
  downloadCatalogMod: (p, url, id) => App.DownloadCatalogMod(p, url, id),
  saveData: (file, data) => App.SaveData(file, data),
  loadData: (file) => App.LoadData(file),
  bulkToggleMods: (path, ops) => App.BulkToggleMods(path, ops),
  closeApp: () => App.CloseApp(),
  minimizeApp: () => App.MinimizeApp(),
  openExternal: (url) => runtime.BrowserOpenURL(url)
};

window.customConfirm = (msg) => {
  const modal = document.getElementById('confirm-modal');
  const text = document.getElementById('confirm-msg');
  return new Promise((resolve) => {
    text.textContent = msg;
    modal.classList.add('active');
    document.getElementById('confirm-yes').onclick = () => { modal.classList.remove('active'); resolve(true); };
    document.getElementById('confirm-no').onclick = () => { modal.classList.remove('active'); resolve(false); };
  });
};

const handleAction = (action, arg1, arg2) => {
  if (window.__vueHandler) window.__vueHandler(action, arg1, arg2);
};

onMounted(() => {
  const addFolderBtn = document.getElementById('add-folder-btn');
  const folderListEl = document.getElementById('folder-list');
  const noSelectionScreen = document.getElementById('no-selection');
  const gameSelectionScreen = document.getElementById('game-selection');

  const playBtn = document.getElementById('play-btn');
  const gameTitleEl = document.getElementById('current-game-title');
  const gamePathEl = document.getElementById('current-game-path');

  const modalOverlay = document.getElementById('name-modal');
  const instanceNameInput = document.getElementById('instance-name');
  const cancelNameBtn = document.getElementById('cancel-name-btn');
  const saveNameBtn = document.getElementById('save-name-btn');

  const deleteBtn = document.getElementById('delete-instance-btn');
  const modsSection = document.getElementById('mods-section');
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });

  const modsListEl = document.getElementById('mods-list');
  const modCountEl = document.getElementById('mod-count');
  const depModal = document.getElementById('dependency-modal');
  const depListEl = document.getElementById('dependent-mods-list');
  const disableAllBtn = document.getElementById('disable-all-btn');
  const disableOnlyBtn = document.getElementById('disable-only-btn');
  const cancelDepBtn = document.getElementById('cancel-dep-btn');

  const presetModal = document.getElementById('preset-modal');
  const presetNameInput = document.getElementById('preset-name-input');
  const cancelPresetBtn = document.getElementById('cancel-preset-btn');
  const savePresetBtn = document.getElementById('save-preset-btn');

  const installPreviewModal = document.getElementById('install-preview-modal');
  const confirmInstallBtn = document.getElementById('confirm-install-btn');
  const cancelInstallBtn = document.getElementById('cancel-install-btn');
  const previewDesc = document.getElementById('preview-desc');
  const settingsView = document.getElementById('settings-view');
  const settingsNav = document.getElementById('settings-nav');
  const backHomeBtn = document.getElementById('back-home-btn');
  const previewName = document.getElementById('preview-name');
  const previewMeta = document.getElementById('preview-meta');
  const settingsBtn = document.getElementById('settings-btn');
  const folderListWrapper = document.getElementById('folder-list');
  const langSelect = document.querySelector('.settings-select');
  const themeCards = document.querySelectorAll('.theme-card');
  const accentBtns = document.querySelectorAll('.accent-color-btn');

  let folders = [];
  const defaultSettings = { "theme": "dark", "lang": "en-EN", "accent": "#0084cc", "accentRgb": "0, 132, 204", "closeOnLaunch": false, "uiScale": "1.0", "optimizeWallpaper": true, "modListView": "list", "sortBy": "name" };
  let currentSettings = { ...defaultSettings };
  let isInitializing = true;

  let currentSelectionId = null;
  let activePresetId = null;
  let pendingFolderPath = null;
  let currentMods = [];
  let pendingToggle = null;
  let pendingInstallPath = null;
  let modUpdates = {};
  let checkingUpdates = false;
  let pendingPresetFolder = null;
  let currentDict = {};
  let currentRenderId = 0;
  let currentSyncId = 0;
  
  // Wallpaper State (Deep Sleep)
  let savedTime = 0;
  let activeLiveTheme = null;

  // VUE STATE SYNC (Vanilla -> Vue Store)
  function syncState() {
    store.folders = folders;
    store.currentSettings = currentSettings;
    store.currentDict = currentDict;
    store.isInitializing = isInitializing;
    store.currentSelectionId = currentSelectionId;
    store.activePresetId = activePresetId;
    store.currentMods = currentMods;
    store.settingsMode = settingsView.classList.contains('active');
    
    const closeCheck = document.getElementById('close-on-launch-check');
    if (closeCheck) closeCheck.checked = !!currentSettings.closeOnLaunch;
  }
  
  // Expose methods for Vue Component events
  window.__vueHandler = async function(action, arg1, arg2) {
    if (action === 'addFolder') {
      if (store.isAddingFolder) return;
      store.isAddingFolder = true;
      const folderPath = await window.backend.openFolder();
      store.isAddingFolder = false;
      if (folderPath) {
        pendingFolderPath = folderPath;
        document.getElementById('instance-name').value = '';
        document.getElementById('name-modal').classList.add('active');
        document.getElementById('instance-name').focus();
      }
    }
    if (action === 'selectFolder') await selectFolder(arg1);
    if (action === 'openSettings') toggleSettingsMode(true);
    if (action === 'closeSettings') toggleSettingsMode(false);
    if (action === 'changeSettingsTab') {
      store.activeSettingsTab = arg1;
      document.querySelectorAll('.settings-tab-content').forEach(c => c.style.display = 'none');
      document.getElementById('tab-'+arg1).style.display = 'block';
    }
    if (action === 'addPreset') openPresetModal(arg1);
    if (action === 'selectPreset') selectPresetContext(arg1, arg2);
    if (action === 'applyPreset') await applyPresetSnapshot(arg1, arg2);
    if (action === 'deletePreset') await deletePresetSnapshot(arg1, arg2);
    
    syncState();
  };

  async function applyTheme(theme, shouldSave = true) {
    document.body.classList.remove('light', 'dark', 'midnight', 'black-hole', 'nullscapes', 'kocmoc', 'heliopolis', 'geometry-dash');
    let target = theme.toLowerCase().replace(/\s+/g, '-');
    
    if (target === 'system') {
      target = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (['light', 'dark', 'midnight', 'black-hole', 'nullscapes', 'kocmoc', 'heliopolis', 'geometry-dash'].includes(target)) {
      document.body.classList.add(target);
    }
    
    if (target === 'custom') {
      const c = currentSettings.customTheme || {
        bgApp: "#1e1f22",
        bgSidebar: "#111214",
        textPrimary: "#dbdee1",
        textSecondary: "#949ba4",
        border: "rgba(255,255,255,0.05)"
      };
      document.documentElement.style.setProperty('--bg-app', c.bgApp);
      document.documentElement.style.setProperty('--bg-sidebar', c.bgSidebar);
      document.documentElement.style.setProperty('--text-primary', c.textPrimary);
      document.documentElement.style.setProperty('--text-secondary', c.textSecondary);
      document.documentElement.style.setProperty('--border', c.border);
      document.body.classList.add('dark'); // Use dark base for custom
    } else {
      // Reset to :root variables by removing override
      document.documentElement.style.removeProperty('--bg-app');
      document.documentElement.style.removeProperty('--bg-sidebar');
      document.documentElement.style.removeProperty('--text-primary');
      document.documentElement.style.removeProperty('--text-secondary');
      document.documentElement.style.removeProperty('--border');
    }

    // Dynamic RAM Optimization: Handle wallpaper existence
    await updateLiveWallpaper(target);

    if (shouldSave) {
      currentSettings.theme = theme;
      await saveSettings();
    }

    const grayBtn = document.getElementById('accent-gray-btn');
    const allAccentBtns = document.querySelectorAll('.accent-color-btn');
    
    if (target === 'kocmoc') {
      await applyAccentColor('#808080', '128, 128, 128', shouldSave);
      allAccentBtns.forEach(btn => {
        if (btn.id === 'accent-gray-btn') btn.style.display = 'block';
        else btn.style.display = 'none';
      });
    } else {
      allAccentBtns.forEach(btn => {
        if (btn.id === 'accent-gray-btn') btn.style.display = 'none';
        else btn.style.display = 'block';
      });
      if (currentSettings.accent === '#808080') {
        await applyAccentColor('#0084cc', '0, 132, 204', shouldSave);
      }
    }

    themeCards.forEach(card => {
      card.classList.remove('active');
      if (card.getAttribute('data-theme') === theme) card.classList.add('active');
    });
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  let accentSaveTimeout = null;
  function debouncedSaveAccent(hex, rgb) {
    if (accentSaveTimeout) clearTimeout(accentSaveTimeout);
    accentSaveTimeout = setTimeout(async () => {
      if (isInitializing) return;
      currentSettings.accent = hex;
      currentSettings.accentRgb = rgb;
      await saveSettings();
    }, 300);
  }

  async function applyAccentColor(hex, rgb, shouldSave = true) {
    // High performance UI update using requestAnimationFrame
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--accent', hex);
      document.documentElement.style.setProperty('--accent-rgb', rgb);
      document.documentElement.style.setProperty('--accent-hover', hex);
      
      const customPreview = document.getElementById('custom-accent-preview');
      const customPicker = document.getElementById('custom-accent-picker');
      if (customPicker && customPicker.value !== hex) customPicker.value = hex;
      if (customPreview) {
        customPreview.style.background = hex;
        customPreview.style.borderColor = 'rgba(255,255,255,0.4)';
      }
      
      accentBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-color') === hex) btn.classList.add('active');
      });

      const allBtns = document.querySelectorAll('.accent-color-btn');
      let isPreset = false;
      allBtns.forEach(btn => {
        if (btn.getAttribute('data-color') === hex && btn.id !== 'custom-accent-wrapper') isPreset = true;
      });

      if (customPreview) {
        if (isPreset) {
          customPreview.style.background = 'transparent';
          customPreview.style.borderColor = 'rgba(255,255,255,0.1)';
          customPreview.classList.remove('active');
        } else {
          customPreview.classList.add('active');
        }
      }
    });

    if (shouldSave) {
      // Debounce disk I/O to prevent lag
      debouncedSaveAccent(hex, rgb);
    }
  }

  async function applyUIScale(scale, shouldSave = true) {
    // Current logic: window resize instead of zoom
    let w = 1000;
    let h = 700;
    
    if (scale === "0.85") { w = 850; h = 600; }
    else if (scale === "1.0") { w = 1000; h = 700; }
    else if (scale === "1.15") { w = 1200; h = 840; }

    if (runtime && runtime.WindowSetSize) {
      runtime.WindowSetSize(w, h);
      // Small delay to ensure resize completes, then force wake just in case blur/visibility triggered
      setTimeout(() => {
        handleWake();
      }, 100);
    }
    
    // Ensure root scale variable is still set if any CSS uses it
    document.documentElement.style.setProperty('--ui-scale', scale);

    if (shouldSave) {
      currentSettings.uiScale = scale;
      await saveSettings();
    }

    document.querySelectorAll('.ui-scale-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-scale') === String(scale)) btn.classList.add('active');
    });
  }

  function updateLiveWallpaper(target) {
    return new Promise((resolve) => {
      const container = document.getElementById('theme-bg-container');
      if (!container) { resolve(); return; }

      // Clear background thoroughly to release RAM/CPU
      const oldVideo = container.querySelector('video');
      if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = "";
        oldVideo.load();
        oldVideo.remove();
      }
      container.innerHTML = '';

      const liveThemes = {
        'black-hole': { src: '/bhppr.webm', class: 'black-hole-bg' },
        'nullscapes': { src: '/nullscapes.webm', class: 'nullscapes-bg', rate: 0.7 },
        'kocmoc': { src: '/kocmoc.webm', class: 'kocmoc-bg' },
        'heliopolis': { src: '/heliopolis.webm', class: 'heliopolis-bg', start: 8, loopReset: 20 }
      };

      const config = liveThemes[target];
      if (config) {
        const video = document.createElement('video');
        video.className = `theme-bg-video ${config.class}`;
        video.muted = true;
        video.loop = !config.loopReset;
        video.playsInline = true;
        video.style.display = 'block';
        
        const source = document.createElement('source');
        source.src = config.src;
        source.type = config.src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
        video.appendChild(source);

        if (config.rate) video.playbackRate = config.rate;
        if (config.start) video.onloadedmetadata = () => { video.currentTime = config.start; };

        // Signal ready
        video.oncanplaythrough = () => {
          resolve();
        };
        // Failsafe for slow connections/errors
        setTimeout(resolve, 4000);

        if (config.loopReset) {
          video.ontimeupdate = () => {
            if (video.currentTime >= config.loopReset) video.currentTime = config.start || 0;
          };
        }

        container.appendChild(video);
        video.play().catch(e => {
          console.log("Dynamic Video Error:", e);
          resolve();
        });
        
        activeLiveTheme = target;
      } else {
        activeLiveTheme = null;
        resolve();
      }
    });
  }

  async function saveSettings() {
    if (isInitializing) return;
    currentSettings.lastInstanceId = currentSelectionId;
    currentSettings.lastPresetId = activePresetId;
    await window.backend.saveData('settings.json', JSON.stringify(currentSettings));
  }

  async function applyLanguage(code) {
    try {
      const response = await fetch(`./locales/${code}.json`);
      if (!response.ok) throw new Error("File not found");
      const dict = await response.json();
      currentDict = dict;

      const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setElementText('sidebar-logo', dict.sidebar_logo);
      const addBtn = document.getElementById('add-folder-btn');
      if (addBtn) addBtn.title = dict.add_instance_tip;

      setElementText('nav-general', dict.settings_nav_general || "General");
      setElementText('nav-appearance', dict.settings_nav_appearance || "Appearance");
      setElementText('nav-about', dict.settings_nav_about || "About");
      setElementText('back-home-text', dict.back_to_instances);
      setElementText('settings-text', dict.settings);
      setElementText('settings-view-title', dict.settings_title);
      setElementText('settings-view-desc', dict.settings_desc);
      setElementText('label-lang', dict.language);
      setElementText('label-theme', dict.theme_preference);
      setElementText('credits-btn', dict.credits_btn || "Credits");
      
      setElementText('credits-modal-title', dict.credits_modal_title);
      setElementText('credits-modal-desc', dict.credits_modal_desc);
      setElementText('credits-developer-label', dict.credits_developer);
      setElementText('credits-translations-label', dict.credits_translations);
      setElementText('credits-thanks-label', dict.credits_special_thanks);
      setElementText('credits-powered-label', dict.credits_powered_by);
      setElementText('close-credits-btn', dict.credits_close);
      
      setElementText('label-live-theme', dict.live_theme_preference || "Live Themes");
      setElementText('label-accent', dict.accent_color);

      setElementText('theme-dark-btn', dict.theme_dark);
      setElementText('theme-light-btn', dict.theme_light);
      setElementText('theme-system-btn', dict.theme_system || "System");
      setElementText('theme-black-hole-btn', dict.theme_black_hole || "Black Hole");
      setElementText('theme-nullscapes-btn', dict.theme_nullscapes || "Nullscapes");
      setElementText('theme-kocmoc-btn', dict.theme_kocmoc || "Kocmoc");

      setElementText('no-selection-title', dict.select_instance_title);
      setElementText('no-selection-desc', dict.select_instance_desc);
      setElementText('play-btn-text', dict.play_now);

      const addM = document.getElementById('add-mod-file-btn');
      const delI = document.getElementById('delete-instance-btn');
      if (addM) addM.title = dict.add_mod_tooltip;
      if (delI) delI.title = dict.delete_instance_tooltip;

      setElementText('mods-header-title', dict.installed_mods);
      setElementText('mods-found-text', dict.mods_found);

      setElementText('instance-modal-title', dict.instance_modal_title);
      setElementText('instance-modal-desc', dict.instance_modal_desc);
      const instanceInput = document.getElementById('instance-name');
      if (instanceInput) instanceInput.placeholder = dict.instance_input_placeholder;
      setElementText('save-name-btn', dict.instance_add_btn);
      setElementText('cancel-name-btn', dict.instance_cancel_btn);

      setElementText('preset-modal-title', dict.preset_modal_title);
      setElementText('preset-modal-desc', dict.preset_modal_desc);
      const presetInput = document.getElementById('preset-name-input');
      if (presetInput) presetInput.placeholder = dict.preset_input_placeholder;
      setElementText('save-preset-btn', dict.preset_add_btn);
      setElementText('cancel-preset-btn', dict.preset_cancel_btn);

      setElementText('about-title', dict.about_title || "GD Organizer");
      setElementText('about-desc', dict.about_text);
      setElementText('label-close-on-launch', dict.close_on_launch || "Close Launcher on Game Start");
      setElementText('label-ui-scale', dict.ui_scale || "UI Mode (Scaling)");
      setElementText('label-launcher-behavior', dict.launcher_behavior || "Launcher Behavior");
      setElementText('label-optimize-wallpaper', dict.optimize_wallpaper || "Optimize Wallpaper (Sleep Mode)");

      currentSettings.lang = code;
      if (!isInitializing) await saveSettings();
      if (langSelect) langSelect.value = code;
      if (sortSelect) sortSelect.value = currentSettings.sortBy || 'name';

      renderFolders();
      if (currentSelectionId) renderMods(currentMods);

    } catch (e) {
      console.error("Language load failed:", e);
    }
  }

  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.getAttribute('data-theme');
      if (themeId === 'custom' && currentSettings.theme === 'custom') {
        openThemeEditor();
      } else {
        applyTheme(themeId);
      }
    });
  });

  let originalCustomTheme = null;

  function openThemeEditor() {
    const modal = document.getElementById('theme-editor-modal');
    const c = currentSettings.customTheme || {
      bgApp: "#1e1f22",
      bgSidebar: "#111214",
      textPrimary: "#dbdee1",
      textSecondary: "#949ba4",
      border: "rgba(255,255,255,0.05)"
    };
    
    // Backup for cancel
    originalCustomTheme = { ...c };
    
    document.getElementById('edit-bg-app').value = c.bgApp;
    document.getElementById('edit-bg-sidebar').value = c.bgSidebar;
    document.getElementById('edit-text-primary').value = c.textPrimary;
    document.getElementById('edit-text-secondary').value = c.textSecondary;

    // Sync Mini Mockup initially
    const miniSidebar = document.getElementById('mini-sidebar');
    const miniContent = document.getElementById('mini-content');
    const miniTextP = document.getElementById('mini-text-p');
    const miniTextS = document.getElementById('mini-text-s');
    
    if (miniSidebar) miniSidebar.style.background = c.bgSidebar;
    if (miniContent) miniContent.style.background = c.bgApp;
    if (miniTextP) miniTextP.style.background = c.textPrimary;
    if (miniTextS) miniTextS.style.background = c.textSecondary;
    
    modal.classList.add('active');
  }

  const closeThemeEditorBtn = document.getElementById('close-theme-editor');
  if (closeThemeEditorBtn) {
    closeThemeEditorBtn.onclick = () => {
      document.getElementById('theme-editor-modal').classList.remove('active');
      // Revert if cancelled
      if (originalCustomTheme) {
        currentSettings.customTheme = originalCustomTheme;
        applyTheme('custom', false);
      }
    };
  }

  // Real-time preview listeners
  ['edit-bg-app', 'edit-bg-sidebar', 'edit-text-primary', 'edit-text-secondary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const c = {
          bgApp: document.getElementById('edit-bg-app').value,
          bgSidebar: document.getElementById('edit-bg-sidebar').value,
          textPrimary: document.getElementById('edit-text-primary').value,
          textSecondary: document.getElementById('edit-text-secondary').value,
          border: "rgba(255,255,255,0.05)" 
        };
        // Apply instantly to UI
        document.documentElement.style.setProperty('--bg-app', c.bgApp);
        document.documentElement.style.setProperty('--bg-sidebar', c.bgSidebar);
        document.documentElement.style.setProperty('--text-primary', c.textPrimary);
        document.documentElement.style.setProperty('--text-secondary', c.textSecondary);

        // Update Mini Mockup
        const miniSidebar = document.getElementById('mini-sidebar');
        const miniContent = document.getElementById('mini-content');
        const miniTextP = document.getElementById('mini-text-p');
        const miniTextS = document.getElementById('mini-text-s');
        
        if (miniSidebar) miniSidebar.style.background = c.bgSidebar;
        if (miniContent) miniContent.style.background = c.bgApp;
        if (miniTextP) miniTextP.style.background = c.textPrimary;
        if (miniTextS) miniTextS.style.background = c.textSecondary;
      });
    }
  });

  const saveCustomThemeBtn = document.getElementById('save-custom-theme');
  if (saveCustomThemeBtn) {
    saveCustomThemeBtn.onclick = async () => {
      const c = {
        bgApp: document.getElementById('edit-bg-app').value,
        bgSidebar: document.getElementById('edit-bg-sidebar').value,
        textPrimary: document.getElementById('edit-text-primary').value,
        textSecondary: document.getElementById('edit-text-secondary').value,
        border: "rgba(255,255,255,0.05)" 
      };
      currentSettings.customTheme = c;
      applyTheme('custom');
      document.getElementById('theme-editor-modal').classList.remove('active');
    };
  }

  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-color');
      if (!hex) return;
      const rgb = btn.getAttribute('data-rgb');
      applyAccentColor(hex, rgb);
    });
  });

  const customAccentPicker = document.getElementById('custom-accent-picker');
  if (customAccentPicker) {
    customAccentPicker.addEventListener('input', (e) => {
      const hex = e.target.value;
      const rgb = hexToRgb(hex);
      // Real-time UI update, debounced save
      applyAccentColor(hex, rgb, true);
    });
    
    // Explicit save on change (user finished picking)
    customAccentPicker.addEventListener('change', async (e) => {
      const hex = e.target.value;
      const rgb = hexToRgb(hex);
      currentSettings.accent = hex;
      currentSettings.accentRgb = rgb;
      await saveSettings();
    });
  }

  langSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  document.querySelectorAll('.ui-scale-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const scale = btn.getAttribute('data-scale');
      applyUIScale(scale);
    });
  });

  const closeOnLaunchCheck = document.getElementById('close-on-launch-check');
  closeOnLaunchCheck.addEventListener('change', (e) => {
    currentSettings.closeOnLaunch = e.target.checked;
    if (!isInitializing) saveSettings();
  });

  const optimizeWallpaperCheck = document.getElementById('optimize-wallpaper-check');
  optimizeWallpaperCheck.addEventListener('change', (e) => {
    currentSettings.optimizeWallpaper = e.target.checked;
    if (!isInitializing) saveSettings();
    if (!e.target.checked) handleWake(); // Force wake if disabled
  });

  applyTheme(currentSettings.theme || 'dark');
  applyAccentColor(currentSettings.accent || '#0084cc', currentSettings.accentRgb || '0, 132, 204');
  applyLanguage(currentSettings.lang || 'en-EN');
  
  // Initialize View Mode
  if (modsListEl) {
    modsListEl.classList.remove('view-list', 'view-grid');
    modsListEl.classList.add('view-' + (currentSettings.modListView || 'list'));
  }
  
  const toggleViewBtn = document.getElementById('toggle-view-btn');
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener('click', () => {
      currentSettings.modListView = currentSettings.modListView === 'grid' ? 'list' : 'grid';
      saveSettings();
      if (modsListEl) {
        modsListEl.classList.remove('view-list', 'view-grid');
        modsListEl.classList.add('view-' + currentSettings.modListView);
      }
      renderMods(currentMods);
      updateViewToggleIcon();
    });
  }

  function updateViewToggleIcon() {
    const btn = document.getElementById('toggle-view-btn');
    if (!btn) return;
    const isGrid = currentSettings.modListView === 'grid';
    btn.innerHTML = isGrid 
      ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
      : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
  }
  updateViewToggleIcon();

  syncState();

  function toggleSettingsMode(active) {
    const backHomeBtn = document.getElementById('back-home-btn');
    if (active) {
      noSelectionScreen.classList.remove('active');
      gameSelectionScreen.classList.remove('active');
      settingsView.classList.add('active');

      folderListWrapper.style.display = 'none';
      settingsNav.style.display = 'flex';
      addFolderBtn.style.display = 'none';
      settingsBtn.style.display = 'none';
      backHomeBtn.style.display = 'flex';
    } else {
      settingsView.classList.remove('active');
      folderListWrapper.style.display = 'flex';
      settingsNav.style.display = 'none';
      addFolderBtn.style.display = 'flex';
      settingsBtn.style.display = 'flex';
      backHomeBtn.style.display = 'none';

      if (!currentSelectionId) {
        noSelectionScreen.classList.add('active');
      } else {
        gameSelectionScreen.classList.add('active');
      }
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => toggleSettingsMode(true));
  }
  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', () => toggleSettingsMode(false));
  }

  const creditsBtn = document.getElementById('credits-btn');
  const creditsModal = document.getElementById('credits-modal');
  const closeCreditsBtn = document.getElementById('close-credits-btn');

  if (creditsBtn) {
    creditsBtn.addEventListener('click', () => {
      creditsModal.classList.add('active');
    });
  }
  if (closeCreditsBtn) {
    closeCreditsBtn.addEventListener('click', () => {
      creditsModal.classList.remove('active');
    });
  }

  document.addEventListener('click', (e) => {
    const extLink = e.target.closest('.external-link');
    if (extLink) {
      e.preventDefault();
      const url = extLink.getAttribute('href');
      if (window.runtime && window.runtime.BrowserOpenURL) {
        window.runtime.BrowserOpenURL(url);
      } else {
        window.open(url, '_blank');
      }
    }
  });

  const modSearchInput = document.getElementById('mod-search');
  modSearchInput.addEventListener('input', () => {
    renderMods(currentMods);
  });

  const sortSelect = document.getElementById('sort-mods-select');
  sortSelect.addEventListener('change', (e) => {
    currentSettings.sortBy = e.target.value;
    saveSettings();
    renderMods(currentMods);
  });

  const viewLogsBtn = document.getElementById('view-logs-btn');
  const logModal = document.getElementById('log-modal');
  const logContent = document.getElementById('log-content');
  const closeLogsBtn = document.getElementById('close-logs-btn');
  const refreshLogsBtn = document.getElementById('refresh-logs-btn');

  async function loadLogs() {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    logContent.textContent = "Loading logs...";
    const logs = await window.backend.readLogs(selected.path);
    logContent.textContent = logs;
    // Scroll to bottom
    const modalBody = logModal.querySelector('.modal-body');
    setTimeout(() => { modalBody.scrollTop = modalBody.scrollHeight; }, 50);
  }

  viewLogsBtn.onclick = () => {
    logModal.classList.add('active');
    loadLogs();
  };
  closeLogsBtn.onclick = () => logModal.classList.remove('active');
  refreshLogsBtn.onclick = () => loadLogs();

  const updateAllBtn = document.getElementById('update-all-btn');
  updateAllBtn.onclick = async () => {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    const updates = currentMods.filter(m => {
      const vLatest = modUpdates[m.id];
      if (!vLatest) return false;
      return vLatest.replace(/^v+/i, '') !== String(m.version || '').replace(/^v+/i, '');
    });

    if (updates.length === 0) return;
    if (!await window.customConfirm(`Update ${updates.length} mods to their latest versions?`)) return;

    updateAllBtn.textContent = "UPDATING...";
    updateAllBtn.disabled = true;

    for (const mod of updates) {
      const info = await window.backend.fetchModInfo(mod.id);
      const downloadLink = info?.versions?.[0]?.download_link;
      if (downloadLink) {
        await window.backend.updateMod(selected.path, mod.id, downloadLink);
      }
    }

    updateAllBtn.textContent = "DONE!";
    setTimeout(() => {
      updateAllBtn.textContent = "UPDATE ALL";
      updateAllBtn.disabled = false;
      refreshMods();
    }, 2000);
  };

  // Removed legacy Vanilla JS click listener

  function updateLoading(pct, status) {
    const bar = document.getElementById('loading-bar');
    const statusEl = document.getElementById('loading-status');
    if (bar) bar.style.width = pct + '%';
    if (statusEl && status) statusEl.textContent = status;
  }

  async function initApp() {
    updateLoading(10, "Loading folders...");
    try {
      const rawFolders = await window.backend.loadData('folders.json');
      if (rawFolders) {
        folders = JSON.parse(rawFolders);
      } else {
        const localFolders = localStorage.getItem('gd-folders');
        if (localFolders) {
          folders = JSON.parse(localFolders);
          await saveFolders();
        }
      }

      updateLoading(30, "Loading configuration...");
      const rawSettings = await window.backend.loadData('settings.json');
      if (rawSettings) {
        try {
          const parsed = JSON.parse(rawSettings);
          currentSettings = { ...defaultSettings, ...parsed };
        } catch (e) {
          console.error("Settings JSON parse error:", e);
        }
      } else {
        const localSettings = localStorage.getItem('gd-settings');
        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings);
            currentSettings = { ...defaultSettings, ...parsed };
            await saveSettings();
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("Primary data load failed:", e);
    }

    updateLoading(50, "Applying theme...");
    // Set UI with final settings
    await applyTheme(currentSettings.theme || "dark", false);
    
    updateLoading(70, "Finalizing UI...");
    await applyAccentColor(currentSettings.accent || "#0084cc", currentSettings.accentRgb || "0, 132, 204", false);
    await applyUIScale(currentSettings.uiScale || "1.0", false);
    await applyLanguage(currentSettings.lang || "en-EN");
    
    closeOnLaunchCheck.checked = currentSettings.closeOnLaunch || false;
    optimizeWallpaperCheck.checked = currentSettings.optimizeWallpaper !== undefined ? currentSettings.optimizeWallpaper : true;

    updateLoading(90, "Syncing...");
    renderFolders();
    
    updateLoading(100, "Done!");
    // Smooth transition
    setTimeout(async () => {
      isInitializing = false;
      syncState();

      if (currentSettings.lastInstanceId) {
        const found = folders.find(f => f.id === currentSettings.lastInstanceId);
        if (found) {
          activePresetId = currentSettings.lastPresetId || null;
          await selectFolder(found.id, true);
        }
      }
    }, 700);
  }

  async function saveFolders() {
    if (isInitializing) return;
    await window.backend.saveData('folders.json', JSON.stringify(folders));
  }

  function renderFolders() {
    syncState();
  }

  async function selectPresetContext(folder, presetId) {
    activePresetId = presetId;
    saveSettings();
    
    if (activePresetId) {
      const preset = folder.presets.find(p => p.id === activePresetId);
      if (preset) {
        quickSyncPresetUI(preset);
        await syncDiskToPreset(folder, preset);
        return; // Skip full refresh
      }
    }
    
    renderFolders();
    refreshMods();
  }

  function quickSyncPresetUI(preset) {
    // 1. Update In-memory currentMods metadata immediately
    currentMods.forEach(m => {
      if (preset.mods[m.id] !== undefined) {
        m.enabled = (preset.mods[m.id] === true);
      }
    });

    // 2. Update Header Title
    const headerTitle = document.getElementById('mods-header-title');
    if (headerTitle) {
      headerTitle.textContent = (currentDict.editing_preset || "Editing Preset") + `: ${preset.name}`;
    }

    // 3. Update Checkboxes in current list
    const checkboxes = modsListEl.querySelectorAll('input[type="checkbox"][data-id]');
    checkboxes.forEach(cb => {
      const modId = cb.getAttribute('data-id');
      if (preset.mods[modId] !== undefined) {
        cb.checked = (preset.mods[modId] === true);
      }
    });

    // 4. Update Stats and trigger sidebar re-render for active state
    updateModStats(currentMods);
    renderFolders();
  }

  function openPresetModal(folder) {
    pendingPresetFolder = folder;
    presetNameInput.value = '';
    presetModal.classList.add('active');
    presetNameInput.focus();
  }

  cancelPresetBtn.onclick = () => {
    presetModal.classList.remove('active');
    pendingPresetFolder = null;
  };

  savePresetBtn.onclick = async () => {
    const name = presetNameInput.value.trim();
    if (!name || !pendingPresetFolder) return;

    try {
      const mods = await window.backend.getMods(pendingPresetFolder.path);
      const record = {};
      mods.forEach(m => {
        record[m.id] = (m.enabled === true);
      });

      if (!pendingPresetFolder.presets) pendingPresetFolder.presets = [];
      pendingPresetFolder.presets.push({
        id: Date.now().toString(),
        name: name,
        mods: record
      });

      saveFolders();
      renderFolders();
      presetModal.classList.remove('active');
      pendingPresetFolder = null;
    } catch (err) {
      alert('Failed to save preset: ' + err.message);
    }
  };

  async function applyPresetSnapshot(folder, idx) {
    const preset = folder.presets[idx];
    if (!preset) return;

    activePresetId = preset.id;
    saveSettings();
    
    await syncDiskToPreset(folder, preset);
    quickSyncPresetUI(preset);
    
    await window.backend.launchGame(folder.path);
  }

  async function syncDiskToPreset(folder, preset) {
    const syncId = ++currentSyncId;
    try {
      const modsOnDisk = await window.backend.getMods(folder.path);
      if (syncId !== currentSyncId) return; // Cancel if newer sync started

      const ops = [];
      for (const m of modsOnDisk) {
        if (preset.mods[m.id] !== undefined) {
          const targetStatus = (preset.mods[m.id] === true);
          if (m.enabled !== targetStatus) {
            ops.push({ file: m.file, enabled: targetStatus });
          }
        }
      }
      if (ops.length > 0) {
        await window.backend.bulkToggleMods(folder.path, ops);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  }

  async function deletePresetSnapshot(folder, idx) {
    if (!await window.customConfirm(currentDict.delete_preset_confirm || 'Delete this preset record?')) return;
    folder.presets.splice(idx, 1);
    saveFolders();
    renderFolders();
  }

  async function selectFolder(id, preservePreset = false) {
    if (!preservePreset && currentSelectionId !== id) activePresetId = null; 
    currentSelectionId = id;
    saveSettings();
    renderFolders();

    const selected = folders.find(f => f.id === id);
    if (selected) {
      noSelectionScreen.classList.remove('active');
      gameSelectionScreen.classList.add('active');
      gameTitleEl.textContent = selected.name;
      gamePathEl.textContent = selected.path;

      const versionEl = document.getElementById('current-game-version');
      const geodeIcon = document.getElementById('geode-icon');

      versionEl.textContent = "Analyzing...";
      geodeIcon.style.display = 'none';
      modsSection.style.display = 'none';
      modsListEl.innerHTML = '';

      const analysis = await window.backend.analyzeGame(selected.path);
      versionEl.textContent = analysis.version;

      const vanillaIcon = document.getElementById('geometry-icon');

      let needsSave = false;
      if (selected.hasGeode !== analysis.hasGeode) {
        selected.hasGeode = analysis.hasGeode;
        needsSave = true;
      }
      if (selected.version !== analysis.version) {
        selected.version = analysis.version;
        needsSave = true;
      }
      if (selected.customLogo !== analysis.customLogo) {
        selected.customLogo = analysis.customLogo;
        needsSave = true;
      }

      if (needsSave) {
        saveFolders();
        renderFolders();
      }

      const gdpsIcon = document.getElementById('gdps-icon');

      if (analysis.hasGeode && !analysis.isGDPS) {
        geodeIcon.style.display = 'flex';
        vanillaIcon.style.display = 'none';
        gdpsIcon.style.display = 'none';
        modsSection.style.display = 'block';
        const installBtn = document.getElementById('install-mod-btn');
        if (installBtn) installBtn.style.display = 'flex';

        modsListEl.innerHTML = `
          <div class="loading-mods-container" style="padding: 60px 0; text-align: center; width: 100%; grid-column: 1 / -1;">
            <div class="loading-spinner" style="margin: 0 auto 20px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.05); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div style="font-size: 16px; font-weight: 700; color: white; letter-spacing: -0.3px;">Loading mods...</div>
            <div id="render-status" style="font-size: 11px; color: var(--text-dim); margin-top: 8px;">Accessing instance directory and extracting metadata</div>
          </div>
        `;
        currentMods = await window.backend.getMods(selected.path);

        if (preservePreset && activePresetId) {
          const preset = selected.presets?.find(p => p.id === activePresetId);
          if (preset) await syncDiskToPreset(selected, preset);
        }

        renderMods(currentMods);
      } else {
        geodeIcon.style.display = 'none';
        if (analysis.isGDPS) {
          gdpsIcon.style.display = 'flex';
          const img = gdpsIcon.querySelector('img');
          if (img) img.src = analysis.customLogo || '/gdpslogo.png';
          vanillaIcon.style.display = 'none';
        } else {
          gdpsIcon.style.display = 'none';
          vanillaIcon.style.display = 'flex';
        }
        modsSection.style.display = analysis.hasGeode ? 'block' : 'none';
        const installBtn = document.getElementById('install-mod-btn');
        if (installBtn) installBtn.style.display = 'none';
        currentMods = [];
        renderMods([]);
      }
    }
  }

  async function refreshMods() {
    if (currentSelectionId) {
      const selected = folders.find(f => f.id === currentSelectionId);
      if (selected) {
        currentMods = await window.backend.getMods(selected.path);
        renderMods(currentMods);

      }
    }
  }

  async function checkUpdatesIndividually() {
    if (checkingUpdates || currentMods.length === 0) return;
    checkingUpdates = true;

    modUpdates = {};
    updateModStats(currentMods, 'checking', 0, currentMods.length);

    let count = 0;
    for (const mod of currentMods) {
      const info = await window.backend.fetchModInfo(mod.id);
      if (info) {
        modUpdates[mod.id] = info.versions?.[0]?.version || null;
      }
      count++;
      updateModStats(currentMods, 'checking', count, currentMods.length);
      renderMods(currentMods);
    }
    checkingUpdates = false;
  }

  function updateModStats(modsList, status = 'idle', current = 0, total = 0) {
    const statsEl = document.getElementById('mod-stats');
    if (!statsEl) return;

    if (status === 'checking') {
      statsEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dim); font-weight: 500;">
          <div class="status-dot" style="background: var(--accent); animation: pulse 1.5s infinite;"></div>
          <span>${currentDict.checking || 'Checking'} (${current}/${total})...</span>
        </div>
      `;
      return;
    }

    const currentFolder = folders.find(f => f.id === currentSelectionId);
    const preset = (currentFolder && activePresetId) ? currentFolder.presets.find(p => p.id === activePresetId) : null;
    const enabledCount = (modsList || []).filter(m => {
      return preset ? (preset.mods[m.id] === true) : m.enabled;
    }).length;

    const modsFoundText = currentDict.mods_found || "mods found";
    const modActiveText = currentDict.mod_active || "active";

    statsEl.innerHTML = `
      <div style="display: flex; items-center; gap: 12px; font-size: 11px; font-weight: 500; color: var(--text-dim);">
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--text-secondary);">${(modsList || []).length}</span>
          <span>${modsFoundText}</span>
        </div>
        <div style="width: 1px; height: 10px; background: var(--border);"></div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--accent);">${enabledCount}</span>
          <span>${modActiveText}</span>
          ${preset ? `<span style="opacity: 0.6; font-size: 10px;">(${preset.name})</span>` : ''}
        </div>
      </div>
    `;
  }

  function renderMods(mods) {
    const folder = folders.find(f => f.id === currentSelectionId);
    if (!folder) return;

    const searchTermEl = document.getElementById('mod-search');
    const searchTerm = searchTermEl ? searchTermEl.value.toLowerCase() : '';

    let modsToRender = mods.filter(m => 
      m.name.toLowerCase().includes(searchTerm) || 
      m.id.toLowerCase().includes(searchTerm)
    );

    const sortBy = currentSettings.sortBy || 'name';
    modsToRender.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'version') return b.version.localeCompare(a.version);
      if (sortBy === 'enabled') {
        const aE = folder.presets && activePresetId ? (folder.presets.find(p => p.id === activePresetId)?.mods[a.id] ?? a.enabled) : a.enabled;
        const bE = folder.presets && activePresetId ? (folder.presets.find(p => p.id === activePresetId)?.mods[b.id] ?? b.enabled) : b.enabled;
        return (bE === aE) ? a.name.localeCompare(b.name) : (bE ? 1 : -1);
      }
      return 0;
    });

    modsListEl.innerHTML = '';
    const isGrid = currentSettings.modListView === 'grid';
    
    // Progressive Rendering Logic
    const renderId = ++currentRenderId;
    
    let preset = null;
    if (activePresetId) {
      preset = folder.presets.find(p => p.id === activePresetId);
    }

    const headerTitle = document.getElementById('mods-header-title');
    if (headerTitle) {
      const modeText = preset
        ? (currentDict.editing_preset || "Editing Preset") + `: ${preset.name}`
        : (currentDict.installed_mods || "Installed Mods");
      headerTitle.textContent = modeText;
    }

    // Process mods: First 10 instantly for responsiveness, then stagger
    let renderedCount = 0;
    const totalToRender = modsToRender.length;
    
    if (totalToRender === 0) {
      modsListEl.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-dim); font-size: 13px; grid-column: 1/-1;">No mods installed in this instance.</div>`;
      updateModStats(mods);
      return;
    }

    modsToRender.forEach((mod, index) => {
      const delay = index < 10 ? 0 : Math.min((index - 10) * 20, 400);
      
      setTimeout(() => {
        if (renderId !== currentRenderId) return;
        
        // Update loading status if still showing placeholder
        const statusEl = document.getElementById('render-status');
        if (statusEl) {
          statusEl.textContent = `Rendering mod ${renderedCount + 1} of ${totalToRender}...`;
        }
        
        // Remove loading placeholder on first mod
        if (renderedCount === 0) modsListEl.innerHTML = '';
        renderedCount++;
        
        try {
          const isEnabled = preset ? (preset.mods[mod.id] !== undefined ? preset.mods[mod.id] : mod.enabled) : mod.enabled;
          const isChecked = isEnabled ? 'checked' : '';

          const card = document.createElement('div');
          card.className = isGrid ? 'mod-card mod-card-grid' : 'mod-card';
          card.style.animationDelay = `${Math.min(index * 30, 600)}ms`;

          const latestVersion = modUpdates[mod.id];
          let updateAvailable = false;
          if (latestVersion) {
            const vLocal = String(mod.version || '').replace(/^v+/i, '').trim();
            const vLatest = String(latestVersion || '').replace(/^v+/i, '').trim();
            if (vLatest && vLocal && vLatest !== vLocal) {
              updateAvailable = true;
            }
          }

          card.innerHTML = `
            <div class="mod-info-box">
              <div class="mod-icon-wrapper">
                <img src="${mod.icon || '/geodelogo.png'}" class="mod-card-icon" onerror="this.src='/geodelogo.png'">
              </div>
              <div class="mod-meta-details">
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span class="mod-name" title="${mod.name}">${mod.name}</span>
                  <span style="font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500;">${String(mod.version || '0.0.0').replace(/^v+/i, '')}</span>
                </div>
                <div class="mod-info-btn" data-desc="${mod.description || 'No description provided.'}">i</div>
                ${updateAvailable ? `<span class="update-badge" title="Latest: ${latestVersion}">Update Available</span>` : ''}
              </div>
            </div>

            <div class="mod-actions-box">
              <button class="mod-delete-btn" title="Delete Mod File">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <label class="switch">
                <input type="checkbox" ${isChecked} data-id="${mod.id}">
                <span class="slider"></span>
              </label>
            </div>
          `;

          // Action Bindings
          const deleteBtn = card.querySelector('.mod-delete-btn');
          deleteBtn.onclick = async () => {
            if (await window.customConfirm(currentDict.delete_mod_confirm || `Are you sure you want to delete "${mod.name}" mod file permanently?`)) {
              const res = await window.backend.deleteMod(folder.path, mod.file);
              if (res.success) refreshMods();
              else alert("Error deleting mod: " + res.error);
            }
          };

          const checkbox = card.querySelector('input[type="checkbox"]');
          checkbox.onchange = async (e) => {
            const enabled = e.target.checked;
            const modId = e.target.getAttribute('data-id');
            
            if (!enabled) {
              const dependents = currentMods.filter(m => {
                const mEnabled = preset ? (preset.mods[m.id] !== undefined ? preset.mods[m.id] : m.enabled) : m.enabled;
                if (!mEnabled || !m.dependencies) return false;
                return m.dependencies.some(d => String(d).toLowerCase() === modId.toLowerCase());
              });

              if (dependents.length > 0) {
                e.preventDefault();
                e.target.checked = true;
                showDependencyWarning(mod, dependents);
                return;
              }
            }
            performToggle(modId, enabled, card);
          };

          const infoBtn = card.querySelector('.mod-info-btn');
          infoBtn.onclick = () => {
            document.getElementById('desc-modal-title').textContent = mod.name;
            document.getElementById('desc-modal-body').textContent = mod.description || 'No description provided.';
            document.getElementById('desc-modal').classList.add('active');
          };

          modsListEl.appendChild(card);
        } catch (err) {
          console.error("Error rendering mod card:", err);
        }
      }, 0); // We use 0ms or very small delay to keep it responsive but sequential
    });

    updateModStats(mods);
    
    // Check if any updates exist to show/hide "Update All" button
    const anyUpdates = modsToRender.some(m => {
      const vLatest = modUpdates[m.id];
      if (!vLatest) return false;
      return vLatest.replace(/^v+/i, '') !== String(m.version || '').replace(/^v+/i, '');
    });
    if (updateAllBtn) updateAllBtn.style.display = anyUpdates ? 'block' : 'none';
  }

  // Removed redundant updateModStats definition


  document.addEventListener('click', async (e) => {
    const installBtn = e.target.closest('#install-mod-btn');
    if (installBtn) {
      if (!currentSelectionId) return;
      const selected = folders.find(f => f.id === currentSelectionId);
      const filePath = await window.backend.openFile([{ name: 'Geode Mod', extensions: ['geode'] }]);
      if (filePath) {
        const info = await window.backend.getSingleModInfo(filePath);
        if (info.id) {
          pendingInstallPath = filePath;
          previewName.textContent = info.name || info.id;
          previewMeta.textContent = `${info.version || 'v1.0.0'} by ${info.developer || 'Unknown'}`;
          previewDesc.textContent = info.description || 'No description provided for this mod.';
          document.getElementById('install-instance-target').textContent = `Target Instance: ${selected.name}`;

          const isInstalled = currentMods.some(m => m.id.toLowerCase() === info.id.toLowerCase());
          const warningContainer = document.getElementById('install-warning-container');

          if (isInstalled) {
            warningContainer.style.display = 'flex';
            confirmInstallBtn.style.display = 'none';
          } else {
            warningContainer.style.display = 'none';
            confirmInstallBtn.style.display = 'block';
          }

          installPreviewModal.classList.add('active');
        } else {
          alert("Invalid Geode mod file (mod.json not found or corrupted).");
        }
      }
    }
  });

  confirmInstallBtn.addEventListener('click', async () => {
    if (!pendingInstallPath || !currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);

    confirmInstallBtn.textContent = 'Adding...';
    const res = await window.backend.installMod(selected.path, pendingInstallPath);
    confirmInstallBtn.textContent = 'Add Mod';

    if (res.success) {
      installPreviewModal.classList.remove('active');
      
      // If we are in a preset, automatically enable this new mod in the preset data
      if (activePresetId) {
        const info = await window.backend.getSingleModInfo(pendingInstallPath);
        if (info && info.id) {
          const preset = selected.presets.find(p => p.id === activePresetId);
          if (preset) {
            preset.mods[info.id] = true;
            saveFolders();
          }
        }
      }

      pendingInstallPath = null;
      refreshMods();
    } else {
      alert("Error installing mod: " + res.error);
    }
  });

  cancelInstallBtn.addEventListener('click', () => {
    installPreviewModal.classList.remove('active');
    pendingInstallPath = null;
  });

  async function performToggle(modId, enabled, cardEl) {
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    if (activePresetId) {
      const preset = selected.presets.find(p => p.id === activePresetId);
      if (preset) {
        preset.mods[modId] = enabled;
        saveFolders();
        
        // Sync to disk instantly for a more reliable experience
        const localMod = currentMods.find(m => m.id === modId);
        await window.backend.toggleMod(selected.path, modId, enabled, localMod?.file);
        
        renderMods(currentMods);
      }
    } else {
      const localMod = currentMods.find(m => m.id === modId);
      if (localMod) {
        localMod.enabled = enabled;
        updateModStats(currentMods);
      }

      await window.backend.toggleMod(selected.path, modId, enabled, localMod?.file);
    }
  }

  function showDependencyWarning(mod, dependents) {
    pendingToggle = { mod, dependents };
    depListEl.innerHTML = '';
    
    dependents.forEach(d => {
      const item = document.createElement('div');
      item.className = 'mod-card';
      item.style.marginBottom = '8px';
      item.innerHTML = `<span class="mod-name">${d.name}</span>`;
      depListEl.appendChild(item);
    });

    depModal.classList.add('active');
  }

  disableAllBtn.addEventListener('click', async () => {
    if (!pendingToggle) return;
    const { mod, dependents } = pendingToggle;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    let preset = activePresetId ? selected.presets.find(p => p.id === activePresetId) : null;

    for (const d of dependents) {
      await window.backend.toggleMod(selected.path, d.id, false, d.file);
      if (preset) {
        preset.mods[d.id] = false;
      } else {
        d.enabled = false;
      }
    }

    await window.backend.toggleMod(selected.path, mod.id, false, mod.file);
    if (preset) {
      preset.mods[mod.id] = false;
      saveFolders();
    } else {
      mod.enabled = false;
    }

    depModal.classList.remove('active');
    pendingToggle = null;
    renderMods(currentMods);
  });

  disableOnlyBtn.addEventListener('click', async () => {
    if (!pendingToggle) return;
    const { mod } = pendingToggle;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    let preset = activePresetId ? selected.presets.find(p => p.id === activePresetId) : null;

    await window.backend.toggleMod(selected.path, mod.id, false, mod.file);
    if (preset) {
      preset.mods[mod.id] = false;
      saveFolders();
    } else {
      mod.enabled = false;
    }

    depModal.classList.remove('active');
    pendingToggle = null;
    renderMods(currentMods);
  });

  cancelDepBtn.addEventListener('click', () => {
    depModal.classList.remove('active');
    pendingToggle = null;
  });

  window.addEventListener('focus', () => {
    if (currentSelectionId) {
      const selected = folders.find(f => f.id === currentSelectionId);
      if (selected && selected.hasGeode && !selected.isGDPS) {
        window.backend.getMods(selected.path).then(renderMods);
      }
    }
  });

  // Removed redundant setInterval for mods polling to reduce flickering

  deleteBtn.addEventListener('click', async () => {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    if (await window.customConfirm(currentDict.delete_instance_confirm || `Are you sure you want to remove "${selected.name}"? This won't delete the actual files.`)) {
      folders = folders.filter(f => f.id !== currentSelectionId);
      saveFolders();
      currentSelectionId = null;
      renderFolders();
      noSelectionScreen.classList.add('active');
      gameSelectionScreen.classList.remove('active');
    }
  });

  // addFolderBtn listener removed to prevent double-firing with Vue Sidebar


  cancelNameBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    pendingFolderPath = null;
  });

  saveNameBtn.onclick = async () => {
    if (isInitializing) return;
    const name = instanceNameInput.value.trim() || 'Untitled Instance';
    if (pendingFolderPath) {
      if (folders.some(f => f.path === pendingFolderPath)) {
        alert("This folder is already in your list!");
        modalOverlay.classList.remove('active');
        pendingFolderPath = null;
        return;
      }

      const analysis = await window.backend.analyzeGame(pendingFolderPath);

      if (analysis.version === "Not Found") {
        alert(currentDict.invalid_folder_err || "GeometryDash.exe not found in this folder!");
        return;
      }

      const newFolder = {
        id: Date.now().toString(),
        name,
        path: pendingFolderPath,
        hasGeode: analysis.hasGeode,
        version: analysis.version,
        isGDPS: analysis.isGDPS,
        exeName: analysis.exeName,
        customLogo: analysis.customLogo
      };
      folders.push(newFolder);
      saveFolders();
      selectFolder(newFolder.id);
      modalOverlay.classList.remove('active');
      pendingFolderPath = null;
    }
  };

  playBtn.addEventListener('click', async () => {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    if (activePresetId) {
      const preset = selected.presets.find(p => p.id === activePresetId);
      if (preset) {
        playBtn.querySelector('span').textContent = currentDict.syncing || 'Syncing...';
        await syncDiskToPreset(selected, preset);
      }
    }

    playBtn.style.opacity = '0.7';
    playBtn.querySelector('span').textContent = currentDict.launching || 'Launching...';

    const result = await window.backend.launchGame(selected.path, selected.exeName || "");


    setTimeout(() => {
      playBtn.style.opacity = '1';
      playBtn.innerHTML = `<span>${currentDict.play_now || 'Play Now'}</span>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`;
    }, 1500);

    if (!result.success) {
      alert('Error launching game: ' + result.error);
    } else {
      if (currentSettings.closeOnLaunch) {
        setTimeout(() => {
          window.backend.closeApp();
        }, 3000);
      }
    }
  });

  document.getElementById('min-btn').addEventListener('click', () => {
    window.backend.minimizeApp();
  });
  document.getElementById('close-btn').addEventListener('click', () => {
    window.backend.closeApp();
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href.startsWith('http')) {
      e.preventDefault();
      window.backend.openExternal(link.href);
    }
  });

  const catalogModal = document.getElementById('catalog-modal');
  const catalogList = document.getElementById('catalog-list');
  const catalogSearch = document.getElementById('catalog-search');
  const catalogStatus = document.getElementById('catalog-status');
  const catalogTarget = document.getElementById('catalog-target');
  const catalogPageInfo = document.getElementById('catalog-page-info');
  const catalogPrev = document.getElementById('catalog-prev');
  const catalogNext = document.getElementById('catalog-next');
  const closeCatalogBtn = document.getElementById('close-catalog-btn');

  const detailModal = document.getElementById('catalog-detail-modal');
  const detailName = document.getElementById('detail-mod-name');
  const detailMeta = document.getElementById('detail-mod-meta');
  const detailDesc = document.getElementById('detail-mod-desc');
  const detailBadge = document.getElementById('detail-featured-badge');
  const detailTarget = document.getElementById('detail-install-target');
  const detailInstallBtn = document.getElementById('detail-install-btn');
  const detailCloseBtn = document.getElementById('detail-close-btn');

  let catalogPage = 1;
  let catalogQuery = '';
  let catalogTotal = 0;
  let catalogDebounce = null;
  let catalogModsCache = [];
  let selectedCatalogMod = null;

  function formatDownloads(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function getSelectedInstanceName() {
    const selected = folders.find(f => f.id === currentSelectionId);
    return selected ? selected.name : '—';
  }

  async function loadCatalog() {
    catalogList.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-dim); font-size: 13px;">Loading...</div>';
    catalogTarget.textContent = `Installing to: ${getSelectedInstanceName()}`;

    const selected = folders.find(f => f.id === currentSelectionId);
    const result = await window.backend.browseCatalog(catalogPage, catalogQuery, selected ? selected.version : "");
    catalogTotal = result.total;
    catalogModsCache = result.mods;
    const totalPages = Math.ceil(catalogTotal / 15) || 1;
    catalogPageInfo.textContent = `${catalogPage} / ${totalPages}`;
    catalogStatus.textContent = `${catalogTotal} mods available`;
    catalogPrev.disabled = catalogPage <= 1;
    catalogNext.disabled = catalogPage >= totalPages;

    if (result.mods.length === 0) {
      catalogList.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-dim); font-size: 13px;">No mods found.</div>';
      return;
    }

    catalogList.innerHTML = '';
    result.mods.forEach((mod, idx) => {
      const isInstalled = currentMods.some(m => m.id.toLowerCase() === mod.id.toLowerCase());
      const card = document.createElement('div');
      card.className = 'mod-card';
      card.style.cursor = 'pointer';
      card.setAttribute('data-catalog-idx', idx);
      card.innerHTML = `
        <div class="mod-info-box" style="flex: 1; min-width: 0;">
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="mod-name">${mod.name}</span>
              ${mod.featured ? '<span style="background: #f59e0b; color: #000; font-size: 8px; padding: 1px 5px; border-radius: 3px; font-weight: 600;">★</span>' : ''}
              ${isInstalled ? '<span style="background: rgba(59,165,93,0.2); color: #3ba55d; font-size: 8px; padding: 1px 5px; border-radius: 3px; font-weight: 600;">Installed</span>' : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
              ${mod.developer} · v${mod.version} · ${formatDownloads(mod.downloads)} downloads
            </div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-dim)" stroke-width="2" style="flex-shrink: 0;">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      `;
      catalogList.appendChild(card);
    });
  }

  function openModDetail(mod) {
    selectedCatalogMod = mod;
    const isInstalled = currentMods.some(m => m.id.toLowerCase() === mod.id.toLowerCase());

    detailName.textContent = mod.name;
    detailMeta.textContent = `${mod.developer} · v${mod.version} · ${formatDownloads(mod.downloads)} downloads`;
    detailDesc.textContent = mod.description || 'No description provided.';
    detailBadge.style.display = mod.featured ? 'inline' : 'none';
    detailTarget.textContent = `Will install to: ${getSelectedInstanceName()}`;

    document.getElementById('detail-progress-wrap').style.display = 'none';
    document.getElementById('detail-progress-bar').style.width = '0%';
    document.getElementById('detail-progress-pct').textContent = '0%';

    if (isInstalled) {
      detailInstallBtn.textContent = 'Already Installed';
      detailInstallBtn.style.opacity = '0.4';
      detailInstallBtn.style.pointerEvents = 'none';
    } else {
      detailInstallBtn.textContent = `Install to ${getSelectedInstanceName()}`;
      detailInstallBtn.style.opacity = '1';
      detailInstallBtn.style.pointerEvents = 'auto';
    }

    detailModal.classList.add('active');
  }

  document.addEventListener('click', async (e) => {
    const catBtn = e.target.closest('#geode-catalog-btn');
    if (catBtn) {
      catalogPage = 1;
      catalogQuery = '';
      catalogSearch.value = '';
      catalogModal.classList.add('active');
      loadCatalog();
    }

    const catalogCard = e.target.closest('[data-catalog-idx]');
    if (catalogCard) {
      const idx = parseInt(catalogCard.getAttribute('data-catalog-idx'));
      if (catalogModsCache[idx]) openModDetail(catalogModsCache[idx]);
    }

    const closeBtn = e.target.closest('#close-catalog-btn');
    if (closeBtn) {
      catalogModal.classList.remove('active');
    }
  });

  /* window.backend.onDownloadProgress((pct) => {
    const bar = document.getElementById('detail-progress-bar');
    const pctEl = document.getElementById('detail-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }); */

  detailInstallBtn.addEventListener('click', async () => {
    if (!selectedCatalogMod || !currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    const progressWrap = document.getElementById('detail-progress-wrap');
    progressWrap.style.display = 'block';
    document.getElementById('detail-progress-bar').style.width = '0%';
    document.getElementById('detail-progress-pct').textContent = '0%';

    detailInstallBtn.textContent = 'Downloading...';
    detailInstallBtn.style.pointerEvents = 'none';

    const res = await window.backend.downloadCatalogMod(selected.path, selectedCatalogMod.download_link, selectedCatalogMod.id);
    if (res.success) {
      document.getElementById('detail-progress-bar').style.width = '100%';
      document.getElementById('detail-progress-pct').textContent = '100%';
      detailInstallBtn.textContent = 'Installed!';
      detailInstallBtn.style.opacity = '0.4';
      await refreshMods();
      loadCatalog();
    } else {
      progressWrap.style.display = 'none';
      detailInstallBtn.textContent = 'Failed — Try Again';
      detailInstallBtn.style.pointerEvents = 'auto';
    }
  });

  detailCloseBtn.addEventListener('click', () => detailModal.classList.remove('active'));
  closeCatalogBtn.addEventListener('click', () => catalogModal.classList.remove('active'));

  catalogSearch.addEventListener('input', (e) => {
    clearTimeout(catalogDebounce);
    catalogDebounce = setTimeout(() => {
      catalogQuery = e.target.value;
      catalogPage = 1;
      loadCatalog();
    }, 400);
  });

  catalogPrev.addEventListener('click', () => {
    if (catalogPage > 1) { catalogPage--; loadCatalog(); }
  });

  catalogNext.addEventListener('click', () => {
    const totalPages = Math.ceil(catalogTotal / 15) || 1;
    if (catalogPage < totalPages) { catalogPage++; loadCatalog(); }
  });

  initApp();

  // Deep Sleep: Unload video completely to free RAM
  const handleSleep = () => {
    const video = document.querySelector('.theme-bg-video');
    if (video) {
        savedTime = video.currentTime;
        const liveThemes = ['black-hole', 'nullscapes', 'kocmoc', 'heliopolis'];
        activeLiveTheme = liveThemes.find(t => document.body.classList.contains(t));
        
        video.pause();
        video.src = "";
        video.load();
        video.remove();
    }
  };

  const handleWake = () => {
    if (activeLiveTheme && !document.querySelector('.theme-bg-video')) {
      updateLiveWallpaper(activeLiveTheme);
      const newVid = document.querySelector('.theme-bg-video');
      if (newVid) {
        newVid.onloadedmetadata = () => {
          newVid.currentTime = savedTime;
          newVid.play().catch(e => console.error("Resume Error:", e));
        };
      }
    }
  };

  window.addEventListener('blur', () => {
    if (activeLiveTheme && currentSettings.optimizeWallpaper) handleSleep();
  });
  window.addEventListener('focus', () => {
    if (currentSettings.optimizeWallpaper) handleWake();
  });
  document.addEventListener('visibilitychange', () => {
    if (currentSettings.optimizeWallpaper) {
      if (document.hidden) handleSleep();
      else handleWake();
    }
  });
});

</script>

<template>
  <div v-if="store.isInitializing" class="loading-overlay">
    <div class="loading-card">
      <div class="loading-logo-container">
        <img src="/appicon.png" class="loading-logo" />
        <div class="loading-ring"></div>
      </div>
      <h2 id="loading-text">GD Organizer</h2>
      <div class="loading-progress-container">
        <div id="loading-bar" class="loading-bar"></div>
      </div>
      <p id="loading-status">Starting engine...</p>
    </div>
  </div>

  <!-- Custom Confirm Modal -->
  <div id="confirm-modal" class="modal-overlay">
    <div class="modal">
      <h3 style="margin: 0; color: var(--accent);">ARE YOU SURE?</h3>
      <p id="confirm-msg">Do you really want to delete this?</p>
      <div class="confirm-btns">
        <button id="confirm-no" class="btn-secondary" style="border:none;">Cancel</button>
        <button id="confirm-yes" class="btn-primary" style="padding: 10px 24px; background: #ed4245;">Confirm</button>
      </div>
    </div>
  </div>
  <div class="window-controls">
    <div class="drag-region"></div>
    <button id="min-btn" class="win-btn" title="Minimize">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect fill="currentColor" width="10" height="1" x="1" y="6" />
      </svg>
    </button>
    <button id="close-btn" class="win-btn close" title="Close">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path fill="currentColor"
          d="M10.707 1.293a1 1 0 00-1.414 0L6 4.586 2.707 1.293a1 1 0 00-1.414 1.414L4.586 6l-3.293 3.293a1 1 0 101.414 1.414L6 7.414l3.293 3.293a1 1 0 001.414-1.414L7.414 6l3.293-3.293a1 1 0 000-1.414z" />
      </svg>
    </button>
  </div>

  <div id="theme-bg-container"></div>
  
  <div class="app-container">
    <Sidebar 
      @addFolder="handleAction('addFolder')" 
      @selectFolder="val => handleAction('selectFolder', val)" 
      @openSettings="handleAction('openSettings')" 
      @closeSettings="handleAction('closeSettings')" 
      @changeSettingsTab="val => handleAction('changeSettingsTab', val)" 
      @addPreset="val => handleAction('addPreset', val)" 
      @selectPreset="val => handleAction('selectPreset', val.folder, val.presetId)" 
      @applyPreset="val => handleAction('applyPreset', val.folder, val.idx)" 
      @deletePreset="val => handleAction('deletePreset', val.folder, val.idx)" 
    />
    <main class="main-content">

      <div id="settings-view" class="screen">
        <div class="content-view">
          <div class="game-details">
            <h1 id="settings-view-title" style="font-size: 32px; margin-bottom: 8px;">Settings</h1>
            <p id="settings-view-desc" style="color: var(--text-dim); font-size: 14px;">Customize your GD Organizer
              experience</p>
          </div>

          <div class="settings-dashboard">
            <div class="settings-tab-content active" id="tab-general">
              <div class="settings-card">
                  <div style="display: flex; align-items: flex-end; gap: 10px; margin-bottom: 5px; padding-bottom: 20px;">
                    <div style="flex: 1;">
                      <label id="label-lang">Language</label>
                      <select class="settings-select" id="lang-select">
                        <option value="en-EN">English</option>
                        <option value="ru-RU">Russian (Русский)</option>
                        <option value="ar-EG">Arabic (العربية)</option>
                        <option value="es-419">Spanish LATAM (Español)</option>
                        <option value="th-TH">Thai (ภาษาไทย)</option>
                      </select>
                    </div>
                    <button id="credits-btn" class="btn-secondary" style="height: 38px; padding: 0 24px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center;"></button>
                  </div>
              </div>
            </div>

            <div class="settings-tab-content" id="tab-appearance" style="display: none;">
              <div class="settings-card">
                <div class="setting-item">
                  <label id="label-theme">Standard Themes</label>
                  <div class="theme-choices">
                    <div class="theme-card" id="theme-dark-btn" data-theme="dark">Dark</div>
                    <div class="theme-card" id="theme-light-btn" data-theme="light">Light</div>
                    <div class="theme-card" id="theme-system-btn" data-theme="system">System</div>
                    <div class="theme-card" id="theme-geometry-dash-btn" data-theme="geometry-dash" style="background: #2a2233; color: #ffff00; font-weight: 900; border: 2px solid #ffff00; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Geode</div>
                    <div class="theme-card" id="theme-custom-btn" data-theme="custom" style="background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(var(--accent-rgb), 0.05)); border: 1px solid var(--accent); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 600; letter-spacing: 0.5px; transition: all 0.3s ease;">
                        <span>Custom</span>
                    </div>
                  </div>

                  <label id="label-live-theme" style="margin-top: 20px; display: block;">Live Themes</label>
                  <div class="theme-choices">
                    <div class="theme-card" id="theme-black-hole-btn" data-theme="black-hole">Black Hole</div>
                    <div class="theme-card" id="theme-nullscapes-btn" data-theme="nullscapes">Nullscapes</div>
                    <div class="theme-card" id="theme-kocmoc-btn" data-theme="kocmoc" style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="color: #000; filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));">
                        <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                      </svg>
                      <span>Kocmoc</span>
                    </div>
                    <div class="theme-card" id="theme-heliopolis-btn" data-theme="heliopolis">Heliopolis</div>
                  </div>
                </div>

                <div class="setting-item">
                  <label id="label-accent">Accent Color</label>
                  <div class="accent-choices" style="display: flex; gap: 10px; margin-top: 10px;">
                    <div class="accent-color-btn" data-color="#0084cc" data-rgb="0, 132, 204"
                      style="background: #0084cc;"></div>
                    <div class="accent-color-btn" data-color="#3ba55d" data-rgb="59, 165, 93"
                      style="background: #3ba55d;"></div>
                    <div class="accent-color-btn" data-color="#eb459e" data-rgb="235, 69, 158"
                      style="background: #eb459e;"></div>
                    <div class="accent-color-btn" data-color="#a333c8" data-rgb="163, 51, 200"
                      style="background: #a333c8;"></div>
                    <div class="accent-color-btn" data-color="#808080" data-rgb="128, 128, 128"
                      id="accent-gray-btn" style="background: #808080; display: none;"></div>
                    <div class="accent-color-btn" data-color="#ed4245" data-rgb="237, 66, 69"
                      style="background: #ed4245;"></div>
                    
                    <div id="custom-accent-wrapper" class="accent-color-btn" style="position: relative; border: none; background: transparent; padding: 0; overflow: visible;">
                      <input type="color" id="custom-accent-picker" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 2;">
                      <div id="custom-accent-preview" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); background: transparent; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="opacity: 0.8; color: white;"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="setting-item" style="margin-top: 30px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.05);">
                  <label id="label-launcher-behavior" style="margin-bottom: 15px; display: block; color: var(--accent); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Launcher Behavior</label>
                  
                  <div class="mod-card" style="margin-top: 10px; background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.03); padding: 12px 16px;">
                    <div class="mod-info-box">
                      <span id="label-close-on-launch" class="mod-name" style="font-weight: 500; font-size: 13px;">Close Launcher on Game Start</span>
                    </div>
                    <div class="mod-actions-box" style="margin-left: auto;">
                      <label class="switch">
                        <input type="checkbox" id="close-on-launch-check">
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div class="mod-card" style="margin-top: 12px; background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.03); padding: 12px 16px;">
                    <div class="mod-info-box">
                      <span id="label-optimize-wallpaper" class="mod-name" style="font-weight: 500; font-size: 13px;">Optimize Wallpaper (Sleep Mode)</span>
                    </div>
                    <div class="mod-actions-box" style="margin-left: auto;">
                      <label class="switch">
                        <input type="checkbox" id="optimize-wallpaper-check">
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="setting-item" style="margin-top: 25px;">
                  <label id="label-ui-scale">UI Mode (Scaling)</label>
                  <div class="theme-choices" style="margin-top: 10px;">
                    <div class="theme-card ui-scale-btn" data-scale="0.85">Small</div>
                    <div class="theme-card ui-scale-btn" data-scale="1.0">Medium</div>
                    <div class="theme-card ui-scale-btn" data-scale="1.15">Large</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="settings-tab-content" id="tab-about" style="display: none;">
              <div class="about-section">
                <h3 id="about-title">GD Organizer</h3>
                <p id="about-version">Client Version : v1.3.0</p>
                <div class="about-description"
                  style="margin-top: 12px; font-size: 13px; line-height: 1.6; color: var(--text-secondary);">
                  <p>GD Organizer is a lightweight launcher and mod manager for Geometry Dash. It helps you easily
                    install, manage, and update mods with a simple and modern interface, providing powerful mod
                    management tools and a clean user experience.</p>
                </div>
                <div class="contributors"
                  style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
                  <span
                    style="font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase;">Contributors</span>
                  <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                    <img src="/logo.png"
                      style="width: 32px; height: 32px; border-radius: 8px; object-fit: contain; background: rgba(255,255,255,0.03);">
                    <div>
                      <div style="font-size: 13px; font-weight: 600;">drmilooo</div>
                      <a href="https://github.com/drmilooo" target="_blank"
                        style="font-size: 11px; color: var(--accent); text-decoration: none;">github.com/drmilooo</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="no-selection" class="screen active">
        <div class="hero-content">
          <h2 id="no-selection-title">Select an Instance</h2>
          <p id="no-selection-desc">Choose a folder from the sidebar to manage and play.</p>
        </div>
      </div>

      <div id="game-selection" class="screen">
        <div class="content-view">
          <div class="game-details">
            <div class="title-section">
              <h1 id="current-game-title">Geometry Dash</h1>
              <div id="geode-icon" class="status-pill geode" style="display: none;">
                <img src="/geodelogo.png" alt="Geode" />
                <span>Geode</span>
              </div>
              <div id="geometry-icon" class="status-pill geode"
                style="display: none; background: rgba(59, 110, 165, 0.1); border-color: rgba(59, 110, 165, 0.2);">
                <img src="/Geometrylogo.png" alt="GD" />
                <span style="color: #6da4d6;">Vanilla</span>
              </div>
              <div id="gdps-icon" class="status-pill geode"
                style="display: none; background: rgba(5, 150, 105, 0.1); border-color: rgba(5, 150, 105, 0.2);">
                <img src="/gdpslogo.png" alt="GDPS" />
                <span style="color: #10b981;">GDPS</span>
              </div>
              <div class="status-pill version">
                <span id="current-game-version">Checking...</span>
              </div>
            </div>

            <p id="current-game-path" class="path-display"></p>
          </div>

          <div class="action-area">
            <div class="button-group">
              <button id="play-btn" class="primary-btn">
                <span id="play-btn-text">PLAY</span>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <button id="delete-instance-btn" class="icon-btn delete" title="Delete Instance">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button id="view-logs-btn" class="icon-btn" title="View Geode Logs" style="width: auto; padding: 0 16px; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span style="font-size: 13px; font-weight: 600;">Logs</span>
              </button>
            </div>
          </div>

          <div id="mods-section" class="mods-container" style="display: none;">
            <div class="section-header"
              style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div>
                <h3 id="mods-header-title" style="margin: 0; font-size: 18px; color: white;">Installed Mods</h3>
                <p id="mod-stats"
                  style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-dim);">
                  <span id="mod-count" style="color: var(--text-secondary); font-weight: 500;">0</span>
                  <span id="mods-found-text">mods found</span>
                </p>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                  <button id="update-all-btn" class="btn-primary" style="display: none; padding: 4px 12px; font-size: 11px; height: 24px;">Update All</button>
                  <select id="sort-mods-select" class="settings-select" style="padding: 0 8px; font-size: 11px; height: 24px; width: auto; background: rgba(0,0,0,0.2); border-color: var(--border);">
                    <option value="name">Sort by Name</option>
                    <option value="enabled">Sort by Enabled</option>
                    <option value="version">Sort by Version</option>
                  </select>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <div class="search-box">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input type="text" id="mod-search" placeholder="Search mods..." autocomplete="off">
                </div>
                <button id="toggle-view-btn" class="install-mod-btn" title="Toggle Grid/List View" style="padding: 0; width: 32px; display: flex; align-items: center; justify-content: center;"></button>
                <button id="install-mod-btn" class="install-mod-btn">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                  </svg>
                </button>
                <button id="geode-catalog-btn" class="install-mod-btn" title="Browse Geode Catalog">
                  <img src="/geodelogo.png" style="width: 14px; height: 14px; object-fit: contain;">
                  <span style="font-size: 12px;">Catalog</span>
                </button>
              </div>
            </div>
            <div id="mods-list" class="mods-grid">
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div id="catalog-modal" class="modal-overlay">
    <div class="modal" style="width: 600px; max-height: 80vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="flex-shrink: 0; margin-bottom: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="/geodelogo.png" style="width: 20px; height: 20px; object-fit: contain;">
            <h3 style="margin: 0;">Geode Catalog</h3>
          </div>
          <button id="close-catalog-btn" class="btn-secondary" style="border: none; padding: 6px 12px;">✕</button>
        </div>
        <p id="catalog-target" style="font-size: 11px; color: var(--accent); margin: 0 0 10px 0;"></p>
        <div class="search-box" style="width: 100%; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" id="catalog-search" placeholder="Search Geode mods..." autocomplete="off">
        </div>
        <p id="catalog-status" style="font-size: 11px; color: var(--text-dim); margin: 8px 0 0 0;"></p>
      </div>
      <div id="catalog-list" class="mods-grid" style="flex: 1; overflow-y: auto; margin-top: 10px; min-height: 200px;">
      </div>
      <div
        style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 12px; flex-shrink: 0;">
        <button id="catalog-prev" class="btn-secondary" style="padding: 6px 14px; font-size: 12px;">← Prev</button>
        <span id="catalog-page-info" style="font-size: 12px; color: var(--text-dim);"></span>
        <button id="catalog-next" class="btn-secondary" style="padding: 6px 14px; font-size: 12px;">Next →</button>
      </div>
    </div>
  </div>

  <div id="catalog-detail-modal" class="modal-overlay">
    <div class="modal" style="width: 480px;">
      <div class="modal-header" style="margin-bottom: 0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span id="detail-mod-name" style="font-size: 18px; font-weight: 600;"></span>
          <span id="detail-featured-badge"
            style="background: #f59e0b; color: #000; font-size: 8px; padding: 1px 5px; border-radius: 3px; font-weight: 600; display: none;">★</span>
        </div>
        <p id="detail-mod-meta" style="font-size: 12px; color: var(--text-dim); margin: 0 0 16px 0;"></p>
      </div>
      <div
        style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 16px; max-height: 200px; overflow-y: auto;">
        <p id="detail-mod-desc" style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin: 0;"></p>
      </div>
      <div id="detail-progress-wrap" style="display: none; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 11px; color: var(--text-secondary);">Downloading...</span>
          <span id="detail-progress-pct"
            style="font-size: 11px; color: var(--text-primary); font-weight: 500;">0%</span>
        </div>
        <div style="background: rgba(255,255,255,0.06); border-radius: 4px; height: 6px; overflow: hidden;">
          <div id="detail-progress-bar"
            style="height: 100%; width: 0%; background: var(--accent); border-radius: 4px; transition: width 0.15s ease;">
          </div>
        </div>
      </div>
      <p id="detail-install-target" style="font-size: 11px; color: var(--text-dim); margin-bottom: 12px;"></p>
      <div class="modal-footer" style="justify-content: space-between;">
        <button id="detail-close-btn" class="btn-secondary" style="border: none;">Cancel</button>
        <button id="detail-install-btn" class="btn-primary" style="padding: 10px 24px;">Install</button>
      </div>
    </div>
  </div>

  <div id="dependency-modal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 id="dep-modal-title">Dependency Warning</h3>
        <p id="dep-modal-desc">The following mods depend on this and might stop working:</p>
      </div>
      <div id="dependent-mods-list" class="mods-grid" style="margin-bottom: 24px; max-height: 150px;">
      </div>
      <div class="modal-footer" style="flex-direction: column; gap: 10px;">
        <button id="disable-all-btn" class="btn-primary" style="width: 100%;">Close All Dependent Mods</button>
        <button id="disable-only-btn" class="btn-secondary" style="width: 100%;">Close Only Selected Mod</button>
        <button id="cancel-dep-btn" class="btn-secondary" style="width: 100%; border: none;">Cancel</button>
      </div>
    </div>
  </div>

  <div id="install-preview-modal" class="modal-overlay">
    <div class="modal" style="width: 480px;">
      <div class="modal-header" style="margin-bottom: 0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span id="preview-name" style="font-size: 18px; font-weight: 600;">Mod Name</span>
        </div>
        <p id="preview-meta" style="font-size: 12px; color: var(--text-dim); margin: 0 0 16px 0;">v1.0.0 by Developer
        </p>
      </div>
      <div
        style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 16px; max-height: 200px; overflow-y: auto;">
        <p id="preview-desc" style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin: 0;">
          Description goes here...</p>
      </div>
      <div id="install-warning-container"
        style="display: none; padding: 12px; background: rgba(237, 66, 69, 0.1); border: 1px solid rgba(237, 66, 69, 0.2); border-radius: var(--radius-md); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ed4245" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style="color: #ed4245; font-size: 11px; font-weight: 600;">Mod already exists in this instance.</span>
      </div>
      <p id="install-instance-target" style="font-size: 11px; color: var(--text-dim); margin-bottom: 12px;"></p>
      <div class="modal-footer" style="justify-content: space-between;">
        <button id="cancel-install-btn" class="btn-secondary" style="border: none;">Cancel</button>
        <button id="confirm-install-btn" class="btn-primary" style="padding: 10px 24px;">Confirm Add</button>
      </div>
    </div>
  </div>

  <div id="name-modal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 id="instance-modal-title">New Instance</h3>
        <p id="instance-modal-desc">Give this folder a recognizable name.</p>
      </div>
      <input type="text" id="instance-name" placeholder="e.g. Geode 2.204" autocomplete="off" />
      <div class="modal-footer">
        <button id="cancel-name-btn" class="btn-secondary">Cancel</button>
        <button id="save-name-btn" class="btn-primary">Add Instance</button>
      </div>
    </div>
  </div>


  <div id="log-modal" class="modal-overlay">
    <div class="modal" style="width: 800px; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 15px; margin-bottom: 15px;">
        <h3 id="log-modal-title" style="margin: 0;">Geode Logs (latest.log)</h3>
        <div style="display: flex; gap: 8px;">
          <button id="refresh-logs-btn" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">Refresh</button>
          <button id="close-logs-btn" class="btn-secondary" style="border: none; padding: 6px 12px;">✕</button>
        </div>
      </div>
      <div class="modal-body" style="flex: 1; overflow-y: auto; background: #111; color: #ccc; padding: 15px; border-radius: 8px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.4; border: 1px solid #333;">
        <code id="log-content">Loading logs...</code>
      </div>
    </div>
  </div>

  <div id="preset-modal" class="modal-overlay">
    <div class="modal" style="width: 320px;">
      <div class="modal-header">
        <h3 style="margin-bottom: 8px;" id="preset-modal-title">New Preset</h3>
        <p style="font-size: 11px; color: var(--text-dim);" id="preset-modal-desc">Enter a name for this mod snapshot:
        </p>
      </div>
      <input type="text" id="preset-name-input" placeholder="e.g. Building Mods"
        style="width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); color: white; border-radius: var(--radius-sm); margin-bottom: 20px; outline: none;"
        autocomplete="off">
      <div class="modal-footer">
        <button id="cancel-preset-btn" class="btn-secondary" style="border: none;">Cancel</button>
        <button id="save-preset-btn" class="btn-primary" style="padding: 10px 24px;">Add</button>
      </div>
    </div>
  </div>

  
  <div id="theme-editor-modal" class="modal-overlay">
    <div class="modal" style="width: 520px; display: flex; gap: 25px; padding: 25px;">
      <div style="flex: 1;">
        <div class="modal-header">
          <h3 id="theme-editor-title" style="margin: 0; color: var(--accent); display: flex; align-items: center; gap: 8px;">
            <span>Custom Palette</span>
          </h3>
          <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Personalize your environment colors</p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px;">App Background</label>
            <input type="color" id="edit-bg-app" style="background:none; border:none; width:40px; height:24px; cursor:pointer;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px;">Sidebar Background</label>
            <input type="color" id="edit-bg-sidebar" style="background:none; border:none; width:40px; height:24px; cursor:pointer;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px;">Primary Text</label>
            <input type="color" id="edit-text-primary" style="background:none; border:none; width:40px; height:24px; cursor:pointer;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 13px;">Secondary Text</label>
            <input type="color" id="edit-text-secondary" style="background:none; border:none; width:40px; height:24px; cursor:pointer;">
          </div>
        </div>
        
        <div class="modal-footer" style="margin-top: 25px;">
          <button id="close-theme-editor" class="btn-secondary" style="border: none;">Cancel</button>
          <button id="save-custom-theme" class="btn-primary" style="padding: 10px 24px; background: var(--accent);">Save Colors</button>
        </div>
      </div>

      <!-- Mini Preview UI -->
      <div style="width: 160px; display: flex; flex-direction: column; gap: 10px;">
        <label style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Preview</label>
        <div id="mini-mockup" style="flex: 1; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: flex; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div id="mini-sidebar" style="width: 40px; background: #111214; border-right: 1px solid rgba(255,255,255,0.05); padding: 8px 4px; display: flex; flex-direction: column; gap: 6px;">
            <div style="width: 100%; height: 6px; border-radius: 2px; background: rgba(255,255,255,0.1);"></div>
            <div style="width: 80%; height: 6px; border-radius: 2px; background: var(--accent); opacity: 0.8;"></div>
            <div style="width: 90%; height: 6px; border-radius: 2px; background: rgba(255,255,255,0.05);"></div>
          </div>
          <div id="mini-content" style="flex: 1; background: #1e1f22; padding: 12px 10px; display: flex; flex-direction: column; gap: 10px;">
            <div id="mini-text-p" style="width: 60%; height: 8px; border-radius: 2px; background: #dbdee1;"></div>
            <div id="mini-text-s" style="width: 40%; height: 5px; border-radius: 2px; background: #949ba4; opacity: 0.5;"></div>
            <div id="mini-btn-accent" style="margin-top: auto; width: 100%; height: 20px; border-radius: 4px; background: var(--accent); display: flex; align-items: center; justify-content: center;">
               <div style="width: 40%; height: 4px; background: white; border-radius: 2px; opacity: 0.8;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="credits-modal">
    <div class="modal-content" style="max-width: 450px;">
      <h2 id="credits-modal-title"></h2>
      <p id="credits-modal-desc"></p>
      
      <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; padding-right: 5px;">
        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div id="credits-developer-label" style="color: var(--accent); font-weight: bold; font-size: 13px; margin-bottom: 4px;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="color: var(--text-primary); font-size: 14px;">drmilooo</div>
            <a href="https://github.com/drmilooo" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@drmilooo</a>
          </div>
        </div>
        
        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div id="credits-translations-label" style="color: var(--accent); font-weight: bold; font-size: 13px; margin-bottom: 4px;"></div>
          <div style="color: var(--text-primary); font-size: 14px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>English</span>
              <a href="https://github.com/drmilooo" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@drmilooo</a>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Russian</span>
              <a href="https://github.com/aceinetx" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@aceinetx</a>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Arabic</span>
              <a href="https://github.com/slyxlz" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@slyxlz</a>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Spanish (LATAM)</span>
              <a href="https://discord.com/users/w.thm" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@w.thm</a>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Thai</span>
              <a href="https://www.tiktok.com/@lxvesxcker" class="external-link" style="color: var(--accent); text-decoration: none; font-size: 12px;">@lxvesxcker</a>
            </div>
          </div>
        </div>

        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div id="credits-thanks-label" style="color: var(--accent); font-weight: bold; font-size: 13px; margin-bottom: 4px;"></div>
          <div style="color: var(--text-primary); font-size: 14px;">Geode Team, Geometry Dash Community</div>
        </div>

        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div id="credits-powered-label" style="color: var(--accent); font-weight: bold; font-size: 13px; margin-bottom: 4px;"></div>
          <div style="color: var(--text-primary); font-size: 14px;">Wails, Go, Vue 3, Vite</div>
        </div>
      </div>

      <div class="modal-actions" style="margin-top: 25px;">
        <button class="primary-btn" id="close-credits-btn" style="width: 100%;"></button>
      </div>
    </div>
  </div>

</template>
