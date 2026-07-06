package com.laundryking.scanner

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.laundryking.scanner.data.Mode
import com.laundryking.scanner.databinding.ActivityHomeBinding
import com.laundryking.scanner.net.Session

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

        b.btnDispatch.setOnClickListener { open(Mode.DISPATCH) }
        b.btnReturn.setOnClickListener { open(Mode.RETURN) }
        b.btnWash.setOnClickListener { open(Mode.PICKUP) }
        b.btnStock.setOnClickListener { open(Mode.STOCK_CHECK) }
        b.btnRegister.setOnClickListener { open(Mode.REGISTER) }
        b.btnLogout.setOnClickListener {
            session.clearAuth()
            startActivity(Intent(this, LoginActivity::class.java)); finish()
        }
    }

    private fun open(mode: Mode) {
        startActivity(Intent(this, ScanActivity::class.java).putExtra(ScanActivity.EXTRA_MODE, mode.name))
    }
}
