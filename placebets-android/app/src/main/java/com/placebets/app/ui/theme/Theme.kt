package com.placebets.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF00E676),
    onPrimary = Color(0xFF000000),
    primaryContainer = Color(0xFF004D25),
    onPrimaryContainer = Color(0xFFA5F5BA),
    secondary = Color(0xFFFFAB00),
    onSecondary = Color(0xFF000000),
    secondaryContainer = Color(0xFF5C4100),
    onSecondaryContainer = Color(0xFFFFE082),
    tertiary = Color(0xFFFF5252),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFF8B0000),
    onTertiaryContainer = Color(0xFFFFCDD2),
    background = Color(0xFF0A0A0A),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF161616),
    onSurface = Color(0xFFE0E0E0),
    surfaceVariant = Color(0xFF252525),
    onSurfaceVariant = Color(0xFFBDBDBD),
    error = Color(0xFFFF5252),
    onError = Color(0xFFFFFFFF)
)

@Composable
fun PlaceBetsTheme(content: @Composable () -> Unit) {
    val colorScheme = DarkColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
