import pytest

from services.auth.bootstrap import ensure_dev_accounts


@pytest.mark.parametrize(
    "origins",
    [
        ["https://atlas.example.com"],
        ["http://localhost:5173", "https://atlas.example.com"],
        ["http://192.168.1.10:5173"],
        ["http://localhost.example.com"],
    ],
)
async def test_refuses_to_start_when_served_beyond_this_machine(origins):
    # Test accounts sign in without a password, so a public origin must stop the app.
    with pytest.raises(RuntimeError, match="local development only"):
        await ensure_dev_accounts(True, origins)


async def test_does_nothing_when_disabled():
    # Must not touch the database (none runs in unit tests) whatever the origins are.
    await ensure_dev_accounts(False, ["https://atlas.example.com"])
