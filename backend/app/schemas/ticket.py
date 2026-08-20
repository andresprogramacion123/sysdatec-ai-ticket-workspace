import uuid
from datetime import datetime
from typing import Literal

from sqlmodel import SQLModel

from app.schemas.comment import CommentRead

TicketStatus = Literal["open", "in_progress", "resolved", "closed"]


class TicketCreate(SQLModel):
    customer_name: str
    request_text: str
    attachment_url: str | None = None


class TicketRead(SQLModel):
    id: uuid.UUID
    customer_name: str
    request_text: str
    attachment_url: str | None
    category: str | None
    priority: str | None
    ai_summary: str | None
    status: str
    owner: str | None
    created_at: datetime
    updated_at: datetime


class TicketReadWithComments(TicketRead):
    comments: list[CommentRead] = []


class TicketUpdate(SQLModel):
    status: TicketStatus | None = None
    owner: str | None = None
