import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.comment_model import Comment


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    customer_name: str
    request_text: str
    attachment_url: str | None = None

    category: str | None = None
    priority: str | None = None
    ai_summary: str | None = None

    status: str = Field(default="open")
    owner: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    comments: list["Comment"] = Relationship(back_populates="ticket")
