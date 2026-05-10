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
  const modsListEl = document.getElementById('mods-list');
  const modCountEl = document.getElementById('mod-count');
  const depModal = document.getElementById('dependency-modal');
  const depListEl = document.getElementById('dependent-mods-list');
  const disableAllBtn = document.getElementById('disable-all-btn');
  const disableOnlyBtn = document.getElementById('disable-only-btn');
  const cancelDepBtn = document.getElementById('cancel-dep-btn');

  const installPreviewModal = document.getElementById('install-preview-modal');
  const confirmInstallBtn = document.getElementById('confirm-install-btn');
  const cancelInstallBtn = document.getElementById('cancel-install-btn');
  const previewDesc = document.getElementById('preview-desc');
  const settingsView = document.getElementById('settings-view');
  const settingsNav = document.getElementById('settings-nav');
  const backHomeBtn = document.getElementById('back-home-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const folderListWrapper = document.getElementById('folder-list');
  const langSelect = document.querySelector('.settings-select');
  const themeCards = document.querySelectorAll('.theme-card');

  let currentSettings = JSON.parse(localStorage.getItem('gd-settings') || '{"theme":"dark","lang":"en-EN"}');
  const _appSignature = 'drmilooo'; 
  
  function applyTheme(theme) {
    document.body.classList.remove('light');
    if (theme === 'light') {
      document.body.classList.add('light');
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('light');
      }
    }
    currentSettings.theme = theme;
    localStorage.setItem('gd-settings', JSON.stringify(currentSettings));
    
    themeCards.forEach(card => {
      card.classList.remove('active');
      if (card.textContent.toLowerCase() === theme) card.classList.add('active');
    });
  }

  async function applyLanguage(code) {
    try {
      const response = await fetch(`./locales/${code}.json`);
      if (!response.ok) throw new Error("File not found");
      const dict = await response.json();
      
      // Sidebar & Nav
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
      
      const statusTxt = document.getElementById('status-text');
      if (statusTxt) statusTxt.textContent = dict.ready;

      // Settings View
      const setT = document.getElementById('settings-view-title');
      const setD = document.getElementById('settings-view-desc');
      if (setT) setT.textContent = dict.settings_title;
      if (setD) setD.textContent = dict.settings_desc;
      
      const labL = document.getElementById('label-lang');
      const labT = document.getElementById('label-theme');
      if (labL) labL.textContent = dict.language;
      if (labT) labT.textContent = dict.theme_preference;
      
      const abT = document.getElementById('about-title');
      const abD = document.getElementById('about-desc');
      if (abT) abT.textContent = dict.sidebar_logo;
      if (abD) abD.textContent = dict.about_text;

      // Home Screen
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

      // Persistence Update
      currentSettings.lang = code;
      localStorage.setItem('gd-settings', JSON.stringify(currentSettings));
      langSelect.value = code;
      
    } catch (e) { console.error("Lang Load Error:", e); }
  }

  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.textContent.toLowerCase());
    });
  });

  langSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  // Init
  applyTheme(currentSettings.theme);
  applyLanguage(currentSettings.lang);

  function toggleSettingsMode(active) {
    if (active) {
      noSelectionScreen.classList.remove('active');
      gameSelectionScreen.classList.remove('active');
      settingsView.classList.add('active');
      
      folderListWrapper.style.display = 'none';
      settingsNav.style.display = 'flex';
      addFolderBtn.style.display = 'none';
    } else {
      settingsView.classList.remove('active');
      folderListWrapper.style.display = 'flex';
      settingsNav.style.display = 'none';
      addFolderBtn.style.display = 'flex';
      
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

  const modSearchInput = document.getElementById('mod-search');
  modSearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = currentMods.filter(m => 
      m.name.toLowerCase().includes(term) || 
      m.id.toLowerCase().includes(term)
    );
    renderMods(filtered);
  });

  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      // UI
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Tabs
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

  function saveFolders() {
    localStorage.setItem('gd-folders', JSON.stringify(folders));
  }

  function renderFolders() {
    folderListEl.innerHTML = '';
    folders.forEach(f => {
      const div = document.createElement('div');
      div.className = 'folder-item' + (currentSelectionId === f.id ? ' active' : '');
      div.innerHTML = `
        <h4>${f.name}</h4>
        <p>${f.path}</p>
      `;
      div.addEventListener('click', () => selectFolder(f.id));
      folderListEl.appendChild(div);
    });
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
      
      if (analysis.hasGeode) {
        geodeIcon.style.display = 'flex';
        currentMods = await window.electronAPI.getMods(selected.path);
        renderMods(currentMods);
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
    
    // Clear old results
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
      // Partial render to show badges as they come
      renderMods(currentMods, true);
    }
    
    checkingUpdates = false;
    renderMods(currentMods); // Final render
  }

  function updateStatsUI(status, current, total) {
    const statsEl = document.getElementById('mod-stats');
    if (!statsEl) return;
    if (status === 'checking') {
      statsEl.innerHTML = `<span style="color: var(--accent); font-weight: bold;">${currentMods.length}</span> MODS FOUND · <span style="color: var(--text-dim);">CHECKING (${current}/${total})...</span>`;
    }
  }

  function renderMods(mods, isPartial = false) {
    if (!mods || !Array.isArray(mods)) return;
    
    modsSection.style.display = 'block';
    modCountEl.textContent = mods.length;
    modsListEl.innerHTML = '';

    let totalUpdates = 0;

    mods.forEach(mod => {
      try {
        const card = document.createElement('div');
        card.className = 'mod-card';
        
        const isChecked = mod.enabled ? 'checked' : '';
        
        const latestVersion = modUpdates[mod.id];
        let updateAvailable = false;
        if (latestVersion) {
          const vLocal = String(mod.version || '').replace(/^v+/i, '').trim();
          const vLatest = String(latestVersion || '').replace(/^v+/i, '').trim();
          if (vLatest && vLocal && vLatest !== vLocal) {
            updateAvailable = true;
            totalUpdates++;
          }
        }

        card.innerHTML = `
          <div class="mod-info-box">
            <div class="mod-icon ${mod.enabled ? 'enabled' : 'disabled'}"></div>
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

    const statsEl = document.getElementById('mod-stats');
    if (statsEl) {
      statsEl.innerHTML = `<span style="color: var(--accent); font-weight: bold;">${mods.length}</span> MODS FOUND · <span style="color: var(--text-dim); font-size: 10px; letter-spacing: 1px;">UPDATES (SOON)</span>`;
    }
    
    rebindModEvents();
  }

  function rebindModEvents() {
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    document.querySelectorAll('.mod-card').forEach((card, index) => {
      const mod = currentMods[index];
      if (!mod) return;

      const deleteBtn = card.querySelector('.mod-delete-btn');
      deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete "${mod.name}" mod file permanently?`)) {
          const res = await window.electronAPI.deleteMod(selected.path, mod.file);
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
            if (!m.enabled || !m.dependencies) return false;
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
    if (e.target && e.target.id === 'install-mod-btn') {
      if (!currentSelectionId) return;
      const filePath = await window.electronAPI.openFile([{ name: 'Geode Mod', extensions: ['geode'] }]);
      if (filePath) {
        const info = await window.electronAPI.getSingleModInfo(filePath);
        if (info.id) {
          pendingInstallPath = filePath;
          previewName.textContent = info.name || info.id;
          previewMeta.textContent = `${info.version || 'v1.0.0'} by ${info.developer || 'Unknown'}`;
          previewDesc.textContent = info.description || 'No description provided for this mod.';
          
          const isInstalled = currentMods.some(m => m.id.toLowerCase() === info.id.toLowerCase());
          const warningContainer = document.getElementById('install-warning-container');
          
          if (isInstalled) {
            confirmInstallBtn.style.display = 'none';
            warningContainer.style.display = 'flex';
          } else {
            confirmInstallBtn.style.display = 'block';
            warningContainer.style.display = 'none';
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

    const dot = cardEl.querySelector('.mod-icon');
    dot.className = `mod-icon ${enabled ? 'enabled' : 'disabled'}`;
    
    const localMod = currentMods.find(m => m.id === modId);
    if (localMod) localMod.enabled = enabled;

    const result = await window.electronAPI.toggleMod(selected.path, modId, enabled);
    if (!result.success) {
      alert("Failed to toggle mod: " + result.error);
      const input = cardEl.querySelector('input');
      input.checked = !enabled;
      dot.className = `mod-icon ${!enabled ? 'enabled' : 'disabled'}`;
      if (localMod) localMod.enabled = !enabled;
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
    
    for (const d of dependents) {
      await window.electronAPI.toggleMod(selected.path, d.id, false);
      const card = Array.from(modsListEl.querySelectorAll('.mod-card')).find(c => c.querySelector('input').getAttribute('data-id') === d.id);
      if (card) {
        card.querySelector('input').checked = false;
        card.querySelector('.mod-icon').className = 'mod-icon disabled';
      }
      d.enabled = false;
    }

    await window.electronAPI.toggleMod(selected.path, mod.id, false);
    const targetCard = Array.from(modsListEl.querySelectorAll('.mod-card')).find(c => c.querySelector('input').getAttribute('data-id') === mod.id);
    if (targetCard) {
      targetCard.querySelector('input').checked = false;
      targetCard.querySelector('.mod-icon').className = 'mod-icon disabled';
    }
    mod.enabled = false;

    depModal.classList.remove('active');
    pendingToggle = null;
  });

  disableOnlyBtn.addEventListener('click', async () => {
    if (!pendingToggle) return;
    const { mod } = pendingToggle;
    const selected = folders.find(f => f.id === currentSelectionId);
    
    await window.electronAPI.toggleMod(selected.path, mod.id, false);
    const targetCard = Array.from(modsListEl.querySelectorAll('.mod-card')).find(c => c.querySelector('input').getAttribute('data-id') === mod.id);
    if (targetCard) {
      targetCard.querySelector('input').checked = false;
      targetCard.querySelector('.mod-icon').className = 'mod-icon disabled';
    }
    mod.enabled = false;

    depModal.classList.remove('active');
    pendingToggle = null;
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

  deleteBtn.addEventListener('click', () => {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    if (confirm(`Are you sure you want to remove "${selected.name}"? This won't delete the actual files.`)) {
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

  saveNameBtn.addEventListener('click', () => {
    const name = instanceNameInput.value.trim() || 'Untitled Instance';
    if (pendingFolderPath) {
      const newFolder = {
        id: Date.now().toString(),
        name,
        path: pendingFolderPath
      };
      folders.push(newFolder);
      saveFolders();
      selectFolder(newFolder.id);
      modalOverlay.classList.remove('active');
      pendingFolderPath = null;
    }
  });

  playBtn.addEventListener('click', async () => {
    if (!currentSelectionId) return;
    const selected = folders.find(f => f.id === currentSelectionId);
    if (!selected) return;

    playBtn.style.opacity = '0.7';
    playBtn.querySelector('span').textContent = 'LAUNCHING...';
    
    const result = await window.electronAPI.launchGame(selected.path);
    
    setTimeout(() => {
      playBtn.style.opacity = '1';
      playBtn.innerHTML = `<span>PLAY</span>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`;
    }, 1500);

    if (!result.success) {
      alert('Error launching game: ' + result.error);
    }
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href.startsWith('http')) {
      e.preventDefault();
      window.electronAPI.openExternal(link.href);
    }
  });

  // Init
  renderFolders();
});
