#!/usr/bin/env bash
# Build both versions of the resume from the one .tex file (needs pdflatex).
#   Sherif_Morsi_Resume.pdf     investing / quant (the one the site links)
#   Sherif_Morsi_Resume_AI.pdf  AI / ML engineering
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
build() {  # $1 = version number, $2 = output name
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory "$tmp" -jobname "$2" \
    "\\def\\resumevariant{$1}\\input{Sherif_Morsi_Resume.tex}" > "$tmp/$2.log" || { tail -20 "$tmp/$2.log"; exit 1; }
  pages=$(grep -c '/Type /Page$' "$tmp/$2.pdf" || true)
  grep -q 'Output written on .* (1 page' "$tmp/$2.log" || { echo "$2: not one page"; exit 1; }
  cp "$tmp/$2.pdf" "$2.pdf"; echo "built $2.pdf (1 page)"
}
build 0 Sherif_Morsi_Resume
build 1 Sherif_Morsi_Resume_AI
