# User Input Redesign Design

## Goal

Replace mileage-based user inputs with a charging-habit-driven input model that ordinary electric bicycle users can answer more reliably.

## Approved Input Set

- `battery_type`: LFP, NCM, lead-acid, unknown.
- `charge_start_soc`: selected percentage.
- `charge_end_soc`: selected percentage.
- `weekly_charge_times`: selected number of charges per week.
- `driving_style`: gentle, normal, aggressive.
- `load_condition`: single rider, two people, frequent heavy load.
- `long_term_storage`: rarely, occasionally, often.
- `parking_environment`: indoor, underground, outdoor shade, outdoor sunlight.
- `city`: expanded Chinese city options.
- `voltage`: 48, 60, 72, or other supported voltage.
- `capacity_ah`: common Ah choices or numeric input.
- `battery_age_months`: numeric age in months.

The app should no longer require `daily_distance_km` or `weekly_usage_days`.

## Mapping

Single-charge DOD is derived from the charge SOC window:

```text
single_charge_dod = (charge_end_soc - charge_start_soc) / 100
```

Equivalent cycles are derived from charge frequency:

```text
annual_equivalent_cycles = single_charge_dod * weekly_charge_times * 52
estimated_cycles_elapsed = annual_equivalent_cycles * battery_age_months / 12
```

Battery type provides a lifecycle prior:

```text
LFP: 2500 nominal cycles
NCM: 1500 nominal cycles
Lead-acid: 500 nominal cycles
Unknown: 1500 nominal cycles
```

Driving style and load adjust stress through estimated current pressure:

- gentle: lower stress
- normal: baseline stress
- aggressive: higher stress
- single rider: baseline load
- two people: moderate load
- frequent heavy load: high load

Long-term storage affects calendar-aging risk and suggestions. The user wording assumes the battery leakage switch is not turned off.

City and parking environment map to temperature exposure. Cities should include common Chinese cities beyond the initial small list.

## Model Inputs

The user mapping should directly set:

- `cycle_index`
- `cycle_position`
- `nominal_capacity_in_Ah`
- `DOD`
- `DOC`
- `ambient_temperature_in_C`
- `temperature_mean`
- `temperature_max`
- `C_rate`
- `current_abs_mean`
- `current_abs_max`

Training-set median defaults remain for lab sequence features that users cannot provide:

- `voltage_mean`
- `voltage_std`
- `voltage_min`
- `voltage_max`
- `current_mean`
- `current_std`
- `current_min`
- `current_max`
- `charge_time`
- `discharge_time`

## API And UI Changes

Update `PredictionRequest`, the static form, JavaScript numeric field list, tests, and status documentation to use the approved input set.

Keep backward compatibility where cheap: if old clients send `daily_distance_km` or `weekly_usage_days`, ignore them rather than failing the request.

## Testing

Tests must cover:

- SOC-window DOD calculation.
- Weekly charge frequency equivalent-cycle calculation.
- Battery chemistry lifecycle prior.
- Driving/load stress changes.
- Long-term storage risk factor.
- API accepts the redesigned payload.

## Known Limits

The model is still trained on CALB lab data, not real e-bike field histories. The redesigned mapping improves user input reliability but does not eliminate the domain gap between lab cycles and everyday electric bicycle usage.
