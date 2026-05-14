document.addEventListener('DOMContentLoaded', () => {
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

  let currentSettings = JSON.parse(localStorage.getItem('gd-settings') || '{"theme":"dark","lang":"en-EN","accent":"#0084cc","accentRgb":"0, 132, 204"}');
  const _appSignature = 'drmilooo';

  function applyTheme(theme) {
    document.body.classList.remove('light', 'dark', 'midnight', 'black-hole', 'nullscapes', 'kocmoc');
    let target = theme.toLowerCase().replace(/\s+/g, '-');
    
    if (target === 'system') {
      target = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (['light', 'dark', 'black-hole', 'nullscapes', 'kocmoc'].includes(target)) {
      document.body.classList.add(target);
    }

    const bhVid = document.getElementById('black-hole-video');
    const nsVid = document.getElementById('nullscapes-video');
    const kmVid = document.getElementById('kocmoc-video');

    if (bhVid) { bhVid.pause(); bhVid.currentTime = 0; }
    if (nsVid) { nsVid.pause(); nsVid.currentTime = 0; }
    if (kmVid) { kmVid.pause(); }

    if (target === 'black-hole' && bhVid) {
      bhVid.play().catch(e => console.log("Video Play Error:", e));
    } else if (target === 'nullscapes' && nsVid) {
      nsVid.playbackRate = 0.7;
      nsVid.play().catch(e => console.log("Video Play Error:", e));
    } else if (target === 'kocmoc' && kmVid) {
      kmVid.play().catch(e => console.log("Video Play Error:", e));
    }

    currentSettings.theme = theme;
    saveSettings();

    const grayBtn = document.getElementById('accent-gray-btn');
    const allAccentBtns = document.querySelectorAll('.accent-color-btn');
    
    if (target === 'kocmoc') {
      applyAccentColor('#808080', '128, 128, 128');
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
        applyAccentColor('#0084cc', '0, 132, 204');
      }
    }

    themeCards.forEach(card => {
      card.classList.remove('active');
      if (card.textContent.trim().toLowerCase() === theme.toLowerCase()) card.classList.add('active');
    });
  }

  function applyAccentColor(hex, rgb) {
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', rgb);

    document.documentElement.style.setProperty('--accent-hover', hex);

    currentSettings.accent = hex;
    currentSettings.accentRgb = rgb;
    saveSettings();

    accentBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-color') === hex) btn.classList.add('active');
    });
  }

  function saveSettings() {
    localStorage.setItem('gd-settings', JSON.stringify(currentSettings));
  }

  async function applyLanguage(code) {
    try {
      const response = await fetch(`./locales/${code}.json`);
      if (!response.ok) throw new Error("File not found");
      const dict = await response.json();
      currentDict = dict;

      const logoEl = document.getElementById('sidebar-logo');
      if (logoEl) logoEl.textContent = dict.sidebar_logo;
      const addBtn = document.getElementById('add-folder-btn');
      if (addBtn) addBtn.title = dict.add_instance_tip;

      const navG = document.getElementById('nav-general');
      const navA = document.getElementById('nav-appearance');
      const navAb = document.getElementById('nav-about');
      if (navG) navG.textContent = dict.settings_nav_general || "General";
      if (navA) navA.textContent = dict.settings_nav_appearance || "Appearance";
      if (navAb) navAb.textContent = dict.settings_nav_about || "About";

      const backHome = document.getElementById('back-home-text');
      if (backHome) backHome.textContent = dict.back_to_instances;

      const settingsTxt = document.getElementById('settings-text');
      if (settingsTxt) settingsTxt.textContent = dict.settings;

      const setT = document.getElementById('settings-view-title');
      const setD = document.getElementById('settings-view-desc');
      if (setT) setT.textContent = dict.settings_title;
      if (setD) setD.textContent = dict.settings_desc;

      const labL = document.getElementById('label-lang');
      const labT = document.getElementById('label-theme');
      if (labL) labL.textContent = dict.language;
      if (labT) labT.textContent = dict.theme_preference;

      const creditsBtn = document.getElementById('credits-btn');
      if (creditsBtn) creditsBtn.textContent = dict.credits_btn || "Credits";
      
      const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setElementText('credits-modal-title', dict.credits_modal_title);
      setElementText('credits-modal-desc', dict.credits_modal_desc);
      setElementText('credits-developer-label', dict.credits_developer);
      setElementText('credits-translations-label', dict.credits_translations);
      setElementText('credits-thanks-label', dict.credits_special_thanks);
      setElementText('credits-powered-label', dict.credits_powered_by);
      setElementText('close-credits-btn', dict.credits_close);
      const labLT = document.getElementById('label-live-theme');
      const labAcc = document.getElementById('label-accent');
      if (labLT) labLT.textContent = dict.live_theme_preference || "Live Themes";
      if (labAcc) labAcc.textContent = dict.accent_color;

      document.getElementById('theme-dark-btn').textContent = dict.theme_dark;
      document.getElementById('theme-light-btn').textContent = dict.theme_light;
      document.getElementById('theme-system-btn').textContent = dict.theme_system || "System";
      document.getElementById('theme-black-hole-btn').textContent = dict.theme_black_hole || "Black Hole";
      document.getElementById('theme-nullscapes-btn').textContent = dict.theme_nullscapes || "Nullscapes";
      document.getElementById('theme-kocmoc-btn').querySelector('span').textContent = dict.theme_kocmoc || "Kocmoc";

      const abT = document.getElementById('about-title');
      const abD = document.getElementById('about-desc');
      if (abT) abT.textContent = dict.about_title || "GD Organizer";
      if (abD) abD.textContent = dict.about_text;

      const noT = document.getElementById('no-selection-title');
      const noD = document.getElementById('no-selection-desc');
      if (noT) noT.textContent = dict.select_instance_title;
      if (noD) noD.textContent = dict.select_instance_desc;

      const playT = document.getElementById('play-btn-text');
      if (playT) playT.textContent = dict.play_now;

      const addM = document.getElementById('add-mod-file-btn');
      const delI = document.getElementById('delete-instance-btn');
      if (addM) addM.title = dict.add_mod_tooltip;
      if (delI) delI.title = dict.delete_instance_tooltip;

      const modsH = document.getElementById('mods-header-title');
      const modsF = document.getElementById('mods-found-text');
      if (modsH) modsH.textContent = dict.installed_mods;
      if (modsF) modsF.textContent = dict.mods_found;

      document.getElementById('instance-modal-title').textContent = dict.instance_modal_title;
      document.getElementById('instance-modal-desc').textContent = dict.instance_modal_desc;
      document.getElementById('instance-name').placeholder = dict.instance_input_placeholder;
      document.getElementById('save-name-btn').textContent = dict.instance_add_btn;
      document.getElementById('cancel-name-btn').textContent = dict.instance_cancel_btn;

      document.getElementById('preset-modal-title').textContent = dict.preset_modal_title;
      document.getElementById('preset-modal-desc').textContent = dict.preset_modal_desc;
      document.getElementById('preset-name-input').placeholder = dict.preset_input_placeholder;
      document.getElementById('save-preset-btn').textContent = dict.preset_add_btn;
      document.getElementById('cancel-preset-btn').textContent = dict.preset_cancel_btn;

      currentSettings.lang = code;
      localStorage.setItem('gd-settings', JSON.stringify(currentSettings));
      langSelect.value = code;

      renderFolders();
      if (currentSelectionId) renderMods(currentMods);

    } catch (e) { console.error("Lang Load Error:", e); }
  }

  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.textContent.trim());
    });
  });

  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-color');
      const rgb = btn.getAttribute('data-rgb');
      applyAccentColor(hex, rgb);
    });
  });

  langSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  applyTheme(currentSettings.theme || 'dark');
  applyAccentColor(currentSettings.accent || '#0084cc', currentSettings.accentRgb || '0, 132, 204');
  applyLanguage(currentSettings.lang || 'en-EN');

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

  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const targetTab = item.getAttribute('data-tab');
      document.querySelectorAll('.settings-tab-content').forEach(content => {
        content.style.display = content.id === `tab-${targetTab}` ? 'block' : 'none';
      });
    });
  });

  let folders = JSON.parse(localStorage.getItem('gd-folders') || '[]');
  let currentSelectionId = null;
  let pendingFolderPath = null;
  let currentMods = [];
  let pendingToggle = null;
  let pendingInstallPath = null;
  let modUpdates = {};
  let checkingUpdates = false;
  let pendingPresetFolder = null;
  let currentDict = {};

  function saveFolders() {
    localStorage.setItem('gd-folders', JSON.stringify(folders));
  }

  function renderFolders() {
    folderListEl.innerHTML = '';
    folders.forEach(f => {
      const div = document.createElement('div');
      div.className = 'folder-item' + (currentSelectionId === f.id ? ' active' : '');
      const iconSrc = f.hasGeode ? 'geodelogo.png' : 'Geometrylogo.png';

      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <img src="${iconSrc}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; flex-shrink: 0;">
          <div style="min-width: 0; flex: 1;">
            <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</h4>
            <p style="margin: 2px 0 0 0; font-size: 10px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.path}</p>
          </div>
        </div>
      `;

      if (currentSelectionId === f.id && f.hasGeode) {
        const presetsBox = document.createElement('div');
        presetsBox.className = 'presets-container';

        (f.presets || []).forEach(function (preset, idx) {
          const row = document.createElement('div');
          row.className = 'preset-item' + (activePresetId === preset.id ? ' active' : '');

          row.onclick = function (ev) {
            ev.stopPropagation();
            selectPresetContext(f, preset.id);
          };

          const label = document.createElement('span');
          label.textContent = preset.name;
          label.title = preset.name;
          row.appendChild(label);

          const actions = document.createElement('div');
          actions.className = 'preset-actions';

          const syncBtn = document.createElement('button');
          syncBtn.className = 'preset-btn play';
          syncBtn.title = 'Apply this preset to files now';
          syncBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
          syncBtn.onclick = function (ev) {
            ev.stopPropagation();
            applyPresetSnapshot(f, idx);
          };
          actions.appendChild(syncBtn);

          const delBtn = document.createElement('button');
          delBtn.className = 'preset-btn delete-p';
          delBtn.title = 'Delete this record';
          delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
          delBtn.onclick = function (ev) {
            ev.stopPropagation();
            deletePresetSnapshot(f, idx);
          };
          actions.appendChild(delBtn);

          row.appendChild(actions);
          presetsBox.appendChild(row);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-preset-btn';
        addBtn.textContent = '+ New Preset';
        addBtn.onclick = function (ev) {
          ev.stopPropagation();
          openPresetModal(f);
        };
        presetsBox.appendChild(addBtn);

        div.appendChild(presetsBox);
      }

      div.onclick = function (e) {
        if (e.target.closest('.presets-container')) return;
        activePresetId = null;
        selectFolder(f.id);
      };

      folderListEl.appendChild(div);
    });
  }

  function selectPresetContext(folder, presetId) {
    activePresetId = presetId;
    renderFolders();
    refreshMods();
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
      const mods = await window.electronAPI.getMods(pendingPresetFolder.path);
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
    renderFolders();

    await syncDiskToPreset(folder, preset);

    refreshMods();

    await window.electronAPI.launchGame(folder.path);
  }

  async function syncDiskToPreset(folder, preset) {
    try {
      const modsOnDisk = await window.electronAPI.getMods(folder.path);
      for (const m of modsOnDisk) {
        const targetStatus = (preset.mods[m.id] === true);
        if (m.enabled !== targetStatus) {
          await window.electronAPI.toggleMod(folder.path, m.id, targetStatus, m.file);
        }
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

  async function selectFolder(id) {
    currentSelectionId = id;
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

      const analysis = await window.electronAPI.analyzeGame(selected.path);
      versionEl.textContent = analysis.version;

      const vanillaIcon = document.getElementById('geometry-icon');

      if (selected.hasGeode !== analysis.hasGeode) {
        selected.hasGeode = analysis.hasGeode;
        saveFolders();
        renderFolders();
      }

      if (analysis.hasGeode) {
        geodeIcon.style.display = 'flex';
        vanillaIcon.style.display = 'none';
        modsSection.style.display = 'block';
        const installBtn = document.getElementById('install-mod-btn');
        if (installBtn) installBtn.style.display = 'flex';

        currentMods = await window.electronAPI.getMods(selected.path);
        renderMods(currentMods);
      } else {
        geodeIcon.style.display = 'none';
        vanillaIcon.style.display = 'flex';
        modsSection.style.display = 'block';
        const installBtn = document.getElementById('install-mod-btn');
        if (installBtn) installBtn.style.display = 'none';

        modsListEl.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--text-dim); border: 1px dashed var(--border); border-radius: 8px;">
            <p style="font-size: 13px;">No Mods available (Geode not detected)</p>
          </div>
        `;
        const statsEl = document.getElementById('mod-stats');
        if (statsEl) statsEl.innerHTML = '';
      }
    }
  }



  async function refreshMods() {
    if (currentSelectionId) {
      const selected = folders.find(f => f.id === currentSelectionId);
      if (selected) {
        currentMods = await window.electronAPI.getMods(selected.path);
        renderMods(currentMods);

      }
    }
  }

  async function checkUpdatesIndividually() {
    if (checkingUpdates || currentMods.length === 0) return;
    checkingUpdates = true;

    modUpdates = {};
    updateStatsUI('checking', 0, currentMods.length);

    let count = 0;
    for (const mod of currentMods) {
      const info = await window.electronAPI.fetchModInfo(mod.id);
      if (info) {
        modUpdates[mod.id] = info.versions?.[0]?.version || null;
      }
      count++;
      updateStatsUI('checking', count, currentMods.length);
      renderMods(currentMods);
    }
    checkingUpdates = false;
  }

  function updateStatsUI(status, current, total) {
    const statsEl = document.getElementById('mod-stats');
    if (!statsEl) return;
    if (status === 'checking') {
      statsEl.innerHTML = `<span style="color: var(--accent); font-weight: bold;">${currentMods.length}</span> MODS FOUND · <span style="color: var(--text-dim);">CHECKING (${current}/${total})...</span>`;
    }
  }

  function renderMods(mods) {
    const searchTerm = document.getElementById('mod-search').value.toLowerCase();
    const modsToRender = mods.filter(m => 
      m.name.toLowerCase().includes(searchTerm) || 
      m.id.toLowerCase().includes(searchTerm)
    );

    modsListEl.innerHTML = '';
    const folder = folders.find(f => f.id === currentSelectionId);
    if (!folder) return;

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

    modsToRender.forEach(mod => {
      try {
        const isEnabled = preset ? (preset.mods[mod.id] === true) : mod.enabled;
        const isChecked = isEnabled ? 'checked' : '';

        const card = document.createElement('div');
        card.className = 'mod-card';

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
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span class="mod-name" title="${mod.name}">${mod.name}</span>
              <span style="font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500;">${String(mod.version || '0.0.0').replace(/^v+/i, '')}</span>
            </div>
            <div class="mod-info-btn" data-desc="${mod.description || 'No description provided.'}">i</div>
            ${updateAvailable ? `<span class="update-badge" title="Latest: ${latestVersion}">UPDATE AVAILABLE</span>` : ''}
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
        modsListEl.appendChild(card);
      } catch (err) {
        console.error("Error rendering mod card:", err);
      }
    });

    updateModStats(mods);
    rebindModEvents();
  }

  function updateModStats(modsList) {
    const statsEl = document.getElementById('mod-stats');
    if (!statsEl) return;

    const folder = folders.find(f => f.id === currentSelectionId);
    const preset = (folder && activePresetId) ? folder.presets.find(p => p.id === activePresetId) : null;
    const enabledCount = modsList.filter(m => {
      return preset ? (preset.mods[m.id] === true) : m.enabled;
    }).length;

    const modsFoundText = currentDict.mods_found || "mods found";
    const modActiveText = currentDict.mod_active || "mod active";

    statsEl.style.textTransform = 'none';
    statsEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-secondary); font-weight: 500; font-size: 11px;">${modsList.length} ${modsFoundText}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-secondary); font-weight: 500; font-size: 11px;">${enabledCount} ${modActiveText} ${preset ? '(' + (currentDict.in_preset || "in preset") + ')' : ''}</span>
        </div>
      </div>
    `;
  }

  function rebindModEvents() {
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    document.querySelectorAll('.mod-card').forEach((card, index) => {
      const mod = currentMods[index];
      if (!mod) return;

      const deleteBtn = card.querySelector('.mod-delete-btn');
      deleteBtn.onclick = async () => {
        if (await window.customConfirm(currentDict.delete_mod_confirm || `Are you sure you want to delete "${mod.name}" mod file permanently?`)) {
          const res = await window.electronAPI.deleteMod(selected.path, mod.file);
          if (res.success) refreshMods();
          else alert("Error deleting mod: " + res.error);
        }
      };

      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.onchange = async (e) => {
        const enabled = e.target.checked;
        const modId = e.target.getAttribute('data-id');
        const folder = folders.find(f => f.id === currentSelectionId);
        let preset = (folder && activePresetId) ? folder.presets.find(p => p.id === activePresetId) : null;

        if (!enabled) {
          const dependents = currentMods.filter(m => {
            const mEnabled = preset ? (preset.mods[m.id] === true) : m.enabled;
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
    });
  }

  document.addEventListener('click', async (e) => {
    const installBtn = e.target.closest('#install-mod-btn');
    if (installBtn) {
      if (!currentSelectionId) return;
      const selected = folders.find(f => f.id === currentSelectionId);
      const filePath = await window.electronAPI.openFile([{ name: 'Geode Mod', extensions: ['geode'] }]);
      if (filePath) {
        const info = await window.electronAPI.getSingleModInfo(filePath);
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

    confirmInstallBtn.textContent = 'ADDING...';
    const res = await window.electronAPI.installMod(selected.path, pendingInstallPath);
    confirmInstallBtn.textContent = 'ADD MOD';

    if (res.success) {
      installPreviewModal.classList.remove('active');
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
        renderMods(currentMods);
      }
    } else {
      
      const localMod = currentMods.find(m => m.id === modId);
      if (localMod) {
        localMod.enabled = enabled;
        updateModStats(currentMods);
      }

      const result = await window.electronAPI.toggleMod(selected.path, modId, enabled, localMod?.file);
      if (!result.success) {
        alert("Failed to toggle mod: " + result.error);
        refreshMods();
      }
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
      await window.electronAPI.toggleMod(selected.path, d.id, false, d.file);
      if (preset) {
        preset.mods[d.id] = false;
      } else {
        d.enabled = false;
      }
    }

    await window.electronAPI.toggleMod(selected.path, mod.id, false, mod.file);
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

    await window.electronAPI.toggleMod(selected.path, mod.id, false, mod.file);
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
      if (selected) {
        window.electronAPI.getMods(selected.path).then(renderMods);
      }
    }
  });

  setInterval(() => {
    if (currentSelectionId && document.hasFocus()) {
      const selected = folders.find(f => f.id === currentSelectionId);
      if (selected) {
        window.electronAPI.getMods(selected.path).then(renderMods);
      }
    }
  }, 10000);

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

  addFolderBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.openFolder();
    if (folderPath) {
      pendingFolderPath = folderPath;
      instanceNameInput.value = '';
      modalOverlay.classList.add('active');
      instanceNameInput.focus();
    }
  });

  cancelNameBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    pendingFolderPath = null;
  });

  saveNameBtn.onclick = async () => {
    const name = instanceNameInput.value.trim() || 'Untitled Instance';
    if (pendingFolderPath) {
      if (folders.some(f => f.path === pendingFolderPath)) {
        alert("This folder is already in your list!");
        modalOverlay.classList.remove('active');
        pendingFolderPath = null;
        return;
      }

      const analysis = await window.electronAPI.analyzeGame(pendingFolderPath);

      if (analysis.version === "Not Found") {
        alert(currentDict.invalid_folder_err || "GeometryDash.exe not found in this folder!");
        return;
      }

      const newFolder = {
        id: Date.now().toString(),
        name,
        path: pendingFolderPath,
        hasGeode: analysis.hasGeode,
        version: analysis.version
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

    const result = await window.electronAPI.launchGame(selected.path);

    setTimeout(() => {
      playBtn.style.opacity = '1';
      playBtn.innerHTML = `<span>${currentDict.play_now || 'PLAY'}</span>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`;
    }, 1500);

    if (!result.success) {
      alert('Error launching game: ' + result.error);
    }
  });

  document.getElementById('min-btn').addEventListener('click', () => {
    window.electronAPI.minimize();
  });
  document.getElementById('close-btn').addEventListener('click', () => {
    window.electronAPI.close();
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href.startsWith('http')) {
      e.preventDefault();
      window.electronAPI.openExternal(link.href);
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
    const result = await window.electronAPI.browseCatalog(catalogPage, catalogQuery, selected ? selected.version : "");
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

  /* window.electronAPI.onDownloadProgress((pct) => {
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

    const res = await window.electronAPI.downloadCatalogMod(selected.path, selectedCatalogMod.download_link, selectedCatalogMod.id);
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

  renderFolders();
});
