from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, List
import yaml

PRICES_FILE = Path(__file__).resolve().parent.parent.parent / "config" / "prices.yaml"


class CostEngine:
    def __init__(self, prices_path: Path = PRICES_FILE):
        self.prices_path = prices_path
        self._rates: Dict[str, Any] = {}
        self.reload_prices()

    def reload_prices(self) -> None:
        if not self.prices_path.exists():
            self._rates = {
                "default": {"input_usd": 1.50, "output_usd": 6.00},
                "models": {}
            }
            return
        with open(self.prices_path, "r", encoding="utf-8") as f:
            self._rates = yaml.safe_load(f) or {}

    def calculate_cost(self, model: str | None, input_tokens: int, output_tokens: int) -> float:
        default_rate = self._rates.get("rates_per_million_tokens", {}).get("default", {"input_usd": 1.50, "output_usd": 6.00})
        models_rates = self._rates.get("rates_per_million_tokens", {}).get("models", {})

        model_key = model or "scripted-mock-v1"
        rate = models_rates.get(model_key, default_rate)

        in_price = rate.get("input_usd", 1.50) / 1_000_000.0
        out_price = rate.get("output_usd", 6.00) / 1_000_000.0

        return round((input_tokens * in_price) + (output_tokens * out_price), 6)


cost_engine = CostEngine()

