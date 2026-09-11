#!/usr/bin/env python3
"""Re-apply a brand branch's copy edits onto main's version of the same files.

Why this exists
---------------
A brand branch (salvtech is the first) carries its translations as edits to
the templates themselves: "Continue" became "Continuar" in ~45 files, with no
i18n layer. When main is merged into that branch every one of those files
conflicts, and the resolution is always the same shape: take main's version
(`git checkout --theirs`) and put the brand's words back. Doing that by hand
for hundreds of hunks is how a "Continue" slips onto a Spanish production
build.

What it does
------------
For each file it reads the brand's edits (`git diff -U1 <base> <brand>`),
splits them into change groups, and applies each group to the file in the
working tree (main's version after the conflict was resolved theirs-side):

  block    the removed lines still exist verbatim and contiguous -> replaced
           with the added lines (trailing whitespace tolerated).
  line     main changed the markup around the words. Every line is read as a
           skeleton (tags, attribute names, placeholders for every value and
           text node) plus its translatable segments (text nodes, title /
           placeholder / aria-label / alt / *Label attribute values, string
           literals on script lines). The current line with the same skeleton
           and the same segments as the brand's removed line gets the brand's
           new segments spliced in, so main's classes survive and the brand's
           words land. Never a bare substring: "Send" is not touched inside
           "Send money". When the brand also changed the structure of the
           line, its line is taken whole.
  insert   a pure addition is placed after its leading context line when
           that line is unique in the current file.

A line the brand reflowed over several physical lines (a <p> split in three)
is joined back into one logical line before matching. Anything else is
reported as UNMATCHED with the closest current line, for a person to do. The
report also lists every English string main introduced in the files it
changed since the base: the translator's list.

Stdlib only, like scripts/sanitise-fixtures.py. `--self-test` runs the
matching on synthetic data without git.

Usage
-----
  scripts/reapply-brand-copy.py --base ea89342 --brand origin/salvtech_production \
      --main origin/main --files src/a.vue src/b.vue --report /tmp/copy-report.md
  scripts/reapply-brand-copy.py ... --files-from /tmp/translation-only.txt --dry-run
  scripts/reapply-brand-copy.py --self-test
"""
import argparse
import difflib
import os
import re
import subprocess
import sys

# ---------------------------------------------------------------- git

def git(*args):
    return subprocess.run(['git', *args], check=True, capture_output=True, text=True).stdout


def brand_groups(base, brand, path):
    return parse_unified(git('diff', '-U1', '--no-color', base, brand, '--', path))


def parse_unified(text):
    """Change groups: each a dict with old, new and the context line before.

    A hunk with two edits a line apart is two groups; keeping them together
    would pair "Saving..." with "Send money".
    """
    groups, hunk_started, current, last_context = [], False, None, None
    for line in text.splitlines():
        if line.startswith('@@'):
            hunk_started, current, last_context = True, None, None
            continue
        if not hunk_started or line.startswith(('---', '+++', 'diff ', 'index ', '\\ No newline')):
            continue
        tag, body = line[:1], line[1:]
        if tag == ' ':
            current, last_context = None, body
            continue
        if current is None:
            current = {'old': [], 'new': [], 'before': last_context}
            groups.append(current)
        (current['old'] if tag == '-' else current['new']).append(body)
    return groups

# ---------------------------------------------------------------- lines

WS = re.compile(r'\s+')
TEXT_ATTRS = {'title', 'placeholder', 'aria-label', 'alt', 'label', 'backLabel', 'retryLabel',
              'confirmLabel', 'cancelLabel', 'text', 'value'}
ATTR = re.compile(r'([:@\w.-]+)="([^"]*)"')
TEXT_TAGS = {'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'label', 'li', 'em',
             'strong', 'small', 'dt', 'dd', 'td', 'th', 'legend', 'summary', 'option', 'template'}
# Attribute values may contain > (":class="[a.length > 0 ? ...]"), so the
# attribute run is read as quoted strings or non-bracket characters.
TAG = re.compile(r'<(/?)([A-Za-z][\w-]*)((?:"[^"]*"|\'[^\']*\'|[^"\'<>])*)>')
LITERAL = re.compile(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"")
CLASSLIST = re.compile(r'^[a-z0-9:/\-\[\]\.%!&\s]+$')


class Line:
    """A line's markup skeleton and its translatable segments with spans."""

    def __init__(self, text):
        self.text = text
        self.segments = []   # (start, end, value)
        self.skeleton = self._analyse(text)
        self.values = [v for _, _, v in self.segments]

    def _analyse(self, line):
        if TAG.search(line):
            return self._markup(line)
        stripped = line.strip()
        if not stripped:
            return ''
        if ('<' in line) != ('>' in line):
            # A tag split over several lines: structure, nothing to translate.
            return WS.sub(' ', stripped)
        if self._looks_like_code(stripped):
            return self._code(line)
        # A bare text line inside an element.
        s = len(line) - len(line.lstrip())
        e = s + len(stripped)
        self.segments.append((s, e, stripped))
        return '~'

    @staticmethod
    def _looks_like_code(s):
        if s.startswith(('//', '*', '/*', 'import ', 'export ', 'const ', 'let ', 'return ', 'if ', '}', ')', '.', '`')):
            return True
        if s.endswith((';', '{', '}', '(', ')', ',', '=>', '[', ']', ':')):
            return True
        if re.search(r'=|\(|\[|\|\||&&|\.value\b|\bfunction\b', s):
            return True
        return bool(re.search(r"[=(:]\s*['\"]|['\"]\s*[,;)]", s)) and s.count("'") % 2 == 0 and s.count('"') % 2 == 0

    @staticmethod
    def _translatable_literal(value):
        v = value.strip()
        if not re.search(r'[A-Za-z]{2}', v):
            return False
        if CLASSLIST.match(v) or v.startswith(('/', '@', 'http', '#')):
            return False
        # An expression in a bound attribute, or a CamelCase identifier.
        if re.search(r'[=()\[\]{}]|&&|\|\||\w\.\w', v) or re.fullmatch(r'[A-Z][a-z]+(?:[A-Z][a-z]+)+', v):
            return False
        # A sentence, or a capitalised word ("Recipient") that is not a constant.
        return ' ' in v or (v[:1].isupper() and re.search(r'[a-z]', v) is not None)

    def _code(self, line):
        out, pos = [], 0
        for m in LITERAL.finditer(line):
            value = m.group(1) if m.group(1) is not None else m.group(2)
            if not self._translatable_literal(value):
                continue
            out.append(WS.sub(' ', line[pos:m.start()]))
            out.append(m.group(0)[0] + '~' + m.group(0)[0])
            self.segments.append((m.start() + 1, m.end() - 1, value))
            pos = m.end()
        out.append(WS.sub(' ', line[pos:]))
        return ''.join(out).strip()

    def _markup(self, line):
        out, pos = [], 0
        for m in TAG.finditer(line):
            # text before this tag
            self._text_node(line, pos, m.start(), out)
            closing, name, attrs = m.groups()
            selfclose = '/' if attrs.rstrip().endswith('/') else ''
            if selfclose:
                attrs = attrs.rstrip()[:-1]
            out.append('<' + closing + name)
            for a in ATTR.finditer(attrs):
                aname, value = a.group(1), a.group(2)
                if aname in TEXT_ATTRS and re.search(r'[A-Za-z]', value):
                    self.segments.append((m.start() + 1 + len(closing) + len(name) + a.start(2), m.start() + 1 + len(closing) + len(name) + a.end(2), value))
                out.append(' ' + aname + '="~"')
            rest = ATTR.sub('', attrs).strip()
            if rest:
                out.append(' ' + WS.sub(' ', rest))
            out.append(selfclose + '>')
            pos = m.end()
        self._text_node(line, pos, len(line), out)
        return WS.sub(' ', ''.join(out)).strip()

    def _text_node(self, line, start, end, out):
        chunk = line[start:end]
        if not chunk:
            return
        if not chunk.strip():
            out.append(' ')
            return
        s = start + (len(chunk) - len(chunk.lstrip()))
        e = end - (len(chunk) - len(chunk.rstrip()))
        value = line[s:e]
        if '="' in value or value.startswith(('}"', '"')):
            # The tail of a multi-line tag, not a text node.
            out.append(' ' + WS.sub(' ', value) + ' ')
            return
        if re.search(r'[A-Za-z]', re.sub(r'\{\{.*?\}\}', '', value)) or re.search(r"'[^']*[A-Za-z][^']*'", value):
            self.segments.append((s, e, value))
            out.append(' ~ ')
        else:
            # {{ expression }} alone, or punctuation: structure, not words
            out.append(' ' + WS.sub(' ', value) + ' ')

    @property
    def tags(self):
        """The tag sequence alone: the fallback key when main renamed attributes."""
        return ' '.join(m.group(1) + m.group(2) for m in TAG.finditer(self.text))

    def splice(self, values):
        """This line with its k-th segment replaced by values[k]."""
        text, offset = self.text, 0
        for (s, e, _), v in zip(self.segments, values):
            text = text[:s + offset] + v + text[e + offset:]
            offset += len(v) - (e - s)
        return text


def open_text_tag(text):
    """The name of a text-holding tag opened and not closed in text, or None."""
    stack = []
    for m in TAG.finditer(text):
        closing, name, attrs = m.groups()
        if attrs.rstrip().endswith('/'):
            continue
        if closing:
            if stack and stack[-1] == name:
                stack.pop()
        else:
            stack.append(name)
    return stack[-1] if stack and stack[-1] in TEXT_TAGS else None


def logical_lines(lines):
    """Join a text block the brand reflowed over several lines back into one."""
    out, acc = [], None
    for l in lines:
        if acc is not None and open_text_tag(acc):
            acc = acc.rstrip() + ' ' + l.strip()
        else:
            if acc is not None:
                out.append(acc)
            acc = l
    if acc is not None:
        out.append(acc)
    return out


def find_block(current, block, loose=False):
    n = len(block)
    norm = (lambda s: s.rstrip()) if loose else (lambda s: s)
    target = [norm(l) for l in block]
    for i in range(len(current) - n + 1):
        if [norm(l) for l in current[i:i + n]] == target:
            return i
    return -1

# ---------------------------------------------------------------- apply

class Result:
    def __init__(self):
        self.applied = []     # (strategy, description)
        self.unmatched = []   # (old_lines, new_lines, candidate)


def match_line(current, analysed, old, new, cursor):
    """Index of the current line that carries old's words, and its rewrite."""
    o, n = Line(old), Line(new)
    if not o.segments:
        return None
    candidates = [i for i, a in enumerate(analysed) if a.skeleton == o.skeleton and a.values == o.values]
    if not candidates:
        # main renamed or added an attribute (:class -> :disabled): fall back to
        # the tag sequence and the words, but only when that names one line.
        candidates = [i for i, a in enumerate(analysed) if a.tags == o.tags and a.values == o.values and a.segments]
        if len(candidates) != 1:
            return None
    pick = next((i for i in candidates if i >= cursor), candidates[0])
    if len(n.segments) == len(o.segments) and (n.skeleton == o.skeleton or n.tags == o.tags):
        rewritten = analysed[pick].splice(n.values)
        strategy = 'line'
    else:
        rewritten = new
        strategy = 'line (brand structure)'
    if rewritten == current[pick]:
        return None
    return pick, rewritten, strategy


def apply_group(current, group, result, cursor):
    old, new = group['old'], group['new']
    label = (old[0] if old else new[0]).strip()[:90]

    if old:
        at = find_block(current, old)
        if at < 0:
            at = find_block(current, old, loose=True)
        if at >= 0:
            current[at:at + len(old)] = new
            result.applied.append(('block', label))
            return at + len(new)

    if not old and new and group['before'] is not None:
        hits = [i for i, l in enumerate(current) if l == group['before']]
        if len(hits) == 1:
            current[hits[0] + 1:hits[0] + 1] = new
            result.applied.append(('insert', label))
            return hits[0] + 1 + len(new)

    if old:
        o_lines, n_lines = old, new
        if len(o_lines) != len(n_lines):
            o_lines, n_lines = logical_lines(old), logical_lines(new)
        if len(o_lines) == len(n_lines):
            analysed = [Line(l) for l in current]
            plan, pos = [], cursor
            for o, n in zip(o_lines, n_lines):
                if o == n:
                    continue
                m = match_line(current, analysed, o, n, pos)
                if m is None:
                    plan = None
                    break
                plan.append(m)
                pos = m[0] + 1
            if plan:
                for i, rewritten, _ in plan:
                    current[i] = rewritten
                result.applied.append((plan[-1][2], label))
                return plan[-1][0] + 1

    candidate = None
    if old and old[0].strip():
        close = difflib.get_close_matches(old[0], current, n=1, cutoff=0.5)
        candidate = close[0] if close else None
    result.unmatched.append((old, new, candidate))
    return cursor


def reapply(current_text, groups):
    newline = '\r\n' if '\r\n' in current_text else '\n'
    trailing = current_text.endswith(('\n', '\r\n'))
    current = current_text.split(newline)
    if trailing:
        current = current[:-1]
    result, cursor = Result(), 0
    for group in groups:
        cursor = apply_group(current, group, result, cursor)
    return newline.join(current) + (newline if trailing else ''), result

# ---------------------------------------------------------------- new strings

def new_strings(base, main, files):
    """English strings main added in these files since base, per file."""
    found = {}
    for path in files:
        if not path.endswith(('.vue', '.js')):
            continue
        try:
            diff = git('diff', '-U0', '--no-color', base, main, '--', path)
            before = git('show', f'{base}:{path}')
        except subprocess.CalledProcessError:
            before = ''
            try:
                diff = git('diff', '-U0', '--no-color', base, main, '--', path)
            except subprocess.CalledProcessError:
                continue
        strings = []
        for line in diff.splitlines():
            if not line.startswith('+') or line.startswith('+++'):
                continue
            body = line[1:]
            if body.lstrip().startswith(('//', '*', '/*', '<!--', 'import ')):
                continue
            for value in Line(body).values:
                s = WS.sub(' ', re.sub(r'\{\{.*?\}\}', '…', value)).strip(' …')
                if len(s) < 2 or not re.search(r'[A-Za-z]{2}', s):
                    continue
                # A line main only moved or re-indented is not new copy.
                if s in before or s in strings:
                    continue
                strings.append(s)
        if strings:
            found[path] = strings
    return found

# ---------------------------------------------------------------- report

def write_report(path, per_file, added, brand_files):
    lines = ['# Brand copy re-application report', '']
    total_applied = sum(len(r.applied) for _, r in per_file)
    total_unmatched = sum(len(r.unmatched) for _, r in per_file)
    lines += [f'Applied change groups: {total_applied}. Unmatched: {total_unmatched}.', '']
    lines += ['## (a) Applied', '']
    for f, r in per_file:
        if not r.applied:
            continue
        lines.append(f'### {f}')
        lines += [f'- `{strategy}` {desc}' for strategy, desc in r.applied]
        lines.append('')
    lines += ['## (b) Unmatched (do by hand)', '']
    for f, r in per_file:
        if not r.unmatched:
            continue
        lines.append(f'### {f}')
        for old, new, candidate in r.unmatched:
            lines.append('- brand removed:')
            lines += [f'      {l}' for l in old] or ['      (nothing)']
            lines.append('  brand added:')
            lines += [f'      {l}' for l in new] or ['      (nothing)']
            lines.append(f'  closest current line: {candidate.strip() if candidate else "(none)"}')
        lines.append('')
    lines += ['## (c) New English strings main introduced (translator list)', '']
    if not added:
        lines.append('(none)')
    for f, strings in sorted(added.items()):
        marker = ' (brand also edits this file)' if f in brand_files else ' (new to the brand)'
        lines.append(f'### {f}{marker}')
        lines += [f'- {s}' for s in strings]
        lines.append('')
    with open(path, 'w') as fh:
        fh.write('\n'.join(lines) + '\n')

# ---------------------------------------------------------------- self-test

def self_test():
    ok = True

    def check(name, cond):
        nonlocal ok
        print(('ok   ' if cond else 'FAIL ') + name)
        ok = ok and cond

    def run(current, diff):
        return reapply(current, parse_unified(diff))

    hunk = '@@ -1 +1 @@\n-<p class="a">Continue</p>\n+<p class="a">Continuar</p>\n'
    out, r = run('<p class="a">Continue</p>\n<p>Other</p>\n', hunk)
    check('block replaces verbatim lines', out.startswith('<p class="a">Continuar</p>') and r.applied[0][0] == 'block')

    out, r = run('<p class="b mt-2">Continue</p>\n<span>Continue reading</span>\n', hunk)
    check('line keeps main\'s classes and swaps the whole text node',
          out == '<p class="b mt-2">Continuar</p>\n<span>Continue reading</span>\n' and r.applied[0][0] == 'line')

    cur = "<p>{{ a || 'Recipient' }}</p>\n<p class=\"x\">{{ b || 'Recipient' }} gets</p>\n"
    out, r = run(cur, "@@ -2 +2 @@\n-<p class=\"y\">{{ b || 'Recipient' }} gets</p>\n+<p class=\"y\">{{ b || 'Beneficiario' }} recibe</p>\n")
    check('line picks the line with the matching skeleton and words',
          out.splitlines() == ["<p>{{ a || 'Recipient' }}</p>", "<p class=\"x\">{{ b || 'Beneficiario' }} recibe</p>"])

    reflow = '@@ -2 +2,3 @@\n-  <p class="c">Here you can manage all your recipients.</p>\n+  <p class="c">Aquí puedes gestionar   \n+a todos tus  \n+beneficiarios.</p>\n'
    out, r = run('<div>\n  <p class="c">Here you can manage all your recipients.</p>\n</div>\n', reflow)
    check('a reflowed block replaces its line verbatim', 'Aquí puedes gestionar' in out and r.applied[0][0] == 'block')

    out, r = run('<div>\n  <p class="d">Here you can manage all your recipients.</p>\n</div>\n', reflow)
    check('a reflowed block is joined and spliced when main changed the class',
          out.splitlines()[1] == '  <p class="d">Aquí puedes gestionar a todos tus beneficiarios.</p>')

    out, r = run('<button>Send money</button>\n', '@@ -1 +1 @@\n-<button class="q">Send</button>\n+<button class="q">Enviar</button>\n')
    check('never touches a bare substring', out == '<button>Send money</button>\n' and len(r.unmatched) == 1)

    out, r = run('<h1>Title</h1>\n<p>Body</p>\n', '@@ -1,2 +1,3 @@\n <h1>Title</h1>\n+<p class="sub">Subtítulo</p>\n <p>Body</p>\n')
    check('inserts a pure addition after its context line', out.splitlines()[1] == '<p class="sub">Subtítulo</p>' and r.applied[0][0] == 'insert')

    two = '@@ -1,3 +1,3 @@\n-    Saving ...\n </span>\n-    Send Money\n+    Guardando...\n+    Enviar dinero\n'
    # git prints the removed and added lines of one hunk interleaved with context;
    # here the second group only has additions after the context line.
    out, r = run('<button>\n    Saving ...\n</span>\n    Send Money\n</button>\n',
                 '@@ -2,3 +2,3 @@\n-    Saving ...\n+    Guardando...\n </span>\n-    Send Money\n+    Enviar dinero\n')
    check('two edits in one hunk are two groups', out.splitlines()[1:4] == ['    Guardando...', '</span>', '    Enviar dinero'] and len(r.applied) == 2)

    out, r = run("otpError.value = 'Wrong code';\nconst x = 'Wrong code';\n", "@@ -1 +1 @@\n-otpError.value = 'Wrong code';\n+otpError.value = 'Código incorrecto';\n")
    check('script literals are segments', out.splitlines()[0] == "otpError.value = 'Código incorrecto';" and 'Wrong code' in out.splitlines()[1])

    out, r = run('<input placeholder="Search" class="a" />\n', '@@ -1 +1 @@\n-<input placeholder="Search" class="b" />\n+<input placeholder="Buscar" class="b" />\n')
    check('translatable attributes are segments, class is structure', out == '<input placeholder="Buscar" class="a" />\n')

    out, r = run('<p class="a">Fast, Secure Transfers</p>\n', '@@ -1 +1 @@\n-<p class="a">Blazing Fast, Instant Transfers</p>\n+<p class="a">Transferencias rápidas</p>\n')
    check('a line main reworded is reported, not guessed', len(r.unmatched) == 1 and 'Fast, Secure' in r.unmatched[0][2])

    l = Line('<p class="a b" :title="t">Hello {{ x }}</p>')
    check('skeleton strips text and values', l.skeleton == Line('<p class="c" :title="u">Hola {{ y }}</p>').skeleton and l.values == ['Hello {{ x }}'])

    out, r = run('<label :class="[e.length > 0 ? \'text-danger-700\' : \'\']" for="p">Password</label>\n',
                 '@@ -1 +1 @@\n-<label :class="[e.length > 0 ? \'text-red-700\' : \'\']" for="p">Password</label>\n+<label :class="[e.length > 0 ? \'text-red-700\' : \'\']" for="p">Contraseña</label>\n')
    check('a > inside a bound attribute does not break the tag', out == '<label :class="[e.length > 0 ? \'text-danger-700\' : \'\']" for="p">Contraseña</label>\n')

    out, r = run('<button :disabled="busy" class="x">Change Password</button>\n<p>Change Password</p>\n',
                 '@@ -1 +1 @@\n-<button :class="[busy ? \'a\' : \'\']" class="y">Change Password</button>\n+<button :class="[busy ? \'a\' : \'\']" class="y">Cambiar contraseña</button>\n')
    check('a renamed attribute falls back to the tag sequence when unique', out.splitlines() == ['<button :disabled="busy" class="x">Cambiar contraseña</button>', '<p>Change Password</p>'])

    check('constants and class lists are not copy', not Line("api === 'SUMSUB'").values and not Line("'bg-warning-100 animate-pulse': busy,").values and Line("x = 'Send money';").values == ['Send money'])

    print('self-test', 'passed' if ok else 'FAILED')
    return 0 if ok else 1

# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--base', help='merge base between main and the brand, e.g. ea89342')
    ap.add_argument('--brand', help='the brand ref whose copy is re-applied, e.g. origin/salvtech_production')
    ap.add_argument('--main', default='origin/main', help='main ref, for the new-strings list (default origin/main)')
    ap.add_argument('--files', nargs='*', default=[], help='files to re-apply (working-tree paths)')
    ap.add_argument('--files-from', help='a file with one path per line')
    ap.add_argument('--report', default='copy-report.md', help='where the markdown report goes')
    ap.add_argument('--dry-run', action='store_true', help='report only, write nothing')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.base or not args.brand:
        ap.error('--base and --brand are required')

    files = list(args.files)
    if args.files_from:
        with open(args.files_from) as fh:
            files += [l.strip() for l in fh if l.strip() and not l.startswith('#')]
    if not files:
        ap.error('no files given')

    per_file = []
    for path in files:
        if not os.path.exists(path):
            print(f'skip (missing in working tree): {path}', file=sys.stderr)
            continue
        groups = brand_groups(args.base, args.brand, path)
        with open(path, encoding='utf-8') as fh:
            current = fh.read()
        out, result = reapply(current, groups)
        per_file.append((path, result))
        print(f'{path}: {len(result.applied)} applied, {len(result.unmatched)} unmatched')
        if not args.dry_run and out != current:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(out)

    main_changed = git('diff', '--name-only', args.base, args.main).splitlines()
    brand_changed = set(git('diff', '--name-only', args.base, args.brand).splitlines())
    added = new_strings(args.base, args.main, [f for f in main_changed if f.startswith('src/')])
    write_report(args.report, per_file, added, brand_changed)
    print(f'report: {args.report}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
