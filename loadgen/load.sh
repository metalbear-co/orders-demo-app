#!/usr/bin/env bash
# Fire N concurrent requests at an endpoint and print each one's wall-clock time.
# usage: ./load.sh <url> [concurrency] [rounds]
set -u
URL="${1:?usage: load.sh <url> [concurrency] [rounds]}"
CONC="${2:-10}"
ROUNDS="${3:-1}"

for r in $(seq 1 "$ROUNDS"); do
  for i in $(seq 1 "$CONC"); do
    curl -s -o /dev/null -m 120 -w "%{http_code} %{time_total}s\n" "$URL" &
  done
  wait
done
