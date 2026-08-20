import logging
import sys
import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.database.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pre_start")

MAX_TRIES = 60
WAIT_SECONDS = 1


def main() -> None:
    for attempt in range(1, MAX_TRIES + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Database is available")
            return
        except OperationalError as error:
            logger.info(
                "Database unavailable (attempt %s/%s): %s", attempt, MAX_TRIES, error
            )
            time.sleep(WAIT_SECONDS)

    logger.error("Could not connect to the database after %s attempts", MAX_TRIES)
    sys.exit(1)


if __name__ == "__main__":
    main()
