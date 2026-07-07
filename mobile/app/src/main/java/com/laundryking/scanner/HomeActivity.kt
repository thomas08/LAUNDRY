package com.laundryking.scanner

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.laundryking.scanner.data.Mode
import com.laundryking.scanner.data.RefCache
import com.laundryking.scanner.databinding.ActivityHomeBinding
import com.laundryking.scanner.net.Api
import com.laundryking.scanner.net.Session
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Mode-first home: big buttons for floor staff. Pick a job → ScanActivity. */
class HomeActivity : AppCompatActivity() {
    private lateinit var b: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val session = Session(this)
        if (!session.isLoggedIn) {
            startActivity(Intent(this, LoginActivity::class.java)); finish(); return
        }
        b = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnLangEn.setOnClickListener { Locales.set("en") }
        b.btnLangTh.setOnClickListener { Locales.set("th") }

        // ปรับกำลังส่งเครื่องอ่านได้หลังล็อกอิน (setter จำกัด 5–30, บันทึกทันที)
        fun renderPower() { b.powerValue.text = getString(R.string.power_value, session.power) }
        renderPower()
        b.btnPowerDown.setOnClickListener { session.power = session.power - 1; renderPower() }
        b.btnPowerUp.setOnClickListener { session.power = session.power + 1; renderPower() }

        b.btnDispatch.setOnClickListener { open(Mode.DISPATCH) }
        b.btnReturn.setOnClickListener { open(Mode.RETURN) }
        b.btnWash.setOnClickListener { open(Mode.PICKUP) }
        b.btnStock.setOnClickListener { open(Mode.STOCK_CHECK) }
        b.btnRegister.setOnClickListener { open(Mode.REGISTER) }

        // พนักงานหน้างาน (role 'user') เห็นแค่ รับผ้า (PICKUP) + ส่งผ้า (DISPATCH)
        // ลงทะเบียนผ้า/รับคืน/เช็คสต็อก เฉพาะ admin/superadmin (backend บังคับซ้ำอีกชั้น)
        val managerOnly = if (session.isManager) View.VISIBLE else View.GONE
        b.btnRegister.visibility = managerOnly
        b.btnReturn.visibility = managerOnly
        b.btnStock.visibility = managerOnly
        b.btnLogout.setOnClickListener {
            session.clearAuth()
            startActivity(Intent(this, LoginActivity::class.java)); finish()
        }

        // Refresh the offline reference cache (articles/customers/job orders) for the pickers.
        val api = Api(session)
        val refCache = RefCache(this)
        lifecycleScope.launch {
            try {
                val ref = withContext(Dispatchers.IO) { api.fetchReference() }
                withContext(Dispatchers.IO) { refCache.save(ref) }
            } catch (_: Exception) {
                // Offline — keep whatever was cached last time.
            }
        }
    }

    private fun open(mode: Mode) {
        startActivity(Intent(this, ScanActivity::class.java).putExtra(ScanActivity.EXTRA_MODE, mode.name))
    }
}
