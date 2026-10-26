#!/bin/sh
# rdf-array: fetch rdf-tests-contrib (the SPARQL-array tests every rdf-array implementation shares)
# into .rdf-array-tests/ at the repository root; the spec:rdf-array-* scripts map its Pages URLs there.
set -eu
checkout="$(cd "$(dirname "$0")/../../.." && pwd)/.rdf-array-tests/rdf-tests-contrib"
if test -d "$checkout/.git"; then
  git -C "$checkout" fetch --quiet --depth 1 origin main
  git -C "$checkout" checkout --quiet --detach FETCH_HEAD
else
  rm -rf "$checkout"
  git clone --quiet --depth 1 --branch main --filter=blob:none --sparse https://github.com/rdf-array/rdf-tests-contrib.git "$checkout"
  git -C "$checkout" sparse-checkout set --no-cone sparql
fi
