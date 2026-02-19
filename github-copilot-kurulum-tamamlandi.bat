@echo off
echo ============================================
echo GitHub CLI ve Copilot CLI Kurulumu
echo ============================================
echo.
echo 1. GitHub CLI Kurulumu
echo --------------------------------------------
echo GitHub CLI 2.87.0 basariyla kuruldu!
echo Konum: C:\Program Files\GitHub CLI\gh.exe
echo.
echo 2. GitHub Copilot CLI Kurulumu
echo --------------------------------------------
echo Copilot CLI 0.0.411 basariyla kuruldu!
echo Komut: copilot
echo.
echo ============================================
echo PATH Ayarlari
echo ============================================
echo.
echo GitHub CLI'yi PATH'e eklemek icin yeni
echo bir terminal penceresi acin ve calistirin:
echo.
echo setx PATH "%%PATH%%;C:\Program Files\GitHub CLI"
echo.
echo Veya manuel olarak kullanmak icin:
echo   "C:\Program Files\GitHub CLI\gh.exe" --version
echo.
echo ============================================
echo Temel Komutlar
echo ============================================
echo.
echo GitHub CLI:
echo   gh --version          - Versiyon kontrol
echo   gh auth login         - GitHub'a giris
echo   gh repo list          - Repo listele
echo.
echo Copilot CLI:
echo   copilot               - Copilot baslat
echo   copilot update        - Guncelleme kontrol
echo   copilot --version     - Versiyon kontrol
echo.
echo ============================================
echo Copilot CLI Baslatma
echo ============================================
echo.
echo Terminalde yazin:
echo   copilot
echo.
echo Sonra GitHub hesabinizla giris yapin:
echo   /login
echo.
pause
