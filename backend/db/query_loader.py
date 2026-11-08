import re
from pathlib import Path

_QUERY_HEADER = re.compile(r"^// name: (\w+)\n", re.MULTILINE)


def load_queries(module_file: str) -> dict[str, str]:
    """Named queries from the `.cypher` file next to a module, each starting with
    a `// name: <query_name>` line."""
    path = Path(module_file).with_suffix(".cypher")
    text = path.read_text(encoding="utf-8")
    headers = list(_QUERY_HEADER.finditer(text))
    if not headers:
        raise ValueError(f"No named queries in {path}")
    ends = [h.start() for h in headers[1:]] + [len(text)]
    return {h.group(1): text[h.end() : end].strip() for h, end in zip(headers, ends, strict=True)}
