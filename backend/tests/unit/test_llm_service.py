from types import SimpleNamespace

import httpx
import pytest
from openai import APIConnectionError, APIStatusError, RateLimitError

from services.llm_service import LLMService, check_model, describe_llm_error


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


def test_server_model_gets_low_temperature():
    svc, fake = service("{}")
    svc.generate_graph_json("T", "x")
    assert fake.calls[0]["temperature"] == 0.1


def test_custom_model_sends_no_temperature(monkeypatch):
    svc, fake = custom_service(monkeypatch)
    svc.generate_graph_json("T", "x")
    assert "temperature" not in fake.calls[0]


def test_labels_and_content_reach_the_prompt():
    svc, fake = service("{}")
    svc.generate_graph_json("Tytuł", "[S1] treść", labels=["KLUB"])
    prompt = fake.calls[0]["messages"][-1]["content"]
    assert "KLUB" in prompt and "[S1] treść" in prompt and "Tytuł" in prompt


def chunk(content: str | None, finish_reason: str | None = None):
    delta = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(delta=delta, finish_reason=finish_reason)])


class FakeStream(FakeCompletions):
    def create(self, **kwargs):
        self.calls.append(kwargs)
        return iter(
            [
                chunk('{"nodes": '),
                chunk(None),
                chunk('[], "edges": []}', self.finish_reason),
                SimpleNamespace(choices=[]),
            ]
        )


def custom_service(monkeypatch, finish_reason: str = "stop") -> tuple[LLMService, FakeStream]:
    config = {"base_url": "https://llm.example/v1", "model": "m", "api_key": "k"}
    monkeypatch.setattr("services.llm_service.custom_provider_config", lambda pid, owner: config)
    monkeypatch.setattr("services.llm_service.ensure_public_url", lambda url: None)
    svc = LLMService("custom:p1", owner_id="u1")
    fake = FakeStream(None, finish_reason)
    svc._client = SimpleNamespace(chat=SimpleNamespace(completions=fake))
    return svc, fake


def test_custom_model_streams_and_joins_chunks(monkeypatch):
    svc, fake = custom_service(monkeypatch)
    assert svc.generate_graph_json("T", "x") == {"nodes": [], "edges": []}
    assert fake.calls[0]["stream"] is True


def test_streamed_truncation_raises(monkeypatch):
    svc, _ = custom_service(monkeypatch, "length")
    with pytest.raises(ValueError, match="truncated"):
        svc.generate_graph_json("T", "x")


def test_think_block_is_dropped_before_parsing():
    svc, _ = service(
        '<think>\nNajpierw osoby...\n</think>\n```json\n{"nodes": [], "edges": []}\n```'
    )
    assert svc.generate_graph_json("T", "x") == {"nodes": [], "edges": []}


def status_error(code: int, body=None):
    request = httpx.Request("POST", "https://llm.example/v1/chat/completions")
    return APIStatusError("e", response=httpx.Response(code, request=request), body=body)


@pytest.mark.parametrize(
    ("code", "fragment"),
    [(401, "klucz API"), (404, "„m”"), (502, "serwer lokalny"), (524, "Cloudflare"), (500, "500")],
)
def test_server_errors_become_readable(code, fragment):
    assert fragment in describe_llm_error(status_error(code), "m")


def test_connection_error_becomes_readable_and_rate_limit_is_kept(monkeypatch):
    svc, fake = custom_service(monkeypatch)
    request = httpx.Request("POST", "https://llm.example/v1")

    def refuse(**kwargs):
        raise APIConnectionError(request=request)

    fake.create = refuse
    with pytest.raises(ValueError, match="Nie można połączyć"):
        svc.generate_graph_json("T", "x")

    def limited(**kwargs):
        raise RateLimitError("slow", response=httpx.Response(429, request=request), body=None)

    fake.create = limited
    with pytest.raises(RateLimitError):
        svc.generate_graph_json("T", "x")


def fake_models(monkeypatch, ids=None, error=None):
    def models_list():
        if error:
            raise error
        return [SimpleNamespace(id=i) for i in ids]

    client = SimpleNamespace(models=SimpleNamespace(list=models_list))
    monkeypatch.setattr("services.llm_service.OpenAI", lambda **kwargs: client)


def test_check_model_finds_the_model(monkeypatch):
    fake_models(monkeypatch, ["a", "m"])
    assert check_model("https://llm.example/v1", "m", None)[0] is True


def test_check_model_lists_what_is_there(monkeypatch):
    fake_models(monkeypatch, ["a", "b"])
    ok, message = check_model("https://llm.example/v1", "m", None)
    assert not ok and "a, b" in message


def test_check_model_reports_server_errors(monkeypatch):
    fake_models(monkeypatch, error=status_error(401))
    assert check_model("https://llm.example/v1", "m", "k") == (
        False,
        "Serwer modelu odrzucił klucz API.",
    )


def test_provider_message_is_kept_for_other_errors():
    body = {"error": {"message": "context length exceeded", "code": "too_long"}}
    message = describe_llm_error(status_error(400, body), "m")
    assert "400" in message and "context length exceeded" in message


def test_groq_invalid_json_is_named():
    body = {"error": {"message": "Failed to generate JSON", "code": "json_validate_failed"}}
    assert "niepoprawny JSON" in describe_llm_error(status_error(400, body), "m")
