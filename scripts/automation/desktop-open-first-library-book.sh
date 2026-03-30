#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-br1}"
CLICK_X_OFFSET="${CLICK_X_OFFSET:-112}"
CLICK_Y_OFFSET="${CLICK_Y_OFFSET:-248}"
WAIT_AFTER_CLICK="${WAIT_AFTER_CLICK:-1.2}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing dependency: $1" >&2
    exit 1
  }
}

require_cmd osascript
require_cmd cliclick

get_window_count() {
  osascript -e "tell application \"System Events\" to tell process \"$APP_NAME\" to count windows"
}

get_library_bounds() {
  osascript -e "tell application \"System Events\" to tell process \"$APP_NAME\" to tell (first window whose name is \"$APP_NAME\") to get {position, size}"
}

echo "bringing $APP_NAME to front"
osascript -e "tell application \"System Events\" to tell process \"$APP_NAME\" to set frontmost to true" >/dev/null

before_count="$(get_window_count)"
bounds_raw="$(get_library_bounds)"

IFS=', ' read -r pos_x pos_y width height <<<"$bounds_raw"

if [[ -z "${pos_x:-}" || -z "${pos_y:-}" || -z "${width:-}" || -z "${height:-}" ]]; then
  echo "failed to resolve library window bounds" >&2
  exit 1
fi

click_x=$((pos_x + CLICK_X_OFFSET))
click_y=$((pos_y + CLICK_Y_OFFSET))

echo "library window: x=$pos_x y=$pos_y width=$width height=$height"
echo "clicking first card near x=$click_x y=$click_y"

cliclick "m:${click_x},${click_y}" "c:${click_x},${click_y}"
sleep "$WAIT_AFTER_CLICK"

after_count="$(get_window_count)"

echo "window count: before=$before_count after=$after_count"

if [[ "$after_count" -gt "$before_count" ]]; then
  echo "PASS: reader window opened"
  exit 0
fi

echo "FAIL: reader window count did not increase" >&2
exit 2
