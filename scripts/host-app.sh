#!/usr/bin/env bash
set -euo pipefail

ACCOUNT_ID="${CF_ACCOUNT_ID:-7eb89b01e9c3bec41ee24db8ecbe77f8}"
API_BASE="https://api.cloudflare.com/client/v4"
TARGET="fashionistas1979.workers.dev"
ZONE_PATTERN="fashionistas.ai|marketpicks.ai|israeljoffe.com|israeljoffe.org|ketiservice.com|religiousjews.com|wuwonline.com|wuwonline.org"

usage() {
  printf 'Usage: %s <zone> <hostname-or-label>\n' "$0" >&2
  printf 'Example: %s fashionistas.ai demo-123\n' "$0" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 64
fi

first="${1,,}"
second="${2,,}"
case "$first" in
  fashionistas.ai|marketpicks.ai|israeljoffe.com|israeljoffe.org|ketiservice.com|religiousjews.com|wuwonline.com|wuwonline.org)
    zone="$first"
    host="$second"
    ;;
  *)
    host="$first"
    zone="$second"
    ;;
esac
zone="${zone%.}"
host="${host%.}"

case "$zone" in
  fashionistas.ai|marketpicks.ai|israeljoffe.com|israeljoffe.org|ketiservice.com|religiousjews.com|wuwonline.com|wuwonline.org) ;;
  *) printf 'Unsupported zone: %s\n' "$zone" >&2; exit 64 ;;
esac

if [[ "$host" == "$zone" || "$host" == *".$zone" ]]; then
  :
else
  if [[ "$host" == *.* ]]; then
    printf 'Hostname must be below %s\n' "$zone" >&2
    exit 64
  fi
  host="${host}.${zone}"
fi

IFS='.' read -r -a labels <<< "$host"
if (( ${#labels[@]} < 3 )); then
  printf 'Hostname must be a subdomain of %s\n' "$zone" >&2
  exit 64
fi
for label in "${labels[@]}"; do
  if [[ ! "$label" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]; then
    printf 'Invalid hostname label: %s\n' "$label" >&2
    exit 64
  fi
done

if [[ -n "${CF_DNS_TOKEN:-}" ]]; then
  token="$CF_DNS_TOKEN"
  token_name="CF_DNS_TOKEN"
elif [[ -n "${CF_API_TOKEN:-}" ]]; then
  token="$CF_API_TOKEN"
  token_name="CF_API_TOKEN"
else
  printf 'Set CF_DNS_TOKEN or CF_API_TOKEN before running this script.\n' >&2
  exit 78
fi

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
request_number=0
response_file=""
response_code=""

api() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"
  local output
  request_number=$((request_number + 1))
  output="$workdir/response-${request_number}.json"
  local args=(
    --silent
    --show-error
    --request "$method"
    --header "Authorization: Bearer $token"
    --header "Accept: application/json"
    --output "$output"
    --write-out "%{http_code}"
  )
  if [[ -n "$payload" ]]; then
    args+=(--header "Content-Type: application/json" --data "$payload")
  fi
  if ! response_code=$(curl "${args[@]}" "$API_BASE$path"); then
    printf 'HTTP unavailable %s %s\n' "$method" "$path" >&2
    return 1
  fi
  response_file="$output"
  printf 'HTTP %s %s %s\n' "$response_code" "$method" "$path"
  if [[ -s "$output" ]]; then
    jq -c . "$output" 2>/dev/null || printf '%s\n' "$(<"$output")"
  fi
}

is_success() {
  [[ "$1" =~ ^2[0-9][0-9]$ ]]
}

api GET "/zones?name=$zone&status=active&per_page=50"
if ! is_success "$response_code"; then
  exit 1
fi
zone_id=$(jq -r --arg zone "$zone" '[.result[] | select(.name == $zone)][0].id // empty' "$response_file")
if [[ -z "$zone_id" ]]; then
  printf 'Zone was not returned by Cloudflare: %s\n' "$zone" >&2
  exit 1
fi

api GET "/zones/$zone_id/dns_records?type=CNAME&name=$host&per_page=100"
if ! is_success "$response_code"; then
  exit 1
fi
existing_json=$(jq -c --arg host "$host" '[.result[] | select((.name | sub("\\.$"; "")) == ($host | sub("\\.$"; "")))]' "$response_file")
existing_count=$(jq 'length' <<< "$existing_json")
if (( existing_count > 1 )); then
  printf 'More than one CNAME exists for %s; refusing to choose one.\n' "$host" >&2
  exit 1
fi

payload=$(jq -cn --arg name "$host" --arg content "$TARGET" '{type:"CNAME", name:$name, content:$content, ttl:1, proxied:true}')
if (( existing_count == 0 )); then
  api POST "/zones/$zone_id/dns_records" "$payload"
  if ! is_success "$response_code"; then
    exit 1
  fi
  record_id=$(jq -r '.result.id // empty' "$response_file")
  action="created"
else
  record_id=$(jq -r '.[0].id // empty' <<< "$existing_json")
  existing_content=$(jq -r '.[0].content // "" | sub("\\.$"; "")' <<< "$existing_json")
  existing_proxied=$(jq -r '.[0].proxied // false' <<< "$existing_json")
  if [[ "$existing_content" == "$TARGET" && "$existing_proxied" == "true" ]]; then
    action="unchanged"
    printf 'DNS record already matches %s -> %s (proxied).\n' "$host" "$TARGET"
  else
    api PUT "/zones/$zone_id/dns_records/$record_id" "$payload"
    if ! is_success "$response_code"; then
      exit 1
    fi
    record_id=$(jq -r '.result.id // empty' "$response_file")
    action="updated"
  fi
fi

if [[ -z "$record_id" ]]; then
  printf 'Cloudflare did not return a DNS record id.\n' >&2
  exit 1
fi

api GET "/zones/$zone_id/dns_records/$record_id"
if ! is_success "$response_code"; then
  exit 1
fi
verified_name=$(jq -r '.result.name | sub("\\.$"; "")' "$response_file")
verified_content=$(jq -r '.result.content | sub("\\.$"; "")' "$response_file")
verified_proxied=$(jq -r '.result.proxied // false' "$response_file")
if [[ "$verified_name" != "$host" || "$verified_content" != "$TARGET" || "$verified_proxied" != "true" ]]; then
  printf 'DNS verification did not match the requested record.\n' >&2
  exit 1
fi
printf 'DNS %s: %s CNAME %s (proxied=true), account=%s\n' "$action" "$host" "$TARGET" "$ACCOUNT_ID"
