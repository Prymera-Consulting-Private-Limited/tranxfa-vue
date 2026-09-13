#!/usr/bin/env python3
"""Copy in a component's script block, rendered by the template as data.

The navigation is the example: `{name: 'Home', href: 'dashboard'}` in an array
that the template loops over. It is copy, but it is not a text node, not an
attribute and not inside a template expression, so none of the earlier sweeps
could see it.

    i18n-script-sweep.py            # path, the exact source form, the words

What this deliberately does not report, each rule paid for by a mistake:
a Tailwind class list, an icon class, a date format, a media query, an enum,
a slug, an event name, a compound written as one word, a developer log line,
a value being compared against, a string being concatenated, and a default
inside defineProps, which cannot call t() because Vue hoists it above setup().

A concatenation means a + beside the literal on the same line. The rule used to
be `[+\w)\]]\s*$`, and \s* crossed a newline: `return 'copy'` matched on the n
of return, so every returned sentence in every script block was invisible. Its
mirror skipped any literal at the end of a line whose next line began with a
word character. Both were written to catch `x + 'foo'` and caught most copy.
"""
import re, subprocess

TAILWIND = re.compile(r'^[a-z0-9:/\[\]().%!,@-]+$')  # @ for a container query
UTILITY = re.compile(r'^(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|w|h|min|max|p[xytblr]?|m[xytblr]?|gap|text|bg|border|ring|rounded|shadow|opacity|z|top|left|right|bottom|size|space|divide|justify|items|self|order|col|row|overflow|truncate|whitespace|cursor|transition|duration|ease|animate|group|peer|sr|not|font|leading|tracking|uppercase|underline|antialiased|object|aspect|fill|stroke|from|via|to|backdrop|outline|accent|pointer|select|scale|rotate|translate|origin|list|table|sm|md|lg|xl|hover|focus|active|disabled|first|last|odd|even|dark|print)\b')
MOMENT = re.compile(r'^[DdMYyHhmsSAaZzXxWwEeQGgkTt\W]{3,}$')
ICON = re.compile(r'^(?:pi|fa|bi|mdi)[\s-]')
MEDIA = re.compile(r'^\(\s*(?:min|max|prefers)-')
KEYISH = re.compile(r'^[A-Z0-9_]+$|^[a-z][\w-]*$')
COMPARED = re.compile(r"""(?:[=!]==?\s*|\.(?:includes|startsWith|endsWith|indexOf|split|match)\(\s*|import\s+.*from\s*|require\(\s*)$""")
# An analytics event name is wiring, not copy: fbq('trackCustom', 'KYCApproved')
# and fbq('track', 'Purchase', {...}) are names Meta matches on, and moving one
# into the catalogue stops the conversion being counted without changing a word
# on screen. gtag is here for the same reason; only the brand branches call either.
WIRING = re.compile(r'\.(?:listen|stopListening|emit|on|off|once)\(\s*$|\$emit\(\s*$'
                    r'|\b(?:fbq|gtag)\??\.?\(\s*$|\b(?:fbq|gtag)\??\.?\([^)]*,\s*$')
NOISE = re.compile(r'console\.\w+\(\s*$|(?:useMediaQuery|matchMedia)\(\s*$')
# `import.meta.env.VITE_APP_NAME || 'Payvel'` is a default for a missing
# environment variable. It is configuration, and translating it would rename
# the brand. Only an env read counts: `props.label || 'Continue'` is still copy.
ENV_DEFAULT = re.compile(r'import\.meta\.env\.\w+\s*(?:\|\||\?\?)\s*$')
CALL_ARG = re.compile(r'\$?t\(\s*$')


def is_class_list(text):
    tokens = text.strip().split()
    if len(tokens) < 2:
        return bool(TAILWIND.fullmatch(text) and UTILITY.match(text))
    return all(TAILWIND.fullmatch(tok) and (UTILITY.match(tok) or '-' in tok or ':' in tok)
               for tok in tokens)


def looks_like_copy(text):
    if len(text) < 3 or '/' in text or '@' in text:
        return False
    if is_class_list(text) or MOMENT.fullmatch(text) or ICON.match(text):
        return False
    if MEDIA.match(text) or text.startswith('['):
        return False
    if '.' in text and ' ' not in text:
        return False
    if KEYISH.fullmatch(text):
        return False
    if ' ' not in text and re.search(r'[:_.\-]', text):
        return False
    if ' ' not in text and re.search(r'[a-z][A-Z]', text):
        return False
    if not re.search(r'[A-Za-z]{2,}', text):
        return False
    return bool(re.search(r'[A-Z]', text) or ' ' in text)


def in_call(code, index, name):
    open_at = code.rfind(name + '(', 0, index)
    if open_at < 0:
        return False
    depth, i = 0, open_at + len(name)
    while i < len(code):
        if code[i] == '(':
            depth += 1
        elif code[i] == ')':
            depth -= 1
            if depth == 0:
                return open_at < index < i
        i += 1
    return False


def strings_in(code):
    """Every string literal, with its source text.

    A regex cannot do this: in `'+' + code + ' '` it happily matches the gap
    between two strings and hands back ` + code + ` as though it were copy.
    """
    out, i, n = [], 0, len(code)
    while i < n:
        c = code[i]
        if c in '\'"`':
            quote, start, i = c, i, i + 1
            while i < n:
                if code[i] == '\\':
                    i += 2; continue
                if code[i] == quote:
                    break
                if quote != '`' and code[i] == '\n':
                    break
                i += 1
            if i < n and code[i] == quote:
                out.append((start, code[start:i + 1], code[start + 1:i]))
            i += 1
            continue
        if c == '/' and i + 1 < n and code[i + 1] == '/':
            i = code.find('\n', i)
            if i < 0:
                break
            continue
        if c == '/' and i + 1 < n and code[i + 1] == '*':
            i = code.find('*/', i)
            if i < 0:
                break
            i += 2
            continue
        i += 1
    return out


hits = []
for path in subprocess.run(['git', 'ls-files', 'src'], capture_output=True, text=True).stdout.split():
    if not path.endswith('.vue'):
        continue
    source = open(path, encoding='utf-8').read()
    bodies = re.findall(r'<script[^>]*>(.*?)</script>', source, re.S)
    if not bodies:
        continue
    body = '\n'.join(bodies)
    for start, quoted, text in strings_in(body):
        if quoted.startswith('`'):
            continue
        before = body[:start][-40:]
        if COMPARED.search(before) or WIRING.search(before) or NOISE.search(before) \
                or CALL_ARG.search(before) or ENV_DEFAULT.search(before):
            continue
        if re.search(r'\+[ \t]*$', before):
            continue
        if re.match(r'[ \t]*\+', body[start + len(quoted):][:12]):
            continue
        if in_call(body, start, 'defineProps') or in_call(body, start, 'defineEmits') or \
                in_call(body, start, 'defineOptions'):
            continue
        if looks_like_copy(text):
            hits.append((path, quoted, text))

seen = set()
for path, quoted, text in hits:
    if (path, quoted) in seen:
        continue
    seen.add((path, quoted))
    print(f'{path}\t{quoted}\t{text}')
print(f'--- {len(seen)} literals in {len({p for p, _, _ in hits})} files')
