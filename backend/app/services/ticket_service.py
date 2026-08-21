import logging
import uuid

from fastapi import HTTPException, status
from sqlmodel import Session

from app.crud import comment as comment_crud
from app.crud import ticket as ticket_crud
from app.models.comment_model import Comment
from app.models.ticket_model import Ticket
from app.schemas.comment import CommentCreate
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services import ai_classifier_service

logger = logging.getLogger(__name__)


def create_ticket(session: Session, ticket_in: TicketCreate) -> Ticket:
    ticket = ticket_crud.create_ticket(session, ticket_in)

    try:
        classification = ai_classifier_service.classify_ticket(
            customer_name=ticket.customer_name,
            request_text=ticket.request_text,
            attachment_url=ticket.attachment_url,
        )
    except Exception:
        logger.warning(
            "AI classification failed for ticket %s; leaving category/priority/"
            "ai_summary as null",
            ticket.id,
            exc_info=True,
        )
        return ticket

    return ticket_crud.set_ai_classification(
        session,
        ticket,
        category=classification["category"],
        priority=classification["priority"],
        ai_summary=classification["summary"],
    )


def get_all_tickets(session: Session) -> list[Ticket]:
    return ticket_crud.get_all_tickets(session)


def get_ticket(session: Session, ticket_id: uuid.UUID) -> Ticket:
    ticket = ticket_crud.get_ticket_by_id(session, ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )
    return ticket


def update_ticket(
    session: Session, ticket_id: uuid.UUID, ticket_in: TicketUpdate
) -> Ticket:
    ticket = get_ticket(session, ticket_id)
    return ticket_crud.update_ticket(session, ticket, ticket_in)


def get_comments(session: Session, ticket_id: uuid.UUID) -> list[Comment]:
    get_ticket(session, ticket_id)
    return comment_crud.get_comments_by_ticket_id(session, ticket_id)


def add_comment(
    session: Session, ticket_id: uuid.UUID, comment_in: CommentCreate
) -> Comment:
    get_ticket(session, ticket_id)
    return comment_crud.create_comment(session, ticket_id, comment_in)
