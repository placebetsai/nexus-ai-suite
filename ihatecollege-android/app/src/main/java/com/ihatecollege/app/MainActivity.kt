package com.ihatecollege.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ihatecollege.app.ui.theme.IHateCollegeTheme

data class CareerPath(val id: Int, val title: String, val subtitle: String, val icon: String, val color: Color, val salary: String, val lessons: Int, val completed: Int)
data class Lesson(val id: Int, val title: String, val pathId: Int, val duration: String, val completed: Boolean, val content: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            IHateCollegeTheme {
                IHateCollegeApp()
            }
        }
    }
}

@Composable
fun IHateCollegeApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomItems = listOf(
        NavBarItem("careers", Icons.Filled.Work, "Careers"),
        NavBarItem("lessons", Icons.Filled.MenuBook, "Lessons"),
        NavBarItem("progress", Icons.Filled.TrendingUp, "Progress"),
        NavBarItem("community", Icons.Filled.Groups, "Community"),
        NavBarItem("profile", Icons.Filled.Person, "Profile")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("IHateCollege", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text("Skip college. Start building.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                bottomItems.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentRoute == item.route,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "careers",
            modifier = Modifier.padding(padding)
        ) {
            composable("careers") { CareersScreen(navController) }
            composable("lessons") { LessonsScreen(navController) }
            composable("progress") { ProgressScreen() }
            composable("community") { CommunityScreen() }
            composable("profile") { ProfileScreen() }
            composable("career_detail/{careerId}") { backStackEntry ->
                val careerId = backStackEntry.arguments?.getString("careerId")?.toIntOrNull() ?: 1
                CareerDetailScreen(careerId, navController)
            }
            composable("lesson_detail/{lessonId}") { backStackEntry ->
                val lessonId = backStackEntry.arguments?.getString("lessonId")?.toIntOrNull() ?: 1
                LessonDetailScreen(lessonId, navController)
            }
        }
    }
}

data class NavBarItem(val route: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)

val careerPaths = listOf(
    CareerPath(1, "Frontend Developer", "HTML, CSS, JavaScript, React", "code", Color(0xFFFF6F00), "$85K-$130K", 24, 8),
    CareerPath(2, "Backend Developer", "Python, Node.js, Databases", "storage", Color(0xFF00BFA5), "$90K-$140K", 28, 12),
    CareerPath(3, "Mobile Developer", "Kotlin, Swift, Flutter", "phone_android", Color(0xFFE040FB), "$80K-$125K", 22, 5),
    CareerPath(4, "Data Scientist", "Python, ML, Statistics", "analytics", Color(0xFF2196F3), "$95K-$150K", 30, 15),
    CareerPath(5, "DevOps Engineer", "Docker, K8s, CI/CD", "cloud", Color(0xFF4CAF50), "$100K-$155K", 26, 3),
    CareerPath(6, "Cybersecurity", "Network Security, Ethical Hacking", "security", Color(0xFFFF5252), "$85K-$135K", 25, 0)
)

val allLessons = listOf(
    Lesson(1, "HTML Fundamentals", 1, "15 min", true, "Learn the building blocks of the web. HTML provides the structure for every webpage you visit."),
    Lesson(2, "CSS Styling Basics", 1, "20 min", true, "Make your HTML beautiful. CSS controls colors, layouts, fonts, and responsive design."),
    Lesson(3, "JavaScript Intro", 1, "25 min", false, "Add interactivity to your websites. JavaScript is the programming language of the web."),
    Lesson(4, "React Components", 1, "30 min", false, "Build reusable UI components with React. Learn about JSX, props, and component lifecycle."),
    Lesson(5, "Python Basics", 2, "20 min", true, "Start your backend journey with Python. Simple syntax, powerful capabilities."),
    Lesson(6, "Node.js & Express", 2, "25 min", true, "Build server-side applications with JavaScript. REST APIs made easy."),
    Lesson(7, "SQL Databases", 2, "20 min", false, "Store and query data efficiently. Learn PostgreSQL and database design."),
    Lesson(8, "Kotlin for Android", 3, "25 min", false, "Build native Android apps with Kotlin. Modern, concise, and powerful."),
    Lesson(9, "Data Structures", 4, "30 min", true, "Arrays, linked lists, trees, and graphs. The foundation of efficient algorithms."),
    Lesson(10, "Docker Containers", 5, "20 min", false, "Package and deploy applications consistently. Containerize anything.")
)

@Composable
fun CareersScreen(navController: NavHostController) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Career Paths", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Choose your path. No degree required.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(careerPaths) { path ->
                CareerCard(path) { navController.navigate("career_detail/${path.id}") }
            }
        }
    }
}

@Composable
fun CareerCard(path: CareerPath, onClick: () -> Unit) {
    val progress = if (path.lessons > 0) path.completed.toFloat() / path.lessons else 0f

    Card(
        modifier = Modifier.fillMaxWidth().height(180.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = path.color.copy(alpha = 0.12f))
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Box(
                modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(path.color.copy(alpha = 0.25f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    when (path.icon) {
                        "code" -> Icons.Filled.Code
                        "storage" -> Icons.Filled.Storage
                        "phone_android" -> Icons.Filled.PhoneAndroid
                        "analytics" -> Icons.Filled.Analytics
                        "cloud" -> Icons.Filled.Cloud
                        "security" -> Icons.Filled.Security
                        else -> Icons.Filled.Work
                    },
                    contentDescription = null,
                    tint = path.color,
                    modifier = Modifier.size(22.dp)
                )
            }
            Column {
                Text(path.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                Spacer(modifier = Modifier.height(2.dp))
                Text(path.subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)),
                    color = path.color,
                    trackColor = path.color.copy(alpha = 0.15f)
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text("${path.completed}/${path.lessons} lessons", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun LessonsScreen(navController: NavHostController) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Lessons", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Practical skills, not theory fluff", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(12.dp))

        val completed = allLessons.count { it.completed }
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Filled.TrendingUp, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Overall Progress", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("$completed of ${allLessons.size} lessons completed", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("${(completed * 100 / allLessons.size)}%", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(allLessons) { lesson ->
                LessonRow(lesson) { navController.navigate("lesson_detail/${lesson.id}") }
            }
        }
    }
}

@Composable
fun LessonRow(lesson: Lesson, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(
                    if (lesson.completed) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant
                ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (lesson.completed) Icons.Filled.CheckCircle else Icons.Filled.PlayCircle,
                    contentDescription = null,
                    tint = if (lesson.completed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(lesson.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text("${careerPaths.find { it.id == lesson.pathId }?.title ?: ""} | ${lesson.duration}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun ProgressScreen() {
    val totalLessons = allLessons.size
    val completedLessons = allLessons.count { it.completed }
    val overallProgress = completedLessons.toFloat() / totalLessons

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Your Progress", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(modifier = Modifier.size(120.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        progress = { overallProgress },
                        modifier = Modifier.fillMaxSize(),
                        strokeWidth = 10.dp,
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${(overallProgress * 100).toInt()}%", fontWeight = FontWeight.Bold, fontSize = 28.sp, color = MaterialTheme.colorScheme.primary)
                        Text("Complete", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("$completedLessons of $totalLessons lessons", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
        Text("By Career Path", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(12.dp))

        careerPaths.forEach { path ->
            val progress = if (path.lessons > 0) path.completed.toFloat() / path.lessons else 0f
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(path.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("${(progress * 100).toInt()}%", fontSize = 14.sp, color = path.color, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                        color = path.color,
                        trackColor = path.color.copy(alpha = 0.15f)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${path.completed} of ${path.lessons} lessons", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun CommunityScreen() {
    val posts = listOf(
        "Just landed my first dev job after 3 months!",
        "Best resources for learning React in 2024",
        "Show off your portfolio project",
        "Study group for cybersecurity path",
        "Tips for nailing technical interviews",
        "Free tools every developer should know"
    )
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Community", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Learn together, grow together", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(16.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(posts) { post ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                        Box(
                            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(post, fontSize = 14.sp, lineHeight = 20.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("2h ago", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen() {
    val completed = allLessons.count { it.completed }
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(20.dp))
        Box(
            modifier = Modifier.size(80.dp).clip(RoundedCornerShape(40.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text("Self-Taught Dev", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("No degree. Just skills.", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(20.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$completed", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
                    Text("Lessons", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("6", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.secondary)
                    Text("Paths Active", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("12", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.tertiary)
                    Text("Day Streak", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        listOf("Settings", "Achievements", "Bookmarks", "Help & Support").forEach { item ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(item, modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium)
                    Icon(Icons.Filled.ChevronRight, contentDescription = null)
                }
            }
        }
    }
}

@Composable
fun CareerDetailScreen(careerId: Int, navController: NavHostController) {
    val career = careerPaths.find { it.id == careerId } ?: careerPaths.first()
    val lessons = allLessons.filter { it.pathId == careerId }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Career Path", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = career.color.copy(alpha = 0.12f))
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(career.title, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(career.subtitle, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Avg Salary: ${career.salary}", fontSize = 15.sp, color = career.color, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(12.dp))
                LinearProgressIndicator(
                    progress = { if (career.lessons > 0) career.completed.toFloat() / career.lessons else 0f },
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                    color = career.color,
                    trackColor = career.color.copy(alpha = 0.15f)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text("${career.completed}/${career.lessons} lessons completed", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
        Text("Lessons", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(lessons) { lesson ->
                LessonRow(lesson) { navController.navigate("lesson_detail/${lesson.id}") }
            }
            if (lessons.isEmpty()) {
                item {
                    Text("No lessons available yet", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(32.dp))
                }
            }
        }
    }
}

@Composable
fun LessonDetailScreen(lessonId: Int, navController: NavHostController) {
    val lesson = allLessons.find { it.id == lessonId } ?: allLessons.first()
    val path = careerPaths.find { it.id == lesson.pathId }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Lesson", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(path?.title ?: "", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(lesson.title, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Schedule, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(lesson.duration, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(16.dp))
                    Badge(containerColor = if (lesson.completed) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant) {
                        Text(if (lesson.completed) "Completed" else "In Progress", fontSize = 11.sp, color = if (lesson.completed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("About This Lesson", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text(lesson.content, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = if (lesson.completed) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary)
        ) {
            Icon(
                if (lesson.completed) Icons.Filled.Refresh else Icons.Filled.PlayArrow,
                contentDescription = null
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                if (lesson.completed) "Review Lesson" else "Start Lesson",
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
        }
    }
}
