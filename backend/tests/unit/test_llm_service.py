from types import SimpleNamespace

import pytest

from services.llm_service import LLMService


class FakeCompletions:
    def __init__(self, content: str | None, finish_reason: str = "stop") -> None:
        self.content, self.finish_reason, self.calls = content, finish_reason, []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        message = SimpleNamespace(content=self.content)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=message, finish_reason=self.finish_reason)]
        )


def service(content: str | None, finish_reason: str = "stop") -> tuple[LLMService, FakeCompletions]:
    svc = LLMService("local")
    fake = FakeCompletions(content, finish_reason)
    svc._client = SimpleNamespace(chat=SimpleNamespace(completions=fake))
    return svc, fake


def test_strips_code_fences():
    svc, _ = service('```json\n{"nodes": [], "edges": []}\n```')
    assert svc.generate_graph_json("T", "[S1] x") == {"nodes": [], "edges": []}


def test_truncated_response_raises():
    svc, _ = service('{"nodes": [', "length")
    with pytest.raises(ValueError, match="truncated"):
        svc.generate_graph_json("T", "x")


def test_empty_response_raises():
    svc, _ = service("")
    with pytest.raises(ValueError, match="Empty"):
        svc.generate_graph_json("T", "x")


def test_invalid_json_raises():
    svc, _ = service("{nope")
    with pytest.raises(ValueError, match="invalid JSON"):
        svc.generate_graph_json("T", "x")


def test_rules_go_first_as_system_message():
    svc, fake = service("{}")
    svc.generate_graph_json("T", "x", rules="Tylko osoby")
    messages = fake.calls[0]["messages"]
    assert messages[0]["role"] == "system" and "Tylko osoby" in messages[0]["content"]


def test_labels_and_content_reach_the_prompt():
    svc, fake = service("{}")
    svc.generate_graph_json("Tytuł", "[S1] treść", labels=["KLUB"])
    prompt = fake.calls[0]["messages"][-1]["content"]
    assert "KLUB" in prompt and "[S1] treść" in prompt and "Tytuł" in prompt
