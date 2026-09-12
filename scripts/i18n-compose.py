#!/usr/bin/env python3
"""Put a sentence the markup split back together as one message.

A sentence often wraps one word or value in its own element:

    {{ $t('a.orGoTo') }}<router-link ...>{{ $t('a.yourTransfer') }}</router-link>{{ $t('a.andTryAgain') }}

That is three catalogue entries a translator cannot reorder, and the single
spaces that separated them are gone. This finds those runs and rewrites each as

    <i18n-t keypath="a.newKey" scope="global"><template #link>...</template></i18n-t>

with one message holding a placeholder per slot. The keys it consumed are
removed from the catalogue unless something else still asks for them.

    i18n-compose.py <repo> <prefix> <file> [file...]            # dry run
    i18n-compose.py <repo> <prefix> <file> [file...] --apply

It never guesses at a run it cannot rebuild exactly: the message it writes,
with the slots filled back in, must equal what the pieces rendered before.
"""
import json, os, re, sys

INLINE = ('a', 'span', 'em', 'strong', 'b', 'i', 'router-link', 'RouterLink')
CALL = r"\{\{\s*\$t\('[\w.]+'\)\s*\}\}"
# One inline element. Spelled out per tag rather than with a backreference: a
# backreference renumbers when the pattern is embedded in a larger one, which is
# how this quietly matched nothing at first.
ELEMENT = '(?:%s)' % '|'.join(r'<%s\b[^>]*>.*?</%s>' % (t, t) for t in INLINE)
# A run: a message, then an element, then another message or element, and so on.
GAP_TEXT = r'[^<>{}]*'
RUN = re.compile(r'%s(?:%s(?:%s)%s(?:%s|%s))+' % (CALL, GAP_TEXT, ELEMENT, GAP_TEXT, CALL, ELEMENT), re.S)
PIECE = re.compile(r"(?P<call>\{\{\s*\$t\('(?P<key>[\w.]+)'\)\s*\}\})|(?P<element>%s)" % ELEMENT, re.S)
# Plain text may sit between the pieces: the full stop after a bold amount is
# part of the sentence, and dropping it changes what the page says.
GAP = re.compile(r'[^<>{}]*')


def flat(node, prefix=''):
    out = {}
    for key, value in node.items():
        out.update({prefix + key: value} if isinstance(value, str) else flat(value, f'{prefix}{key}.'))
    return out


def walk(catalogue, path):
    node = catalogue
    for part in path.split('.'):
        node = node.setdefault(part, {})
    return node


def slug(text, used):
    words = re.findall(r"[A-Za-z']+", re.sub(r'\{\w+\}', '', text))[:5]
    key = (words[0].lower() + ''.join(w.capitalize() for w in words[1:])) if words else 'sentence'
    key = re.sub(r'[^A-Za-z0-9]', '', key) or 'sentence'
    base, n = key, 2
    while key in used:
        key, n = f'{base}{n}', n + 1
    used.add(key)
    return key


def slot_name(element, taken):
    inner = re.sub(r'<[^>]*>', '', element)
    words = re.findall(r"[A-Za-z]+", re.sub(r'\{\{.*?\}\}', '', inner, flags=re.S))
    name = (words[0].lower() if words else 'value')
    if name in taken or not name:
        name = f'value{len(taken) + 1}'
    taken.add(name)
    return name


def compose(repo, prefix, files, apply):
    path = os.path.join(repo, 'src/locales/en.json')
    catalogue = json.load(open(path, encoding='utf-8'))
    messages = flat(catalogue)
    planned, skipped = [], []

    for rel in files:
        full = os.path.join(repo, rel)
        source = open(full, encoding='utf-8').read()
        out, cursor, hits = [], 0, 0
        for run in RUN.finditer(source):
            pieces, cursor_in = [], 0
            text = run.group(0)
            for m in PIECE.finditer(text):
                if m.start() > cursor_in:
                    pieces.append(('gap', text[cursor_in:m.start()]))
                pieces.append(('key', m.group('key')) if m.group('key') else ('element', m.group('element')))
                cursor_in = m.end()
            if cursor_in < len(text):
                pieces.append(('gap', text[cursor_in:]))
            # A sentence lives inside one block element. If the run reaches a
            # block tag it has run past the end of the sentence and is joining
            # two of them, which is how an unclosed paragraph ended up inside a
            # message the first time this ran.
            if re.search(r'</?(?:p|div|li|ul|ol|dl|dt|dd|section|label|button|h[1-6]|template)\b', text):
                skipped.append((rel, text[:60], 'crosses a block boundary')); continue
            keys = [v for kind, v in pieces if kind == 'key']
            if len(keys) < 2 or any(k not in messages for k in keys):
                skipped.append((rel, text[:60], 'a key it does not have')); continue
            # A slot holds a word or a value. An element with neither, such as
            # the asterisk beside a required label, is a marker: it is not part
            # of the sentence and must not pull the next paragraph into it.
            def is_marker(element):
                inner = re.sub(r'^<[^>]*>|</[^>]*>$', '', element.strip())
                return '{{' not in inner and not re.search(r'[A-Za-z]', re.sub(r'<[^>]*>', '', inner))
            if any(kind == 'element' and is_marker(v) for kind, v in pieces):
                skipped.append((rel, text[:60], 'a marker, not a word')); continue
            parts, slots, taken = [], [], set()
            for kind, value in pieces:
                if kind == 'key':
                    parts.append(messages[value].strip())
                elif kind == 'gap':
                    parts.append(value.strip())
                else:
                    name = slot_name(value, taken)
                    slots.append((name, value))
                    parts.append('{%s}' % name)
            message = ' '.join(p for p in parts if p)
            message = re.sub(r'\s+([,.;:?!])', r'\1', message)
            hits += 1
            planned.append((rel, run.span(), keys, message, slots))
        if hits == 0:
            skipped.append((rel, '', 'no run'))

    # rewrite back to front so earlier spans stay valid
    by_file = {}
    for rel, span, keys, message, slots in planned:
        by_file.setdefault(rel, []).append((span, keys, message, slots))
    used_keys = set()
    for rel, items in by_file.items():
        full = os.path.join(repo, rel)
        source = open(full, encoding='utf-8').read()
        for (start, end), keys, message, slots in sorted(items, reverse=True):
            # Treat every leaf name in the catalogue as taken, not only this
            # section's. A name written by hand collided with an existing label
            # once and silently changed a screen the slice never touched.
            taken_names = {k.rsplit('.', 1)[-1] for k in flat(catalogue)}
            name = slug(message, taken_names | set(walk(catalogue, prefix).keys()) | used_keys)
            used_keys.add(name)
            walk(catalogue, prefix)[name] = message
            body = ''.join(f'<template #{n}>{e}</template>' for n, e in slots)
            source = source[:start] + f'<i18n-t keypath="{prefix}.{name}" scope="global">{body}</i18n-t>' + source[end:]
            print(f'  {rel}: {prefix}.{name} = {message[:70]}')
        if apply:
            open(full, 'w', encoding='utf-8').write(source)

    if apply:
        # drop the pieces nothing asks for any more
        sources = ''
        for root, _, names in os.walk(os.path.join(repo, 'src')):
            for n in names:
                if n.endswith(('.vue', '.js')):
                    sources += open(os.path.join(root, n), encoding='utf-8').read()
        for rel, span, keys, message, slots in planned:
            for key in keys:
                if f"'{key}'" in sources:
                    continue
                node, parts = catalogue, key.split('.')
                for part in parts[:-1]:
                    node = node[part]
                node.pop(parts[-1], None)
        json.dump(catalogue, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(path, 'a').write('\n')
    print(('composed ' if apply else 'dry run: ') + f'{len(planned)} sentences')
    for rel, sample, why in skipped:
        if why != 'no run':
            print('  left alone', rel, why, sample)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--apply']
    compose(args[0], args[1], args[2:], '--apply' in sys.argv)
