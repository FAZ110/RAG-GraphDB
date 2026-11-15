from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class UserScope:
    """A signed-in user's own things across their spaces."""

    user_id: str
    kinds: ClassVar[frozenset[str]] = frozenset({"owner"})

    def params(self) -> dict[str, str]:
        return {"owner_id": self.user_id}


@dataclass(frozen=True)
class SpaceScope:
    """Proof that the space belongs to `owner_id`. Made only where that was checked: the API's
    space dependency, an admin acting on a user, and the extraction task for its own article."""

    space_id: str
    owner_id: str
    kinds: ClassVar[frozenset[str]] = frozenset({"space", "owner"})

    def params(self) -> dict[str, str]:
        return {"space_id": self.space_id, "owner_id": self.owner_id}

    def owner(self) -> UserScope:
        return UserScope(user_id=self.owner_id)


@dataclass(frozen=True)
class AdminScope:
    user_id: str
    kinds: ClassVar[frozenset[str]] = frozenset({"admin"})

    def params(self) -> dict[str, str]:
        return {}

    def for_space(self, space_id: str, owner_id: str) -> SpaceScope:
        return SpaceScope(space_id=space_id, owner_id=owner_id)


@dataclass(frozen=True)
class SystemScope:
    """The app's own bookkeeping, outside any user's data: sign-in lookups, settings, schema
    and the extraction queue."""

    kinds: ClassVar[frozenset[str]] = frozenset({"system"})

    def params(self) -> dict[str, str]:
        return {}


SYSTEM = SystemScope()

type Scope = SpaceScope | UserScope | AdminScope | SystemScope
