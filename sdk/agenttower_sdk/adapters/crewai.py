from __future__ import annotations
from typing import Any, Dict, Optional, Callable
from sdk.agenttower_sdk.adapters.custom import instrument_agent, instrument_tool


class AgentTowerCrewAIAdapter:
    """Adapter bridging CrewAI agent actions and tool usage into canonical AgentTower events."""

    def __init__(self, agent_id: str = "it_agent"):
        self.agent_id = agent_id

    def wrap_task(self, task_name: str, fn: Callable) -> Callable:
        return instrument_agent(agent_id=self.agent_id, framework="crewai")(fn)

    def wrap_tool(self, tool_name: str, fn: Callable) -> Callable:
        return instrument_tool(tool_name=tool_name, agent_id=self.agent_id, framework="crewai")(fn)
