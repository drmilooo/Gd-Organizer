<script setup>
import { store } from '../store.js'

const emit = defineEmits([
  'addFolder', 
  'selectPreset', 
  'applyPreset', 
  'deletePreset', 
  'addPreset', 
  'selectFolder',
  'openSettings',
  'closeSettings',
  'changeSettingsTab'
])

const onAddFolder = () => emit('addFolder');
const onSelectPreset = (folder, presetId) => emit('selectPreset', { folder, presetId });
const onApplyPreset = (folder, idx) => emit('applyPreset', { folder, idx });
const onDeletePreset = (folder, idx) => emit('deletePreset', { folder, idx });
const onAddPreset = (folder) => emit('addPreset', folder);
const onSelectFolder = (folderId) => emit('selectFolder', folderId);

const openSettings = () => emit('openSettings');
const closeSettings = () => emit('closeSettings');
const changeTab = (tabId) => emit('changeSettingsTab', tabId);

</script>

<template>
  <div class="sidebar">
    <div class="sidebar-brand">
      <img src="/logo.png" alt="Logo">
      <span>GDOrganizer</span>
    </div>
    
    <div class="sidebar-header">
      <div class="logo" id="sidebar-logo">{{ store.currentDict.sidebar_logo || 'Instances' }}</div>
      <button v-show="!store.settingsMode" class="add-btn" id="add-folder-btn" :title="store.currentDict.add_instance_tip || 'Add Geometry Dash Instance'" @click="onAddFolder">+</button>
    </div>

    <!-- MAIN FOLDER LIST -->
    <div v-show="!store.settingsMode" class="folder-list" id="folder-list">
      <div v-for="f in store.folders" :key="f.id"
           :class="['folder-item', { active: store.currentSelectionId === f.id }]"
           @click.stop="onSelectFolder(f.id)">
           
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <img v-if="f.isGDPS" :src="f.customLogo || '/gdpslogo.png'" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; flex-shrink: 0; background: rgba(255,255,255,0.02);">
          <img v-else :src="f.hasGeode ? '/geodelogo.png' : '/Geometrylogo.png'" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; flex-shrink: 0; background: rgba(255,255,255,0.02);">
          <div style="min-width: 0; flex: 1;">
            <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ f.name }}</h4>
            <p style="margin: 2px 0 0 0; font-size: 10px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ f.path }}</p>
          </div>
        </div>

        <div v-if="store.currentSelectionId === f.id && f.hasGeode" class="presets-container" @click.stop>
          <div v-for="(preset, idx) in f.presets || []" :key="preset.id"
               :class="['preset-item', { active: store.activePresetId === preset.id }]"
               @click.stop="onSelectPreset(f, preset.id)">
            <span :title="preset.name">{{ preset.name }}</span>
            <div class="preset-actions">
              <button class="preset-btn play" title="Apply this preset to files now" @click.stop="onApplyPreset(f, idx)">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button class="preset-btn delete-p" title="Delete this record" @click.stop="onDeletePreset(f, idx)">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
          <button class="add-preset-btn" @click.stop="onAddPreset(f)">+ New Preset</button>
        </div>

      </div>
    </div>

    <!-- SETTINGS NAVIGATION -->
    <div v-show="store.settingsMode" class="settings-nav" id="settings-nav" style="display: flex;">
      <div :class="['settings-nav-item', { active: store.activeSettingsTab === 'general' }]" 
           @click="changeTab('general')" id="nav-general">{{ store.currentDict.settings_nav_general || 'General' }}</div>
      <div :class="['settings-nav-item', { active: store.activeSettingsTab === 'appearance' }]" 
           @click="changeTab('appearance')" id="nav-appearance">{{ store.currentDict.settings_nav_appearance || 'Appearance' }}</div>
      <div :class="['settings-nav-item', { active: store.activeSettingsTab === 'about' }]" 
           @click="changeTab('about')" id="nav-about">{{ store.currentDict.settings_nav_about || 'About' }}</div>
    </div>

    <div class="sidebar-footer">
      <div v-show="!store.settingsMode" class="settings-entry" id="settings-btn" @click="openSettings">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span id="settings-text">{{ store.currentDict.settings || 'Settings' }}</span>
      </div>

      <div v-show="store.settingsMode" class="settings-entry" id="back-home-btn" style="display: flex;" @click="closeSettings">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
        </svg>
        <span id="back-home-text">{{ store.currentDict.back_to_instances || 'Back to Instances' }}</span>
      </div>
    </div>
  </div>
</template>
