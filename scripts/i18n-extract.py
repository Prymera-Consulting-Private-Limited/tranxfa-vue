#!/usr/bin/env python3
"""Move a component's copy into the catalogue.

Handles the three shapes that hold copy: a whole text node, a known text
attribute, and a text node with interpolations in it. Anything it cannot place
confidently is listed instead of guessed, so the remainder is a short read
rather than a diff to trust.

    i18n_migrate.py <repo> <prefix> <file> [file...]         # dry run
    i18n_migrate.py <repo> <prefix> <file> [file...] --apply
"""
import json, os, re, sys

ATTRS = ['placeholder', 'title', 'alt', 'aria-label', 'label', 'retryLabel',
         'retry-label', 'backLabel', 'emptyMessage', 'empty-message', 'confirmLabel']
SKIP_TEXT = re.compile(r'^[\s\d\W]*$')

def slug(text, used):
    words = re.findall(r"[A-Za-z']+", text)[:5]
    if not words:
        words = ['text']
    key = words[0].lower() + ''.join(w.capitalize() for w in words[1:])
    key = re.sub(r"[^A-Za-z0-9]", '', key) or 'text'
    base, n = key, 2
    while key in used:
        key, n = f'{base}{n}', n + 1
    used.add(key)
    return key

def param_name(expression):
    """A readable placeholder name for an interpolation."""
    parts = re.findall(r'[A-Za-z_]\w*', expression)
    parts = [p for p in parts if p not in ('data', 'value', 'props')]
    return parts[-1] if parts else 'value'

# A word that only ever joins two halves of a sentence. Alone at the start of a
# node it means the rest of the sentence lives in a sibling element, which is
# i18n-compose.py's problem, not this script's.
CONNECTIVE = re.compile(r"^\W*(?:in|on|at|of|to|for|from|via|and|or|by|with|per)\b",
                        re.IGNORECASE)


def spots_only_fragment(text, own):
    """True when a node holds only part of a sentence the markup split up.

    This used to test `len(words) < 3`, and that was the wrong question. It
    exempted `Pay {{ amount }}` - the button a customer presses to move their
    money - along with `Welcome {{ name }}`, `Upload {{ document }}` and
    `Payout in {{ country }}`, and every guard stayed green over them because
    the guard skipped the same shape.

    A message with a named placeholder can be reordered by a translator:
    "Pay {amount}" can become "{amount} a pagar". What cannot be reordered is a
    sentence spread over sibling elements, because each piece is its own
    message. So the test is whether this node opens with a connective - which
    means the sentence started in the element before it - not how many words it
    has.
    """
    if '{{' not in text:
        return False
    if not re.search(r"[A-Za-z']", own):
        return True

    # A connective *between* this node's own interpolations is fine: the node
    # still holds the whole phrase, and `{method} in {country}` is one message.
    # It is a connective at the very start or the very end of the node that
    # says the sentence continues in the element next door.
    head = text[:text.index('{{')]
    tail = text[text.rindex('}}') + 2:]
    return bool(CONNECTIVE.match(head.strip()) or CONNECTIVE.search(tail.strip() + ' ')
                and CONNECTIVE.match(tail.strip()))


def decides_a_word(text):
    """True when an interpolation picks an English word rather than a value.

    `night{{ n === 1 ? '' : 's' }}` spells a plural in the template. Turning it
    into a message with a parameter would hand the translator an `s` to place,
    which is meaningless in a language that pluralises differently. These need
    vue-i18n pluralisation and a person.
    """
    # A conditional that yields a string literal. A quote on its own is not
    # enough: `moment(x).format('lll')` is a date format, not a word.
    return any(re.search(r"""\?[^:]*['"]|:\s*['"]""", spot)
               for spot in re.findall(r'\{\{(.+?)\}\}', text))


def walk(catalogue, path):
    node = catalogue
    for part in path.split('.'):
        node = node.setdefault(part, {})
    return node

def flat(node, prefix=''):
    out = {}
    for key, value in node.items():
        out.update({prefix + key: value} if isinstance(value, str) else flat(value, f'{prefix}{key}.'))
    return out

def migrate(repo, prefix, files, apply):
    cat_path = os.path.join(repo, 'src/locales/en.json')
    catalogue = json.load(open(cat_path, encoding='utf-8'))
    by_text = {v: k for k, v in flat(catalogue).items()}
    placed, rewritten, skipped = 0, 0, []

    for rel in files:
        path = os.path.join(repo, rel)
        source = open(path, encoding='utf-8').read()
        # Only the template block: a <style> section after it holds CSS that
        # looks like text, and rewriting that produces invalid declarations.
        # The root block can carry attributes (`<template v-if="...">`), so find
        # it by its position at the start of a line rather than by exact text.
        opening = re.search(r'^<template[^>]*>', source, re.M)
        if not opening or '\n</template>' not in source:
            skipped.append((rel, 'no template')); continue
        start = opening.end()
        end = source.rindex('\n</template>') + 1
        head, rest, tail = source[:start], source[start:end], source[end:]
        sep = ''
        used = set(walk(catalogue, prefix).keys())

        def key_for(text):
            nonlocal placed, rewritten
            rewritten += 1
            if text in by_text:
                return by_text[text]
            name = slug(text, used)
            walk(catalogue, prefix)[name] = text
            full = f'{prefix}.{name}'
            by_text[text] = full
            placed += 1
            return full

        def text_node(m):
            raw = m.group(2)
            text = ' '.join(raw.split())
            # The letter test runs on what is left after the interpolations are
            # taken out. A node that is only interpolations and punctuation is
            # data, not copy, and a node whose own words are one short fragment
            # ("in", "using") is half a sentence the markup split across
            # elements; both need a person, so leave them where they are.
            # An interpolation can hold `>` (an arrow function, a comparison),
            # so a match that opens more braces than it closes is half an
            # expression, not a text node. Rewriting it produces broken markup.
            if text.count('{{') != text.count('}}'):
                return m.group(0)
            own = re.sub(r'\{\{.+?\}\}', ' ', text)
            if SKIP_TEXT.match(text) or not re.search(r'[A-Za-z]{2,}', own):
                return m.group(0)
            if spots_only_fragment(text, own) or decides_a_word(text):
                return m.group(0)
            spots = list(re.finditer(r'\{\{(.+?)\}\}', text))
            if not spots:
                return f"{m.group(1)}{{{{ $t('{key_for(text)}') }}}}{m.group(3)}"
            params, message = [], text
            for i, spot in enumerate(spots):
                name = param_name(spot.group(1))
                if name in [p[0] for p in params]:
                    name = f'{name}{i}'
                params.append((name, spot.group(1).strip()))
                message = message.replace(spot.group(0), '{' + name + '}', 1)
            if '@' in message:
                message = message.replace('@', "{'@'}")
            args = ', '.join(f'{n}: {e}' for n, e in params)
            return f"{m.group(1)}{{{{ $t('{key_for(message)}', {{{args}}}) }}}}{m.group(3)}"

        body = re.sub(r'(>)([^<>]+)(<)', text_node, rest)

        def attribute(m):
            name, value = m.group(1), m.group(2)
            text = ' '.join(value.split())
            if SKIP_TEXT.match(text) or not re.search(r'[A-Za-z]{2,}', text) or '{{' in text:
                return m.group(0)
            return f''':{name}="$t('{key_for(text)}')"'''

        body = re.sub(r'(?<![:@\w-])(' + '|'.join(map(re.escape, ATTRS)) + r')="([^"{}]{2,200})"', attribute, body)

        if apply:
            open(path, 'w', encoding='utf-8').write(head + body + tail)
        print(f'  {rel}')

    if apply:
        json.dump(catalogue, open(cat_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(cat_path, 'a', encoding='utf-8').write('\n')
    print(('applied ' if apply else 'dry run: ')
          + f'{rewritten} site(s) rewritten, {placed} new key(s) under {prefix}')
    for rel, why in skipped:
        print('  skipped', rel, why)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--apply']
    migrate(args[0], args[1], args[2:], '--apply' in sys.argv)
