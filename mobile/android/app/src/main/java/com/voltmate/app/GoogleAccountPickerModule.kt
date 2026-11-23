package com.voltmate.app

import android.Manifest
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
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GoogleAccountPickerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val mainScope = CoroutineScope(Dispatchers.Main)

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
    fun signInWithGoogle(serverClientId: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Foreground activity is not available for Google Sign-In.")
            return
        }
        val cleanClientId = serverClientId.trim()
        if (cleanClientId.isEmpty()) {
            promise.reject("INVALID_CONFIG", "Google OAuth Web Client ID (serverClientId) is not configured.")
            return
        }

        val credentialManager = CredentialManager.create(activity)

        mainScope.launch {
            try {
                // Primary: Google's official "Sign in with Google" bottom-sheet flow
                val signInOption = GetSignInWithGoogleOption.Builder(cleanClientId).build()
                val primaryRequest = GetCredentialRequest.Builder()
                    .addCredentialOption(signInOption)
                    .build()

                val response = try {
                    credentialManager.getCredential(
                        context = activity,
                        request = primaryRequest
                    )
                } catch (noCred: NoCredentialException) {
                    // Fallback to GetGoogleIdOption with filterByAuthorizedAccounts = false
                    val googleIdOption = GetGoogleIdOption.Builder()
                        .setServerClientId(cleanClientId)
                        .setFilterByAuthorizedAccounts(false)
                        .setAutoSelectEnabled(false)
                        .build()
                    val fallbackRequest = GetCredentialRequest.Builder()
                        .addCredentialOption(googleIdOption)
                        .build()
                    credentialManager.getCredential(
                        context = activity,
                        request = fallbackRequest
                    )
                }

                handleGoogleCredentialResponse(response, promise)
            } catch (e: GetCredentialCancellationException) {
                promise.reject("CANCELLED", "Google Sign-In was cancelled by the user.", e)
            } catch (e: NoCredentialException) {
                promise.reject(
                    "NO_GOOGLE_ACCOUNT",
                    "No Google account is signed in on this device. Please add a Google account in your device Settings and try again.",
                    e
                )
            } catch (e: GetCredentialInterruptedException) {
                promise.reject(
                    "NETWORK_ERROR",
                    "Google Sign-In was interrupted. Please check your internet connection and try again.",
                    e
                )
            } catch (e: GetCredentialException) {
                promise.reject(
                    "CREDENTIAL_ERROR",
                    e.errorMessage?.toString() ?: e.localizedMessage ?: "Google Sign-In could not be completed.",
                    e
                )
            } catch (e: Exception) {
                promise.reject(
                    "UNKNOWN_ERROR",
                    e.localizedMessage ?: "Unexpected error during Google Sign-In.",
                    e
                )
            }
        }
    }

    private fun handleGoogleCredentialResponse(response: GetCredentialResponse, promise: Promise) {
        val credential = response.credential
        if (credential is CustomCredential &&
            (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL ||
             credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL)
        ) {
            try {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken
                if (idToken.isBlank()) {
                    promise.reject("EMPTY_ID_TOKEN", "Google Sign-In returned an empty ID token.")
                    return
                }
                val map = Arguments.createMap().apply {
                    putString("idToken", idToken)
                    putString("email", googleIdTokenCredential.id)
                    putString("displayName", googleIdTokenCredential.displayName ?: "")
                    putString("profilePictureUri", googleIdTokenCredential.profilePictureUri?.toString() ?: "")
                }
                promise.resolve(map)
            } catch (e: GoogleIdTokenParsingException) {
                promise.reject("INVALID_ID_TOKEN", "Received an invalid Google ID token response.", e)
            }
        } else {
            promise.reject("UNSUPPORTED_CREDENTIAL", "Unsupported credential type returned by Credential Manager.")
        }
    }

    @ReactMethod
    fun clearGoogleCredentialState(promise: Promise) {
        val ctx = currentActivity ?: reactApplicationContext
        val credentialManager = CredentialManager.create(ctx)
        mainScope.launch {
            try {
                credentialManager.clearCredentialState(ClearCredentialStateRequest())
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    companion object {
        private const val CHANNEL_ID = "voltmate-alerts"
    }
}
