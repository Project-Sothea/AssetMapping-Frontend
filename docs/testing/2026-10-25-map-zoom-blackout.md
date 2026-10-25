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

Initial simulator discovery was blocked by the restricted execution environment.
After granting simulator access, a local native smoke test was performed as described below.
Android reproduction remains pending.

On a test device, download a village pack to completion, open that village, and repeatedly
pinch to maximum zoom and back, first online and then in airplane mode. Repeat with satellite
selected and after background/resume. Capture platform, app build, coordinates, selected
style, network state, zoom and native logs if a blackout recurs. Streets packs do not cover
locations outside their bounds, zoom levels below their range, or satellite imagery.

## Local iOS simulator smoke test

Date: 25 October 2026.

- Used existing isolated `Soform Manual Transfer Test` simulator, iOS 18.6,
  bundle identifier `com.projectsothea.SoformManualTest`.
- Reused its installed native Release shell with the current branch's production JavaScript
  bundle and assets. This is not a fresh native build or a TestFlight binary.
- Public Mapbox token returned HTTP 200 for both satellite and Streets style requests.
  Token values were not printed. Real satellite tiles were visibly rendered.
- Two existing synthetic fixture pins were present; production app records were not used.
- Test bundle API fallback was localhost; no upload, clear, production database mutation,
  or offline-pack deletion was requested during the smoke test.
- Repeated satellite zoom-in gestures (11 double-taps from the initial map view) reached
  a very close imagery view without reproducing the black map. Exact native zoom was
  not instrumented. The configured zoom ceiling is verified in component tests.
- Layer switching and manual reload remained responsive. Manual reload returned to the
  default satellite camera view with imagery visible.
- Sent the app to Home and relaunched the same running process (PID unchanged). Satellite
  imagery and map controls remained visible after resume.
- This exercise did not trigger a real native loading-error event, so error-banner and
  fallback behavior are verified by component tests, not native fault injection.

No multi-day soak, physical-device memory profiling, full 200-pin dataset, freshly downloaded
offline-pack test, blank-form save, photo retry, or Android native test was performed in this
smoke test. These results do not establish that the reported field blackout is fixed or that
the complete branch is production-ready. Local test records were preserved.
