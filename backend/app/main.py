from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

from app.config.config import settings
from app.database.session import engine
from app.models import Comment, Ticket  # noqa: F401  (registers tables on metadata)
from app.routers.ticket import router as ticket_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title=settings.project_name, lifespan=lifespan)

app.include_router(ticket_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
