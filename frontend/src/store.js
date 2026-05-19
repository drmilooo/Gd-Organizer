import { reactive } from 'vue';

export const store = reactive({
  // Genel Veriler
  folders: [],
  currentSettings: { 
    theme: 'dark', 
    lang: 'en-EN', 
    accent: '#0084cc', 
    accentRgb: '0, 132, 204' 
  },
  currentDict: {},
  
  // Arayüz Durumları (State)
  isInitializing: true,
  settingsMode: false,
  activeSettingsTab: 'general',
  isAddingFolder: false,
  
  // Seçili Öğeler
  currentSelectionId: null,
  activePresetId: null,
  currentMods: [],
  
  // Bekleme Durumları & Modallar için
  pendingFolderPath: null,
  pendingPresetFolder: null,
  pendingToggle: null,
  pendingInstallPath: null,
  
  // Katalog ve Güncellemeler
  modUpdates: {},
  checkingUpdates: false,
  catalog: {
    page: 1,
    query: '',
    total: 0,
    mods: [],
    selectedMod: null
  }
});
