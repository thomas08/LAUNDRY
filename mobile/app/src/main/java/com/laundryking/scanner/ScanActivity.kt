package com.laundryking.scanner

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.laundryking.scanner.data.Mode
import com.laundryking.scanner.data.Option
import com.laundryking.scanner.data.RefCache
import com.laundryking.scanner.data.ScanEvent
import com.laundryking.scanner.data.ScanQueue
import com.laundryking.scanner.databinding.ActivityScanBinding
import com.laundryking.scanner.net.Api
import com.laundryking.scanner.net.Session
import com.laundryking.scanner.rfid.UhfReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.random.Random

/** Single-mode scan screen: big count, trigger-driven, one big Save button. */
class ScanActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_MODE = "mode"
        const val MAX_MANUAL = 500 // cap non-RFID key-in per add (protects the batch)
    }

    private lateinit var b: ActivityScanBinding
    private lateinit var session: Session
    private lateinit var api: Api
    private lateinit var queue: ScanQueue
    private val uhf = UhfReader()

    private lateinit var mode: Mode
    private val tags = LinkedHashSet<String>()
    private val refCache by lazy { RefCache(this) }
    private val triggerKeys = setOf(139, 280, 293, 294, 311, 312, 313, 315, 87, 88)

    private fun modeColor(m: Mode) = when (m) {
        Mode.DISPATCH -> R.color.mode_dispatch
        Mode.RETURN -> R.color.mode_return
        Mode.PICKUP -> R.color.mode_wash
        Mode.STOCK_CHECK -> R.color.mode_stock
        Mode.REGISTER -> R.color.mode_register
    }

    private fun modeLabel(m: Mode) = when (m) {
        Mode.DISPATCH -> R.string.mode_dispatch
        Mode.RETURN -> R.string.mode_return
        Mode.PICKUP -> R.string.mode_wash
        Mode.STOCK_CHECK -> R.string.mode_stock
        Mode.REGISTER -> R.string.mode_register
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityScanBinding.inflate(layoutInflater)
        setContentView(b.root)
        session = Session(this)
        api = Api(session)
        queue = ScanQueue(this)

        mode = Mode.valueOf(intent.getStringExtra(EXTRA_MODE) ?: Mode.DISPATCH.name)
        b.modeHeader.setText(modeLabel(mode))
        b.header.setBackgroundColor(ContextCompat.getColor(this, modeColor(mode)))

        val ready = uhf.init(this)
        // ตั้งกำลังส่งให้ต่ำตามที่ config ไว้ (กันอ่านกว้างเกิน/อ่าน tag กองข้าง ๆ)
        if (ready) uhf.setPower(session.power)
        uhf.setOnTag { epc -> runOnUiThread { addTag(epc) } }
        if (!ready) b.hint.setText(R.string.reader_off)

        setupPickers()

        b.btnBack.setOnClickListener { finish() }
        b.scanToggle.setOnClickListener { toggleScan() }
        b.addBtn.setOnClickListener {
            val t = b.tagInput.text.toString().trim().uppercase()
            if (t.isNotEmpty()) { addTag(t); b.tagInput.setText("") }
        }
        b.clearBtn.setOnClickListener { tags.clear(); render() }
        b.saveBtn.setOnClickListener { save() }
        b.qtyAddBtn.setOnClickListener { addManualQuantity() }

        render(); updatePending()
    }

    /** Show only the pickers relevant to this mode, filled from the offline reference cache. */
    private fun setupPickers() {
        val none = Option("", getString(R.string.opt_none))
        val articles = refCache.articles()
        fun fill(sp: android.widget.Spinner, items: List<Option>) {
            sp.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, items)
        }
        fill(b.spinnerArticle, articles)
        fill(b.spinnerCustomer, listOf(none) + refCache.customers())
        fill(b.spinnerJobOrder, listOf(none) + refCache.jobOrders())

        fun show(vararg v: View) = v.forEach { it.visibility = View.VISIBLE }
        when (mode) {
            Mode.REGISTER -> {
                show(b.labelArticle, b.spinnerArticle, b.ownershipGroup, b.manualGroup)
                b.ownershipGroup.setOnCheckedChangeListener { _, id ->
                    val cog = id == R.id.rbCog
                    b.labelCustomer.visibility = if (cog) View.VISIBLE else View.GONE
                    b.spinnerCustomer.visibility = if (cog) View.VISIBLE else View.GONE
                }
                if (articles.isEmpty()) b.hint.setText(R.string.no_ref)
            }
            Mode.DISPATCH -> show(b.labelJobOrder, b.spinnerJobOrder)
            Mode.PICKUP -> show(b.labelCustomer, b.spinnerCustomer)
            else -> {}
        }
    }

    /** REGISTER: mint N unique non-RFID codes (NR-...) and queue them like scanned tags.
     *  Each becomes one linen_item via the same item_receive path — no scanning needed. */
    private fun addManualQuantity() {
        val qty = b.qtyInput.text.toString().trim().toIntOrNull() ?: 0
        if (qty < 1 || qty > MAX_MANUAL) return
        val stamp = System.currentTimeMillis().toString(36).uppercase()
        val alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        val rand = (1..4).map { alphabet[Random.nextInt(alphabet.length)] }.joinToString("")
        for (i in 1..qty) addTag("NR-$stamp$rand-" + i.toString().padStart(4, '0'))
        b.qtyInput.setText("")
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
        val article = b.spinnerArticle.selectedItem as? Option
        val customer = b.spinnerCustomer.selectedItem as? Option
        val jobOrder = b.spinnerJobOrder.selectedItem as? Option
        val ownership = if (b.rbCog.isChecked) "customer_owned" else "rental"
        val events = tags.map {
            ScanEvent.forTag(
                mode, it, branchId,
                articleId = article?.id?.ifBlank { null },
                articleName = article?.label,
                ownership = ownership,
                customerId = customer?.id?.ifBlank { null },
                jobOrderId = jobOrder?.id?.ifBlank { null }
            )
        }
        events.forEach { queue.add(it) }
        updatePending()
        tags.clear(); render()

        b.saveBtn.isEnabled = false
        b.result.visibility = View.VISIBLE
        b.result.setTextColor(ContextCompat.getColor(this, R.color.mode_register))
        b.result.setText(R.string.saving)
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
                    b.result.text = getString(R.string.result_ok, applied)
                } else {
                    b.result.setTextColor(ContextCompat.getColor(this@ScanActivity, R.color.reject_red))
                    b.result.text = getString(R.string.result_ok, applied) + "\n" +
                        getString(R.string.result_reject, rejected)
                }
            } catch (e: Exception) {
                b.result.setTextColor(ContextCompat.getColor(this@ScanActivity, R.color.reject_red))
                b.result.text = getString(R.string.upload_fail)
            } finally {
                b.saveBtn.isEnabled = true
            }
        }
    }

    private fun updatePending() {
        val n = queue.size()
        b.pending.text = if (n > 0) getString(R.string.pending, n) else ""
    }

    override fun onDestroy() {
        uhf.release()
        super.onDestroy()
    }
}
