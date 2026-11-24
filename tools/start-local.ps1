param([string]$InterfaceAlias = 'Wi-Fi')

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repo 'backend'
$envFile = Join-Path $backend '.env.local'
$mqttDir = (New-Item -ItemType Directory -Force (Join-Path $backend 'mqtt/.local')).FullName
$runtime = (New-Item -ItemType Directory -Force (Join-Path $repo '.build-local')).FullName

if (!(Test-Path -LiteralPath $envFile)) {
    New-Item -ItemType File -Path $envFile | Out-Null
}
$settings = ConvertFrom-StringData -StringData ([string](Get-Content -LiteralPath $envFile -Raw))
foreach ($key in 'POSTGRES_PASSWORD', 'AUTH_SECRET', 'MQTT_BACKEND_PASSWORD', 'MQTT_DEVICE_PASSWORD') {
    if (!$settings[$key]) {
        $settings[$key] = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
        Add-Content -LiteralPath $envFile -Value "$key=$($settings[$key])" -Encoding ascii
    }
}
$device = $settings['DEFAULT_FEEDER_ID']
if (!$device) { $device = '11111111-1111-4111-8111-111111111111' }

Push-Location $backend
try {
    $passwd = Join-Path $mqttDir 'passwd'
    if (!(Test-Path -LiteralPath $passwd)) {
        $mount = "type=bind,source=$mqttDir,target=/local"
        docker run --rm --user root --mount $mount --entrypoint mosquitto_passwd eclipse-mosquitto:2.0.22 -b -c /local/passwd.tmp backend $settings['MQTT_BACKEND_PASSWORD']
        if ($LASTEXITCODE) { throw 'No se pudo crear el usuario MQTT del backend.' }
        docker run --rm --user root --mount $mount --entrypoint mosquitto_passwd eclipse-mosquitto:2.0.22 -b /local/passwd.tmp $device $settings['MQTT_DEVICE_PASSWORD']
        if ($LASTEXITCODE) { throw 'No se pudo crear el usuario MQTT del ESP32.' }
        Move-Item -LiteralPath (Join-Path $mqttDir 'passwd.tmp') -Destination $passwd
    }
    docker compose --env-file .env.local up --build -d --wait
    if ($LASTEXITCODE) { throw 'No se pudieron iniciar los servicios de Pet Feeder.' }

    if (!(Test-Path -LiteralPath 'node_modules/multicast-dns')) {
        npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE) { throw 'No se pudo preparar la detección en la red local.' }
    }
    $script = (Resolve-Path -LiteralPath 'tools/discover-local.mjs').Path
    $existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like "*$script*" }
    if (!$existing) {
        $params = @{
            FilePath = 'node.exe'
            ArgumentList = ('"{0}" "{1}"' -f $script, $InterfaceAlias)
            WindowStyle = 'Hidden'
            RedirectStandardOutput = Join-Path $runtime 'discovery.log'
            RedirectStandardError = Join-Path $runtime 'discovery-error.log'
        }
        Start-Process @params
    }
    Write-Host 'Pet Feeder disponible en http://petfeeder.local:3000'
} finally {
    Pop-Location
}
