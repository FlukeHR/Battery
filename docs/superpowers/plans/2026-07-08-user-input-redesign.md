# User Input Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mileage/day-count inputs with a charging-habit-driven input model based on selected weekly charge frequency.

**Architecture:** Update tests first, then revise `src.user_mapping` and `src.predictor` so SOC window and weekly charge frequency drive DOD and equivalent cycles. Update FastAPI request fields and the static form to match the approved user input set.

**Tech Stack:** Python 3.12 in conda env `dachuang`, FastAPI, Pydantic, pytest, static HTML/CSS/JS.

## Global Constraints

- The app should no longer require `daily_distance_km` or `weekly_usage_days`.
- `single_charge_dod = (charge_end_soc - charge_start_soc) / 100`.
- `annual_equivalent_cycles = single_charge_dod * weekly_charge_times * 52`.
- Battery chemistry must affect lifecycle prior and heuristic degradation.
- Keep XGBoost as the saved product model; do not retrain for this input-only change.

---

### Task 1: Mapping Tests

**Files:**
- Modify: `tests/test_user_mapping.py`
- Modify: `tests/test_predictor.py`

**Interfaces:**
- Consumes: `estimate_user_features(payload: Mapping[str, Any]) -> dict[str, Any]`
- Produces: tests for `weekly_charge_times`, `single_charge_dod`, `nominal_cycle_life`, `stress_factor`, and storage risks.

- [ ] Write tests for redesigned user mapping.
- [ ] Run focused tests and confirm they fail for the old implementation.

### Task 2: Mapping Implementation

**Files:**
- Modify: `src/user_mapping.py`
- Modify: `src/predictor.py`

**Interfaces:**
- Produces: `estimate_user_features` output containing `single_charge_dod`, `annual_equivalent_cycles`, `estimated_cycles_elapsed`, `nominal_cycle_life`, `stress_factor`, `estimated_temperature_c`, and `estimated_c_rate`.

- [ ] Implement battery chemistry priors.
- [ ] Implement weekly charge frequency cycle mapping.
- [ ] Implement driving/load/storage stress and expanded Chinese cities.
- [ ] Update predictor heuristic to use chemistry/storage/stress.
- [ ] Run focused tests until green.

### Task 3: API And UI

**Files:**
- Modify: `api/main.py`
- Modify: `web/static/index.html`
- Modify: `web/static/app.js`

**Interfaces:**
- Produces: `/predict` request fields matching the approved input set.

- [ ] Update Pydantic request model.
- [ ] Replace daily mileage/week usage UI with weekly charge frequency, driving style, and long-term storage controls.
- [ ] Update JavaScript numeric field handling.
- [ ] Run API tests.

### Task 4: Documentation And Verification

**Files:**
- Modify: `AGENT.md`
- Modify: `STATUS.md`
- Modify: `README.md`

- [ ] Document the new mapping.
- [ ] Run `conda run -n dachuang pytest -q`.
- [ ] Run API smoke prediction with the redesigned payload.
