from __future__ import annotations
from typing import Any, Dict, Optional, Callable
from sdk.agenttower_sdk.adapters.custom import instrument_agent, instrument_tool


class AgentTowerAutoGenAdapter:
    """Adapter bridging AutoGen conversations, message events, and registered functions into canonical AgentTower events."""

    def __init__(self, agent_id: str = "hr_agent"):
        self.agent_id = agent_id

    def wrap_agent(self, fn: Callable) -> Callable:
        return instrument_agent(agent_id=self.agent_id, framework="autogen")(fn)

    def wrap_function(self, tool_name: str, fn: Callable) -> Callable:
        return instrument_tool(tool_name=tool_name, agent_id=self.agent_id, framework="autogen")(fn)

