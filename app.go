package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/sys/windows"
	"encoding/base64"
)

type App struct {
	ctx context.Context
}

func NewApp() *App { return &App{} }

type LaunchResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	go func() {
		exePath, err := os.Executable()
		if err != nil { return }
		
		desktopPath := filepath.Join(os.Getenv("USERPROFILE"), "Desktop", "GD Organizer.lnk")
		
		if _, err := os.Stat(desktopPath); os.IsNotExist(err) {
			psScript := fmt.Sprintf(`$s=(New-Object -COM WScript.Shell).CreateShortcut('%s'); $s.TargetPath='%s'; $s.IconLocation='%s, 0'; $s.Save()`, desktopPath, exePath, exePath)
			cmd := exec.Command("powershell", "-NoProfile", "-Command", psScript)
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			cmd.Run()
		}
	}()
}

func (a *App) getSavePath(filename string) string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.Getenv("APPDATA")
	}
	dir := filepath.Join(configDir, "GD-Organizer")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			fmt.Println("Error creating config dir:", err)
		}
	}
	return filepath.Join(dir, filename)
}

func (a *App) SaveData(filename string, content string) error {
	path := a.getSavePath(filename)
	err := os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		fmt.Printf("Error saving %s: %v\n", filename, err)
	}
	return err
}

func (a *App) LoadData(filename string) string {
	path := a.getSavePath(filename)
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(data)
}

type GameAnalysis struct {
	HasGeode   bool   `json:"hasGeode"`
	Version    string `json:"version"`
	IsGDPS     bool   `json:"isGDPS"`
	ExeName    string `json:"exeName"`
	CustomLogo string `json:"customLogo"` // Base64 or local identifier
}

func (a *App) getFileVersionNative(filePath string) string {
	vSize, _ := windows.GetFileVersionInfoSize(filePath, nil)
	if vSize <= 0 { return "" }
	vData := make([]byte, vSize)
	if err := windows.GetFileVersionInfo(filePath, 0, vSize, unsafe.Pointer(&vData[0])); err != nil { return "" }
	
	// Try string table
	langs := []string{"040904b0", "040904E4", "080904b0", "000004b0"}
	for _, lang := range langs {
		var vStr *uint16
		var vLen uint32
		query := fmt.Sprintf("\\StringFileInfo\\%s\\ProductVersion", lang)
		if err := windows.VerQueryValue(unsafe.Pointer(&vData[0]), query, unsafe.Pointer(&vStr), &vLen); err == nil && vLen > 0 {
			return windows.UTF16PtrToString(vStr)
		}
	}

	// Fallback to fixed info
	var fixedInfo *windows.VS_FIXEDFILEINFO
	var fixedInfoLen uint32
	if err := windows.VerQueryValue(unsafe.Pointer(&vData[0]), "\\", unsafe.Pointer(&fixedInfo), &fixedInfoLen); err == nil {
		v1 := (fixedInfo.FileVersionMS >> 16) & 0xFFFF
		v2 := (fixedInfo.FileVersionMS) & 0xFFFF
		v3 := (fixedInfo.FileVersionLS >> 16) & 0xFFFF
		v4 := (fixedInfo.FileVersionLS) & 0xFFFF
		if v3 == 0 { return fmt.Sprintf("%d.%d%d", v1, v2, v4) }
		return fmt.Sprintf("%d.%d%d%d", v1, v2, v3, v4)
	}
	return ""
}

func (a *App) AnalyzeGame(folderPath string) GameAnalysis {
	isValidGD := false
	gdCoreDlls := []string{"libcocos2d.dll", "fmod.dll", "glew32.dll"}
	for _, core := range gdCoreDlls {
		if _, err := os.Stat(filepath.Join(folderPath, core)); err == nil {
			isValidGD = true
			break
		}
	}
	if _, err := os.Stat(filepath.Join(folderPath, "Resources")); err == nil {
		isValidGD = true
	}
	if !isValidGD { return GameAnalysis{HasGeode: false, Version: "Not Found"} }

	exePath := filepath.Join(folderPath, "GeometryDash.exe")
	isGDPS := false
	exeName := "GeometryDash.exe"

	if _, err := os.Stat(exePath); os.IsNotExist(err) {
		files, err := os.ReadDir(folderPath)
		if err == nil {
			for _, f := range files {
				name := f.Name()
				if !f.IsDir() && strings.HasSuffix(strings.ToLower(name), ".exe") {
					lower := strings.ToLower(name)
					if lower != "geodeupdater.exe" && !strings.HasPrefix(lower, "unins") && !strings.Contains(lower, "crash") {
						exeName = name
						exePath = filepath.Join(folderPath, exeName)
						isGDPS = true
						break
					}
				}
			}
		}
	}

	// Deep scan for GDPS server correlation if not already flagged
	if !isGDPS && exePath != "" {
		if a.checkGDPSBinary(exePath) {
			isGDPS = true
		}
	}

	indicators := []string{"Geode.dll", "geode-loader.dll", "XInput9_1_0.dll"}
	hasGeode := false
	for _, ind := range indicators {
		if _, err := os.Stat(filepath.Join(folderPath, ind)); err == nil {
			hasGeode = true
			break
		}
	}
	
	version := a.getFileVersionNative(exePath)
	// If the version doesn't start with "2." it's likely a launcher version (like 5.x)
	if version != "" && !strings.HasPrefix(version, "2.") {
		version = ""
	}

	if version == "" && hasGeode {
		v := a.getFileVersionNative(filepath.Join(folderPath, "Geode.dll"))
		if strings.HasPrefix(v, "2.") { version = v }
	}

	// Last resort: Try to find a version pattern in the folder path itself
	// Some pirated/repacked versions (like SteamUnlocked) strip EXE info but put version in folder name
	if version == "" {
		base := filepath.Base(folderPath)
		// Look for patterns like v2.206, 2.2074, etc.
		re := regexp.MustCompile(`[vV]?(2\.\d+)`)
		match := re.FindStringSubmatch(base)
		if len(match) > 1 {
			version = strings.TrimPrefix(strings.ToLower(match[1]), "v")
		}
	}

	version = strings.TrimSpace(version)
	version = strings.ReplaceAll(version, " ", "")
	
	if version == "" {
		version = "2.206" // Default fallback
		if isGDPS { version = "GDPS" }
	}

	customLogo := ""
	if isGDPS && exePath != "" {
		customLogo = a.fetchGDPSLogo(exePath)
	}

	return GameAnalysis{HasGeode: hasGeode, Version: version, IsGDPS: isGDPS, ExeName: exeName, CustomLogo: customLogo}
}

func (a *App) checkGDPSBinary(exePath string) bool {
	f, err := os.Open(exePath)
	if err != nil { return false }
	defer f.Close()

	buffer := make([]byte, 10*1024*1024) 
	n, _ := f.Read(buffer)
	data := string(buffer[:n])

	if strings.Contains(data, "database") {
		official := []string{"boomlings.com", "geometrydash.com"}
		for _, h := range official {
			if strings.Contains(data, h) { return false }
		}
		return true
	}
	return false
}

func (a *App) fetchGDPSLogo(exePath string) string {
	f, err := os.Open(exePath)
	if err != nil { return "" }
	defer f.Close()

	buffer := make([]byte, 10*1024*1024)
	n, _ := f.Read(buffer)
	data := string(buffer[:n])

	// Regex to find potential server URLs
	// We look for http://something/database and take the base
	re := regexp.MustCompile(`(https?://[a-zA-Z0-9\-\.]+(?::\d+)?)/[a-zA-Z0-9\-\.\_/]*database`)
	matches := re.FindStringSubmatch(data)
	if len(matches) < 2 { return "" }
	
	baseURL := matches[1]
	// Possible logo paths
	logoPaths := []string{"/logo.png", "/icon.png", "/icon.ico", "/favicon.ico"}
	
	client := &http.Client{
		Timeout: 5 * 1024 * 1024, // 5ms? no, Timeout is Duration
	}
	client.Timeout = 5 * 1000 * 1000 * 1000 // 5 seconds

	for _, p := range logoPaths {
		resp, err := client.Get(baseURL + p)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			imgData, err := ioutil.ReadAll(resp.Body)
			if err == nil && len(imgData) > 0 {
				// We don't want to store huge files in JSON
				if len(imgData) < 1024*1024 { // Max 1MB
					mime := "image/png"
					if strings.HasSuffix(p, ".ico") { mime = "image/x-icon" }
					encoded := base64.StdEncoding.EncodeToString(imgData)
					return "data:" + mime + ";base64," + encoded
				}
			}
		}
	}
	return ""
}

func (a *App) GetMods(folderPath string) []ModInfo {
	modsPath := filepath.Join(folderPath, "geode", "mods")
	files, err := ioutil.ReadDir(modsPath)
	if err != nil { return []ModInfo{} }

	var results []ModInfo
	for _, f := range files {
		name := f.Name()
		if strings.HasSuffix(name, ".geode") || strings.HasSuffix(name, ".disabled") {
			id := strings.TrimSuffix(strings.TrimSuffix(name, ".disabled"), ".geode")
			info := a.extractModInfoNative(filepath.Join(modsPath, name))
			
			displayName := id
			version := "1.0.0"
			description := ""
			var deps []string

			if info != nil {
				if internalID, ok := info["id"].(string); ok { id = internalID }
				if n, ok := info["name"].(string); ok { displayName = n } else if n, ok := info["n"].(string); ok { displayName = n }
				if v, ok := info["version"].(string); ok { version = v } else if v, ok := info["v"].(string); ok { version = v }
				if d, ok := info["description"].(string); ok { description = d } else if d, ok := info["d"].(string); ok { description = d }
				
				if dependencies, ok := info["dependencies"]; ok {
					switch d := dependencies.(type) {
					case []interface{}:
						for _, dep := range d {
							if dID, ok := dep.(string); ok {
								deps = append(deps, dID)
							} else if dMap, ok := dep.(map[string]interface{}); ok {
								if dID, ok := dMap["id"].(string); ok {
									deps = append(deps, dID)
								}
							}
						}
					case map[string]interface{}:
						for k := range d {
							deps = append(deps, k)
						}
					}
				}
			}

			results = append(results, ModInfo{
				ID: id, Name: displayName, Enabled: !strings.HasSuffix(name, ".disabled"), File: name, Version: version, Description: description, Dependencies: deps,
			})
		}
	}
	return results
}

func (a *App) extractModInfoNative(zipPath string) map[string]interface{} {
	r, err := zip.OpenReader(zipPath)
	if err != nil { return nil }
	defer r.Close()
	for _, f := range r.File {
		if f.Name == "mod.json" {
			rc, err := f.Open()
			if err != nil { return nil }
			defer rc.Close()
			var data map[string]interface{}
			json.NewDecoder(rc).Decode(&data)
			return data
		}
	}
	return nil
}

func (a *App) ToggleMod(folderPath string, modID string, enabled bool, fileName string) map[string]interface{} {
	modsPath := filepath.Join(folderPath, "geode", "mods")
	oldPath := filepath.Join(modsPath, fileName)
	newName := strings.TrimSuffix(strings.TrimSuffix(fileName, ".disabled"), ".geode")
	if !enabled { newName += ".geode.disabled" } else { newName += ".geode" }
	os.Rename(oldPath, filepath.Join(modsPath, newName))
	return map[string]interface{}{"success": true}
}

func (a *App) LaunchGame(folderPath string, exeName string) LaunchResult {
	exePath := ""
	if exeName != "" {
		exePath = filepath.Join(folderPath, exeName)
		if _, err := os.Stat(exePath); os.IsNotExist(err) {
			exePath = "" // Known name is missing, fallback to search
		}
	}

	if exePath == "" {
		exePath = filepath.Join(folderPath, "GeometryDash.exe")
		if _, err := os.Stat(exePath); os.IsNotExist(err) {
			files, err := os.ReadDir(folderPath)
			if err != nil {
				return LaunchResult{Success: false, Error: "Could not read directory"}
			}
			found := false
			for _, f := range files {
				name := f.Name()
				if !f.IsDir() && strings.HasSuffix(strings.ToLower(name), ".exe") {
					lower := strings.ToLower(name)
					if lower != "geodeupdater.exe" && !strings.HasPrefix(lower, "unins") && !strings.Contains(lower, "crash") {
						exePath = filepath.Join(folderPath, name)
						found = true
						break
					}
				}
			}
			if !found {
				return LaunchResult{Success: false, Error: "Game executable not found"}
			}
		}
	}

	cmd := exec.Command(exePath)
	cmd.Dir = folderPath
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	err := cmd.Start()
	if err != nil {
		return LaunchResult{Success: false, Error: err.Error()}
	}
	return LaunchResult{Success: true}
}

func (a *App) OpenFolder() string {
	res, _ := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select GD Folder"})
	return res
}

func (a *App) OpenFile(filters []runtime.FileFilter) string {
	res, _ := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{Title: "Select File", Filters: filters})
	return res
}

func (a *App) DeleteMod(folderPath string, fileName string) map[string]interface{} {
	os.Remove(filepath.Join(folderPath, "geode", "mods", fileName))
	return map[string]interface{}{"success": true}
}

func (a *App) InstallMod(targetPath string, sourcePath string) map[string]interface{} {
	dest := filepath.Join(targetPath, "geode", "mods", filepath.Base(sourcePath))
	out, _ := os.Create(dest); defer out.Close()
	in, _ := os.Open(sourcePath); defer in.Close()
	io.Copy(out, in)
	return map[string]interface{}{"success": true}
}

func (a *App) GetSingleModInfo(path string) map[string]interface{} { return a.extractModInfoNative(path) }

func (a *App) FetchModInfo(id string) map[string]interface{} {
	resp, _ := http.Get("https://api.geode-sdk.org/v1/mods/" + id)
	if resp == nil { return nil }; defer resp.Body.Close()
	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	return res
}

func (a *App) BrowseCatalog(page int, query string, gdVersion string) map[string]interface{} {
	if gdVersion == "" { gdVersion = "2.206" }
	url := fmt.Sprintf("https://api.geode-sdk.org/v1/mods?page=%d&per_page=15&status=accepted&platforms=win&gd=%s", page, gdVersion)
	if query != "" { url += "&query=" + query }
	resp, err := http.Get(url)
	if err != nil || resp == nil { return map[string]interface{}{"total": 0, "mods": []interface{}{}} }
	defer resp.Body.Close()
	
	body, _ := ioutil.ReadAll(resp.Body)
	var raw map[string]interface{}
	json.Unmarshal(body, &raw)
	
	total := 0
	var finalMods []map[string]interface{}

	if payload, ok := raw["payload"].(map[string]interface{}); ok {
		if c, ok := payload["count"].(float64); ok { total = int(c) }
		
		if data, ok := payload["data"].([]interface{}); ok {
			for _, mRaw := range data {
				m, ok := mRaw.(map[string]interface{})
				if !ok { continue }

				id, _ := m["id"].(string)
				downloads, _ := m["download_count"].(float64)
				featured, _ := m["featured"].(bool)
				
				name := id
				desc := ""
				version := "?"
				downloadLink := ""
				developer := "Unknown"

				if versions, ok := m["versions"].([]interface{}); ok && len(versions) > 0 {
					if v0, ok := versions[0].(map[string]interface{}); ok {
						if n, ok := v0["name"].(string); ok { name = n }
						if d, ok := v0["description"].(string); ok { desc = d }
						if ver, ok := v0["version"].(string); ok { version = ver }
						if dl, ok := v0["download_link"].(string); ok { downloadLink = dl }
					}
				}

				if devs, ok := m["developers"].([]interface{}); ok {
					for _, devRaw := range devs {
						if dev, ok := devRaw.(map[string]interface{}); ok {
							isOwner, _ := dev["is_owner"].(bool)
							if isOwner {
								if dName, ok := dev["display_name"].(string); ok { developer = dName }
								break
							}
						}
					}
				}

				finalMods = append(finalMods, map[string]interface{}{
					"id": id,
					"name": name,
					"description": desc,
					"version": version,
					"developer": developer,
					"downloads": downloads,
					"download_link": downloadLink,
					"featured": featured,
				})
			}
		}
	}

	if finalMods == nil { finalMods = []map[string]interface{}{} }

	return map[string]interface{}{
		"total": total,
		"mods": finalMods,
	}
}

func (a *App) DownloadCatalogMod(folderPath string, downloadURL string, modID string) map[string]interface{} {
	dest := filepath.Join(folderPath, "geode", "mods", modID+".geode")
	out, err := os.Create(dest); if err != nil { return map[string]interface{}{"success": false, "error": err.Error()} }; defer out.Close()
	resp, err := http.Get(downloadURL); if err != nil { return map[string]interface{}{"success": false, "error": err.Error()} }; defer resp.Body.Close()
	io.Copy(out, resp.Body)
	return map[string]interface{}{"success": true}
}

func (a *App) CloseWindow() { runtime.Quit(a.ctx) }
func (a *App) MinimizeWindow() { runtime.WindowMinimise(a.ctx) }

type ModInfo struct {
	ID string `json:"id"`; Name string `json:"name"`; Enabled bool `json:"enabled"`; Version string `json:"version"`; Description string `json:"description"`; File string `json:"file"`; Dependencies []string `json:"dependencies"`
}
