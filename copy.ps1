# --------------------------------------------------------------------------
# REKURSIVE SUCHE NACH DATEIEN mit speziellen Filter-Regeln:
#
# Ihre Beschreibung und Anmerkungen hier...
# --------------------------------------------------------------------------

# Basisverzeichnis definieren
$baseDirectory = "C:\00_mldata\programming\FinWise\FinWise_0.1"
$baseDirectoryFull = [System.IO.Path]::GetFullPath($baseDirectory)

# --------------------------------------------------------------------------
# Konfiguration der Verzeichnisse
# --------------------------------------------------------------------------
$excludedDirectories = @(
    "node_modules",
    "dist",
    "src"
)

$includeDirectories = @(
    "./src/components/transaction"

)

# --------------------------------------------------------------------------
# Konfiguration der Dateifilter
# --------------------------------------------------------------------------
$excludeFiles = @(
    "./*.*",
    #"main.js",
    #"app.vue",
    "Trans*"
)

$searchFiles = @(
    "./src/views/TransactionsView.vue",
    "./src/components/transaction/*.vue",
    "./src/stores/transactionStore.ts"

)

# --------------------------------------------------------------------------
# Vorab Informationen laden
# --------------------------------------------------------------------------
$output = @()

# 1. Lade den Inhalt der Datei prompt_GPT_Instructions.md
$instructionsPath = Join-Path $baseDirectoryFull "prompt_GPT_Instructions.md"
if (Test-Path $instructionsPath) {
    $output += Get-Content -Path $instructionsPath -Encoding UTF8 -Raw
} else {
    $output += "Die Datei 'prompt_GPT_Instructions.md' konnte nicht gefunden werden.`n"
}

# 2. Füge eine Zeile mit "## Requirements and Context:"
$output += "## Requirements and Context:`n"

# 3. Lade den Inhalt der Datei prompt_requirements.md
$requirementsPath = Join-Path $baseDirectoryFull "prompt_requirements.md"
if (Test-Path $requirementsPath) {
    $output += Get-Content -Path $requirementsPath -Encoding UTF8 -Raw
} else {
    $output += "Die Datei 'prompt_requirements.md' konnte nicht gefunden werden.`n"
}

# 4. Füge eine Zwischenüberschrift "## Foldersystem and existing files" hinzu
$output += "`n## Foldersystem and existing files`n"

# 5. Füge die Ausgabe von tree ./src /F hinzu
$output += "### Struktur von ./src:`n"
# Tree-Befehl erzeugt keinen UTF-8 Output, daher muss hier nichts angepasst werden.
$output += (tree (Join-Path $baseDirectoryFull "src") /F 2>&1) + "`n"

# 6. Füge die Ausgabe von tree ./test /F hinzu
$output += "### Struktur von ./tests:`n"
# Tree-Befehl erzeugt keinen UTF-8 Output, daher muss hier nichts angepasst werden.
$output += (tree (Join-Path $baseDirectoryFull "tests") /F 2>&1) + "`n"

# --------------------------------------------------------------------------
# Normalize the configured directories to absolute paths
# --------------------------------------------------------------------------
$normalizedExcludedDirs = @()
foreach ($dir in $excludedDirectories) {
    $norm = [System.IO.Path]::GetFullPath((Join-Path $baseDirectoryFull $dir))
    $normalizedExcludedDirs += $norm
}

$normalizedIncludeDirs = @()
foreach ($dir in $includeDirectories) {
    $norm = [System.IO.Path]::GetFullPath((Join-Path $baseDirectoryFull $dir))
    $normalizedIncludeDirs += $norm
}

# --------------------------------------------------------------------------
# Ausgabe der Konfiguration (Excluded/Included Directories)
# --------------------------------------------------------------------------
Write-Host "--- Konfiguration ---"
Write-Host "Ausgeschlossene Verzeichnisse:"
$excludedDirectories | ForEach-Object { Write-Host "`t$_" }
Write-Host "Eingeschlossene Verzeichnisse:"
$includeDirectories | ForEach-Object { Write-Host "`t$_" }

# --------------------------------------------------------------------------
# Funktion zur Prüfung, ob eine Datei auf Basis ihres Verzeichnisses erlaubt ist.
# --------------------------------------------------------------------------
function Test-IsAllowedFile($file) {
    $fileDir = [System.IO.Path]::GetFullPath($file.DirectoryName)

    foreach ($inc in $normalizedIncludeDirs) {
        if ($fileDir -ieq $inc) { return $true }
        elseif ($fileDir.StartsWith($inc + "\")) { return $false }
    }

    foreach ($ex in $normalizedExcludedDirs) {
        if (($fileDir -ieq $ex) -or ($fileDir.StartsWith($ex + "\"))) {
            return $false
        }
    }
    return $true
}

# --------------------------------------------------------------------------
# Rekursive Dateisuche: Alle Dateien im Basisverzeichnis (inklusive Unterordner)
# --------------------------------------------------------------------------
$allFiles = Get-ChildItem -Path $baseDirectoryFull -File -Recurse

# Filtere anhand des Verzeichnispfads (Include/Exclude):
$allowedFiles = $allFiles | Where-Object { Test-IsAllowedFile($_) }

# --------------------------------------------------------------------------
# Suche explizit nach Dateien, die über $searchFiles als relative Pfadangabe spezifiziert sind.
$explicitFiles = @()
foreach ($pattern in $searchFiles) {
    if ($pattern.Contains("/") -or $pattern.Contains("\")) {
        $normalizedPattern = $pattern.Replace("/", "\")
        $fullPath = Join-Path $baseDirectoryFull $normalizedPattern
        if (-not $normalizedPattern.Contains("*")) {
            if (Test-Path -Path $fullPath -PathType Leaf) {
                $explicitFiles += Get-Item -Path $fullPath
                Write-Host "Explizit gesuchte Datei gefunden: '$pattern'" # Ausgabe, dass explizit gesucht wurde
            } else {
                Write-Host "Explizit gesuchte Datei nicht gefunden: '$pattern'"
            }
        } else {
            $parentPath = [System.IO.Path]::GetDirectoryName($fullPath)
            $filePattern = [System.IO.Path]::GetFileName($fullPath)
            if (Test-Path -Path $parentPath -PathType Container) {
                $matchingFiles = Get-ChildItem -Path $parentPath -Filter $filePattern
                $explicitFiles += $matchingFiles
                Write-Host "Explizit gesuchtes Suchmuster gefunden: '$pattern'" # Ausgabe, dass explizit nach Suchmuster gesucht wurde
            } else {
                 Write-Host "Explizit gesuchtes Suchmuster nicht gefunden: '$pattern'"
            }
        }
    }
}

# --------------------------------------------------------------------------
# Ausgabe der Konfiguration (Included Files)
# --------------------------------------------------------------------------
Write-Host "Explizit inkludierte Dateien:"
$explicitFiles | ForEach-Object { Write-Host "`t$($_.FullName)" }

# --------------------------------------------------------------------------
# Für einfache (nicht relative) Suchmuster in $searchFiles (z.B. "*.vue" oder "*.js")
$simpleMatchedFiles = @()
if ($searchFiles.Count -gt 0) {
    $simpleMatchedFiles = $allowedFiles | Where-Object {
        $match = $false
        foreach ($pattern in $searchFiles) {
            if (-not ($pattern.Contains("/") -or $pattern.Contains("\"))) {
                if ($_.Name -like $pattern) {
                    $match = $true
                    break
                }
            }
        }
        $match
    }
}

# --------------------------------------------------------------------------
# Zusätzliche Filterung mittels ExcludeFiles:
# Bevor die Ausgabe in die Zwischenablage erstellt wird
# --------------------------------------------------------------------------
$filteredFiles = $simpleMatchedFiles + $explicitFiles

$filteredFiles = $filteredFiles | Where-Object {
    $skip = $false
    foreach ($pattern in $excludeFiles) {
        $explicitlyIncluded = $false
        $relPath = $_.FullName.Substring($baseDirectoryFull.Length + 1).Replace("\", "/")
        foreach ($searchPattern in $searchFiles) {
            if ($searchPattern.Contains("/") -or $searchPattern.Contains("\")) {
                $normSearch = $searchPattern.Replace("\", "/")
                if ($normSearch.StartsWith("./")) {
                    $normSearch = $normSearch.Substring(2)
                }
                if ($relPath -like $normSearch) {
                    $explicitlyIncluded = $true
                    break
                }
            }
        }

        if ($explicitlyIncluded) { continue }

        if ( ($_.Directory.FullName -ieq $baseDirectoryFull) -and $pattern.StartsWith("./") ) {
            $patternNoPrefix = $pattern.Substring(2)
            if ($_.Name -like $patternNoPrefix) {
                $skip = $true
                break
            }
        } else {
            if ($_.Name -like $pattern) {
                $skip = $true
                break
            }
        }
    }
    -not $skip
}

# --------------------------------------------------------------------------
# Entferne Duplikate (auf Basis des vollständigen Pfades).
# --------------------------------------------------------------------------
$filteredFiles = $filteredFiles | Sort-Object -Property FullName -Unique
# --------------------------------------------------------------------------
# Ausgabe der Liste der Dateien, die ausgeschlossen werden.
# --------------------------------------------------------------------------
Write-Host "Ausgeschlossene Dateien:"
$excludeFiles | ForEach-Object { Write-Host "`t$_" }

# Ausgabe und Vorbereitung des Outputs für die Zwischenablage
foreach ($file in $filteredFiles) {
    Write-Host "Gefundene Datei: $($file.FullName)"
    $output += "## $($file.Name)`n"
    $output += "### Folder`n"
    $output += "$($file.Directory.FullName.Replace('\', '/'))/$($file.Name)`n"
    $output += "### Code Content:`n"
    try {
        $output += (Get-Content $file.FullName -Encoding UTF8 -Raw -ErrorAction Stop) + "`n" # -ErrorAction Stop hinzugefügt
    } catch {
        Write-Warning "Fehler beim Lesen der Datei '$($file.FullName)': $_" # Zusätzliche Fehlermeldung
        $output += "Fehler beim Lesen der Datei: $_`n";
    }
    $output += "## End of excerpt for $($file.Name) ---`n`n`n"
}

# --------------------------------------------------------------------------
# Kopiere den gesamten Output in die Zwischenablage
# --------------------------------------------------------------------------
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText($output -join "`r`n")

# --------------------------------------------------------------------------
# Ausgabe: Anzahl gefundener Dateien
# --------------------------------------------------------------------------
# Wort- und Zeichenanzahl berechnen
$charCount = ($output | Measure-Object -Character).Characters
$wordCount = ($output -split '\s+' | Where-Object { $_ } | Measure-Object).Count

Write-Host "--- Zusammenfassung ---"
Write-Host "Datenmenge: Insgesamt $wordCount Worte mit in Summe $charCount Zeichen"

Write-Host "Insgesamt wurden $($filteredFiles.Count) Dateien gefunden und in die Zwischenablage kopiert."
