# Map-only zoom blackout investigation

## Evidence and scope

The reported failure affects only the map after deep zoom; the app controls remain visible.
No native failure log or exact failing zoom was supplied. This is not a confirmed app crash.

Code inspection found:

- Map defaulted to Satellite Streets and toggled to Outdoors.
- Preset and custom downloads use Streets, with zoom range 16-22.
- Camera had no explicit maximum zoom.
- Map loading errors had no visible recovery state.

Offline resources are style-specific. Downloading Streets does not ensure satellite imagery
is available offline. This is a confirmed configuration mismatch, not proof of the reported
blackout's root cause. Raster overzoom is supported by Mapbox; lack of high-resolution
imagery alone does not establish why a native map turns black.

## Changes

- Open Satellite Streets by default, as requested. Existing offline downloads still use Streets.
- Toggle Streets/Satellite Streets; preserve satellite access without claiming offline coverage.
- Limit camera zoom to 20 as a conservative mitigation, not an experimentally established threshold.
- Surface native map loading errors with reload and Streets fallback actions.
- Reload reconstructs the native view at the existing default camera settings (zoom 10 or 18).
- Retain prior foreground-remount behavior. No local data or offline packs are deleted.

## Verification

Component regression tests mock Mapbox and verify default style, zoom ceiling, recovery
remount, and satellite-to-Streets fallback. These do not exercise native rendering.

Native reproduction remains pending: CoreSimulator was inaccessible from the restricted
execution environment; no Android device was used.

On a test device, download a village pack to completion, open that village, and repeatedly
pinch to maximum zoom and back, first online and then in airplane mode. Repeat with satellite
selected and after background/resume. Capture platform, app build, coordinates, selected
style, network state, zoom and native logs if a blackout recurs. Streets packs do not cover
locations outside their bounds, zoom levels below their range, or satellite imagery.
