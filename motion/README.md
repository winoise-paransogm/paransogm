# Feeding continuity trial

`feeding-0-0.webp` is the baby lion feeding trial. It uses 24 newly drawn consecutive key poses and 72 calculated intermediate poses, rather than a set of unrelated actions. The encoder combines duplicate idle poses into 93 stored frames while retaining the 3,360 ms duration. Playback runs once and holds the last idle frame.

`feeding-idle-0-0.webp` matches the start/end pose. The renderer keeps the character mounted between interactions, caches animation bytes, creates a fresh object URL for each replay and releases timers/URLs when the character leaves the screen.

The flow utility is in `scripts/interpolate_motion.py`. It compensates for motion before mixing premultiplied color and alpha. It is not a learned frame-generation model; difficult occlusions can still need manual retouching. This is a visual trial for pet 0 / stage 0 / snack, not a complete replacement for all growth forms or all actions.

## All growth forms

All 18 growth portraits now also have a stage-specific continuous joint rig (`puppet-motion.js`). This renderer moves the head, front paw, ears, tail and jaw with a continuous mesh, preserving one face and one set of fur details. It replaces the generic crossfaded pose changes, including feeding for the other forms and all toy/ornament responses. The accepted baby-lion feeding animation still uses the baked trial above.

Each gesture starts and ends at the same neutral geometry. A running gesture finishes before the latest queued gesture starts. GPU rendering is preferred; a lower-resolution software warp is used if WebGL is unavailable. Static art is kept when reduced motion is requested. Runtime checks cover all 252 growth/action combinations, resource disposal, queue behavior, and positive mesh Jacobians. Actual OpenGL ES shaders were compiled and 1,008 frames were rendered to check every growth/action endpoint. Mobile browser timing remains unverified.
