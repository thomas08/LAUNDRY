package com.laundryking.scanner.data

import android.content.Context
import org.json.JSONArray
import java.io.File

/**
 * File-backed offline queue of pending scan events. Simple + dependency-free
 * (a JSON array on disk). Good enough for the single-scanner MVP; swap for Room
 * if the volume grows.
 */
class ScanQueue(context: Context) {
    private val file = File(context.filesDir, "scan_queue.json")

    @Synchronized
    fun all(): MutableList<ScanEvent> {
        if (!file.exists()) return mutableListOf()
        return try {
            val arr = JSONArray(file.readText())
            (0 until arr.length()).map { ScanEvent.fromJson(arr.getJSONObject(it)) }.toMutableList()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    @Synchronized
    fun save(events: List<ScanEvent>) {
        val arr = JSONArray()
        events.forEach { arr.put(it.toJson()) }
        file.writeText(arr.toString())
    }

    @Synchronized
    fun add(event: ScanEvent) {
        val list = all()
        list.add(event)
        save(list)
    }

    @Synchronized
    fun removeByUuids(uuids: Set<String>) {
        save(all().filterNot { it.clientUuid in uuids })
    }

    @Synchronized
    fun size(): Int = all().size

    @Synchronized
    fun clear() = save(emptyList())
}
