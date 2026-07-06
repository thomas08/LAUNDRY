package com.laundryking.scanner

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.laundryking.scanner.data.Mode
import com.laundryking.scanner.data.ScanEvent
import com.laundryking.scanner.data.ScanQueue
import com.laundryking.scanner.databinding.ActivityMainBinding
import com.laundryking.scanner.net.Api
import com.laundryking.scanner.net.Session
import com.laundryking.scanner.rfid.UhfReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private lateinit var b: ActivityMainBinding
    private lateinit var session: Session
    private lateinit var api: Api
    private lateinit var queue: ScanQueue
    private val uhf = UhfReader()

    // Tags scanned/typed in the current session (deduped, ordered).
    private val sessionTags = LinkedHashSet<String>()

    // Common Chainway hardware trigger keycodes (varies by model/firmware).
    private val triggerKeys = setOf(139, 280, 293, 294, 311, 312, 313, 315, 87, 88)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)
        session = Session(this)
        api = Api(session)
        queue = ScanQueue(this)

        b.modeSpinner.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item, Mode.values()
        )

        val ready = uhf.init(this)
        uhf.setOnTag { epc -> runOnUiThread { addTag(epc) } }
        b.readerStatus.text = getString(if (ready) R.string.reader_ready else R.string.reader_unavailable)

        b.addBtn.setOnClickListener {
            val t = b.tagInput.text.toString().trim().uppercase()
            if (t.isNotEmpty()) { addTag(t); b.tagInput.setText("") }
        }
        b.scanToggle.setOnClickListener { toggleScan() }
        b.clearBtn.setOnClickListener { sessionTags.clear(); renderTags() }
        b.submitBtn.setOnClickListener { submit() }
        b.syncRefBtn.setOnClickListener { syncReference() }
        b.logoutBtn.setOnClickListener { logout() }

        renderTags()
        updatePending()
    }

    private fun addTag(epc: String) {
        if (sessionTags.add(epc)) renderTags()
    }

    private fun renderTags() {
        b.tagList.text = if (sessionTags.isEmpty()) getString(R.string.no_tags)
        else sessionTags.joinToString("\n")
        b.tagCount.text = getString(R.string.tag_count, sessionTags.size)
    }

    private fun toggleScan() {
        if (uhf.isScanning) {
            uhf.stop(); b.scanToggle.text = getString(R.string.start_scan)
        } else {
            if (uhf.start()) b.scanToggle.text = getString(R.string.stop_scan)
            else b.status.text = getString(R.string.reader_unavailable)
        }
    }

    // Hardware trigger key → toggle inventory.
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode in triggerKeys && event?.repeatCount == 0) { toggleScan(); return true }
        return super.onKeyDown(keyCode, event)
    }

    private fun submit() {
        if (sessionTags.isEmpty()) { b.status.text = getString(R.string.no_tags); return }
        val mode = b.modeSpinner.selectedItem as Mode
        val jobOrderId = b.jobOrderInput.text.toString().trim().ifEmpty { null }
        val registerType = b.registerTypeInput.text.toString().trim().ifEmpty { null }
        val branchId = session.branchId

        // Build + persist events first (survive a crash / offline), then upload.
        val events = sessionTags.map {
            ScanEvent.forTag(mode, it, branchId, jobOrderId = jobOrderId, registerType = registerType)
        }
        events.forEach { queue.add(it) }
        updatePending()
        sessionTags.clear(); renderTags()

        b.submitBtn.isEnabled = false
        b.status.text = getString(R.string.uploading)
        lifecycleScope.launch {
            try {
                val pending = withContext(Dispatchers.IO) { queue.all() }
                val results = withContext(Dispatchers.IO) { api.syncBatch(session.deviceId, pending) }
                val applied = results.count { it.result == "applied" }
                val rejected = results.filter { it.result == "rejected" }
                // Drop everything the server acknowledged (applied or rejected — both are final).
                withContext(Dispatchers.IO) { queue.removeByUuids(results.map { it.clientUuid }.toSet()) }
                updatePending()
                val detail = if (rejected.isEmpty()) "" else
                    "\n" + rejected.joinToString("\n") { "✗ ${it.reason ?: "rejected"}" }
                b.status.text = getString(R.string.result_summary, applied, rejected.size) + detail
            } catch (e: Exception) {
                // Left in the queue for a later retry (idempotent via clientUuid).
                b.status.text = getString(R.string.upload_failed, e.message ?: "")
            } finally {
                b.submitBtn.isEnabled = true
            }
        }
    }

    private fun syncReference() {
        b.status.text = getString(R.string.syncing_ref)
        lifecycleScope.launch {
            try {
                val ref = withContext(Dispatchers.IO) { api.fetchReference() }
                b.status.text = getString(
                    R.string.ref_summary,
                    ref.branchName ?: "?", ref.customers.length(), ref.jobOrders.length()
                )
            } catch (e: Exception) {
                b.status.text = e.message ?: getString(R.string.sync_failed)
            }
        }
    }

    private fun updatePending() {
        b.pending.text = getString(R.string.pending_count, queue.size())
    }

    private fun logout() {
        session.clearAuth()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        uhf.release()
        super.onDestroy()
    }
}
