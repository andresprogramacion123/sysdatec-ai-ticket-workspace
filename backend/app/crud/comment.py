import uuid

from sqlmodel import Session, select

from app.models.comment_model import Comment
from app.schemas.comment import CommentCreate


def create_comment(
    session: Session, ticket_id: uuid.UUID, comment_in: CommentCreate
) -> Comment:
    comment = Comment(ticket_id=ticket_id, **comment_in.model_dump())
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def get_comments_by_ticket_id(session: Session, ticket_id: uuid.UUID) -> list[Comment]:
    statement = (
        select(Comment)
        .where(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at)
    )
    return list(session.exec(statement).all())
