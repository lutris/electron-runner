#!/bin/bash

set -e

out="$1"
arch="$2"
version="$3"

echo "Checking flash player version..."

info=($(node ${0%/*}/get-flash-url "$arch" "$version"))
version=${info[1]}
url=http://web.archive.org/web/${info[2]}

echo "Fetching flash player $version $arch"

echo $url

mkdir -p cache

cachename="cache/flashplayer-v$version-$arch.tar.gz"
curl -sS -o "$cachename" -z "$cachename" -L --remote-time --connect-timeout 30 --fail "$url" || exit $?

tar -xzf "$cachename" -C "$out"
