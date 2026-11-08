import hashlib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# Click-tracking parameters: the same article with or without them.
_TRACKING_PARAMS = ("utm_", "fbclid", "gclid", "mc_cid", "mc_eid")


def content_hash(content: str) -> str:
    """Hash of the text with whitespace collapsed, so reflowed copies hash the same."""
    normalized = " ".join(content.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if not parts.netloc:
        return ""
    query = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not k.lower().startswith(_TRACKING_PARAMS)
    ]
    path = parts.path.rstrip("/")
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), path, urlencode(sorted(query)), "")
    )


def source_key(url: str, content: str) -> str:
    """Identity of an article within a space: its URL, or its content when it has none."""
    return normalize_url(url) or f"sha256:{content_hash(content)}"
