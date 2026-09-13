#!/usr/bin/env python3
"""Prove a migration changed no rendered English.

The extractor replaces a text node with a `$t(...)` call, and a node that sat
beside a styled element loses the single space that separated them: `Expiry date
<span>` renders with a gap, `{{ $t(...) }}<span>` renders without one. HTML
collapses runs of whitespace but not the difference between none and one, so a
lost space is a visible defect that no unit test sees.

This compares the text each template renders in English, before and after, with
tags removed and whitespace collapsed. Anything it prints is a real change.

    i18n-render-check.py <ref> <file> [file...]
"""
import json, re, subprocess, sys

def catalogue(ref=None):
    path = 'src/locales/en.json'
    if ref is None:
        return json.load(open(path, encoding='utf-8'))
    out = subprocess.run(['git', 'show', f'{ref}:{path}'], capture_output=True, text=True)
    return json.loads(out.stdout) if out.returncode == 0 else {}

def flat(node, prefix=''):
    out = {}
    for key, value in node.items():
        out.update({prefix + key: value} if isinstance(value, str) else flat(value, f'{prefix}{key}.'))
    return out

def placeholders(text):
    """A named placeholder renders a runtime value, the same marker an
    interpolation gets; an escaped @ renders as itself."""
    return re.sub(r'\{[A-Za-z_]\w*\}', '\x00', text.replace("{'@'}", '@'))


def message(keys, key):
    """The message a key renders.

    A pluralised message holds every form separated by `|`; vue-i18n picks one
    at runtime, so compare against the first. Without this a plural reads as
    the literal text "one night | many nights" and every pluralisation looks
    like a regression.
    """
    text = keys.get(key, f'?{key}')
    if '|' in text:
        text = text.split('|')[0].strip()
    return placeholders(text)


def template(source):
    if '<template>' not in source or '</template>' not in source:
        return ''
    return source[source.index('<template>') + 10:source.rindex('</template>')]

def rendered(source, keys):
    body = template(source)
    # <i18n-t keypath="k"> ... </i18n-t>: the message, with each slot's own text
    # put where its placeholder sits.
    def linked(m):
        key, inner = m.group(1), m.group(2)
        text = keys.get(key, f'?{key}')
        for name, slot in re.findall(r'<template #(\w+)>(.*?)</template>', inner, re.S):
            text = text.replace('{' + name + '}', strip(slot))
        return ' ' + placeholders(text) + ' '
    body = re.sub(r'<i18n-t[^>]*keypath="([^"]+)"[^>]*>(.*?)</i18n-t>', linked, body, flags=re.S)
    body = re.sub(r'<i18n-t[^>]*keypath="([^"]+)"[^>]*/>',
                  lambda m: ' ' + message(keys, m.group(1)) + ' ', body)
    # {{ $t('k') }} and {{ $t('k', {...}) }}: the message itself. An
    # interpolation that is not a $t call is a runtime value; both sides render
    # the same thing, so it collapses to one marker.
    # {{ $t('k') }}, {{ $t('k', {...}) }}, and a $t call anywhere inside an
    # interpolation - `{{ cond ? $t('a') : $t('b') }}` renders one of two
    # messages, and reading only a call at the very start of the interpolation
    # made that whole branch vanish from the comparison.
    def calls(m):
        inner = m.group(1)
        found = re.findall(r"\$?t\(\s*'([\w.]+)'", inner)
        if not found:
            return '\x00'
        return ' '.join(message(keys, key) for key in found)

    body = re.sub(r'\{\{(.*?)\}\}', calls, body, flags=re.S)
    return strip(body)

def strip(markup):
    markup = re.sub(r'<!--.*?-->', '', markup, flags=re.S)
    # A tag, quoted attribute values included: a Vue binding holds `>` freely.
    markup = re.sub(r'''<(?:[^>"']|"[^"]*"|'[^']*')*>''', '', markup)
    return ' '.join(markup.split())

def main(ref, files):
    after, before = flat(catalogue()), flat(catalogue(ref))
    bad = 0
    for rel in files:
        old = subprocess.run(['git', 'show', f'{ref}:{rel}'], capture_output=True, text=True).stdout
        new = open(rel, encoding='utf-8').read()
        was, now = rendered(old, before), rendered(new, after)
        if was != now:
            bad += 1
            print(f'{rel}')
            for line in difference(was, now):
                print('   ', line)
    print(f'{len(files)} files, {bad} changed')
    return 1 if bad else 0

def difference(was, now):
    import difflib
    for group in difflib.SequenceMatcher(None, was, now).get_opcodes():
        tag, i1, i2, j1, j2 = group
        if tag == 'equal':
            continue
        yield f'{tag}: ...{was[max(0, i1 - 30):i2 + 30]!r} -> ...{now[max(0, j1 - 30):j2 + 30]!r}'

if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2:]))
