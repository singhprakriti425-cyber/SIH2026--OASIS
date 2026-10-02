# OASIS — Enhanced Concept Model

## Purpose

OASIS turns site/climate inputs into a connected early-stage design concept: climate archetype, geometry, materials, thermal prediction, self-sufficiency capacities, airflow communication, ANSYS handoff and project budget/reporting.

## Key corrections in v5

### 1. Climate profile
The Climate module now renders a visible 24-hour SVG profile with separate temperature, solar and wind bands. Hourly tooltips expose the underlying series, making the boundary conditions understandable rather than leaving a blank chart.

### 2. Responsive plan
The Build module now calls its plan renderer during model updates. The plan changes content and opening strategy according to the current archetype instead of remaining an empty frame.

### 3. Climate-specific model forms
- High-altitude cold: compact rectangular enclosure, smaller solar opening, buffered entry, low air exchange, stronger heat-retention emphasis.
- Hot/summer: wider/taller rectangular enclosure, deep shade canopy, opposite-side openings, high-level exhaust and cross-flow paths.
- Composite/temperate: balanced rectangular enclosure, moderate shading, operable openings and internal thermal mass.

### 4. 3D/ANSYS projection
The canvas renderer now uses an orthographic/isometric projection instead of a perspective projection. Parallel enclosure edges remain parallel, so the model reads as a rectangular volume. Climate-specific roof, shade and opening elements are also shown.

The reference and generated APDL seed use a rectangular `BLOCK` base volume:

`BLOCK,0,LENGTH,0,WIDTH,0,HEIGHT`

This is a concept seed only. Detailed openings, multi-layer walls, contacts, air-domain geometry, mesh controls and boundary conditions still need to be created/refined in ANSYS.

### 5. Airflow visualization
Instead of a single arrow, the ANSYS projection now shows multiple curved streamlines with opening labels and an explanatory panel:

- Hot: cool low-level intake → cross-flow through occupied zone → warmer high-level exhaust.
- Cold: low-rate controlled intake/exhaust path.
- Balanced: operable cross-flow plus an upper purge path.

The visualization is intentionally communicative and is not a CFD result.

### 6. Self-sufficiency calculation
The previous `NaN` issue came from using geometry-only fields where calculated model fields were required. The corrected calculation uses the calculated glazing area and roof area.

The module reports:

- PV array capacity in kWp.
- Estimated PV generation in kWh/day.
- Battery capacity in kWh.
- Water storage capacity in L and approximate reserve days.
- Ventilation setting in ACH and equivalent m³/h.
- Estimated daily energy coverage.

`ACH` means **air changes per hour**: the equivalent number of internal air-volume replacements represented by the selected ventilation rate in one hour.

### 7. Budget
The budget is calculated from the current geometry, selected material, glazing, entry, ventilation/shading hardware, PV, battery, water, electrical systems and site setup. A contingency and location adjustment are included. The report displays both the average concept estimate and a planning range.

## Validation status

Static validation completed for the v5 build:

- JavaScript syntax check passed with `node --check`.
- All directly referenced HTML element IDs exist.
- All eight modules and navigation targets match.
- Build form includes a wall-assembly selector used by the material/thermal model.
- No UI output is intentionally populated with `NaN`.
- Reference APDL contains a rectangular base `BLOCK` geometry.
- Generated report contains explanations for self-sufficiency values and ACH.

## Limitations

The model remains concept-stage. A final engineering workflow should replace concept assumptions with annual climate files, exact solar geometry, validated envelope assemblies, detailed structural checks, fire and moisture design, electrical calculations, water balance and—where required—CFD or coupled thermal-fluid simulations.
