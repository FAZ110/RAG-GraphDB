class GraphDatabaseError(RuntimeError):
    """A Neo4j call failed.

    Subclasses RuntimeError so existing `except RuntimeError` handlers keep
    working. `status_code` carries what the API should report: 503 when the
    database could not be reached, 500 when it answered with an error.
    """

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code
