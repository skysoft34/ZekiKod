# ZekiKod Deployment Guide

Bu belge ZekiKod AI Development Studio'yu production ortamına dağıtmak için gerekli adımları içerir.

## Gereksinimler

- Windows 10/11 veya Windows Server 2016+
- Node.js 18+ 
- IIS 7.5+ (Windows özelliklerinden etkinleştirilebilir)
- URL Rewrite Module for IIS
- Application Request Routing (ARR) for IIS

## Hızlı Başlangıç

### 1. Build

```bash
deploy\build.bat
```

Bu script tüm paketleri, backend ve frontend'i production için build eder.

### 2. Backend Service Kurulumu

#### Seçenek A: Windows Service (Önerilen)

Yönetici olarak çalıştırın:
```bash
deploy\install-service.bat
```

Service yönetimi:
- `services.msc` açın
- "ZekiKodBackend" servisini bulun
- Başlat/Durdur/Yeniden Başlat yapabilirsiniz

Service'i kaldırmak için:
```bash
node deploy\uninstall-service.js
```

#### Seçenek B: PM2

```bash
deploy\start-pm2.bat
```

PM2 komutları:
- `pm2 status` - Durum kontrolü
- `pm2 logs` - Logları görüntüle
- `pm2 restart zekikod-backend` - Servisi yeniden başlat
- `pm2 stop zekikod-backend` - Servisi durdur
- `pm2 monit` - İzleme paneli

### 3. IIS Konfigürasyonu

#### Adım 1: IIS Özelliklerini Etkinleştirin

1. Control Panel > Programs > Turn Windows features on or off
2. Internet Information Services > Web Management Tools > IIS Management Console
3. Internet Information Services > World Wide Web Services > Application Development Features > tümünü seçin
4. Tamam'a tıklayın

#### Adım 2: URL Rewrite ve ARR Kurun

1. [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite) indirin ve kurun
2. [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing) indirin ve kurun
3. IIS Manager'da ARR > Server Proxy Settings > Enable proxy'i işaretleyin

#### Adım 3: IIS Site Oluşturun

1. IIS Manager'ı açın (inetmgr)
2. Sites > Add Website
3. Ayarlar:
   - Site name: ZekiKod
   - Physical path: `C:\inetpub\wwwroot\zekikod` (veya istediğiniz yol)
   - Binding: 
     - Type: http (veya https)
     - IP: All Unassigned
     - Port: 80 (veya istediğiniz port)
4. Tamam'a tıklayın

#### Adım 4: Frontend Dosyalarını Kopyalayın

```bash
xcopy /E /I /Y apps\ui\dist C:\inetpub\wwwroot\zekikod
```

#### Adım 5: Application Pool Ayarları

1. IIS Manager > Application Pools
2. ZekiKod için yeni bir pool oluşturun veya DefaultAppPool'u kullanın
3. Pool ayarları:
   - .NET CLR Version: No Managed Code
   - Managed Pipeline Mode: Integrated

### 4. Firewall Ayarları

Backend portu (3008) için firewall kuralı ekleyin:

```powershell
netsh advfirewall firewall add rule name="ZekiKod Backend" dir=in action=allow protocol=TCP localport=3008
```

### 5. Doğrulama

1. Backend API: http://localhost:3008/api/health
2. Frontend: http://localhost (veya IIS'te yapılandırdığınız port)
3. WebSocket: ws://localhost/ws

## SSL/HTTPS Konfigürasyonu

### Self-Signed Certificate (Test için)

```powershell
New-SelfSignedCertificate -DnsName "zekikod.local" -CertStoreLocation "cert:\LocalMachine\My"
```

### Let's Encrypt (Production için)

1. [win-acme](https://www.win-acme.com/) indirin
2. IIS site için certificate alın
3. HTTPS binding ekleyin

## Sorun Giderme

### Backend başlamıyor

1. Log dosyalarını kontrol edin: `deploy\logs\`
2. Service hesabının yeterli izni olduğunu kontrol edin
3. Port 3008'in başka bir uygulama tarafından kullanılmadığını kontrol edin:
   ```bash
   netstat -ano | findstr :3008
   ```

### Frontend API'ye bağlanamıyor

1. Backend servisinin çalıştığını kontrol edin
2. `web.config` dosyasının frontend klasöründe olduğunu kontrol edin
3. URL Rewrite ve ARR modüllerinin kurulu olduğunu kontrol edin
4. IIS logs: `C:\inetpub\logs\LogFiles\`

### WebSocket hatası

1. IIS WebSocket Protocol özelliğinin etkin olduğunu kontrol edin
2. ARR proxy ayarlarının doğru olduğunu kontrol edin

## Environment Değişkenleri

Backend servisi şu environment değişkenlerini kullanır:

- `NODE_ENV`: production / development
- `PORT`: Backend portu (default: 3008)
- `DATA_DIR`: Veri dizini (default: ./data)
- `ALLOWED_ROOT_DIRECTORY`: İzin verilen kök dizin
- `ANTHROPIC_API_KEY`: Claude API key (isteğe bağlı)

Bu değişkenleri `deploy\install-service.js` dosyasından değiştirebilirsiniz.

## Güncelleme

```bash
git pull
deploy\build.bat
pm2 restart zekikod-backend
# veya Windows Service için services.msc'den restart edin
xcopy /E /I /Y apps\ui\dist C:\inetpub\wwwroot\zekikod
```

## Backup

Önemli veriler:
- `data/` klasörü (settings, credentials, sessions)
- `.automaker/` klasörü (project-specific data)

```bash
# Backup script (örnek)
robocopy data D:\Backups\zekikod\data /MIR
robocopy .automaker D:\Backups\zekikod\automaker /MIR
```

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### Windows Event Log

Windows Event Viewer > Applications and Services Logs > ZekiKodBackend

### Log Files

- PM2: `deploy\logs\pm2-*.log`
- Windows Service: `deploy\logs\*.log`
- IIS: `C:\inetpub\logs\LogFiles\W3SVC*\`
