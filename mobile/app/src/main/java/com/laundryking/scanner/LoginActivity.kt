package com.laundryking.scanner

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.laundryking.scanner.databinding.ActivityLoginBinding
import com.laundryking.scanner.net.Api
import com.laundryking.scanner.net.Session
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class LoginActivity : AppCompatActivity() {
    private lateinit var b: ActivityLoginBinding
    private lateinit var session: Session

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(b.root)
        session = Session(this)

        if (session.isLoggedIn) { goMain(); return }

        b.baseUrl.setText(session.baseUrl)
        b.branchId.setText(session.branchId)
        b.deviceId.setText(session.deviceId)
        session.email?.let { b.email.setText(it) }

        b.loginBtn.setOnClickListener { doLogin() }
    }

    private fun doLogin() {
        val email = b.email.text.toString().trim()
        val pass = b.password.text.toString()
        if (email.isEmpty() || pass.isEmpty()) {
            b.status.text = getString(R.string.enter_credentials)
            return
        }
        session.baseUrl = b.baseUrl.text.toString().trim()
        session.branchId = b.branchId.text.toString().trim()
        session.deviceId = b.deviceId.text.toString().trim()

        b.loginBtn.isEnabled = false
        b.status.text = getString(R.string.signing_in)
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { Api(session).login(email, pass) }
                goMain()
            } catch (e: Exception) {
                b.status.text = e.message ?: getString(R.string.login_failed)
                b.loginBtn.isEnabled = true
            }
        }
    }

    private fun goMain() {
        startActivity(Intent(this, HomeActivity::class.java))
        finish()
    }
}
