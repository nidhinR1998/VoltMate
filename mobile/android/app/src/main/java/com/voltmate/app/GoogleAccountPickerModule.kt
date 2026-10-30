package com.voltmate.app

import android.accounts.AccountManager
import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class GoogleAccountPickerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pickerPromise: Promise? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?
        ) {
            if (requestCode == REQUEST_CODE_PICK_GOOGLE_ACCOUNT) {
                val promise = pickerPromise
                pickerPromise = null
                if (promise == null) return

                if (resultCode == Activity.RESULT_OK && data != null) {
                    val accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
                    val accountType = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE)
                    if (!accountName.isNullOrBlank()) {
                        val map = Arguments.createMap().apply {
                            putString("email", accountName.trim())
                            putString("accountType", accountType ?: "com.google")
                        }
                        promise.resolve(map)
                    } else {
                        promise.reject("NO_ACCOUNT", "No Google account was returned.")
                    }
                } else {
                    promise.reject("CANCELLED", "Google account selection was cancelled.")
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "GoogleAccountPicker"

    @ReactMethod
    fun pickGoogleAccount(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current foreground activity is not available.")
            return
        }

        pickerPromise = promise
        try {
            @Suppress("DEPRECATION")
            val intent = AccountManager.newChooseAccountIntent(
                null,
                null,
                arrayOf("com.google"),
                false,
                null,
                null,
                null,
                null
            )
            activity.startActivityForResult(intent, REQUEST_CODE_PICK_GOOGLE_ACCOUNT)
        } catch (e: Exception) {
            pickerPromise = null
            promise.reject("PICKER_ERROR", e.localizedMessage ?: "Failed to launch Google Account Picker", e)
        }
    }

    companion object {
        private const val REQUEST_CODE_PICK_GOOGLE_ACCOUNT = 9401
    }
}

