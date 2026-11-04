#!/bin/sh
set -eu

persistent_root="${HF_PERSISTENT_ROOT:-/data/paper-studio}"

link_persistent_dir() {
  bucket_dir="${persistent_root}/$1"
  app_dir="/app/$2"

  mkdir -p "$bucket_dir"
  mkdir -p "$(dirname "$app_dir")"

  if [ -L "$app_dir" ]; then
    current_target="$(readlink "$app_dir")"
    if [ "$current_target" = "$bucket_dir" ]; then
      return
    fi
    rm "$app_dir"
  elif [ -e "$app_dir" ]; then
    cp -an "$app_dir/." "$bucket_dir/"
    mv "$app_dir" "${app_dir}.image"
  fi

  ln -s "$bucket_dir" "$app_dir"
}

link_persistent_dir workspace workspace
link_persistent_dir app-data data
link_persistent_dir public-assets public/assets
link_persistent_dir voiceover public/voiceover
link_persistent_dir gallery-assets public/gallery-assets

exec "$@"
