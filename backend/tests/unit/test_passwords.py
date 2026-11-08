from services.auth.passwords import hash_password, verify_password


def test_verify_password_accepts_own_hash():
    assert verify_password(hash_password("correct horse"), "correct horse") is True


def test_verify_password_rejects_other_password():
    assert verify_password(hash_password("correct horse"), "wrong horse") is False


def test_verify_password_with_no_hash_is_false():
    # The dummy hash used for unknown e-mails must never let anyone in.
    assert verify_password(None, "dummy password, never matches") is False


def test_verify_password_with_garbage_hash_is_false():
    assert verify_password("not-a-hash", "x") is False
