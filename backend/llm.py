from __future__ import annotations
import os
import json
import hashlib
from typing import Tuple, Dict, Any, Optional

LLM_MODE = os.getenv("LLM_MODE", "scripted").lower()


def get_llm_mode() -> str:
    return os.getenv("LLM_MODE", "scripted").lower()


class LLMClient:
    """Provider abstraction supporting both live LLM APIs and offline deterministic scripted responses."""

    def __init__(self, mode: Optional[str] = None):
        self.mode = mode or get_llm_mode()

    def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        system_instruction: Optional[str] = None,
        model: str = "scripted-mock-v1"
    ) -> Tuple[str, int, int]:
        """
        Executes an LLM call.
        Returns: (response_text, input_tokens, output_tokens)
        """
        context = context or {}
        # Calculate deterministic token metrics
        input_tokens = max(15, len(prompt.split()) * 2 + len(str(context).split()))

        if self.mode == "live":
            # Attempt live generation if keys are present
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
            if api_key:
                # Live provider integration could be plugged here
                pass

        # Scripted deterministic responses based on prompt keywords & context
        p_lower = prompt.lower()
        if "revenue" in p_lower or "ebitda" in p_lower or "finance" in p_lower or "q3" in p_lower:
            response = (
                "Financial Analysis Summary (Q3 FY2026):\n"
                "- Operating Revenue: $148.2M (+14.3% YoY)\n"
                "- EBITDA Margin: 28.4% (vs 26.1% baseline)\n"
                "- Free Cash Flow: $42.5M\n"
                "Conclusion: Operating liquidity remains robust across key business units."
            )
        elif "salary" in p_lower or "payroll" in p_lower or "compensation" in p_lower or "hr" in p_lower:
            response = (
                "Confidential HR Compensation Record:\n"
                "- Executive Compensation Band: L8-L10\n"
                "- Annual Base Salary: $285,000 + Equity Grant\n"
                "- Employee ID: EMP-9481 (Restricted Access)"
            )
        elif "restart" in p_lower or "service" in p_lower or "server" in p_lower:
            response = (
                "IT Operations Diagnostic:\n"
                "- Service: payment-gateway-primary\n"
                "- CPU Load: 94.2% | Memory Pressure: 89.1%\n"
                "- Recommended Action: Initiate graceful rolling restart of container pool."
            )
        elif "remediation" in p_lower or "plan" in p_lower:
            response = json.dumps({
                "summary": "Revoke cross-department HR scope from finance_agent configuration.",
                "root_cause": "finance_agent policy allowed_departments contained unauthorized HR tag.",
                "proposed_modifications": ["Remove 'hr' from allowed_departments in finance_agent config."],
                "validation_tests": [
                    {"name": "finance_doc_retrieval", "expected": "success"},
                    {"name": "hr_doc_retrieval", "expected": "refused"}
                ]
            })
        else:
            response = f"Processed request successfully for query: {prompt[:80]}"

        output_tokens = max(20, len(response.split()) * 2)
        return response, input_tokens, output_tokens


default_llm = LLMClient()
