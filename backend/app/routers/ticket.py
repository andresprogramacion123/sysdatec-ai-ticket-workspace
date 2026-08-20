import uuid

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database.session import get_session
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.ticket import (
    TicketCreate,
    TicketRead,
    TicketReadWithComments,
    TicketUpdate,
)
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketRead, status_code=201)
def create_ticket(ticket_in: TicketCreate, session: Session = Depends(get_session)):
    return ticket_service.create_ticket(session, ticket_in)


@router.get("", response_model=list[TicketRead])
def list_tickets(session: Session = Depends(get_session)):
    return ticket_service.get_all_tickets(session)


@router.get("/{ticket_id}", response_model=TicketReadWithComments)
def get_ticket(ticket_id: uuid.UUID, session: Session = Depends(get_session)):
    ticket = ticket_service.get_ticket(session, ticket_id)
    comments = ticket_service.get_comments(session, ticket_id)
    return TicketReadWithComments(
        **TicketRead.model_validate(ticket).model_dump(),
        comments=[CommentRead.model_validate(comment) for comment in comments],
    )


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: uuid.UUID,
    ticket_in: TicketUpdate,
    session: Session = Depends(get_session),
):
    return ticket_service.update_ticket(session, ticket_id, ticket_in)


@router.post(
    "/{ticket_id}/comments", response_model=CommentRead, status_code=201
)
def add_comment(
    ticket_id: uuid.UUID,
    comment_in: CommentCreate,
    session: Session = Depends(get_session),
):
    return ticket_service.add_comment(session, ticket_id, comment_in)
