"""Create an admin account, or make an existing account an admin.

python create_admin.py admin@example.com
docker compose exec backend python create_admin.py admin@example.com
"""

import asyncio
import getpass
import sys

from pydantic import TypeAdapter, ValidationError

from db.driver import close_driver
from db.schema import ensure_schema
from db.users import claim_orphans, create_user, update_user, user_with_hash
from schemas.auth import Email, Registration
from services.auth.passwords import hash_password


async def main(email: str) -> None:
    await ensure_schema()
    found = await user_with_hash(email)
    if found:
        user = await update_user(found[0]["id"], {"role": "admin", "disabled": False})
        print(f"{email} is now an admin")
    else:
        password = getpass.getpass("Password: ")
        if getpass.getpass("Repeat password: ") != password:
            sys.exit("Passwords differ")
        try:
            Registration(email=email, password=password)
        except ValidationError as e:
            sys.exit(f"Invalid password: {e.errors()[0]['msg']}")
        user = await create_user(email, hash_password(password), "admin", server_models=True)
        print(f"Created admin {email}")
    claimed = await claim_orphans(user["id"])
    if claimed["spaces"] or claimed["providers"]:
        print(
            f"Took over {claimed['spaces']} spaces and {claimed['providers']} models "
            "from before accounts"
        )
    await close_driver()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    try:
        address = TypeAdapter(Email).validate_python(sys.argv[1])
    except ValidationError:
        sys.exit("Invalid e-mail address")
    asyncio.run(main(address))
