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

    // กำลังส่ง UHF (dBm) — ต่ำ = ระยะอ่านสั้น กันอ่าน tag กองข้าง ๆ/ลงทะเบียนพลาด
    // ช่วงที่เครื่องรับได้ราว 5–30; default 15 (สั้นพอสำหรับจ่อลงทะเบียนทีละชิ้น)
    var power: Int
        get() = prefs.getInt("power", 15)
        set(v) = prefs.edit().putInt("power", v.coerceIn(5, 30)).apply()

    var token: String?
        get() = prefs.getString("token", null)
        set(v) = prefs.edit().putString("token", v).apply()

    var refreshToken: String?
        get() = prefs.getString("refreshToken", null)
        set(v) = prefs.edit().putString("refreshToken", v).apply()

    var email: String?
        get() = prefs.getString("email", null)
        set(v) = prefs.edit().putString("email", v).apply()

    // บทบาทผู้ใช้จาก backend ('user' | 'admin' | 'superadmin') — ใช้ซ่อน/แสดงโหมดบนหน้า Home
    var role: String
        get() = prefs.getString("role", "user")!!
        set(v) = prefs.edit().putString("role", v).apply()

    val isLoggedIn: Boolean get() = !token.isNullOrEmpty()

    /** admin/superadmin เท่านั้นที่ลงทะเบียนผ้า (REGISTER) และเห็นโหมดจัดการอื่น ๆ ได้ */
    val isManager: Boolean get() = role == "admin" || role == "superadmin"

    fun clearAuth() {
        prefs.edit().remove("token").remove("refreshToken").remove("role").apply()
    }
}
