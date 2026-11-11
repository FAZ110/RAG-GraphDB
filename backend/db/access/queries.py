import re
from dataclasses import dataclass, replace
from pathlib import Path

_HEADER = re.compile(r"^// name: (\w+)\n// scope: (\w+)\n", re.MULTILINE)
KINDS = frozenset({"space", "owner", "admin", "system"})
# The parameter a query of the kind must filter by; the gate fills it from the scope.
_REQUIRED_PARAM = {"space": "space_id", "owner": "owner_id"}


@dataclass(frozen=True)
class Query:
    name: str
    kind: str
    text: str

    def with_numbers(self, **numbers: int) -> "Query":
        """Fill `{name}` placeholders where Cypher takes no parameters, e.g. path lengths."""
        text = self.text
        for key, value in numbers.items():
            text = text.replace(f"{{{key}}}", str(int(value)))
        return replace(self, text=text)


def _checked(path: Path, name: str, kind: str, text: str) -> Query:
    if kind not in KINDS:
        raise ValueError(f"{path}: query '{name}' has unknown scope '{kind}'")
    param = _REQUIRED_PARAM.get(kind)
    if param and not re.search(rf"\${param}\b", text):
        raise ValueError(f"{path}: {kind} query '{name}' never uses ${param}")
    return Query(name=name, kind=kind, text=text)


def load_queries(module_file: str) -> dict[str, Query]:
    """Named queries from the `.cypher` file next to a module, each starting with
    `// name: <query_name>` and `// scope: <kind>` lines. A query of a user's data that does
    not filter by the scope's parameter stops the app from starting."""
    path = Path(module_file).with_suffix(".cypher")
    text = path.read_text(encoding="utf-8")
    headers = list(_HEADER.finditer(text))
    if not headers:
        raise ValueError(f"No named queries in {path}")
    if len(headers) != text.count("// name: "):
        raise ValueError(f"{path}: every query needs a '// scope:' line under its name")
    ends = [h.start() for h in headers[1:]] + [len(text)]
    return {
        h.group(1): _checked(path, h.group(1), h.group(2), text[h.end() : end].strip())
        for h, end in zip(headers, ends, strict=True)
    }
