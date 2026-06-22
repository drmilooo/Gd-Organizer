package main

import (
	"archive/zip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/sys/windows"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.ensureDesktopShortcut()
}

// ensureDesktopShortcut creates a shortcut if it doesn't exist
func (a *App) ensureDesktopShortcut() {
	go func() {
		exePath, err := os.Executable()
		if err != nil {
			return
		}
		
		desktopPath := filepath.Join(os.Getenv("USERPROFILE"), "Desktop", "GD Organizer.lnk")
		
		if _, err := os.Stat(desktopPath); os.IsNotExist(err) {
			psScript := fmt.Sprintf(`$s=(New-Object -COM WScript.Shell).CreateShortcut('%s'); $s.TargetPath='%s'; $s.IconLocation='%s, 0'; $s.Save()`, desktopPath, exePath, exePath)
			cmd := exec.Command("powershell", "-NoProfile", "-Command", psScript)
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			_ = cmd.Run()
		}
	}()
}

// Data Utility
func (a *App) getSavePath(filename string) string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.Getenv("APPDATA")
	}
	dir := filepath.Join(configDir, "GD-Organizer")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		_ = os.MkdirAll(dir, 0755)
	}
	return filepath.Join(dir, filename)
}

func (a *App) SaveData(filename string, content string) error {
	path := a.getSavePath(filename)
	return os.WriteFile(path, []byte(content), 0644)
}

func (a *App) LoadData(filename string) string {
	path := a.getSavePath(filename)
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(data)
}

// Mod Models
type ModInfo struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Enabled      bool     `json:"enabled"`
	Version      string   `json:"version"`
	Description  string   `json:"description"`
	File         string   `json:"file"`
	Dependencies []string `json:"dependencies"`
	Icon         string   `json:"icon"`
}

type GameAnalysis struct {
	HasGeode   bool   `json:"hasGeode"`
	Version    string `json:"version"`
	IsGDPS     bool   `json:"isGDPS"`
	ExeName    string `json:"exeName"`
	CustomLogo string `json:"customLogo"`
}

type LaunchResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

// Game Analysis Logic
func (a *App) AnalyzeGame(folderPath string) GameAnalysis {
	exeName, isGDPS, found := a.findGDExecutable(folderPath)
	if !found {
		return GameAnalysis{HasGeode: false, Version: "Not Found"}
	}

	exePath := filepath.Join(folderPath, exeName)
	hasGeode := a.checkGeodeExistence(folderPath)
	version := a.detectGDVersion(exePath, folderPath, hasGeode, isGDPS)

	customLogo := ""
	if isGDPS {
		customLogo = a.fetchGDPSLogo(exePath)
	}

	return GameAnalysis{
		HasGeode:   hasGeode,
		Version:    version,
		IsGDPS:     isGDPS,
		ExeName:    exeName,
		CustomLogo: customLogo,
	}
}

func (a *App) findGDExecutable(folderPath string) (name string, isGDPS bool, found bool) {
	// 1. Check Standard Name
	stdExe := "GeometryDash.exe"
	if _, err := os.Stat(filepath.Join(folderPath, stdExe)); err == nil {
		return stdExe, false, true
	}

	// 2. Scan for fallbacks
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return "", false, false
	}

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		n := f.Name()
		low := strings.ToLower(n)
		if strings.HasSuffix(low, ".exe") {
			// Filter out obviously non-game EXEs
			if low != "geodeupdater.exe" && 
			   !strings.HasPrefix(low, "unins") && 
			   !strings.Contains(low, "crash") &&
			   !strings.Contains(low, "dxwebsetup") {
				return n, true, true
			}
		}
	}

	// 3. Last check for core DLLs as a proxy of GD folder
	coreDlls := []string{"libcocos2d.dll", "fmod.dll", "glew32.dll"}
	for _, dll := range coreDlls {
		if _, err := os.Stat(filepath.Join(folderPath, dll)); err == nil {
			return "", false, true // Folder is GD, but EXE is missing/named weirdly
		}
	}

	return "", false, false
}

func (a *App) checkGeodeExistence(folderPath string) bool {
	indicators := []string{"Geode.dll", "geode-loader.dll", "XInput9_1_0.dll"}
	for _, ind := range indicators {
		if _, err := os.Stat(filepath.Join(folderPath, ind)); err == nil {
			return true
		}
	}
	return false
}

func (a *App) detectGDVersion(exePath string, folderPath string, hasGeode bool, isGDPS bool) string {
	version := a.getFileVersionNative(exePath)
	
	// Filter launcher/installer versions
	if version != "" && !strings.HasPrefix(version, "2.") {
		version = ""
	}

	if version == "" && hasGeode {
		v := a.getFileVersionNative(filepath.Join(folderPath, "Geode.dll"))
		if strings.HasPrefix(v, "2.") {
			version = v
		}
	}

	if version == "" {
		re := regexp.MustCompile(`[vV]?(2\.\d+)`)
		match := re.FindStringSubmatch(filepath.Base(folderPath))
		if len(match) > 1 {
			version = strings.TrimPrefix(strings.ToLower(match[1]), "v")
		}
	}

	if version == "" {
		if isGDPS {
			return "GDPS"
		}
		return "2.206" // Default fallback
	}

	return strings.TrimSpace(version)
}

func (a *App) getFileVersionNative(filePath string) string {
	vSize, _ := windows.GetFileVersionInfoSize(filePath, nil)
	if vSize <= 0 {
		return ""
	}
	vData := make([]byte, vSize)
	if err := windows.GetFileVersionInfo(filePath, 0, vSize, unsafe.Pointer(&vData[0])); err != nil {
		return ""
	}
	
	langs := []string{"040904b0", "040904E4", "080904b0", "000004b0"}
	for _, lang := range langs {
		var vStr *uint16
		var vLen uint32
		query := fmt.Sprintf("\\StringFileInfo\\%s\\ProductVersion", lang)
		if err := windows.VerQueryValue(unsafe.Pointer(&vData[0]), query, unsafe.Pointer(&vStr), &vLen); err == nil && vLen > 0 {
			return windows.UTF16PtrToString(vStr)
		}
	}

	var fixedInfo *windows.VS_FIXEDFILEINFO
	var fixedInfoLen uint32
	if err := windows.VerQueryValue(unsafe.Pointer(&vData[0]), "\\", unsafe.Pointer(&fixedInfo), &fixedInfoLen); err == nil {
		v1 := (fixedInfo.FileVersionMS >> 16) & 0xFFFF
		v2 := (fixedInfo.FileVersionMS) & 0xFFFF
		v3 := (fixedInfo.FileVersionLS >> 16) & 0xFFFF
		v4 := (fixedInfo.FileVersionLS) & 0xFFFF
		if v3 == 0 {
			return fmt.Sprintf("%d.%d%d", v1, v2, v4)
		}
		return fmt.Sprintf("%d.%d%d%d", v1, v2, v3, v4)
	}
	return ""
}

// GDPS Helper
func (a *App) fetchGDPSLogo(exePath string) string {
	data, err := os.ReadFile(exePath)
	if err != nil {
		// Try partial read if file is huge
		f, err := os.Open(exePath)
		if err != nil { return "" }
		defer f.Close()
		buf := make([]byte, 5*1024*1024)
		n, _ := f.Read(buf)
		data = buf[:n]
	}

	re := regexp.MustCompile(`(https?://[a-zA-Z0-9\-\.]+(?::\d+)?)/[a-zA-Z0-9\-\.\_/]*database`)
	matches := re.FindStringSubmatch(string(data))
	if len(matches) < 2 {
		return ""
	}
	
	baseURL := matches[1]
	client := &http.Client{Timeout: 3 * time.Second}
	paths := []string{"/logo.png", "/icon.png", "/favicon.ico"}
	
	for _, p := range paths {
		resp, err := client.Get(baseURL + p)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			img, _ := io.ReadAll(resp.Body)
			if len(img) > 0 && len(img) < 512*1024 {
				mime := "image/png"
				if strings.HasSuffix(p, ".ico") { mime = "image/x-icon" }
				return "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(img)
			}
		}
	}
	return ""
}

// Mod Management
func (a *App) GetMods(folderPath string) []ModInfo {
	modsPath := filepath.Join(folderPath, "geode", "mods")
	files, err := os.ReadDir(modsPath)
	if err != nil {
		return []ModInfo{}
	}

	var results []ModInfo
	for _, f := range files {
		n := f.Name()
		if !strings.HasSuffix(n, ".geode") && !strings.HasSuffix(n, ".disabled") {
			continue
		}

		fullPath := filepath.Join(modsPath, n)
		id := strings.TrimSuffix(strings.TrimSuffix(n, ".disabled"), ".geode")
		
		info, icon := a.extractModResources(fullPath)
		
		// Defaults
		displayName := id
		version := "1.0.0"
		description := ""
		var deps []string

		if info != nil {
			if s, ok := info["id"].(string); ok { id = s }
			if s, ok := info["name"].(string); ok { displayName = s } else if s, ok := info["n"].(string); ok { displayName = s }
			if s, ok := info["version"].(string); ok { version = s } else if s, ok := info["v"].(string); ok { version = s }
			if s, ok := info["description"].(string); ok { description = s } else if s, ok := info["d"].(string); ok { description = s }
			
			if d, ok := info["dependencies"]; ok {
				switch v := d.(type) {
				case []interface{}:
					for _, item := range v {
						if sid, ok := item.(string); ok { deps = append(deps, sid) }
						if m, ok := item.(map[string]interface{}); ok {
							if sid, ok := m["id"].(string); ok { deps = append(deps, sid) }
						}
					}
				case map[string]interface{}:
					for k := range v { deps = append(deps, k) }
				}
			}
		}

		results = append(results, ModInfo{
			ID: id, Name: displayName, Enabled: !strings.HasSuffix(n, ".disabled"),
			File: n, Version: version, Description: description,
			Dependencies: deps, Icon: icon,
		})
	}
	return results
}

func (a *App) extractModResources(zipPath string) (info map[string]interface{}, icon string) {
	r, err := zip.OpenReader(zipPath)
	if err != nil { return nil, "" }
	defer r.Close()

	for _, f := range r.File {
		if f.Name == "mod.json" {
			rc, err := f.Open()
			if err == nil {
				_ = json.NewDecoder(rc).Decode(&info)
				rc.Close()
			}
		}
		if icon == "" && (f.Name == "logo.png" || f.Name == "icon.png") {
			rc, err := f.Open()
			if err == nil {
				data, _ := io.ReadAll(rc)
				if len(data) > 0 {
					icon = "data:image/png;base64," + base64.StdEncoding.EncodeToString(data)
				}
				rc.Close()
			}
		}
	}
	return
}

func (a *App) ToggleMod(folderPath string, modID string, enabled bool, fileName string) map[string]interface{} {
	modsPath := filepath.Join(folderPath, "geode", "mods")
	oldPath := filepath.Join(modsPath, fileName)
	
	base := strings.TrimSuffix(strings.TrimSuffix(fileName, ".disabled"), ".geode")
	newName := base + ".geode"
	if !enabled {
		newName += ".disabled"
	}
	
	_ = os.Rename(oldPath, filepath.Join(modsPath, newName))
	return map[string]interface{}{"success": true}
}

func (a *App) BulkToggleMods(folderPath string, operations []map[string]interface{}) map[string]interface{} {
	modsPath := filepath.Join(folderPath, "geode", "mods")
	for _, op := range operations {
		fileName, _ := op["file"].(string)
		enabled, _ := op["enabled"].(bool)
		
		oldPath := filepath.Join(modsPath, fileName)
		base := strings.TrimSuffix(strings.TrimSuffix(fileName, ".disabled"), ".geode")
		newName := base + ".geode"
		if !enabled {
			newName += ".disabled"
		}
		
		_ = os.Rename(oldPath, filepath.Join(modsPath, newName))
	}
	return map[string]interface{}{"success": true}
}

func (a *App) LaunchGame(folderPath string, exeName string) LaunchResult {
	finalExe := ""
	if exeName != "" {
		p := filepath.Join(folderPath, exeName)
		if _, err := os.Stat(p); err == nil {
			finalExe = p
		}
	}

	if finalExe == "" {
		name, _, found := a.findGDExecutable(folderPath)
		if !found {
			return LaunchResult{Success: false, Error: "Executable not found"}
		}
		finalExe = filepath.Join(folderPath, name)
	}

	cmd := exec.Command(finalExe)
	cmd.Dir = folderPath
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Start(); err != nil {
		return LaunchResult{Success: false, Error: err.Error()}
	}
	return LaunchResult{Success: true}
}

// Wails Bindings
func (a *App) OpenFolder() string {
	res, _ := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select GD Folder"})
	return res
}

func (a *App) OpenFile(filters []runtime.FileFilter) string {
	res, _ := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select File", Filters: filters})
	return res
}

func (a *App) DeleteMod(folderPath string, fileName string) map[string]interface{} {
	err := os.Remove(filepath.Join(folderPath, "geode", "mods", fileName))
	return map[string]interface{}{"success": err == nil, "error": fmt.Sprint(err)}
}

func (a *App) InstallMod(targetPath string, sourcePath string) map[string]interface{} {
	dest := filepath.Join(targetPath, "geode", "mods", filepath.Base(sourcePath))
	in, _ := os.Open(sourcePath); defer in.Close()
	out, _ := os.Create(dest); defer out.Close()
	_, err := io.Copy(out, in)
	return map[string]interface{}{"success": err == nil}
}

func (a *App) FetchModInfo(id string) map[string]interface{} {
	resp, err := http.Get("https://api.geode-sdk.org/v1/mods/" + id)
	if err != nil || resp == nil { return nil }
	defer resp.Body.Close()
	var res map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&res)
	return res
}

func (a *App) BrowseCatalog(page int, query string, gdVersion string) map[string]interface{} {
	if gdVersion == "" { gdVersion = "2.206" }
	url := fmt.Sprintf("https://api.geode-sdk.org/v1/mods?page=%d&per_page=15&status=accepted&platforms=win&gd=%s", page, gdVersion)
	if query != "" { url += "&query=" + query }
	
	resp, err := http.Get(url)
	if err != nil || resp == nil { return map[string]interface{}{"total": 0, "mods": []interface{}{}} }
	defer resp.Body.Close()
	
	var raw map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&raw)
	
	total := 0
	var finalMods []map[string]interface{}

	if payload, ok := raw["payload"].(map[string]interface{}); ok {
		if c, ok := payload["count"].(float64); ok { total = int(c) }
		if data, ok := payload["data"].([]interface{}); ok {
			for _, item := range data {
				m, _ := item.(map[string]interface{})
				if m == nil { continue }

				id, _ := m["id"].(string)
				downloads, _ := m["download_count"].(float64)
				featured, _ := m["featured"].(bool)
				
				name, desc, version, dlLink, devName := id, "", "?", "", "Unknown"

				if versions, ok := m["versions"].([]interface{}); ok && len(versions) > 0 {
					if v0, ok := versions[0].(map[string]interface{}); ok {
						if s, ok := v0["name"].(string); ok { name = s }
						if s, ok := v0["description"].(string); ok { desc = s }
						if s, ok := v0["version"].(string); ok { version = s }
						if s, ok := v0["download_link"].(string); ok { dlLink = s }
					}
				}

				if devs, ok := m["developers"].([]interface{}); ok {
					for _, dItem := range devs {
						if d, ok := dItem.(map[string]interface{}); ok {
							if owner, _ := d["is_owner"].(bool); owner {
								if s, ok := d["display_name"].(string); ok { devName = s }
								break
							}
						}
					}
				}

				finalMods = append(finalMods, map[string]interface{}{
					"id": id, "name": name, "description": desc, "version": version,
					"developer": devName, "downloads": downloads, "download_link": dlLink,
					"featured": featured,
				})
			}
		}
	}

	return map[string]interface{}{ "total": total, "mods": finalMods }
}

func (a *App) DownloadCatalogMod(folderPath string, downloadURL string, modID string) map[string]interface{} {
	dest := filepath.Join(folderPath, "geode", "mods", modID+".geode")
	resp, err := http.Get(downloadURL)
	if err != nil { return map[string]interface{}{"success": false} }
	defer resp.Body.Close()
	
	out, _ := os.Create(dest); defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return map[string]interface{}{"success": err == nil}
}

func (a *App) ReadLogs(folderPath string) string {
	path := filepath.Join(folderPath, "geode", "logs", "latest.log")
	data, err := os.ReadFile(path)
	if err != nil { return "Log file not found." }
	return string(data)
}

func (a *App) UpdateMod(folderPath string, id string, downloadURL string) map[string]interface{} {
	dest := filepath.Join(folderPath, "geode", "mods", id+".geode")
	temp := dest + ".tmp"

	resp, err := http.Get(downloadURL)
	if err != nil { return map[string]interface{}{"success": false} }
	defer resp.Body.Close()

	out, _ := os.Create(temp); defer out.Close()
	_, _ = io.Copy(out, resp.Body)
	out.Close()

	_ = os.Remove(dest)
	_ = os.Remove(dest + ".disabled")
	_ = os.Rename(temp, dest)

	return map[string]interface{}{"success": true}
}

func (a *App) CloseApp() { runtime.Quit(a.ctx) }
func (a *App) MinimizeApp() { runtime.WindowMinimise(a.ctx) }

func (a *App) GetSingleModInfo(path string) map[string]interface{} {
	info, _ := a.extractModResources(path)
	return info
}
