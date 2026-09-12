#!/usr/bin/env python3
"""English literals hiding inside template expressions.

A ternary in an interpolation or a bound attribute is not a text node, so the
extractor never saw it and a sweep for bare text never will:

    {{ open ? 'Hide password' : 'Show password' }}
    :aria-label="done ? 'Completed' : 'Pending'"

This finds them: quoted strings inside {{ }} or a :bound attribute that read
like words rather than like a key, a class name or an enum value.
"""
import re, subprocess, sys

WORDS = re.compile(r"^[A-Z][a-z]+(?: [A-Za-z',.!?-]+)*[.!?]?$|^[a-z]+(?: [a-z]+){1,}$")
SKIP = re.compile(r'^[\w.]+$|^#|^/|^[a-z-]+(?: [a-z-]+)*$\Z')

CLASSY = re.compile(r'^[a-z0-9:/\[\]().%!,-]+$')
UTILITY = re.compile(r'^(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|w|h|min|max|p[xytblr]?|m[xytblr]?|gap|text|bg|border|ring|rounded|shadow|opacity|z|top|left|right|bottom|size|space|divide|justify|items|self|order|col|row|overflow|truncate|whitespace|cursor|transition|duration|ease|animate|group|peer|sr|not|font|leading|tracking|uppercase|lowercase|capitalize|underline|antialiased|object|aspect|fill|stroke|from|via|to|backdrop|outline|accent|pointer|select|scale|rotate|translate|origin|list|table|sm|md|lg|xl|hover|focus|active|disabled|first|last|odd|even|dark|print)\b')


def is_class_list(text):
    """A Tailwind class list, not a sentence: every token is lowercase markup."""
    tokens = text.split()
    if len(tokens) < 2:
        return bool(CLASSY.fullmatch(text) and UTILITY.match(text))
    return all(CLASSY.fullmatch(tok) and (UTILITY.match(tok) or '-' in tok or ':' in tok)
               for tok in tokens)


MOMENT = re.compile(r'^[DMYHhmsAaZz\W]{3,}$')          # a date format, not words
ICON = re.compile(r'^(?:pi|fa|bi|mdi|heroicon)[\s-]')  # an icon class


def looks_like_copy(text):
    if len(text) < 3:
        return False
    if is_class_list(text) or MOMENT.fullmatch(text) or ICON.match(text):
        return False
    if '.' in text and ' ' not in text:          # a key or a filename
        return False
    if re.fullmatch(r'[A-Z0-9_]+', text):        # an enum value
        return False
    if re.fullmatch(r'[a-z][\w-]*', text):       # a lowercase token: a key, a slug
        return False
    if not re.search(r'[A-Za-z]{2,}', text):
        return False
    return bool(re.search(r'[A-Z]', text) or ' ' in text)

COMPARED = re.compile(r"""(?:[=!]==?\s*|\.(?:includes|startsWith|endsWith|indexOf|split|match)\(\s*)$""")


CALL = re.compile(r"""\$?t\(\s*(?:'[^']*'|"[^"]*")\s*(?:,[^()]*)?\)""")


def strip_calls(expr):
    """Blank out the $t() calls so their key arguments are not read as copy."""
    return CALL.sub(' ', expr)


QUOTED = re.compile(r"""'([^'\\\n]{3,200})'|"([^"\\\n]{3,200})\"""")


def value_literals(expr):
    """Literals the page renders, not the ones it compares against.

    `state === 'Pending'` is a value; `done ? 'Sent' : 'Pending'` is copy. The
    difference is what comes immediately before the quote.

    Both quote styles, because a sentence with an apostrophe is written in
    double quotes, and reading it with a single-quote pattern finds a fragment
    that starts mid-word.
    """
    out = []
    for m in QUOTED.finditer(expr):
        if COMPARED.search(expr[:m.start()]):
            continue
        out.append((m.group(0), m.group(1) if m.group(1) is not None else m.group(2)))
    return out


hits = []
for path in subprocess.run(['git','ls-files','src'],capture_output=True,text=True).stdout.split():
    if not path.endswith('.vue'):
        continue
    source = open(path, encoding='utf-8').read()
    m = re.search(r'^<template[^>]*>', source, re.M)
    if not m or '\n</template>' not in source:
        continue
    body = source[m.end():source.rindex('\n</template>')]
    for spot in re.finditer(r'\{\{(.*?)\}\}', body, re.S):
        # Do not skip an expression that already calls $t: one branch of a
        # ternary is often migrated while the other is still English, which is
        # exactly how the sign-in button kept saying Continue.
        expr = strip_calls(spot.group(1))
        for quoted, lit in value_literals(expr):
            if looks_like_copy(lit):
                hits.append((path, quoted, lit))
    for spot in re.finditer(r'(?::|v-bind:)[\w.-]+="([^"]*)"', body):
        expr = strip_calls(spot.group(1))
        for quoted, lit in value_literals(expr):
            if looks_like_copy(lit):
                hits.append((path, quoted, lit))

seen = set()
for path, quoted, lit in hits:
    if (path, quoted) in seen:
        continue
    seen.add((path, quoted))
    # tab separated so the exact source form survives, quotes and all
    print(f'{path}\t{quoted}\t{lit}')
print(f'--- {len(seen)} literals in {len({p for p, _, _ in hits})} files')
