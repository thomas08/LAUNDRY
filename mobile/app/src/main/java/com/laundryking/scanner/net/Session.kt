package com.laundryking.scanner.net

import android.content.Context
import com.laundryking.scanner.BuildConfig

/** Persists config + auth tokens in SharedPreferences. */
class Session(context: Context) {
    private val prefs = context.getSharedPreferences("laundryking", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString("baseUrl", BuildConfig.DEFAULT_BASE_URL)!!
        set(v) = prefs.edit().putString("baseUrl", v.trimEnd('/')).apply()

    var branchId: String
        get() = prefs.getString("branchId", BuildConfig.DEFAULT_BRANCH_ID)!!
        set(v) = prefs.edit().putString("branchId", v).apply()

    var deviceId: String
        get() = prefs.getString("deviceId", "c72-${branchId}")!!
        set(v) = prefs.edit().putString("deviceId", v).apply()

    var token: String?
        get() = prefs.getString("token", null)
        set(v) = prefs.edit().putString("token", v).apply()

    var refreshToken: String?
        get() = prefs.getString("refreshToken", null)
        set(v) = prefs.edit().putString("refreshToken", v).apply()

    var email: String?
        get() = prefs.getString("email", null)
        set(v) = prefs.edit().putString("email", v).apply()

    val isLoggedIn: Boolean get() = !token.isNullOrEmpty()

    fun clearAuth() {
        prefs.edit().remove("token").remove("refreshToken").apply()
    }
}
