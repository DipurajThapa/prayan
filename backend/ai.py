import json
import logging
import os
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from core import new_id

logger = logging.getLogger(__name__)
PROVIDER, MODEL = "anthropic", "claude-opus-5-5"


def _chat(system: str, session_id: str | None = None, history: list | None = None) -> LlmChat:
    initial = None
    if history:
        initial = [{"role": "system", "content": system}] + history
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=session_id or new_id("ai"),
        system_message=system,
        initial_messages=initial,
    ).with_model(PROVIDER, MODEL)


async def complete(system: str, prompt: str) -> str:
    return (await _chat(system).send_message(UserMessage(text=prompt))).strip()


async def complete_json(system: str, prompt: str) -> dict:
    text = await complete(system + "\nRespond with a single valid JSON object only, no prose.", prompt)
    match = re.search(r"\{.*\}", text, re.S)
    return json.loads(match.group(0)) if match else {}


async def stream_reply(system: str, history: list, message: str, session_id: str):
    chat = _chat(system, session_id, history)
    async for event in chat.stream_message(UserMessage(text=message)):
        if isinstance(event, TextDelta):
            yield event.content
        elif isinstance(event, StreamDone):
            break
