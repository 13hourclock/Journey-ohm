#!/bin/bash
# Journey Ohm dev build: cap sync -> assembleRelease -> zipalign -> apksigner (v1+v2+v3, lensure upload key, READ ONLY) -> verify cert + badging + assets.
# Modelled on /workspace/softsound_logs/release_b9b.sh. The keystore password arrives only via env KSP (inline on the command), is never printed, and is unset here.
set -u
PW="${KSP:-}"; unset KSP
export JAVA_HOME=/home/box/jdk ANDROID_HOME=/home/box/android ANDROID_SDK_ROOT=/home/box/android PATH=/home/box/node22/bin:/home/box/jdk/bin:$PATH
R=/workspace/resonance2; BT=/home/box/android/build-tools/35.0.0; KS=/workspace/lightsynth/lensure-upload.jks
CERT=db171c708310fae2bce8e6edc146d27106e7547a8f6fc0ea019911c441dc7d1f
name=${NAME:-0.0.7}; vc=${VC:-7}; out=$R/dist/${OUT:-JourneyOhm-dev-v0.0.7.apk}; LOG=$R/dist/build.log
say(){ echo "[$(date +%H:%M:%S)] $*"; }; stop(){ PW=; say "STOP: $*"; exit 1; }
[ -n "$PW" ] || stop "no KSP"
mkdir -p $R/dist
(cd $R && npx cap sync android && cd android && nice ./gradlew assembleRelease -q) > $LOG 2>&1 || stop "build (see $LOG)"
$BT/zipalign -p -f 4 $R/android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/jo_aligned.apk || stop zipalign
JO_KP="$PW" $BT/apksigner sign --ks $KS --ks-key-alias lensure --ks-pass env:JO_KP --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out $out /tmp/jo_aligned.apk > /dev/null 2>&1 || stop "sign"
PW=; unset PW
rm -f /tmp/jo_aligned.apk $out.idsig
$BT/apksigner verify -v --print-certs $out > $R/dist/verify.txt 2>&1 || stop "verify"
grep -q "SHA-256 digest: $CERT" $R/dist/verify.txt || stop "cert mismatch"
grep -E "Verified using v[123] scheme" $R/dist/verify.txt
$BT/aapt2 dump badging $out | head -1 | grep -q "name='com.lensure.journeyohm' versionCode='$vc' versionName='$name'" || stop "badging: $($BT/aapt2 dump badging $out | head -1)"
$BT/aapt2 dump badging $out | grep -E "application-label:|sdkVersion|targetSdk"
rm -rf /tmp/jo_chk; mkdir /tmp/jo_chk; (cd /tmp/jo_chk && unzip -q $out 'assets/public/*')
d=$(diff -rq /tmp/jo_chk/assets/public $R/www | grep -v cordova); rm -rf /tmp/jo_chk; [ -z "$d" ] || stop "assets differ: $d"
say "APK $out vc$vc $name verified ($(stat -c %s $out) bytes, sha256 $(sha256sum $out | cut -c1-16))"
