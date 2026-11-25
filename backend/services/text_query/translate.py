import asyncio
import json

import redis
from openai import RateLimitError

from core.config import REDIS_URL, SERVER_LLM_PER_MINUTE
from db.access.scopes import SpaceScope
from db.graph.reads import nodes_by_ids, space_schema
from services.jobs.llm_quota import server_llm_wait
from services.llm_service import CUSTOM_PROVIDER_PREFIX, LLMService
from services.text_query import draft, prompt
from services.text_query.anchors import anchors, relation_types
from services.text_query.output_schema import response_format
from services.text_query.resolve import resolve

_REPAIRS = 2


class QuestionNotAnswerable(Exception):
    """The question cannot be put as a pattern; the message says why, for the user."""


class ServerModelBusy(Exception):
    def __init__(self, wait: int) -> None:
        super().__init__(f"Model serwera jest teraz zajęty, spróbuj za {wait} s")
        self.wait = wait


class _Counted:
    """The server's model, each call counted in the limit the extraction workers share."""

    def __init__(self, llm: LLMService, limit: int) -> None:
        self._llm, self._limit = llm, limit

    def chat_json(self, messages: list[dict], response_format: dict | None = None) -> dict:
        if wait := server_llm_wait(redis.from_url(REDIS_URL), self._limit):
            raise ServerModelBusy(wait)
        return self._llm.chat_json(messages, response_format)


def _shape(schema: dict, found: list[dict], caps: tuple[int, int] = prompt.CAPS[0]) -> dict:
    """The answer's schema, allowing the types the prompt shows and those of the found links."""
    labels = [row["label"] for row in schema["labels"][: caps[0]]]
    labels += [e["label"] for e in found] + [link["label"] for e in found for link in e["links"]]
    types = [row["type"] for row in schema["relations"][: caps[1]]]
    return response_format(labels, types + sorted(relation_types(found)))


def _request(schema: dict, question: str, found: list[dict]) -> tuple[list[dict], dict]:
    """The messages and the answer's schema, the schema narrowed to its most common types
    until the request fits the budget."""
    for caps in prompt.CAPS:
        messages = prompt.messages(schema, question, found, caps)
        shape = _shape(schema, found, caps)
        size = sum(len(m["content"]) for m in messages) + len(json.dumps(shape))
        if size <= prompt.MAX_REQUEST_CHARS:
            break
    return messages, shape


def _refusal(answer: dict) -> str | None:
    error = answer.get("error")
    return error.strip() if isinstance(error, str) and error.strip() else None


def _draft(llm: LLMService, schema: dict, question: str, found: list[dict] | None = None) -> dict:
    messages, shape = _request(schema, question, found or [])
    answer: dict = {}
    for attempt in range(_REPAIRS + 1):
        try:
            reply = llm.chat_json(messages, shape)
        except RateLimitError:
            if attempt == 0 or draft.problems(draft.without_unknown_types(answer, schema), schema):
                raise
            break
        answer = reply if isinstance(reply, dict) else {}
        if refusal := _refusal(answer):
            raise QuestionNotAnswerable(refusal)
        problems = draft.problems(answer, schema)
        if not problems:
            return answer
        if attempt < _REPAIRS:
            messages += prompt.repair(answer, problems)
    answer = draft.without_unknown_types(answer, schema)
    if problems := draft.problems(answer, schema):
        raise QuestionNotAnswerable(
            f"Nie udało się ułożyć poprawnego wzorca: {problems[0]}. Spróbuj prościej."
        )
    return answer


def _ask(provider: str, scope: SpaceScope, schema: dict, question: str, found: list[dict]) -> dict:
    llm = LLMService(provider=provider, scope=scope)
    if SERVER_LLM_PER_MINUTE and not provider.startswith(CUSTOM_PROVIDER_PREFIX):
        llm = _Counted(llm, SERVER_LLM_PER_MINUTE)
    return _draft(llm, schema, question, found)


async def translate(scope: SpaceScope, question: str, provider: str) -> dict:
    """The question as a pattern of the space, the entities its known nodes stand for,
    and the names no entity of the space has."""
    schema = await space_schema(scope)
    if not schema["labels"]:
        raise QuestionNotAnswerable("Ta przestrzeń nie ma jeszcze encji, nie ma o co pytać.")
    found = await anchors(scope, question)
    answer = await asyncio.to_thread(_ask, provider, scope, schema, question, found)
    ids_by_name = await resolve(scope, draft.names_of(answer))
    pattern, missing = draft.to_pattern(draft.without_spelling_twins(answer, schema), ids_by_name)
    ids = list(dict.fromkeys(i for n in pattern["nodes"] for i in n.get("ids", [])))
    entities = await nodes_by_ids(scope, ids) if ids else []
    return {"pattern": pattern, "entities": entities, "missing": missing}
