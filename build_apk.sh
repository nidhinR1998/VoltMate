#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
ANDROID_DIR="$MOBILE_DIR/android"
OUTPUT_DIR="$ROOT_DIR"
BUILD_TYPE="${1:-release}"

echo "========================================================"
echo "       VoltMate - Standalone Android APK Builder        "
echo "========================================================"
echo "[*] Target Build Type : $BUILD_TYPE"
echo "[*] Project Directory : $ROOT_DIR"

cd "$ANDROID_DIR"
chmod +x gradlew

if [ -d "/home/nidhin/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2" ]; then
  export JAVA_HOME="/home/nidhin/.gradle/jdks/eclipse_adoptium-17-amd64-linux.2"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

GRADLE_TASK="assembleDebug"
if [ "$BUILD_TYPE" = "release" ]; then
  GRADLE_TASK="assembleRelease"
fi

echo "[*] Running Gradle build: ./gradlew $GRADLE_TASK --no-daemon"
pkill -f "KotlinCompileDaemon" 2>/dev/null || true
pkill -f "GradleDaemon" 2>/dev/null || true
./gradlew "$GRADLE_TASK" --no-daemon --max-workers=2

SOURCE_APK="$ANDROID_DIR/app/build/outputs/apk/$BUILD_TYPE/app-$BUILD_TYPE.apk"
if [ ! -f "$SOURCE_APK" ]; then
  echo "[!] Error: Compiled APK not found at $SOURCE_APK"
  exit 1
fi

DEST_APK="$OUTPUT_DIR/VoltMate.apk"
cp "$SOURCE_APK" "$DEST_APK"
FILE_SIZE=$(du -h "$DEST_APK" | cut -f1)

echo "========================================================"
echo "  [+] Build Complete Successfully!"
echo "========================================================"
echo "Output APK: $DEST_APK ($FILE_SIZE)"

