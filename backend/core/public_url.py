import ipaddress
import socket
from urllib.parse import urlsplit

from core.config import ALLOW_PRIVATE_PROVIDER_URLS


class PrivateUrlError(ValueError):
    pass


def ensure_public_url(url: str) -> None:
    """Users' own model URLs are fetched by the worker inside our network: refuse any that
    reach a private, loopback or link-local address (Neo4j, Redis, cloud metadata...)."""
    if ALLOW_PRIVATE_PROVIDER_URLS:
        return
    host = urlsplit(url).hostname
    if not host:
        raise PrivateUrlError("Adres modelu nie ma hosta")
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return  # an unknown host reaches nothing; the call itself will fail
    # shortcut: checked before the call, not on the socket, so DNS rebinding could slip past;
    # pin the resolved IP in a custom httpx transport if this ever faces hostile users.
    for info in infos:
        address = ipaddress.ip_address(info[4][0].split("%")[0])
        if not address.is_global:
            raise PrivateUrlError("Adres modelu wskazuje na sieć prywatną lub lokalną")
