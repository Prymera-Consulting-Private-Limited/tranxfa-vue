#!/usr/bin/env python3
"""Every t(...) call, and whether the file it sits in can reach a t.

The catalogue guard proves a key exists. It never proved the caller could reach
the function, so a sweep that replaced a literal with t(...) and forgot the
import left a ReferenceError behind, on branches no spec happened to render:

    ReferenceError: t is not defined

    i18n-scope-check.py             # path, how many calls, the first line

A .vue file reaches t through `const {t} = useI18n()`; a module outside a
component reaches it through the i18n instance:

    import i18n from '@/i18n.js';
    const t = (...args) => i18n.global.t(...args);
"""
import os, re, subprocess, sys

CALL = re.compile(r'(?<![\w$.])t\(')
IN_SCOPE = (
    re.compile(r'\bconst\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\('),  # a component
    re.compile(r'\bconst\s+t\s*='),                                # a module
    re.compile(r'\bfunction\s+t\s*\('),
    re.compile(r'\bimport\s*\{[^}]*\bt\b[^}]*\}\s*from'),
)

paths = sys.argv[1:] or subprocess.run(
    ['git', 'ls-files', 'src'], capture_output=True, text=True).stdout.split()

bad = []
for path in paths:
    if not path.endswith(('.js', '.vue')):
        continue
    source = open(path, encoding='utf-8').read()
    # Only a script block runs as code; a template reaches t another way.
    code = '\n'.join(re.findall(r'<script[^>]*>(.*?)</script>', source, re.S)) \
        if path.endswith('.vue') else source

    calls = [m.start() for m in CALL.finditer(code)]
    if not calls or any(p.search(code) for p in IN_SCOPE):
        continue
    bad.append((path, len(calls), code[:calls[0]].count('\n') + 1))

for path, count, line in sorted(bad):
    print(f'{path}\t{count} call(s)\tfirst at script line {line}')
print(f'--- {len(bad)} file(s) call t() with no t in scope')
sys.exit(1 if bad else 0)
