const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

ipcMain.handle('game:openExternal', async (event, url) => {
  if (url.startsWith('http')) {
    shell.openExternal(url);
  }
});

ipcMain.handle('game:fetchModInfo', async (event, modId) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.geode-sdk.org',
      path: `/v1/mods/${modId}`,
      method: 'GET',
      headers: { 'User-Agent': 'GD-Organizer-Launcher/1.0' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.payload || null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#08080a',
      symbolColor: '#ffffff',
      height: 30,
      _author: 'drmilooo'
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('dialog:openFile', async (event, filters) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('game:deleteMod', async (event, folderPath, modFileName) => {
  try {
    const p1 = path.join(folderPath, 'geode', 'mods', modFileName);
    const p2 = path.join(folderPath, 'geode', 'mods', modFileName + '.disabled');
    
    if (fs.existsSync(p1)) fs.unlinkSync(p1);
    if (fs.existsSync(p2)) fs.unlinkSync(p2);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('game:installMod', async (event, folderPath, sourcePath) => {
  try {
    const destDir = path.join(folderPath, 'geode', 'mods');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);
    
    fs.copyFileSync(sourcePath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('game:getSingleModInfo', async (event, filePath) => {
  try {
    const escapedPath = "'" + filePath.replace(/'/g, "''") + "'";
    const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; try { $z = [System.IO.Compression.ZipFile]::OpenRead(${escapedPath}); $e = $z.Entries | ?{$_.Name -eq 'mod.json'}; if($e){ $s = $e.Open(); $r = New-Object System.IO.StreamReader($s); $j = $r.ReadToEnd(); $r.Close(); $s.Close(); write-host $j }else{ write-host '{}' }; $z.Dispose(); } catch { write-host '{}' }"`;
    
    const output = execSync(psCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return JSON.parse(output || '{}');
  } catch (err) {
    return {};
  }
});

ipcMain.handle('game:analyze', async (event, folderPath) => {
  let hasGeode = false;
  let version = "2.206";
  
  try {
    const exePath = path.join(folderPath, 'GeometryDash.exe');
    if (!fs.existsSync(exePath)) return { hasGeode: false, version: "Not Found" };

    const indicators = ['Geode.dll', 'geode-loader.dll', 'XInput9_1_0.dll'];
    hasGeode = indicators.some(ind => fs.existsSync(path.join(folderPath, ind)));
    
    
    try {
      const psCmd = `powershell -command "$v = (Get-Item '${exePath}').VersionInfo; if ($v.FileVersion) { $v.FileVersion } elseif ($v.ProductVersion) { $v.ProductVersion } else { '' }"`;
      let result = execSync(psCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (result && result !== "0.0.0.0" && result !== "1.0.0.0") version = result;
      else {
        const stats = fs.statSync(exePath);
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB < 9) version = "2.1";
        else version = "2.2";
      }
    } catch (e) { value = "Detected"; }
    version = version.replace(/, /g, '.').replace(/,/g, '.').trim();
    if (version.startsWith('1.0.0.')) version = "2.206";
  } catch (err) { version = "Detected"; }

  return { hasGeode, version };
});

ipcMain.handle('game:toggleMod', async (event, folderPath, modId, enabled) => {
  const savePoints = [
    path.join(folderPath, 'geode', 'save', 'geode.loader', 'saved.json'),
    path.join(process.env.LOCALAPPDATA || '', 'GeometryDash', 'geode', 'mods', 'geode.loader', 'saved.json'),
    path.join(process.env.LOCALAPPDATA || '', 'GeometryDash', 'geode', 'config', 'geode.loader', 'saved.json')
  ];

  for (const sp of savePoints) {
    if (fs.existsSync(sp)) {
      try {
        const content = fs.readFileSync(sp, 'utf-8');
        const saved = JSON.parse(content);
        
        saved[`should-load-${modId}`] = enabled;
        
        fs.writeFileSync(sp, JSON.stringify(saved, null, 4), 'utf-8');
        return { success: true };
      } catch (e) {
        console.error("Toggle error:", e);
      }
    }
  }
  return { success: false, error: "Save file not found" };
});

ipcMain.handle('game:getMods', async (event, folderPath) => {
  const modsPath = path.join(folderPath, 'geode', 'mods');
  if (!fs.existsSync(modsPath)) return [];

  const disabledIds = new Set();
  const searchConfig = (dir) => {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) searchConfig(fullPath);
        else if (entry.name.endsWith('.json')) {
          try {
            const cfg = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            if (Array.isArray(cfg.disabled)) cfg.disabled.forEach(id => disabledIds.add(String(id)));
            for (const [k, v] of Object.entries(cfg)) {
              if (k.startsWith('should-load-') && v === false) disabledIds.add(k.replace('should-load-', ''));
              if (v && v.enabled === false) disabledIds.add(k);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  };
  
  searchConfig(path.join(folderPath, 'geode'));
  if (process.env.LOCALAPPDATA) searchConfig(path.join(process.env.LOCALAPPDATA, 'GeometryDash', 'geode'));

  try {
    const files = fs.readdirSync(modsPath).filter(f => f.match(/\.geode(\.disabled)?$/));
    if (files.length === 0) return [];

    const escapedPaths = files.slice(0, 100).map(f => "'" + path.join(modsPath, f).replace(/'/g, "''") + "'").join(',');
    
    const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $p = @(${escapedPaths}); $out = @(); foreach($a in $p){ try { $z = [System.IO.Compression.ZipFile]::OpenRead($a); $e = $z.Entries | ?{$_.Name -eq 'mod.json'}; if($e){ $s = $e.Open(); $r = New-Object System.IO.StreamReader($s); $j = $r.ReadToEnd(); $o = $j | ConvertFrom-Json; $d = @(); if($o.dependencies){ if($o.dependencies -is [System.Array]){ foreach($dp in $o.dependencies){ if($dp.id){ $d += $dp.id }else{ $d += $dp } } }else{ foreach($k in $o.dependencies.PSObject.Properties.Name){ $d += $k } } }; $out += [PSCustomObject]@{i=$o.id; n=$o.name; d=$d; desc=$o.description; v=$o.version}; $r.Close(); $s.Close(); }else{ $fn = [System.IO.Path]::GetFileNameWithoutExtension($a).Replace('.geode',''); $out += [PSCustomObject]@{i=$fn; n=$fn; d=@(); desc=''; v='' } }; $z.Dispose(); } catch { $fn = [System.IO.Path]::GetFileNameWithoutExtension($a).Replace('.geode',''); $out += [PSCustomObject]@{i=$fn; n=$fn; d=@(); desc=''; v='' } } }; $out | ConvertTo-Json -Compress"`;
    
    let output = "";
    try {
      output = execSync(psCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim();
    } catch(e) { console.error("PS Failed:", e); }

    let resultsArray = [];
    if (output) {
      try {
        const parsed = JSON.parse(output);
        resultsArray = Array.isArray(parsed) ? parsed : [parsed];
      } catch(e) { console.error("JSON Parse Failed:", e); }
    }

    return files.slice(0, 100).map((file, idx) => {
      const res = resultsArray[idx] || {};
      const id = res.i || file.replace('.geode', '').replace('.disabled', '');
      const name = res.n || id;
      const dependencies = res.d || [];
      const description = res.desc || 'No description available.';
      const version = res.v || 'Unknown';

      return {
        id: id,
        name: name,
        file: file,
        enabled: !disabledIds.has(id) && !file.endsWith('.disabled'),
        dependencies: Array.isArray(dependencies) ? dependencies : [],
        description: description,
        version: version
      };
    });
  } catch (err) {
    console.error("Critical Error in getMods:", err);
    return [];
  }
});

ipcMain.handle('game:launch', async (event, folderPath) => {
  const exePath = path.join(folderPath, 'GeometryDash.exe');
  if (fs.existsSync(exePath)) {
    const child = spawn(exePath, [], { cwd: folderPath, detached: true });
    child.unref();
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});
