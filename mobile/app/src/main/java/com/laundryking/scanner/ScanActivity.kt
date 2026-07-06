package com.laundryking.scanner

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.laundryking.scanner.data.Mode
import com.laundryking.scanner.data.ScanEvent
import com.laundryking.scanner.data.ScanQueue
import com.laundryking.scanner.databinding.ActivityScanBinding
import com.laundryking.scanner.net.Api
import com.laundryking.scanner.net.Session
import com.laundryking.scanner.rfid.UhfReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Single-mode scan screen: big count, trigger-driven, one big Save button. */
class ScanActivity : AppCompatActivity() {
    companion object { const val EXTRA_MODE = "mode" }

    private lateinit var b: ActivityScanBinding
    private lateinit var session: Session
    private lateinit var api: Api
    private lateinit var queue: ScanQueue
    private val uhf = UhfReader()

    private lateinit var mode: Mode
    private val tags = LinkedHashSet<String>()
    private val triggerKeys = setOf(139, 280, 293, 294, 311, 312, 313, 315, 87, 88)

    private fun modeColor(m: Mode) = when (m) {
        Mode.DISPATCH -> R.color.mode_dispatch
        Mode.RETURN -> R.color.mode_return
        Mode.PICKUP -> R.color.mode_wash
        Mode.STOCK_CHECK -> R.color.mode_stock
        Mode.REGISTER -> R.color.mode_register
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityScanBinding.inflate(layoutInflater)
        setContentView(b.root)
        session = Session(this)
        api = Api(session)
        queue = ScanQueue(this)

        mode = Mode.valueOf(intent.getStringExtra(EXTRA_MODE) ?: Mode.DISPATCH.name)
        b.modeHeader.text = mode.thLabel
        b.header.setBackgroundColor(ContextCompat.getColor(this, modeColor(mode)))

        val ready = uhf.init(this)
        uhf.setOnTag { epc -> runOnUiThread { addTag(epc) } }
        if (!ready) b.hint.setText(R.string.reader_off_th)

        b.btnBack.setOnClickListener { finish() }
        b.scanToggle.setOnClickListener { toggleScan() }
        b.addBtn.setOnClickListener {
            val t = b.tagInput.text.toString().trim().uppercase()
            if (t.isNotEmpty()) { addTag(t); b.tagInput.setText("") }
        }
        b.clearBtn.setOnClickListener { tags.clear(); render() }
        b.saveBtn.setOnClickListener { save() }

        render(); updatePending()
    }

    private fun addTag(epc: String) {
        if (tags.add(epc)) {
            b.result.visibility = View.GONE
            b.lastTag.text = getString(R.string.last_tag, epc)
            render()
        }
    }

    private fun render() {
        b.countBig.text = tags.size.toString()
    }

    private fun toggleScan() {
        if (uhf.isScanning) {
            uhf.stop(); b.scanToggle.setText(R.string.scan_start)
        } else {
            if (uhf.start()) b.scanToggle.setText(R.string.scan_stop)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode in triggerKeys && event?.repeatCount == 0) { toggleScan(); return true }
        return super.onKeyDown(keyCode, event)
    }

    private fun save() {
        if (tags.isEmpty()) return
        val branchId = session.branchId
        val events = tags.map { ScanEvent.forTag(mode, it, branchId) }
        events.forEach { queue.add(it) }
        updatePending()
        tags.clear(); render()

        b.saveBtn.isEnabled = false
        b.result.visibility = View.VISIBLE
        b.result.setTextColor(ContextCompat.getColor(this, R.color.mode_register))
        b.result.setText(R.string.saving_th)
        lifecycleScope.launch {
            try {
                val pending = withContext(Dispatchers.IO) { queue.all() }
                val results = withContext(Dispatchers.IO) { api.syncBatch(session.deviceId, pending) }
                val applied = results.count { it.result == "applied" }
                val rejected = results.count { it.result == "rejected" }
                withContext(Dispatchers.IO) { queue.removeByUuids(results.map { it.clientUuid }.toSet()) }
                updatePending()
                if (rejected == 0) {
                    b.result.setTextColor(ContextCompat.getColor(this@ScanActivity, R.color.ok_green))
                    b.result.text = getString(R.string.result_ok_th, applied)
                } else {
                    b.result.setTextColor(ContextCompat.getColor(this@ScanActivity, R.color.reject_red))
                    b.result.text = getString(R.string.result_ok_th, applied) + "\n" +
                        getString(R.string.result_reject_th, rejected)
                }
            } catch (e: Exception) {
                b.result.setTextColor(ContextCompat.getColor(this@ScanActivity, R.color.reject_red))
                b.result.text = getString(R.string.upload_fail_th)
            } finally {
                b.saveBtn.isEnabled = true
            }
        }
    }

    private fun updatePending() {
        val n = queue.size()
        b.pending.text = if (n > 0) getString(R.string.pending_th, n) else ""
    }

    override fun onDestroy() {
        uhf.release()
        super.onDestroy()
    }
}
