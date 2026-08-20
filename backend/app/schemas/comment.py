import uuid
from datetime import datetime

from sqlmodel import SQLModel


class CommentCreate(SQLModel):
    content: str


class CommentRead(SQLModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    content: str
    created_at: datetime
