# Chainway C72 — RFID Handheld Integration Spec

Integration contract for the **Chainway C72** UHF RFID handheld (the LinenFlow field
scanner) against the LinenFlow backend (`/v1`). This is the spec the C72 app is built to;
the backend side (`/v1/auth`, `/v1/sync/*`) is **already implemented and live**.

> Status: the C72 device app is **not built yet** (awaiting the Chainway Android SDK).
> This document is the target so it can be built the moment the SDK is in hand.

---

## 1. Device & platform

- **Chainway C72** = rugged **Android** PDA with an integrated **UHF RFID** reader (860–960 MHz)
  plus a 2D barcode engine and a physical scan **trigger** key.
- The UHF module is **not reachable from a browser** — it is driven only through Chainway's
  **Android SDK** (`.aar`). Therefore the device app is a **native Android app (Kotlin)**, not a
  web page. (A WebView shell bridging the SDK to the existing Next.js UI is possible but adds a
  native bridge with no real saving over native for the RFID path.)
- SDK entry points (from Chainway's C72 demo/SDK — names may vary slightly by SDK version):
  - `RFIDWithUHFUART.getInstance()` → `init(context)` / `free()` — acquire/release the reader.
  - `setInventoryCallback(IUHFInventoryCallback)` + `startInventoryTag()` / `stopInventory()` —
    continuous rapid-scan; each callback delivers an `UHFTAGInfo` with the **EPC** (and optional TID/RSSI).
  - `readTagFromBuffer()` / single-read APIs for one-shot reads.
  - `setPower(int)` / `setFrequencyMode(...)` — tune read range for the counter vs a bin.
  - The hardware trigger is delivered as an Android **key event** (map to start/stop inventory).
- **`tagId` = the tag EPC** (uppercase hex string). Keep it stable and canonical; it is the primary
  key of a linen item across the whole system.

---

## 2. Authentication

The device logs in once and stores tokens (encrypted on-device, e.g. Android Keystore).

- `POST /v1/auth/login` `{ email, password }` → `{ token, refreshToken, expiresIn, user }`.
  Send `Authorization: Bearer <token>` on every subsequent call. **Note the access-token field is
  `token`** (not `accessToken`).
- On `401`, call `POST /v1/auth/refresh` `{ refreshToken }` → new tokens, then retry once.
- All `/v1/sync/*` endpoints require auth; `performedBy` (the audit user) is taken from the JWT.
- The device operates as a real user account (create a dedicated `user`-role account per device/branch).

---

## 3. Offline-first model (core requirement)

Route pickups happen where there may be no signal, so the app must work fully offline.

1. **On login / periodically online:** `GET /v1/sync/reference?branchId=<id>` and cache the result
   (see §6). This gives the branch, its customers, and open job orders for offline selection.
2. **While scanning (online or offline):** append each scan to a **local queue** (Room/SQLite),
   each with a freshly generated **`clientUuid` (UUIDv4)** and a device-set `scannedAt` (ISO‑8601).
3. **When online:** drain the queue via `POST /v1/sync/batch` (see §4). On success, mark those
   events uploaded. **Re-uploading is safe** — the server is idempotent on `clientUuid`.
4. Keep uploaded events for a while for audit/retry; prune later.

**Idempotency:** the server dedupes by `clientUuid` (it is the `scan_events.id`). Never reuse a
`clientUuid` for a different physical scan; always reuse the *same* one when retrying an upload.

---

## 4. `POST /v1/sync/batch` — the upload contract

Request body:

```json
{
  "deviceId": "c72-ranong-01",
  "events": [ ScanEventInput, ... ]
}
```

`ScanEventInput`:

| field | type | required | notes |
|---|---|---|---|
| `clientUuid` | string (UUIDv4) | ✅ | idempotency key; one per physical scan |
| `eventType` | enum | ✅ | `item_receive` \| `item_status_change` \| `job_order_link` \| `stock_check` |
| `tagId` | string (EPC) | ✅ | the scanned tag |
| `branchId` | string | ✅ | must be a branch the user can access |
| `scannedAt` | string (ISO‑8601) | ✅ | set on-device at scan time |
| `newStatus` | `In Stock` \| `Washing` \| `On-Rent` \| null | for status changes | target status |
| `jobOrderId` | string \| null | for `job_order_link` | open job order id |
| `payload` | object \| null | for `item_receive` | `{ articleId, type, ownership, customerId? }` |

Response `200`:

```json
{ "results": [ { "clientUuid": "...", "result": "applied" | "rejected", "reason": "...", "currentStatus": "In Stock" }, ... ] }
```

- **Partial success:** each event is processed in its own transaction and passes/fails
  independently. Show the operator which tags were `rejected` and why.
- **Validation (per event):** the server 400s the whole batch if any event is missing
  `clientUuid` / `eventType` / `tagId` / `branchId` / `scannedAt`. Validate on-device first.

---

## 5. Modes → events (the mode-first UI)

The MVP uses **one** reader, so the app is **mode-first**: a home screen asks *"What are you doing?"*
and drops the operator straight into a scan-driven view. Keep to 3–4 primary actions.

| Mode | Meaning | Event(s) emitted |
|---|---|---|
| **Register** | Commission new tags. *Individual* = scan one → pick Article → save. *Batch* = pick Article + owner once, then rapid-scan many. | `item_receive`, `newStatus:"In Stock"`, `payload:{ articleId, type, ownership, customerId? }` — one per tag |
| **Pickup** (intake) | Collect soiled linen at the customer / counter | `item_status_change`, `newStatus:"Washing"` (+ `job_order_link` with `jobOrderId` if tied to a job) |
| **Dispatch-return** | Hand clean linen out to the customer | `item_status_change`, `newStatus:"On-Rent"` |
| **Return** | On-rent linen comes back in | `item_status_change`, `newStatus:"In Stock"` |
| **Stock check** | Audit / cycle count — no state change | `stock_check` (logged for audit only) |

**Registration ownership** (`payload.ownership`): `rental` (laundry-owned pool) or `customer_owned`
(COG — permanently tied to a customer; set `payload.customerId`, and COG must never enter the pool).

---

## 6. Status transitions (server-enforced)

`linen_items.status` ∈ `In Stock` → `Washing` → `On-Rent` (and back via status changes). The server
guards which **event types** are legal from each current status (`ALLOWED_TRANSITIONS`):

| current status | allowed event types |
|---|---|
| `In Stock` | `item_receive`, `item_status_change`, `job_order_link`, `stock_check` |
| `Washing` | `item_status_change`, `stock_check` |
| `On-Rent` | `item_status_change`, `stock_check` |

Rejections you must handle and surface:
- `item_receive` on a tag that already exists (and isn't fresh `In Stock`) → *"tag already exists"*.
- Any non-`item_receive` event on an **unknown** tag → *"must be item_receive first"* (tag was never
  commissioned).
- An event type not allowed from the current status.

> Note: the server currently validates the **event type** per status but not that `newStatus` is the
> strict next step, so the app should only offer sensible targets per mode (as in §5). Each linen item
> also carries a `version` (optimistic concurrency) that increments on every status change.

---

## 7. `GET /v1/sync/reference?branchId=<id>` — offline cache

Returns data to cache for offline operation:

```json
{
  "branch":   { "id": "branch-1", "code": "001", "name": "LaundryKing" },
  "customers":[ { "id": "...", "name": "...", "customerType": "hotel", "phone": "..." } ],
  "jobOrders":[ { "id": "...", "orderNumber": "JO-2026-0001", "customerId": "...", "status": "..." } ],
  "articles": [ { "id": "...", "code": "BST-70140-WHT", "name": "Bath Towel", "nameEn": "...", "category": "..." } ],
  "syncedAt": "2026-07-06T06:00:00.000Z"
}
```

- `articles` = active linen SKUs (branch-specific + global) for the **Register** picker.
- `customers` = active customers of the branch (for Pickup / choosing a COG owner).
- `jobOrders` = **open** orders (not delivered/cancelled) for `job_order_link`.
- Refresh on login and opportunistically when online; `syncedAt` lets the app show cache age.

---

## 8. Testing without the hardware

The whole device contract can be exercised with `curl` before the C72 app exists — e.g. register a
tag, then dispatch it:

```bash
BASE=https://laundryking.senses-iot.com/v1
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@linenflow.com","password":"<pwd>"}' | jq -r .token)   # field is .token

# 1) commission a tag (item_receive)
curl -s -X POST $BASE/sync/batch -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "deviceId":"curl-test",
  "events":[{"clientUuid":"11111111-1111-1111-1111-111111111111","eventType":"item_receive",
    "tagId":"EPC-TEST-0001","branchId":"branch-1","newStatus":"In Stock",
    "scannedAt":"2026-07-06T06:00:00Z","payload":{"type":"Bath Towel","ownership":"rental"}}]}'

# 2) dispatch it (item_status_change -> On-Rent). Re-running is idempotent.
curl -s -X POST $BASE/sync/batch -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "deviceId":"curl-test",
  "events":[{"clientUuid":"22222222-2222-2222-2222-222222222222","eventType":"item_status_change",
    "tagId":"EPC-TEST-0001","branchId":"branch-1","newStatus":"On-Rent","scannedAt":"2026-07-06T06:05:00Z"}]}'
```

The web **Check-in** and **Dispatch** pages will drive these exact same `/sync/batch` events (manual
tag entry / lookup instead of an RFID read), so the two clients stay consistent.

---

## 9. Build checklist (device app, once SDK is in hand)

- [ ] Android project (Kotlin), min SDK per C72 (Android 9+); add Chainway UHF `.aar`.
- [ ] Reader lifecycle: init on foreground, free on background; bind trigger key → start/stop inventory.
- [ ] Login screen → token storage (Keystore) → Bearer + refresh.
- [ ] Reference cache (Room): branch/customers/jobOrders; show cache age.
- [ ] Local scan queue (Room) with `clientUuid`; background uploader → `/sync/batch`; retry w/ backoff.
- [ ] Mode-first home (Register / Pickup / Dispatch-return / Stock check) → scan view (dedupe EPCs in a session).
- [ ] Results screen: applied vs rejected (with reasons); manual re-sync.
- [ ] Config: `deviceId`, branch, backend base URL, reader power.
