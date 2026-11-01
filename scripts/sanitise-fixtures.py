#!/usr/bin/env python3
"""Make captured API responses safe and stable to commit as fixtures.

Removes: AWS presigned-URL credentials, Laravel debug traces and absolute
local paths, and any session token. Keeps the response *shape* intact so the
fixtures still exercise the model mappers.
"""
import json
import pathlib
import re
import sys

OUT = pathlib.Path(sys.argv[1])

S3_RE = re.compile(r"https://s3[.\w-]*\.amazonaws\.com/[^\"?]+\?[^\"]*")
REDACTED_S3 = (
    "https://s3.example-region.amazonaws.com/uploads.example.test/"
    "01EXAMPLEOBJECTKEY000000000.pdf"
    "?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256"
    "&X-Amz-Credential=REDACTED&X-Amz-Date=20260101T000000Z"
    "&X-Amz-SignedHeaders=host&X-Amz-Expires=1800&X-Amz-Signature=REDACTED"
)

changed = []


def scrub(node):
    """Recursively redact secrets and volatile values."""
    if isinstance(node, dict):
        # A Laravel debug body: keep the contract, drop the noise.
        if "exception" in node and "trace" in node:
            return {
                k: node[k]
                for k in ("message", "type", "exception")
                if k in node
            }
        out = {}
        for key, value in node.items():
            if key == "session_token" and isinstance(value, str):
                out[key] = "REDACTED-SESSION-TOKEN"
            else:
                out[key] = scrub(value)
        return out
    if isinstance(node, list):
        return [scrub(item) for item in node]
    if isinstance(node, str):
        if "amazonaws.com" in node and "X-Amz" in node:
            return S3_RE.sub(REDACTED_S3, node)
        if "/Users/" in node:
            return re.sub(r"/Users/[^/]+/[^\"\s]*", "/redacted/path", node)
        return node
    return node


for path in sorted(OUT.glob("*.json")):
    try:
        original = json.loads(path.read_text())
    except json.JSONDecodeError:
        print(f"  skip (not json): {path.name}")
        continue
    cleaned = scrub(original)
    if cleaned != original:
        changed.append(path.name)
    path.write_text(json.dumps(cleaned, indent=2, sort_keys=False) + "\n")

print(f"sanitised {len(changed)} of {len(list(OUT.glob('*.json')))} fixtures")
for name in changed:
    print(f"  - {name}")
