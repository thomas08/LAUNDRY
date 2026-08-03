/**
 * The Android scanner APK offered for download in the web app (superadmin only).
 *
 * The file is served by Caddy from `./public/downloads` on the host (mapped to
 * `/srv`), NOT by Next.js — so this is a plain same-origin href, not a route.
 *
 * When shipping a new scanner build: bump `version` here to match
 * `mobile/app/build.gradle` versionName, and rsync the APK to
 * `/opt/linenflow/public/downloads/` on the droplet. Both must match or the
 * link 404s.
 */

export const SCANNER_APP = {
  version: '0.5.6',
  get fileName() {
    return `LaundryKingScanner-v${this.version}-debug.apk`
  },
  get url() {
    return `/downloads/${this.fileName}`
  },
  /** Caddy has directory browsing on, so older builds stay reachable. */
  allVersionsUrl: '/downloads/',
} as const
