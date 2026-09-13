#!/usr/bin/env python3
"""Display dates should be asked for by meaning, not spelled out.

`MMM D, YYYY h:mm A` renders "septiembre 12, 2026 02:39 AM" in Spanish: the
month translates, the order and the clock do not. Each locale defines its own
`L`, `LL`, `LLL`, `LT` and the short `ll`, `lll`, so asking for one of those
gets "12 de septiembre de 2026, 2:39" without the component deciding.

    i18n-date-formats.py            # what would change
    i18n-date-formats.py --apply

A format sent to an API is not display and is left alone.
"""
import re, subprocess, sys

# spelled out -> asked for by meaning
LOCALISED = {
    'MMM D, YYYY h:mm A': 'lll',
    'MMMM D, YYYY hh:mm A': 'LLL',
    'MMMM D, YYYY h:mm A': 'LLL',
    'D MMM YYYY, HH:mm': 'lll',
    'ddd D MMM, h:mm A': 'llll',
    'D MMM, h:mm A': 'lll',
    'ddd D MMM YYYY': 'llll',
    'MMM D, YYYY': 'll',
    'D MMM YYYY': 'll',
    'h:mm A': 'LT',
    'HH:mm': 'LT',
}
# no locale defines a day-and-month-without-year format, so these stay, and
# they are the ones to look at if a language needs a different order.
KEEP = {'D MMM', 'ddd D MMM', 'ddd, D MMM', 'dddd', 'YYYY-MM-DD', 'YYYY'}


def main(apply):
    changed, left = 0, {}
    for path in subprocess.run(['git', 'ls-files', 'src'], capture_output=True, text=True).stdout.split():
        if not path.endswith(('.vue', '.js')):
            continue
        source = open(path, encoding='utf-8').read()
        out = source
        for spelled, meaning in LOCALISED.items():
            out = out.replace(f".format('{spelled}')", f".format('{meaning}')")
        if out != source:
            changed += 1
            if apply:
                open(path, 'w', encoding='utf-8').write(out)
        for m in re.finditer(r"\.format\(\s*'([^']*)'\s*\)", out):
            if m.group(1) not in LOCALISED.values():
                left.setdefault(m.group(1), []).append(path)
    print(('changed ' if apply else 'would change ') + f'{changed} files')
    for fmt, paths in sorted(left.items()):
        note = 'sent to an API' if fmt in ('YYYY-MM-DD', 'YYYY') else \
               ('no localised equivalent' if fmt in KEEP else 'NOT MAPPED, look at this')
        print(f"  kept {fmt!r} in {len(paths)} place(s): {note}")


if __name__ == '__main__':
    main('--apply' in sys.argv)
