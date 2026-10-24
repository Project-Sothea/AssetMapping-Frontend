# iOS Manual Transfer Validation

Date: 15 October 2026

## Environment and Isolation

- Native Release simulator build: iPhone 16, iOS 18.6.
- Separate simulator named `Soform Manual Transfer Test`, with application identifier `com.projectsothea.SoformManualTest`.
- Disposable pin `TEST A1` and form `NATIVE TEST`; no patient information.
- Mock API bound to `127.0.0.1:18880`. Production services and the normal app were not used.
- Actual Expo SQLite storage inspected alongside UI and mock request logs.
- Two native builds succeeded, including the final transfer-panel contrast fix.

## Observed Results

| Scenario                          | Result                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| First launch without reset marker | One initial snapshot download populated the fixture pin.                                                                                      |
| Save partially blank form         | Saved locally with village and name filled; remaining answer fields blank. Form stayed accessible, without a blackout.                        |
| Save does not upload              | SQLite contained an unsynced form and two pending changes; server still had no form and received no upload.                                   |
| Pending-data protection           | Clear Local Data and Download Latest were disabled while changes remained.                                                                    |
| Simulated HTTP 503 upload failure | Reported 1 failed and 1 blocked change; local form and queue entries remained intact.                                                         |
| Background and resume             | Transfer screen remained visible and retained its failed/pending state.                                                                       |
| Process termination and relaunch  | Form persisted, no repeat reset, and no automatic upload or snapshot download occurred.                                                       |
| Explicit retry                    | Uploaded both changes; local rows became synced and queue entries completed.                                                                  |
| Install updated native build      | Existing fixture records and reset marker were preserved.                                                                                     |
| Confirm Clear Local Data          | With explicit permission, removed only simulator pins, forms, and queue; mock server retained both records and received zero delete requests. |
| Download on empty device          | Restored 1 pin and its attached form; subsequent download was disabled again.                                                                 |
| Map to Pins transition            | Returned to the pin list successfully, with the attached form count intact.                                                                   |

## Fix Found During Testing

The transfer panel inherited a dark background, making its dark text difficult to read. Added an opaque white panel surface and a regression test, observed failing before the fix and passing afterward. The rebuilt native screen was visually checked.

## Limits and Remaining Checks

- No app-wide black screen was observed in the exercised iOS flows. This does not establish that every reported blackout is fixed, particularly on Android.
- Android native testing remains pending at the user's request; no SDK or emulator was installed.
- A dummy Mapbox token intentionally prevented basemap tiles from loading. Map controls and tab transitions were exercised, not real map rendering.
- Physical devices, real backend integration, photo transfer, a 25-plus-change native upload, and native timeout/lost-ack scenarios still require testing. Automated tests cover timeout/retry behaviour separately.
- The existing device identifier appeared to change after a cold launch; stable device identity was not validated or changed in this work.
- No push, remote build, deployment, TestFlight submission, or production mutation was performed.

The existing version `1` legacy reset remains destructive on devices without that marker. This report does not authorize resetting any real device.
