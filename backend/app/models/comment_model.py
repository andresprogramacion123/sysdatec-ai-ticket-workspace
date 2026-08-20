import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.ticket_model import Ticket


class Comment(SQLModel, table=True):
    __tablename__ = "comments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ticket_id: uuid.UUID = Field(foreign_key="tickets.id")

    content: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    ticket: "Ticket" = Relationship(back_populates="comments")
