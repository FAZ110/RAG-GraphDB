class GraphDatabaseError(RuntimeError):
    """A Neo4j call failed.

    Subclasses RuntimeError so existing `except RuntimeError` handlers keep
    working. `status_code` carries what the API should report: 503 when the
    database could not be reached, 500 when it answered with an error.
    """

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


class SpaceNameTakenError(ValueError):
    """Another space already uses this name (`space_name` constraint)."""


class EntityKeyTakenError(ValueError):
    """Another entity of the space already has this label and name (`entity_key` constraint)."""


class ApiKeyRequiredError(ValueError):
    """A provider's base URL changed while its stored API key was kept."""
    
    
class RevisionConflictError(ValueError):
    """The analysis was saved elsewhere since the revision a save started from."""
