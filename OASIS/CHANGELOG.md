# OASIS enhancement — v5 visual/model correction build

## Fixed

- Restored the missing responsive plan rendering by calling the plan renderer whenever the model recalculates or the Build module is opened.
- Replaced the fragile climate canvas with a visible SVG climate profile that always renders the 24-hour temperature, solar and wind series.
- Fixed self-sufficiency `NaN` values caused by referencing `d.glazingArea` and `d.roof` instead of the calculated model values.
- Added finite-value guards so incomplete climate arrays do not propagate invalid values into calculations or reports.
- Reworked the 3D projection to orthographic/isometric geometry so the base volume reads as a proper rectangular enclosure without perspective trapezoid distortion.
- Made the 3D geometry visibly climate-specific rather than using one repeated form.
- Rebuilt airflow visualization around multiple curved streamlines, inlet/exhaust labels and an explanatory airflow panel.
- Added explicit ventilation flow in m³/h alongside ACH.
- Explained ACH in the Self-sufficiency module and in the generated report.
- Expanded the report module to use the previously empty lower space for design interpretation, airflow meaning, self-sufficiency explanation, budget range and engineering handoff actions.
- Replaced the arbitrary report readiness percentage with an 8/8 module completion indicator.
- Updated the reference ANSYS APDL file to use a rectangular base volume.
- Added bottom report download/print actions for easier jury/demo use.

## Preserved

- OASIS navy/cyan/sand visual language.
- Browser-only architecture with no build step.
- Live Open-Meteo lookup and built-in reference climate.
- Existing thermal, material, cost, self-sufficiency and report workflow structure.
