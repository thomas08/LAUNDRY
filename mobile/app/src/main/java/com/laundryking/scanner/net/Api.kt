package com.laundryking.scanner.net

import com.laundryking.scanner.data.ScanEvent
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Result of one uploaded event. */
data class SyncResult(val clientUuid: String, val result: String, val reason: String?)

/** Cached reference data for offline use. */
data class Reference(
    val branchName: String?,
    val customers: JSONArray,
    val jobOrders: JSONArray,
    val articles: JSONArray
)

/**
 * Minimal LinenFlow API client over HttpURLConnection + org.json (no extra deps).
 * All calls are blocking — invoke from a background dispatcher.
 */
class Api(private val session: Session) {

    class ApiException(val status: Int, message: String) : IOException(message)

    /** POST /auth/login → stores token + refreshToken; returns the user's role. */
    fun login(email: String, password: String): String {
        val body = JSONObject().put("email", email).put("password", password)
        val res = request("POST", "/auth/login", body, auth = false)
        // Backend returns { token, refreshToken, expiresIn, user } — the field is `token`.
        session.token = res.getString("token")
        session.refreshToken = res.optString("refreshToken", null)
        session.email = email
        return res.optJSONObject("user")?.optString("role") ?: "user"
    }

    /** POST /auth/refresh using the stored refresh token. Returns true on success. */
    fun refresh(): Boolean {
        val rt = session.refreshToken ?: return false
        return try {
            val res = request("POST", "/auth/refresh", JSONObject().put("refreshToken", rt), auth = false)
            session.token = res.getString("token")
            res.optString("refreshToken", null)?.let { session.refreshToken = it }
            true
        } catch (e: Exception) {
            false
        }
    }

    /** GET /sync/reference?branchId= — data to cache for offline operation. */
    fun fetchReference(): Reference {
        val res = get("/sync/reference?branchId=${session.branchId}")
        return Reference(
            branchName = res.optJSONObject("branch")?.optString("name"),
            customers = res.optJSONArray("customers") ?: JSONArray(),
            jobOrders = res.optJSONArray("jobOrders") ?: JSONArray(),
            articles = res.optJSONArray("articles") ?: JSONArray()
        )
    }

    /** POST /sync/batch — upload queued events; returns per-event results. */
    fun syncBatch(deviceId: String, events: List<ScanEvent>): List<SyncResult> {
        val arr = JSONArray()
        events.forEach { arr.put(it.toJson()) }
        val body = JSONObject().put("deviceId", deviceId).put("events", arr)
        val res = request("POST", "/sync/batch", body, auth = true)
        val results = res.optJSONArray("results") ?: JSONArray()
        return (0 until results.length()).map { i ->
            val o = results.getJSONObject(i)
            SyncResult(o.getString("clientUuid"), o.optString("result", "?"), o.optString("reason", null))
        }
    }

    // ---- transport ----

    private fun get(path: String): JSONObject = request("GET", path, null, auth = true)

    private fun request(method: String, path: String, body: JSONObject?, auth: Boolean): JSONObject {
        // One transparent retry after a 401 (refresh the access token).
        return try {
            raw(method, path, body, auth)
        } catch (e: ApiException) {
            if (e.status == 401 && auth && refresh()) raw(method, path, body, auth) else throw e
        }
    }

    private fun raw(method: String, path: String, body: JSONObject?, auth: Boolean): JSONObject {
        val conn = (URL(session.baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15000
            readTimeout = 20000
            setRequestProperty("Accept", "application/json")
            if (auth) session.token?.let { setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                outputStream.use { it.write(body.toString().toByteArray()) }
            }
        }
        val code = conn.responseCode
        val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText) ?: ""
        conn.disconnect()
        if (code !in 200..299) {
            val msg = try { JSONObject(text).optString("message", text) } catch (_: Exception) { text }
            throw ApiException(code, if (msg.isBlank()) "HTTP $code" else msg)
        }
        return if (text.isBlank()) JSONObject() else JSONObject(text)
    }
}
