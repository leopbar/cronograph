"""CLI utilities for Cronograph administration."""
import asyncio
from datetime import datetime, timezone

import typer

app = typer.Typer(help="Cronograph admin CLI")


@app.command()
def create_admin(
    email: str = typer.Option(..., prompt=True),
    username: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True, confirmation_prompt=True),
) -> None:
    """Create the first admin user (runs alembic upgrade first)."""
    from cronograph.core.security import validate_password_strength

    error = validate_password_strength(password)
    if error:
        typer.echo(f"Erro: {error}", err=True)
        raise typer.Exit(1)

    asyncio.run(_create_admin(email, username, password))
    typer.echo(f"Admin '{username}' criado com sucesso.")


async def _create_admin(email: str, username: str, password: str) -> None:
    from sqlalchemy import select
    from cronograph.core.db import SessionLocal
    from cronograph.core.security import hash_password
    from cronograph.models.user import User

    now = datetime.now(timezone.utc)
    async with SessionLocal() as db:
        existing = await db.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        if existing.scalar_one_or_none():
            typer.echo("Erro: email ou username já existe.", err=True)
            raise typer.Exit(1)

        user = User(
            email=email,
            username=username,
            password_hash=hash_password(password),
            role="admin",
            must_change_password=False,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        await db.commit()


if __name__ == "__main__":
    app()
