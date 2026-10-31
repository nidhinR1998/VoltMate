package com.voltmate.app

import android.Manifest
import android.accounts.AccountManager
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
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
    fun requestNotificationPermission(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "VoltMate EV Charging Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Real-time EV charging telemetry, Gate Pass OTPs, and UPI settlements"
                    enableVibration(true)
                }
                nm.createNotificationChannel(channel)
            }
            if (Build.VERSION.SDK_INT >= 33) {
                val activity = currentActivity
                if (activity != null &&
                    ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        9402
                    )
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun showLocalNotification(title: String, message: String, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "VoltMate EV Charging Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Real-time EV charging telemetry, Gate Pass OTPs, and UPI settlements"
                    enableVibration(true)
                }
                nm.createNotificationChannel(channel)
            }

            val launchIntent = Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(ctx, 0, launchIntent, pendingIntentFlags)

            val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(ctx.applicationInfo.icon)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            val notifId = (System.currentTimeMillis() % 100000).toInt()
            nm.notify(notifId, notification)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

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
        private const val CHANNEL_ID = "voltmate-alerts"
    }
}
