# Iron Log: Dark Theme Workout Tracker

A minimalist, dark-themed PWA workout tracker optimized for iPhone. It stores all data locally on your device (IndexedDB), works offline, and requires no servers or build steps.

## How to Publish (GitHub Pages)

1. **Create a Repo:** Create a new repository on GitHub (e.g., `workout-tracker`).
2. **Upload Files:** Upload `index.html`, `styles.css`, `app.js`, `manifest.json`, and `sw.js` to the root.
3. **Add an Icon:** (Optional but recommended) Add a square image named `icon-192.png` (192x192px) to the repo for the Home Screen icon.
4. **Enable Pages:** Go to Repo Settings > Pages > Source: `Deploy from a branch` > Select `main` / `root` > Save.
5. **Visit URL:** Wait a minute, then visit the provided URL on your iPhone.

## How to Install on iPhone

1. Open the GitHub Pages URL in **Safari**.
2. Tap the **Share** icon (bottom center).
3. Scroll down and tap **Add to Home Screen**.
4. Launch the app from your Home Screen for the full-screen experience.

## Customizing the Plan

To change the workout routine:
1. Open `app.js`.
2. Locate the `DEFAULT_TRAINING_DAYS` constant at the top.
3. Edit the JSON structure (exercise names, sets, reps, rest timers).
4. Commit changes. The app will update the cache on the next online launch.

## Testing Checklist

- [ ] Opens in browser without errors.
- [ ] "Add to Home Screen" creates a standalone app.
- [ ] Data persists after closing and reopening the app.
- [ ] Dark mode looks correct.
- [ ] Export/Import JSON works.
