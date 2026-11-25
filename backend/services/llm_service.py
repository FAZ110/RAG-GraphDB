import json
import re

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    DefaultHttpxClient,
    OpenAI,
    RateLimitError,
)

from core.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)
from core.public_url import ensure_public_url
from db.access.scopes import SpaceScope
from db.settings import custom_provider_config

_GROQ_MAX_COMPLETION_TOKENS = 8000
CUSTOM_PROVIDER_PREFIX = "custom:"
# A real graph is tens of KB; a server streaming without end is cut off here.
_MAX_STREAMED_CHARS = 1_000_000
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _provider_error(e: APIStatusError) -> tuple[str | None, str | None]:
    """The code and message the provider put in its error body, when it gave them."""
    body = e.body.get("error", e.body) if isinstance(e.body, dict) else None
    if not isinstance(body, dict):
        return None, None
    return body.get("code"), body.get("message")


def describe_llm_error(e: Exception, model: str) -> str | None:
    """A readable message for failures of the model's server; None for anything else."""
    if isinstance(e, APITimeoutError):
        return "Serwer modelu nie odpowiedział na czas."
    if isinstance(e, APIConnectionError):
        return "Nie można połączyć się z serwerem modelu: sprawdź adres i czy serwer (lub tunel) działa."
    if not isinstance(e, APIStatusError):
        return None
    code = e.status_code
    provider_code, provider_message = _provider_error(e)
    # Groq checks the JSON itself under response_format and refuses an invalid answer.
    if provider_code == "json_validate_failed":
        return "Model zwrócił niepoprawny JSON. To się zdarza losowo: ponów ekstrakcję artykułu."
    if code in (401, 403):
        return "Serwer modelu odrzucił klucz API."
    if code == 404:
        return f"Serwer modelu nie zna modelu „{model}” albo adres API jest błędny."
    # 502/530: the tunnel or proxy is up, but nothing answers behind it (e.g. LM Studio stopped).
    if code in (502, 530):
        return (
            "Adres odpowiada, ale serwer modelu za nim nie działa: "
            "sprawdź, czy serwer lokalny jest uruchomiony."
        )
    if code == 503:
        return "Serwer modelu jest chwilowo niedostępny albo przeciążony."
    if code in (504, 522, 524):
        return (
            "Serwer modelu nie odpowiedział w limicie czasu po drodze (np. tunel Cloudflare: ~120 s). "
            "Zaznacz „Model lokalny”, użyj szybszego modelu albo krótszego artykułu."
        )
    detail = f": {provider_message[:300]}" if provider_message else "."
    return f"Serwer modelu zwrócił błąd {code}{detail}"


DEFAULT_LABELS = ["OSOBA", "ORGANIZACJA", "MIEJSCE", "WYDARZENIE"]

# Ready label sets the UI puts into a space's labels; the space stores only the labels.
# Each names people and organisations too: with strict labels, whatever has no label is dropped.
LABEL_DOMAINS: dict[str, dict] = {
    "general": {"name": "Ogólna", "labels": DEFAULT_LABELS},
    "business": {
        "name": "Biznes i finanse",
        "labels": ["FIRMA", "INSTYTUCJA", "OSOBA", "PRODUKT", "TRANSAKCJA", "UMOWA"],
    },
    "law": {
        "name": "Prawo",
        "labels": ["OSOBA", "STRONA", "SĄD", "INSTYTUCJA", "PRZEPIS", "ORZECZENIE", "UMOWA"],
    },
    "medicine": {
        "name": "Medycyna",
        "labels": ["OSOBA", "INSTYTUCJA", "CHOROBA", "OBJAW", "LEK", "ZABIEG", "BADANIE"],
    },
    "science": {
        "name": "Nauka i technika",
        "labels": ["POJĘCIE", "METODA", "WYNIK", "BADACZ", "INSTYTUCJA", "TECHNOLOGIA"],
    },
    "sport": {
        "name": "Sport",
        "labels": ["ZAWODNIK", "KLUB", "TRENER", "MECZ", "TURNIEJ", "STADION"],
    },
}

# The only extra instructions a user can send to the model: they pick a key, never write text.
EXTRACTION_PRESETS: dict[str, dict[str, str]] = {
    "people": {
        "name": "Powiązania osobowe",
        "description": "Osoby i relacje między nimi: rodzinne, zawodowe, towarzyskie.",
        "rules": (
            "Skup się na osobach i relacjach między nimi (rodzinnych, zawodowych, towarzyskich). "
            "Organizacje, miejsca i wydarzenia wyodrębniaj tylko wtedy, gdy łączą co najmniej "
            "dwie osoby. Typ relacji nazywaj możliwie konkretnie."
        ),
    },
    "finance": {
        "name": "Przepływy finansowe",
        "description": "Firmy, udziały, transakcje i umowy wraz z kwotami.",
        "rules": (
            "Skup się na firmach, instytucjach i osobach powiązanych finansowo: własność, "
            "udziały, transakcje, umowy, dotacje, pożyczki. Kwoty i daty podane w tekście "
            "zapisuj we właściwościach (properties) relacji. Pomijaj byty bez związku z pieniędzmi."
        ),
    },
    "timeline": {
        "name": "Chronologia wydarzeń",
        "description": "Wydarzenia z datami, ich uczestnicy i miejsca.",
        "rules": (
            "Skup się na wydarzeniach. Każde wydarzenie wyodrębnij jako osobny węzeł, a datę "
            'podaną w tekście zapisz we właściwości "date". Łącz wydarzenia z uczestnikami '
            "i miejscami; pomijaj byty, które nie biorą udziału w żadnym wydarzeniu."
        ),
    },
    "key_only": {
        "name": "Tylko kluczowe byty",
        "description": "Mniejszy graf: bez postaci i miejsc wspomnianych tylko przy okazji.",
        "rules": (
            "Wyodrębniaj tylko byty istotne dla głównego tematu tekstu. Pomijaj byty wspomniane "
            "tylko raz i bez znaczenia dla tematu oraz takie, które nie mają żadnej relacji "
            "z innymi."
        ),
    },
}

# Sits in the main prompt right before the article, so it works with any chat template
# and says outright which rule it narrows.
_SCOPE_SECTION = """\
ZAKRES EKSTRAKCJI — ma pierwszeństwo przed zasadą 1 w kwestii tego, które byty i relacje \
wyodrębniać. Format odpowiedzi i pozostałe zasady obowiązują bez zmian.
{rules}

"""

_LABEL_RULE = """\
Dobierz etykiety (label) odpowiednio do domeny tekstu (np. {labels} lub inne pasujące).
   Etykiety pisz wielkimi literami, np. OSOBA, FIRMA, PRODUKT.\
"""

# The model may still stray; only_labels() drops what it returns outside the list.
_STRICT_LABEL_RULE = """\
Jako etykiety (label) używaj WYŁĄCZNIE tych: {labels}.
   Bytów, które nie pasują do żadnej z nich, nie wyodrębniaj. Ograniczenie dotyczy tylko
   etykiet bytów: relacje między nimi wyodrębniaj wszystkie, a ich typy dobieraj swobodnie
   według zasady 4.\
"""

_GRAPH_JSON_PROMPT = """\
Poniżej wyśle ci tekst, twoim zadaniem jest wyekstrahować encje i relacje semantyczne między nimi.
Zwróć odpowiedź WYŁĄCZNIE jako poprawny JSON (bez żadnych znaczników markdown, bez ```json).
JSON musi zawierać dwa klucze: "nodes" i "edges".

Format węzła:
{{"id": "unikalny_id", "label": "ETYKIETA", "type": "TYP", "aliases":["Inna nazwa z tekstu"], "evidence": ["S1"], "properties": {{"name": "Pełna nazwa", "description": "Krótki opis"}}}}

Format krawędzi:
{{"source": "id_węzła", "target": "id_węzła", "type": "TYP_RELACJI", "evidence": ["S2"], "properties": {{}}}}

Bardzo ważne zasady:
1. {label_rule}
   Etykieta to rodzaj bytu w mianowniku (jedno słowo lub słowa połączone podkreślnikiem,
   np. FIRMA, LEK, CZASOPISMO), NIGDY jego nazwa własna: "FIRMA", nie "ORLEN";
   "UCZELNIA", nie "POLITECHNIKA_ŚLĄSKA". Byty tego samego rodzaju mają tę samą etykietę.
2. Każdy węzeł MUSI mieć właściwość "name" z pełną nazwą encji w mianowniku
   liczby pojedynczej (np. "Uniwersytet Jagielloński", nie "Uniwersytecie Jagiellońskim";
   "Wisła Kraków", nie "Wiśle Kraków"). Osoby zapisuj jako imię i nazwisko, jeśli tekst
   je podaje.
   Ten sam byt w całym tekście musi mieć dokładnie tę samą nazwę.
   W "name" podawaj zawsze pełną, oficjalną nazwę, także gdy tekst używa skrótu lub przezwiska
   (np. "Narodowy Bank Polski", nie "NBP"; "Robert Lewandowski", nie "Lewy").
   Skróty, przezwiska i inne warianty nazwy użyte w tekście wpisz do listy "aliases"
   (pusta lista, jeśli ich nie ma).
3. Pole "id" to wewnętrzny identyfikator do budowania relacji (np. "p1", "org_microsoft").
4. Typy relacji pisz WYŁĄCZNIE po polsku, wielkimi literami z podkreślnikami,
   np. PRACUJE_W, JEST_CZĘŚCIĄ, POSIADA, LECZY, GRA_W. Nie używaj angielskich typów
   (np. WORKS_AT, OWNS, PLAYS_FOR) - także gdy tekst zawiera angielskie nazwy.
5. Pola "source" i "target" MUSZĄ odpowiadać istniejącym "id" węzłów.
6. Każdy węzeł MUSI mieć właściwość "description": jedno krótkie zdanie (do 15 słów)
   mówiące, kim lub czym jest ten byt, na podstawie tekstu (np. "spółka paliwowa
   z siedzibą w Płocku", "lek przeciwzapalny stosowany w reumatologii", "napastnik
   reprezentacji Polski"). Opisuj sam byt, nie wydarzenia z artykułu.
7. Każdy węzeł MUSI mieć pole "type" — ogólny rodzaj bytu, DOKŁADNIE jedna z wartości:
   OSOBA, ORGANIZACJA (firmy, instytucje, urzędy, kluby, drużyny, reprezentacje),
   MIEJSCE (kraje, miasta, regiony, obiekty), WYDARZENIE (konferencje, rozprawy, wybory,
   mecze, turnieje, ligi, rozgrywki), PRODUKT (produkty, leki, dzieła, technologie),
   POJĘCIE (pozostałe).
   Przykład: {{"label": "FIRMA", "type": "ORGANIZACJA", ...}},
   {{"label": "LEKARZ", "type": "OSOBA", ...}}, {{"label": "LIGA", "type": "WYDARZENIE", ...}}.
8. Treść jest podzielona na zdania, każde poprzedzone identyfikatorem w nawiasie, np. [S3].
   Każdy węzeł i każda krawędź MUSI mieć pole "evidence": lista 1-2 identyfikatorów zdań
   (np. ["S3"]), które najlepiej uzasadniają ten byt lub tę relację. Podawaj wyłącznie
   identyfikatory istniejące w treści.
9. Zwróć TYLKO surowy JSON — bez komentarzy, bez tekstu poza JSON.

{scope}Tytuł: {title}
Treść: {content}\
"""


def extraction_prompt_preview() -> dict:
    """The prompt as sent, with its slots left as {name} for the UI to fill in live."""
    return {
        "scope": _SCOPE_SECTION.format(rules="{rules}"),
        "label_rule": _LABEL_RULE,
        "strict_label_rule": _STRICT_LABEL_RULE,
        "user": _GRAPH_JSON_PROMPT.format(
            label_rule="{label_rule}",
            scope="{scope}",
            title="‹tytuł artykułu›",
            content="‹treść artykułu podzielona na zdania: [S1] … [S2] …›",
        ),
    }


def check_model(base_url: str, model: str, api_key: str | None) -> tuple[bool, str]:
    """Asks the server for its models; the URL must already have passed ensure_public_url."""
    client = OpenAI(
        base_url=base_url,
        api_key=api_key or "none",
        max_retries=0,
        timeout=15,
        http_client=DefaultHttpxClient(follow_redirects=False),
    )
    try:
        ids = [m.id for m in client.models.list()]
    except (APIConnectionError, APIStatusError) as e:
        return False, describe_llm_error(e, model) or str(e)
    if model in ids:
        return True, f"Połączono. Model „{model}” jest dostępny."
    if not ids:
        return False, "Serwer odpowiada, ale nie zwrócił żadnego modelu."
    return False, f"Serwer odpowiada, ale nie ma modelu „{model}”. Dostępne: {', '.join(ids[:8])}."


class LLMService:
    def __init__(self, provider: str = "local", scope: SpaceScope | None = None) -> None:
        self._extra: dict = {"temperature": 0.1}
        self._stream = False
        self._takes_schema = True

        if provider == "groq":
            if not GROQ_API_KEY:
                raise ValueError("No GROQ_API_KEY in environmental variables")
            self._client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY,
                max_retries=0,
            )
            self._model = GROQ_MODEL
            self._extra |= {
                "max_completion_tokens": _GROQ_MAX_COMPLETION_TOKENS,
                "reasoning_effort": "low",
                "response_format": {"type": "json_object"},
            }
        elif provider == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("No OPENAI_API_KEY in environmental variables")
            self._client = OpenAI(api_key=OPENAI_API_KEY, max_retries=0)
            self._model = OPENAI_MODEL
            self._extra |= {"response_format": {"type": "json_object"}}
        elif provider.startswith(CUSTOM_PROVIDER_PREFIX):
            provider_id = provider.removeprefix(CUSTOM_PROVIDER_PREFIX)
            config = custom_provider_config(scope, provider_id) if scope else None
            if config is None:
                raise ValueError("Custom LLM provider no longer exists, pick another model")
            # Checked again on every call: the host's DNS may have changed since it was saved,
            # and no redirects, which could lead back into our network.
            ensure_public_url(config["base_url"])
            self._client = OpenAI(
                base_url=config["base_url"],
                api_key=config["api_key"] or "none",
                max_retries=0,
                http_client=DefaultHttpxClient(follow_redirects=False),
            )
            self._model = config["model"]
            self._extra = {}
            self._stream = True
        else:
            self._client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY, max_retries=0)
            self._model = LLM_MODEL

        print(f"Initialized with: {self._model}")

    def _complete(
        self, messages: list[dict], extra: dict | None = None
    ) -> tuple[str | None, str | None]:
        extra = self._extra if extra is None else extra
        if not self._stream:
            response = self._client.chat.completions.create(
                model=self._model, messages=messages, **extra
            )
            if not response.choices:
                raise ValueError("Missing response from LLM")
            choice = response.choices[0]
            return choice.message.content, choice.finish_reason

        parts, size, finish_reason = [], 0, None
        stream = self._client.chat.completions.create(
            model=self._model, messages=messages, stream=True, **extra
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            if choice.delta.content:
                parts.append(choice.delta.content)
                size += len(choice.delta.content)
                if size > _MAX_STREAMED_CHARS:
                    stream.close()
                    raise ValueError("Odpowiedź modelu jest zbyt długa (ponad 1 mln znaków).")
            finish_reason = choice.finish_reason or finish_reason
        return "".join(parts), finish_reason

    def generate_graph_json(
        self,
        title: str,
        content: str,
        rules: str | None = None,
        labels: list[str] | None = None,
        strict_labels: bool = False,
    ) -> dict:
        label_rule = _STRICT_LABEL_RULE if strict_labels else _LABEL_RULE
        prompt = _GRAPH_JSON_PROMPT.format(
            label_rule=label_rule.format(labels=", ".join(labels or DEFAULT_LABELS)),
            scope=_SCOPE_SECTION.format(rules=rules) if rules else "",
            title=title,
            content=content,
        )
        return self.chat_json([{"role": "user", "content": prompt}])

    def _complete_shaped(
        self, messages: list[dict], response_format: dict | None
    ) -> tuple[str | None, str | None]:
        """With the answer's schema where the provider takes one; a provider that refuses it
        is asked again without, and not given one again."""
        if response_format is None or not self._takes_schema:
            return self._complete(messages)
        try:
            return self._complete(messages, {**self._extra, "response_format": response_format})
        except APIStatusError as e:
            if e.status_code != 400:
                raise
            self._takes_schema = False
            return self._complete(messages)

    def chat_json(self, messages: list[dict], response_format: dict | None = None) -> dict:
        try:
            raw, finish_reason = self._complete_shaped(messages, response_format)
        except RateLimitError:
            raise  # retried by the task
        except (APIConnectionError, APIStatusError) as e:
            raise ValueError(describe_llm_error(e, self._model)) from e

        if finish_reason == "length":
            raise ValueError(
                "LLM response was truncated (finish_reason=length) — "
                "article too long or token limit too low"
            )

        if not raw:
            raise ValueError("Empty response from LLM")

        # Reasoning models (Qwen3, DeepSeek-R1...) may think out loud before the JSON.
        cleaned = _THINK_BLOCK.sub("", raw).strip()
        cleaned = re.sub(r"^```[a-z]*\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}") from e
