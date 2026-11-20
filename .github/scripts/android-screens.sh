#!/usr/bin/env bash
# Runs inside the emulator: install, open, screenshot, collect errors. Usage: android-screens.sh <output dir>
set -u
OUT="$1"; mkdir -p "$OUT"
APK=app/android/app/build/outputs/apk/debug/app-debug.apk
PKG=app.socallights.lights
adb wait-for-device
adb install -r "$APK" | tee "$OUT/install.txt"
adb shell pm grant $PKG android.permission.ACCESS_FINE_LOCATION || true
adb shell pm grant $PKG android.permission.ACCESS_COARSE_LOCATION || true
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS || true
adb emu geo fix -117.9 33.7 || true   # Huntington Beach, so distances and Nearest have a place to start from
adb reverse tcp:8788 tcp:8788   # the app reaches the site served on this machine through adb, so a flaky emulator network cannot break it
adb logcat -c
adb shell am start -n $PKG/.MainActivity
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
sleep 30; shot 1-opened
SIZE=$(adb shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1); W=${SIZE%x*}; H=${SIZE#*x}
# drag the list sheet up, then back down
adb shell input swipe $((W/2)) $((H*78/100)) $((W/2)) $((H*30/100)) 400; sleep 3; shot 2-list-up
adb shell input swipe $((W/2)) $((H*30/100)) $((W/2)) $((H*80/100)) 400; sleep 2
# Drive the WebView over DevTools: open an event card, Favorites, the account menu and a few pages.
SOCK=""
for i in $(seq 1 30); do # the WebView opens its DevTools socket a little after the page starts; wait up to 90 s
  SOCK=$(adb shell cat /proc/net/unix | grep -a webview_devtools_remote | head -1 | sed 's/.*@//' | tr -d '\r')
  [ -n "$SOCK" ] && break; sleep 3
done
if [ -n "$SOCK" ]; then
  adb forward tcp:9222 localabstract:$SOCK
  node .github/scripts/android-drive.mjs "$OUT" > "$OUT/drive-stdout.txt" 2>&1 || { echo "drive step failed:" >> "$OUT/drive-log.txt"; tail -20 "$OUT/drive-stdout.txt" >> "$OUT/drive-log.txt"; }
else echo "no webview devtools socket found after 90 s" > "$OUT/drive-log.txt"; adb shell cat /proc/net/unix | grep -a devtools >> "$OUT/drive-log.txt" || true; fi
adb shell dumpsys activity activities | grep -i "mResumedActivity" > "$OUT/resumed.txt" || true
adb logcat -d -v time > "$OUT/logcat-all.txt" || true
grep -E "AndroidRuntime|FATAL|Capacitor.*(E|W)/|chromium.*(ERROR|Uncaught)|ERR_" "$OUT/logcat-all.txt" > "$OUT/errors.txt" || true
echo "errors found: $(wc -l < "$OUT/errors.txt")"
