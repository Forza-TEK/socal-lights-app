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
adb logcat -c
adb shell am start -n $PKG/.MainActivity
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
sleep 30; shot 1-opened
SIZE=$(adb shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1); W=${SIZE%x*}; H=${SIZE#*x}
# drag the list sheet up, then back down
adb shell input swipe $((W/2)) $((H*82/100)) $((W/2)) $((H*30/100)) 400; sleep 3; shot 2-list-up
adb shell input swipe $((W/2)) $((H*30/100)) $((W/2)) $((H*80/100)) 400; sleep 2
# the four bottom-bar spots (phone only has the bar), left to right
for i in 1 2 3 4; do adb shell input tap $((W*i/5)) $((H*94/100)); sleep 4; shot 3-bar-$i; done
adb shell input keyevent KEYCODE_BACK; sleep 2; shot 4-after-back
adb shell dumpsys activity activities | grep -i "mResumedActivity" > "$OUT/resumed.txt" || true
adb logcat -d -v time > "$OUT/logcat-all.txt" || true
grep -E "AndroidRuntime|FATAL|Capacitor.*(E|W)/|chromium.*(ERROR|Uncaught)|ERR_" "$OUT/logcat-all.txt" > "$OUT/errors.txt" || true
echo "errors found: $(wc -l < "$OUT/errors.txt")"
