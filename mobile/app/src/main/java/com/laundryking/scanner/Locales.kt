package com.laundryking.scanner

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

/**
 * Per-app language (AndroidX). Persisted automatically via the
 * AppLocalesMetadataHolderService + autoStoreLocales meta-data in the manifest,
 * so the choice survives restarts and overrides the device locale.
 * Default is English (workers read English); Thai is available for local staff.
 */
object Locales {
    fun set(tag: String) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
    }
}
