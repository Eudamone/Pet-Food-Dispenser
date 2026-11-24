param(
    [string]$Port = 'COM4',
    [string]$InterfaceAlias = 'Wi-Fi',
    [string]$Ssid,
    [securestring]$NetworkPassword,
    [switch]$AskPassword
)

$ErrorActionPreference = 'Stop'
$address = Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4 -AddressState Preferred |
    Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1
if (!$address) { throw 'Conecta primero el PC a la red de la presentación.' }

$wlan = netsh wlan show interfaces
$activeSsid = $wlan | ForEach-Object {
    if ($_ -match '^\s*SSID\s*:\s*(.+?)\s*$') { $Matches[1] }
} | Select-Object -First 1
if (!$Ssid) { $Ssid = $activeSsid }
if (!$Ssid) { throw 'No se encontró el SSID. Indícalo con -Ssid.' }

$profile = $Ssid
if ($Ssid -eq $activeSsid) {
    $activeProfile = $wlan | ForEach-Object {
        if ($_ -match '^\s*(?:Perfil|Profile)\s*:\s*(.+?)\s*$') { $Matches[1] }
    } | Select-Object -First 1
    if ($activeProfile) { $profile = $activeProfile }
}

$password = $null
if ($NetworkPassword) {
    $password = [Net.NetworkCredential]::new('', $NetworkPassword).Password
} elseif (!$AskPassword) {
    $password = netsh wlan show profile "name=$profile" 'key=clear' | ForEach-Object {
        if ($_ -match '^\s*(?:Contenido de la clave|Key Content|Contenido clave)\s*:\s*(.+?)\s*$') { $Matches[1] }
    } | Select-Object -First 1
}
if ($null -eq $password) {
    $secure = Read-Host 'Clave Wi-Fi (vacía si la red es abierta)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secure).Password
}
$payload = @{
    ssid = $Ssid
    password = $password
    fallback = $address.IPAddress
} | ConvertTo-Json -Compress

$serial = [System.IO.Ports.SerialPort]::new($Port, 115200, 'None', 8, 'One')
$serial.Encoding = [Text.UTF8Encoding]::new($false)
$buffer = ''
try {
    $serial.Open()
    $serial.WriteLine("wifi $payload")
    $until = (Get-Date).AddSeconds(8)
    while ((Get-Date) -lt $until -and $buffer -notmatch 'WIFI_(SAVED|BUSY|INVALID|SAVE_ERROR)') {
        $buffer += $serial.ReadExisting()
        Start-Sleep -Milliseconds 120
    }
    if ($buffer -match 'WIFI_BUSY') { throw 'Deja que termine el movimiento y cierra las compuertas.' }
    if ($buffer -notmatch 'WIFI_SAVED') { throw 'El ESP32 no guardó la configuración. Revisa el puerto y el firmware.' }
    Write-Host 'Wi-Fi guardada en el ESP32. El equipo está reiniciando.'
    $buffer = ''
    $until = (Get-Date).AddSeconds(40)
    while ((Get-Date) -lt $until -and $buffer -notmatch 'MQTT:1|MQTT conectado') {
        $buffer += $serial.ReadExisting()
        Start-Sleep -Milliseconds 150
    }
    if ($buffer -notmatch 'MQTT:1|MQTT conectado') {
        throw "No se confirmó MQTT. Comprueba que la red tenga 2,4 GHz y acceso al PC en $($address.IPAddress)."
    }
    Write-Host "ESP32 conectado. Dirección de respaldo para la app: http://$($address.IPAddress):3000"
} finally {
    $serial.Dispose()
}
