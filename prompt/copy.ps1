# --------------------------------------------------------------------------
# REKURSIVE SUCHE NACH DATEIEN mit speziellen Filter-Regeln:
# --------------------------------------------------------------------------

# Basisverzeichnis definieren
$baseDirectory = "D:\_localData\dev\FinWise\FinWise_0.1"
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
    #"src\components\budget",
    #"src\components\transaction"
)

# --------------------------------------------------------------------------
# Konfiguration der Dateifilter
# --------------------------------------------------------------------------
$excludeFiles = @(
    "./*.*"
)

$searchFiles = @(
    # ###Prompt
    "prompt\sytemprompt.md",

    # ###Account

     "src\stores\accountStore.ts",
    #"src\views\AccountsView.vue",
     #"src\components\account\*.vue",

    # Planning
    "src\components\planning\PlanningTransactionForm.vue",
    "src\views\PlanningView.vue",
    "src\stores\planningStore.ts",

    # ###Transaction
    # "src\views\TransactionsView.vue",
     "./src/components/transaction/TransactionCard.vue",
     "src\components\transaction\CategoryTransactionList.vue",
     "src\components\transaction\TransactionList.vue",
    #"src\components\transaction\TransactionForm.vue",
    "src\stores\transactionStore.ts",
    # "src\stores\recipientStore.ts",

    # ###Category - Budget
     "src\stores\categoryStore.ts",
    # "src\views\BudgetsView.vue",
    #"src\views\BudgetsView2.vue",
    # "src\components\budget\BudgetCategoryColumn.vue",
    # "src\components\budget\BudgetMonthCard.vue",
    # "src\components\budget\BudgetMonthHeaderCard.vue",
    # "src\components\budget\CategoryTransferModal.vue",
    # "src\components\budget\CategoryForm.vue",

    # ###Tags
    # "src\stores\tagStore.ts",

    # ###Admin
    #"src\views\admin\AdminAccountsView.vue",
    # "src\views\admin\AdminRecipientsView.vue",
    # "src\views\admin\AdminCategoriesView.vue",
    # "src\layouts\AppLayout.vue",

    # Components
    # "./src/components/ui/PagingComponent.vue",
    # "src\components\ui\PagingYearComponent.vue",
    # "src\components\ui\MonthSelector.vue",

    "src\components\ui\CurrencyDisplay.vue",
    "src\components\ui\CurrencyInput.vue",
    # "src\components\ui\SearchableSelect.vue",
     "src\components\ui\SelectCategory.vue",
    # "src\components\ui\TagSearchableDropdown.vue",
    # "src\components\ui\SearchGroup.vue",
    # "src\components\ui\MainNavigation.vue",

    # ###Sonstiges
    # "./src/stores/*.ts"
     "src\utils\*.ts",
    # "src\utils\formatters.ts",
    # "src\utils\categoryTransfer.ts",
    "src\utils\runningBalances.ts",
     "src\types\*.ts"
    # "*.vue",
    "*.ts"
)

$output = @()

$instructionsPath = Join-Path $baseDirectoryFull "prompt_GPT_Instructions.md"
if (Test-Path $instructionsPath) {
    $output += Get-Content -Path $instructionsPath -Encoding UTF8 -Raw
} else {
    $output += "Die Datei 'prompt_GPT_Instructions.md' konnte nicht gefunden werden.`n"
}

$output += "## Requirements and Context:`n"

$requirementsPath = Join-Path $baseDirectoryFull "./prompt/prompt_requirements.md"
if (Test-Path $requirementsPath) {
    $output += Get-Content -Path $requirementsPath -Encoding UTF8 -Raw
} else {
    $output += "Die Datei 'prompt_requirements.md' konnte nicht gefunden werden.`n"
}

$output += "`n## Foldersystem and existing files`n"
$output += "### Struktur von ./src:`n"
$output += (tree (Join-Path $baseDirectoryFull "src") /F 2>&1) + "`n"
$output += "### Struktur von ./tests:`n"
$output += (tree (Join-Path $baseDirectoryFull "tests") /F 2>&1) + "`n"

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

Write-Host "--- Konfiguration ---"
Write-Host "Ausgeschlossene Verzeichnisse:"
$excludedDirectories | ForEach-Object { Write-Host "`t$_" }
Write-Host "Eingeschlossene Verzeichnisse:"
$includeDirectories | ForEach-Object { Write-Host "`t$_" }

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

$allFiles = Get-ChildItem -Path $baseDirectoryFull -File -Recurse
$allowedFiles = $allFiles | Where-Object { Test-IsAllowedFile($_) }

$explicitFiles = @()
foreach ($pattern in $searchFiles) {
    if ($pattern.Contains("/") -or $pattern.Contains("\")) {
        $normalizedPattern = $pattern.Replace("/", "\")
        $fullPath = Join-Path $baseDirectoryFull $normalizedPattern
        if (-not $normalizedPattern.Contains("*")) {
            if (Test-Path -Path $fullPath -PathType Leaf) {
                $explicitFiles += @(Get-Item -Path $fullPath)
                Write-Host "Explizit gesuchte Datei gefunden: '$pattern'"
            } else {
                Write-Host "Explizit gesuchte Datei nicht gefunden: '$pattern'"
            }
        } else {
            $parentPath = [System.IO.Path]::GetDirectoryName($fullPath)
            $filePattern = [System.IO.Path]::GetFileName($fullPath)
            if (Test-Path -Path $parentPath -PathType Container) {
                $matchingFiles = Get-ChildItem -Path $parentPath -Filter $filePattern
                $explicitFiles += @($matchingFiles)
                Write-Host "Explizit gesuchtes Suchmuster gefunden: '$pattern'"
            } else {
                Write-Host "Explizit gesuchtes Suchmuster nicht gefunden: '$pattern'"
            }
        }
    }
}

Write-Host "Explizit inkludierte Dateien:"
$explicitFiles | ForEach-Object { Write-Host "`t$($_.FullName)" }

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

if ($simpleMatchedFiles -isnot [System.Array]) { $simpleMatchedFiles = @($simpleMatchedFiles) }
if ($explicitFiles -isnot [System.Array]) { $explicitFiles = @($explicitFiles) }

$filteredFiles = $simpleMatchedFiles + $explicitFiles

$filteredFiles = $filteredFiles | Where-Object {
    if (-not $_ -or -not $_.FullName) { return $false }

    $skip = $false
    $relPath = $_.FullName.Substring($baseDirectoryFull.Length + 1).Replace("\", "/")

    foreach ($pattern in $excludeFiles) {
        $explicitlyIncluded = $false
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

$filteredFiles = $filteredFiles | Sort-Object -Property FullName -Unique

Write-Host "Ausgeschlossene Dateien:"
$excludeFiles | ForEach-Object { Write-Host "`t$_" }

foreach ($file in $filteredFiles) {
    Write-Host "Gefundene Datei: $($file.FullName)"
    $output += "## $($file.Name)`n"
    $output += "### Folder`n"
    $output += "$($file.Directory.FullName.Replace('\', '/'))/$($file.Name)`n"
    $output += "### Code Content:`n"
    try {
        $output += (Get-Content $file.FullName -Encoding UTF8 -Raw -ErrorAction Stop) + "`n"
    } catch {
        Write-Warning "Fehler beim Lesen der Datei '$($file.FullName)': $_"
        $output += "Fehler beim Lesen der Datei: $_`n"
    }
    $output += "## End of excerpt for $($file.Name) ---`n`n`n"
}

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText($output -join "`r`n")

$charCount = ($output | Measure-Object -Character).Characters
$wordCount = ($output -split '\s+' | Where-Object { $_ } | Measure-Object).Count

Write-Host "--- Zusammenfassung ---"
Write-Host "Datenmenge: Insgesamt $wordCount Worte mit in Summe $charCount Zeichen"
Write-Host "Insgesamt wurden $($filteredFiles.Count) Dateien gefunden und in die Zwischenablage kopiert."
