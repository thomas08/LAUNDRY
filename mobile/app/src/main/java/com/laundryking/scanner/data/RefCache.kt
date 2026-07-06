package com.laundryking.scanner.data

import android.content.Context
import com.laundryking.scanner.net.Reference
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** One dropdown option: stable id + human label. */
data class Option(val id: String, val label: String) {
    override fun toString(): String = label
}

/**
 * Caches /sync/reference (articles / customers / open job orders) to a file so
 * the Register / Dispatch / Pickup pickers work offline.
 */
class RefCache(context: Context) {
    private val file = File(context.filesDir, "reference.json")

    fun save(ref: Reference) {
        val o = JSONObject()
        o.put("articles", ref.articles)
        o.put("customers", ref.customers)
        o.put("jobOrders", ref.jobOrders)
        file.writeText(o.toString())
    }

    fun articles(): List<Option> = arr("articles").map {
        Option(it.getString("id"), it.optString("name").ifBlank { it.optString("code") })
    }

    fun customers(): List<Option> = arr("customers").map {
        Option(it.getString("id"), it.optString("name"))
    }

    fun jobOrders(): List<Option> = arr("jobOrders").map {
        val label = it.optString("orderNumber").ifBlank { it.getString("id") }
        Option(it.getString("id"), label)
    }

    private fun read(): JSONObject = try {
        if (file.exists()) JSONObject(file.readText()) else JSONObject()
    } catch (e: Exception) {
        JSONObject()
    }

    private fun arr(key: String): List<JSONObject> {
        val a = read().optJSONArray(key) ?: JSONArray()
        return (0 until a.length()).map { a.getJSONObject(it) }
    }
}
