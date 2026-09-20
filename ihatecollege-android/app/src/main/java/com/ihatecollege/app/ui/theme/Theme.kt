package com.ihatecollege.app.ui.theme

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
    primary = Color(0xFFFF6F00),
    onPrimary = Color(0xFF000000),
    primaryContainer = Color(0xFFBF360C),
    onPrimaryContainer = Color(0xFFFFCCBC),
    secondary = Color(0xFF00BFA5),
    onSecondary = Color(0xFF000000),
    secondaryContainer = Color(0xFF004D40),
    onSecondaryContainer = Color(0xFFA7F3E9),
    tertiary = Color(0xFFE040FB),
    onTertiary = Color(0xFF000000),
    tertiaryContainer = Color(0xFF7B1FA2),
    onTertiaryContainer = Color(0xFFF3E5F5),
    background = Color(0xFF111118),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF1A1A24),
    onSurface = Color(0xFFE0E0E0),
    surfaceVariant = Color(0xFF252533),
    onSurfaceVariant = Color(0xFFBDBDBD),
    error = Color(0xFFFF5252),
    onError = Color(0xFFFFFFFF)
)

@Composable
fun IHateCollegeTheme(content: @Composable () -> Unit) {
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
