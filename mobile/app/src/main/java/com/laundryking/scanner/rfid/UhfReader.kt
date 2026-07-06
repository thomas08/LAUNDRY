package com.laundryking.scanner.rfid

import android.content.Context
import android.util.Log
import com.rscja.deviceapi.RFIDWithUHFUART
import com.rscja.deviceapi.entity.UHFTAGInfo
import com.rscja.deviceapi.interfaces.IUHFInventoryCallback

/**
 * Thin wrapper over the Chainway C72 UHF reader (com.rscja.deviceapi.RFIDWithUHFUART).
 * API confirmed against DeviceAPI (com.rscja.deviceapi) via javap:
 *   getInstance() throws ConfigurationException; init(Context):Boolean; free():Boolean;
 *   startInventoryTag():Boolean; stopInventory():Boolean;
 *   setInventoryCallback(IUHFInventoryCallback) → callback(UHFTAGInfo); UHFTAGInfo.getEPC().
 */
class UhfReader {
    private var reader: RFIDWithUHFUART? = null
    var isReady = false; private set
    var isScanning = false; private set

    /** Acquire + power on the reader. Safe to call once (e.g. in onCreate). */
    fun init(context: Context): Boolean {
        return try {
            val r = RFIDWithUHFUART.getInstance()
            val ok = r.init(context.applicationContext)
            reader = r
            isReady = ok
            ok
        } catch (t: Throwable) {
            // Thrown on non-Chainway hardware (e.g. an emulator) — app still runs in manual mode.
            Log.e("UhfReader", "UHF init failed (not a Chainway device?)", t)
            isReady = false
            false
        }
    }

    /** Register the tag-read callback. EPCs are delivered on the SDK's thread. */
    fun setOnTag(onTag: (epc: String) -> Unit) {
        reader?.setInventoryCallback(object : IUHFInventoryCallback {
            override fun callback(info: UHFTAGInfo) {
                val epc = info.getEPC()
                if (!epc.isNullOrBlank()) onTag(epc.uppercase())
            }
        })
    }

    fun start(): Boolean {
        val r = reader ?: return false
        isScanning = try { r.startInventoryTag() } catch (t: Throwable) { false }
        return isScanning
    }

    fun stop(): Boolean {
        val r = reader ?: return false
        val ok = try { r.stopInventory() } catch (t: Throwable) { false }
        isScanning = false
        return ok
    }

    fun setPower(dbm: Int) {
        try { reader?.setPower(dbm) } catch (_: Throwable) {}
    }

    fun release() {
        try { reader?.stopInventory() } catch (_: Throwable) {}
        try { reader?.free() } catch (_: Throwable) {}
        reader = null
        isReady = false
        isScanning = false
    }
}
