#!/usr/bin/env bash
#
# Branch audit for the white-label fleet.
#
#   scripts/branch-audit.sh              divergence of every branch from main
#   scripts/branch-audit.sh <branch>     what that brand deliberately customised
#
# "Ahead"/"behind" are relative to origin/main. "Customised" is the diff against
# the branch's own merge-base with main, i.e. the brand's intentional delta
# rather than the drift caused by main moving on.

set -euo pipefail

BASE="${BASE:-origin/main}"

git fetch --all --prune --quiet

if [ $# -ge 1 ]; then
    branch="origin/${1#origin/}"
    mb=$(git merge-base "$BASE" "$branch")

    echo "Branch:     $branch"
    echo "Merge-base: $(git log -1 --format='%h %cd' --date=short "$mb")"
    read -r behind ahead <<<"$(git rev-list --left-right --count "$BASE...$branch")"
    echo "Ahead of ${BASE}: $ahead    Behind: $behind"
    echo
    echo "Files this brand customised (vs its merge-base):"
    git diff --stat "$mb" "$branch" | sed 's/^/  /'
    echo
    echo "Hardcoded palette colours (should be brand-* instead):"
    git grep -nE '\b(purple|indigo|violet|fuchsia|teal|cyan)-[0-9]{2,3}\b' "$branch" -- src \
        | sed 's/^/  /' || echo "  none"
    exit 0
fi

printf '%-48s %6s %7s  %s\n' BRANCH AHEAD BEHIND LAST-COMMIT
for branch in $(git branch -r | grep -v HEAD | sed 's|.*origin/||'); do
    read -r behind ahead <<<"$(git rev-list --left-right --count "$BASE...origin/$branch")"
    printf '%-48s %6s %7s  %s\n' \
        "$branch" "$ahead" "$behind" \
        "$(git log -1 --format=%cd --date=short "origin/$branch")"
done | sort -k4 -r

echo
echo "Customisation surface across brand branches (file -> how many brands changed it):"
for branch in $(git branch -r | grep -vE 'HEAD|origin/(main|release)$' | sed 's|.*origin/||'); do
    mb=$(git merge-base "$BASE" "origin/$branch" 2>/dev/null) || continue
    git diff --name-only "$mb" "origin/$branch" 2>/dev/null
done | sort | uniq -c | sort -rn | head -25 | sed 's/^/  /'
