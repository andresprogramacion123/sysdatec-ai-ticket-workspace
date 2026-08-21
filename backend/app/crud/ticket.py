import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.ticket_model import Ticket
from app.schemas.ticket import TicketCreate, TicketUpdate


def create_ticket(session: Session, ticket_in: TicketCreate) -> Ticket:
    ticket = Ticket(**ticket_in.model_dump())
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def get_ticket_by_id(session: Session, ticket_id: uuid.UUID) -> Ticket | None:
    return session.get(Ticket, ticket_id)


def get_all_tickets(session: Session) -> list[Ticket]:
    statement = select(Ticket).order_by(Ticket.created_at.desc())
    return list(session.exec(statement).all())


def update_ticket(session: Session, ticket: Ticket, ticket_in: TicketUpdate) -> Ticket:
    update_data = ticket_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)
    ticket.updated_at = datetime.now(timezone.utc)

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def set_ai_classification(
    session: Session, ticket: Ticket, category: str, priority: str, ai_summary: str
) -> Ticket:
    ticket.category = category
    ticket.priority = priority
    ticket.ai_summary = ai_summary
    ticket.updated_at = datetime.now(timezone.utc)

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
