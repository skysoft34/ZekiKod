@echo off
echo ============================================
echo GitHub CLI Kurulumu Tamamlandi
echo ============================================
echo.
echo GitHub CLI 2.87.0 basariyla kuruldu!
echo.
echo Konum: C:\Program Files\GitHub CLI\gh.exe
echo.
echo ============================================
echo GitHub CLI Kullanimi
echo ============================================
echo.
echo Mevcut oturumda kullanmak icin:
echo   "C:\Program Files\GitHub CLI\gh.exe" --version
echo.
echo Veya PATH'e eklemek icin:
echo   setx PATH "%%PATH%%;C:\Program Files\GitHub CLI"
echo.
echo ============================================
echo Temel Komutlar
echo ============================================
echo.
echo GitHub'a giris yap:
echo   gh auth login
echo.
echo Repo listele:
echo   gh repo list
echo.
echo Issue listele:
echo   gh issue list
echo.
echo PR olustur:
echo   gh pr create
echo.
echo Yardim:
echo   gh --help
echo.
pause
