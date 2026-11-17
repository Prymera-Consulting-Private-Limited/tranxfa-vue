#!/bin/zsh
# Port the KYC review/teardown fix onto one brand branch.
#
# Three-way merge, never wholesale copy. A first version of this script took
# main's files as-is, and on salvtech - a Spanish deployment, on a production
# branch - that silently turned "Continuar" back into "Continue" and lang: "es"
# back into "en". The brands do carry their own edits in these files; they are
# just small enough to miss.
#
# DocumentTypeItem.vue needs one extra step. The brand branches predate two
# main-only features (the Didit provider, and the SUMSUB_APIS constant that
# routes SUMSUB-VIA-FINCODE to the Sumsub component), so main's pre-fix version
# is not a usable merge base: every branch conflicts against it. Stripping those
# two features from BOTH sides of the merge gives a base the branch matches, and
# the merge then sees only the fix.
set -e
BRANCH="$1"; FIX="$2"; BASE="$3"; WORK="$4"

git checkout -q --detach "origin/$BRANCH"
git clean -qfd

has_didit=no
git cat-file -e "origin/$BRANCH:src/components/AccountVerification/Provider/Didit.vue" 2>/dev/null && has_didit=yes
has_sumsub_apis=$(git show "origin/$BRANCH:src/components/AccountVerification/DocumentTypeItem.vue" | grep -c 'SUMSUB_APIS' || true)

# `path` is a zsh special variable tied to $PATH. Naming a local that lost the
# script its own PATH, which showed up as "cp: command not found" and a port
# that silently changed nothing.
merge_one () {
  local target="$1" base_file="$2" fix_file="$3"
  mkdir -p "$(dirname "$target")"
  if ! git show "origin/$BRANCH:$target" > "$WORK/ours" 2>/dev/null; then
    command cat "$fix_file" > "$target"
    return 0
  fi
  git merge-file -q -p "$WORK/ours" "$base_file" "$fix_file" > "$WORK/out" || return 1
  command cat "$WORK/out" > "$target"
}

for F in \
  src/components/AccountVerification/Provider/Persona.vue \
  src/components/AccountVerification/Provider/Shufti.vue \
  src/components/AccountVerification/Provider/Sumsub.vue \
  src/components/AccountVerification/Provider/UpPass.vue \
  src/enums/review_answer.js
do
  git show "$BASE:$F" > "$WORK/base" 2>/dev/null || git show "$FIX:$F" > "$WORK/base"
  git show "$FIX:$F" > "$WORK/fix"
  merge_one "$F" "$WORK/base" "$WORK/fix" || { echo "CONFLICT $F"; return 1; }
done

if [ "$has_didit" = yes ]; then
  P=src/components/AccountVerification/Provider/Didit.vue
  git show "$BASE:$P" > "$WORK/base"; git show "$FIX:$P" > "$WORK/fix"
  merge_one "$P" "$WORK/base" "$WORK/fix" || { echo "CONFLICT $P"; return 1; }
fi

D=src/components/AccountVerification/DocumentTypeItem.vue
git show "$BASE:$D" > "$WORK/dbase"
git show "$FIX:$D"  > "$WORK/dfix"
for side in dbase dfix; do
  python3 - "$WORK/$side" "$has_didit" "$has_sumsub_apis" <<'PY'
import re, sys
path, has_didit, has_sumsub_apis = sys.argv[1], sys.argv[2], int(sys.argv[3])
s = open(path).read()
if has_didit != 'yes':
    s = s.replace('import Didit from "@/components/AccountVerification/Provider/Didit.vue";\n', '')
    s = re.sub(r'\n *<Didit\b[\s\S]*?/>\n', '\n', s)
    assert 'Didit' not in s, 'Didit not fully removed from ' + path
if not has_sumsub_apis:
    s = re.sub(r'\n// Provider codes the backend sends as `api`[\s\S]*?const SUMSUB_APIS = \[[^\]]*\];\n', '\n', s)
    s = s.replace('v-if="SUMSUB_APIS.includes(documentType.api)"', 'v-if="documentType.api === \'SUMSUB\'"')
    assert 'SUMSUB_APIS' not in s, 'SUMSUB_APIS not fully removed from ' + path
open(path, 'w').write(s)
PY
done
merge_one "$D" "$WORK/dbase" "$WORK/dfix" || { echo "CONFLICT $D"; return 1; }
