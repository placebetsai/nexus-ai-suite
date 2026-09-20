package com.fashionistas.app.ui.theme

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
    primary = Color(0xFFFFB6C1),
    onPrimary = Color(0xFF000000),
    primaryContainer = Color(0xFF8B0040),
    onPrimaryContainer = Color(0xFFFFD9E0),
    secondary = Color(0xFFFFD700),
    onSecondary = Color(0xFF000000),
    secondaryContainer = Color(0xFF6B5900),
    onSecondaryContainer = Color(0xFFFFF0C0),
    tertiary = Color(0xFFE0B0FF),
    onTertiary = Color(0xFF000000),
    tertiaryContainer = Color(0xFF5B2C80),
    onTertiaryContainer = Color(0xFFF0D6FF),
    background = Color(0xFF0D0D0D),
    onBackground = Color(0xFFE6E6E6),
    surface = Color(0xFF1A1A1A),
    onSurface = Color(0xFFE6E6E6),
    surfaceVariant = Color(0xFF2A2A2A),
    onSurfaceVariant = Color(0xFFCAC4D0),
    error = Color(0xFFFF6B6B),
    onError = Color(0xFF000000)
)

@Composable
fun FashionistasTheme(content: @Composable () -> Unit) {
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
