import anthropic

from app.config.config import settings

MODEL = "claude-sonnet-5"

VALID_CATEGORIES = ["Finance", "Legal", "Procurement", "Operations"]
VALID_PRIORITIES = ["High", "Medium", "Low"]

CLASSIFY_TICKET_TOOL = {
    "name": "classify_ticket",
    "description": (
        "Classify a customer support ticket by category and priority, and "
        "provide a short summary of the request."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "enum": VALID_CATEGORIES,
                "description": "The department that should handle this ticket.",
            },
            "priority": {
                "type": "string",
                "enum": VALID_PRIORITIES,
                "description": "How urgently this ticket needs attention.",
            },
            "summary": {
                "type": "string",
                "description": (
                    "A concise 1-2 sentence summary of the request, written "
                    "ALWAYS in Spanish regardless of the language of the "
                    "original request."
                ),
            },
        },
        "required": ["category", "priority", "summary"],
    },
}


class AIClassificationError(Exception):
    """Raised when Claude fails to return a usable ticket classification."""


def classify_ticket(
    customer_name: str, request_text: str, attachment_url: str | None = None
) -> dict[str, str]:
    if not settings.anthropic_api_key:
        raise AIClassificationError("ANTHROPIC_API_KEY is not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    ticket_details = f"Customer name: {customer_name}\nRequest: {request_text}"
    if attachment_url:
        ticket_details += f"\nAttachment URL: {attachment_url}"

    message = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        tools=[CLASSIFY_TICKET_TOOL],
        tool_choice={"type": "tool", "name": "classify_ticket"},
        messages=[
            {
                "role": "user",
                "content": (
                    "Classify the following support ticket using the "
                    "classify_ticket tool. The request may be written in "
                    "any language, but the 'summary' field must ALWAYS be "
                    "written in Spanish, regardless of the original "
                    "language of the request. The 'category' and "
                    "'priority' fields must remain the exact English enum "
                    f"values.\n\n{ticket_details}"
                ),
            }
        ],
    )

    tool_use_block = next(
        (block for block in message.content if block.type == "tool_use"), None
    )
    if tool_use_block is None:
        raise AIClassificationError(
            "Claude response did not include a classify_ticket tool_use block"
        )

    result = tool_use_block.input
    category = result.get("category")
    priority = result.get("priority")
    summary = result.get("summary")

    if category not in VALID_CATEGORIES or priority not in VALID_PRIORITIES or not summary:
        raise AIClassificationError(
            f"Claude returned an invalid classification: {result!r}"
        )

    return {"category": category, "priority": priority, "summary": summary}
