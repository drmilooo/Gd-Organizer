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
	"path/filepath"
	"strings"
	"syscall"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App { return &App{} }
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
	HasGeode bool   `json:"hasGeode"`
	Version  string `json:"version"`
}

func (a *App) AnalyzeGame(folderPath string) GameAnalysis {
	exePath := filepath.Join(folderPath, "GeometryDash.exe")
	if _, err := os.Stat(exePath); os.IsNotExist(err) {
		return GameAnalysis{HasGeode: false, Version: "Not Found"}
	}
	indicators := []string{"Geode.dll", "geode-loader.dll", "XInput9_1_0.dll"}
	hasGeode := false
	for _, ind := range indicators {
		if _, err := os.Stat(filepath.Join(folderPath, ind)); err == nil {
			hasGeode = true
			break
		}
	}
	
	cmd := exec.Command("powershell", "-NoProfile", "-Command", fmt.Sprintf("(Get-Item '%s').VersionInfo.ProductVersion", exePath))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, _ := cmd.Output()
	
	version := strings.TrimSpace(string(out))
	if version == "" { version = "2.206" }
	parts := strings.Split(version, ".")
	if len(parts) >= 4 { version = parts[0] + "." + parts[1] + parts[3] } else if len(parts) == 3 { version = parts[0] + "." + parts[1] + parts[2] }

	return GameAnalysis{HasGeode: hasGeode, Version: version}
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

func (a *App) LaunchGame(folderPath string) {
	exePath := filepath.Join(folderPath, "GeometryDash.exe")
	cmd := exec.Command(exePath)
	cmd.Dir = folderPath
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Start()
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
