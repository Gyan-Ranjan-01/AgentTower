from __future__ import annotations
import pytest
from backend.adaptive.service import adaptive_service


def test_adaptive_intelligence_initial_state():
    state = adaptive_service.get_adaptive_state()
    assert "manager_agent" in state
    assert state["manager_agent"]["assigned_model"] in ["gpt-4o", "claude-3-5-sonnet"]
    assert len(state["monitoring_bots"]) >= 4

    pipeline = state["three_stage_pipeline"]
    assert pipeline["stage_1_rules"]["cost_usd"] == 0.00
    assert pipeline["cost_reduction_pct"] > 80.0


def test_bot_operating_mode_transitions():
    bot_id = "finance_sentinel_bot"
    
    # Switch to Premium
    updated = adaptive_service.set_bot_operating_mode(bot_id, "Premium")
    bot = next(b for b in updated["monitoring_bots"] if b["bot_id"] == bot_id)
    assert bot["operating_mode"] == "Premium"
    assert bot["assigned_model"] == "gpt-4o"

    # Switch back to Economy
    updated = adaptive_service.set_bot_operating_mode(bot_id, "Economy")
    bot = next(b for b in updated["monitoring_bots"] if b["bot_id"] == bot_id)
    assert bot["operating_mode"] == "Economy"
    assert bot["assigned_model"] == "gpt-4o-mini"


def test_temporary_premium_upgrade():
    bot_id = "it_infra_monitor_bot"
    updated = adaptive_service.set_temporary_premium_upgrade(bot_id, duration_minutes=30, model="gpt-4o")
    bot = next(b for b in updated["monitoring_bots"] if b["bot_id"] == bot_id)
    assert bot["is_premium_temporary"] is True
    assert bot["assigned_model"] == "gpt-4o"
    assert bot["premium_expires_at"] is not None


def test_pricing_catalog_includes_active_models():
    catalog_data = adaptive_service.get_pricing_catalog()
    assert "catalog" in catalog_data
    models = {m["model_id"]: m for m in catalog_data["catalog"]}
    assert "gpt-4o-mini" in models
    assert "gpt-4o" in models
    assert models["gpt-4o-mini"]["input_usd_per_m"] > 0

