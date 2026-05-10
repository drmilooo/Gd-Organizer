Add-Type -AssemblyName System.IO.Compression.FileSystem
$modsPath = "C:\Users\Administrator\Downloads\Goemetry dick\geode\mods"
$files = Get-ChildItem -Path $modsPath -Filter "*.geode"

$results = @()
foreach ($file in $files) {
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
        $entry = $zip.Entries | Where-Object { $_.Name -eq "mod.json" }
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $json = $content | ConvertFrom-Json
            
            $deps = @()
            if ($json.dependencies) {
                foreach ($dep in $json.dependencies) {
                    if ($dep.id) { $deps += $dep.id } else { $deps += $dep }
                }
            }
            
            $results += [PSCustomObject]@{
                file = $file.Name
                id = $json.id
                name = $json.name
                dependencies = $deps
            }
            $reader.Close()
            $stream.Close()
        }
        $zip.Dispose()
    } catch {
        # Skip
    }
}

$results | ConvertTo-Json
