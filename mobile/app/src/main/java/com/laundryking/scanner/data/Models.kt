package com.laundryking.scanner.data

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * The four MVP "modes" from the LinenFlow domain, mapped to /v1/sync/batch events.
 * See docs/device/chainway-c72-integration.md §5.
 */
enum class Mode(val label: String, val eventType: String, val newStatus: String?) {
    REGISTER("Register (new tag)", "item_receive", "In Stock"),
    PICKUP("Pickup (→ Washing)", "item_status_change", "Washing"),
    DISPATCH("Dispatch (→ On-Rent)", "item_status_change", "On-Rent"),
    RETURN("Return (→ In Stock)", "item_status_change", "In Stock"),
    STOCK_CHECK("Stock check", "stock_check", null);

    override fun toString(): String = label
}

/** One queued scan event, idempotent via [clientUuid]. */
data class ScanEvent(
    val clientUuid: String,
    val eventType: String,
    val tagId: String,
    val branchId: String,
    val scannedAt: String,
    val newStatus: String? = null,
    val jobOrderId: String? = null,
    val payload: JSONObject? = null
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("clientUuid", clientUuid)
        put("eventType", eventType)
        put("tagId", tagId)
        put("branchId", branchId)
        put("scannedAt", scannedAt)
        if (newStatus != null) put("newStatus", newStatus)
        if (jobOrderId != null) put("jobOrderId", jobOrderId)
        if (payload != null) put("payload", payload)
    }

    companion object {
        private val ISO = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }

        fun now(): String = ISO.format(Date())

        fun fromJson(o: JSONObject): ScanEvent = ScanEvent(
            clientUuid = o.getString("clientUuid"),
            eventType = o.getString("eventType"),
            tagId = o.getString("tagId"),
            branchId = o.getString("branchId"),
            scannedAt = o.getString("scannedAt"),
            newStatus = if (o.has("newStatus")) o.optString("newStatus") else null,
            jobOrderId = if (o.has("jobOrderId")) o.optString("jobOrderId") else null,
            payload = o.optJSONObject("payload")
        )

        /** Build one event for a scanned tag under the given mode. */
        fun forTag(
            mode: Mode,
            tagId: String,
            branchId: String,
            jobOrderId: String? = null,
            registerType: String? = null,
            ownership: String = "rental"
        ): ScanEvent {
            val payload = if (mode == Mode.REGISTER) JSONObject().apply {
                put("type", registerType ?: "unknown")
                put("ownership", ownership)
            } else null
            return ScanEvent(
                clientUuid = UUID.randomUUID().toString(),
                eventType = mode.eventType,
                tagId = tagId,
                branchId = branchId,
                scannedAt = now(),
                newStatus = mode.newStatus,
                jobOrderId = if (mode == Mode.DISPATCH) jobOrderId else null,
                payload = payload
            )
        }
    }
}
