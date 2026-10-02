# OASIS — Shelter Design Lab

OASIS is a browser-based concept design and analysis lab for climate-responsive shelter planning. The existing navy/cyan/sand visual language is preserved while the workflow is separated into clear modules.

## Modules

1. **Site** — device location or manual coordinates, live hourly climate lookup, site summary and climate-driven adaptation.
2. **Climate** — visible 24-hour temperature, solar and wind profile with hourly values and climate guidance.
3. **Build** — dimensions, glazing, orientation, thermal mass, shade and ventilation. The responsive plan changes when the climate archetype changes.
4. **Materials** — selectable wall assemblies, U-value, conductivity, volumetric heat capacity, indicative cost and custom material entry.
5. **Thermal** — hourly indoor-air prediction, solar gain, thermal capacity, heat-loss coefficient and a conceptual thermal colour field.
6. **Self-sufficiency** — PV, battery, water and ventilation capacities, daily energy coverage and plain-language explanations.
7. **ANSYS** — interactive orthographic 3D concept model, climate-specific geometry, thermal colour visualization, readable airflow streamlines, airflow explanation and APDL handoff.
8. **Report** — complete model summary, average concept budget plus range, climate/design interpretation, self-sufficiency explanation, airflow meaning, engineering handoff checklist, HTML download and print/save-to-PDF.

## Climate adaptation

The design engine uses the selected climate series to choose one of three visible archetypes:

- **High-altitude cold:** compact rectangular enclosure, smaller solar openings, buffered entry, lower ventilation rate and stronger emphasis on heat retention.
- **Hot / summer:** wider and taller rectangular enclosure, deeper shade canopy, larger opposite openings and high-level exhaust for cross ventilation.
- **Composite / temperate:** balanced rectangular enclosure with operable openings, moderate shading and useful thermal mass.

The 3D preview and responsive plan use the active archetype, so changing the location/weather can change both the geometry settings and the visual arrangement.

## Run it

No build step or package install is required. Open `index.html` in a modern browser.

For location access, use `http://localhost` or HTTPS. Manual coordinates are always available.

Windows launcher:

```powershell
Start-Passive-Shelter.cmd
```

Or:

```powershell
python serve_shelter.py
```

Then open `http://localhost:8080`.

## Data + model

Live climate data is requested from Open-Meteo. The built-in Leh reference series keeps the prototype usable for offline demonstrations.

The thermal predictor is a transparent single-zone resistance-capacitance model. It exposes its assumptions rather than presenting a detailed CFD/whole-building simulation as if it were one.

`Qsolar = irradiance × glazing area × SHGC × shade factor`

`Qloss = (UA + ventilation coefficient) × (Tin − Tout)`

`Tnext = Tin + (Qsolar − Qloss) × dt / effective thermal capacity`

The effective capacity combines indoor air and the selected thermal mass.

## Self-sufficiency terms

**ACH** means **air changes per hour**. At the selected room volume, the interface also converts ACH into an equivalent airflow rate in m³/h.

**Energy coverage** is the estimated share of the prototype's daily electricity demand supplied by the selected PV capacity under the current 24-hour solar profile.

Water reserve is shown as both tank capacity and approximate days at the prototype's 240 L/day planning allowance.

## Cost model

The interface calculates an indicative INR project budget from envelope, floor, glazing, entry, shading/ventilation hardware, PV, battery, water, electrical loads and transport/site setup. A 10% contingency is included and a high-altitude location multiplier is applied where relevant.

The report shows both an **average concept budget** and a planning range. These are model outputs for early comparison, not supplier quotations.

## ANSYS handoff

The ANSYS view uses an orthographic projection so the base enclosure remains visually rectangular rather than using perspective distortion. The current climate archetype changes the roof/opening/shading arrangement.

The airflow visualization uses several streamlines with intake/exhaust labels. It is intended to communicate the intended flow path clearly; it is **not a CFD result**.

Use **Download current ANSYS handoff** to export the current dimensions, materials, climate series and conceptual ventilation setting as a MAPDL seed. Refine the air domain, openings, material layers, mesh and boundary conditions in ANSYS before engineering use.

## Report output

The report includes site, climate, geometry, material comparison, thermal results, 24-hour predictions, self-sufficiency capacities with definitions, average budget and range, ANSYS geometry/airflow interpretation, and a practical engineering handoff checklist.

You can view the report inside the site, download a standalone HTML report, or use the browser print dialog to save it as PDF.
