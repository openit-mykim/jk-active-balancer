#!/usr/bin/env bash
# Release guard (wiki "모바일 앱 개발 표준" 7): run on the artifact right before
# any store upload. Any finding blocks the upload (exit 1).
#   1. debug-signed APK
#   2. hard-coded secrets / tokens in the bundle and resources
#   3. version shown in the app must match the build (versionName)
# Usage: scripts/release-guard.sh path/to/app-release.apk
set -euo pipefail
APK="${1:?usage: release-guard.sh <apk>}"
SDK="${ANDROID_HOME:-$HOME/android-sdk}"
BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
fail=0

certs="$("$BT/apksigner" verify --print-certs "$APK" 2>&1 || true)"
if grep -qi "CN=Android Debug" <<<"$certs"; then
  echo "FAIL debug signing: $(grep -m1 'certificate DN' <<<"$certs")"
  fail=1
else
  echo "ok   signing: $(grep -m1 'certificate DN' <<<"$certs")"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -qq -o "$APK" -d "$tmp"
if strings -n 8 -r "$tmp" 2>/dev/null | grep -Eq '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY)'; then
  echo "FAIL secret-like string found in the APK"
  fail=1
elif grep -rEq '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY)' "$tmp" 2>/dev/null; then
  echo "FAIL secret-like string found in the APK"
  fail=1
else
  echo "ok   no secret-like strings"
fi

version="$("$BT/aapt2" dump badging "$APK" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")"
expected="$(node -p "require('$(cd "$(dirname "$0")/.." && pwd)/apps/mobile/package.json').version")"
if [[ "$version" == "$expected" ]]; then echo "ok   versionName $version"; else echo "FAIL versionName $version != package.json $expected"; fail=1; fi

exit $fail
