package com.placebets.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.placebets.app.ui.theme.PlaceBetsTheme

data class OddsEvent(val id: Int, val sport: String, val team1: String, val team2: String, val odds1: String, val odds2: String, val time: String)
data class AiPick(val id: Int, val event: String, val pick: String, val confidence: Float, val potentialReturn: String)
data class TrackedBet(val id: Int, val event: String, val pick: String, val stake: String, val potentialWin: String, val status: String, val profit: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PlaceBetsTheme {
                PlaceBetsApp()
            }
        }
    }
}

@Composable
fun PlaceBetsApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomItems = listOf(
        NavBarItem("odds", Icons.Filled.ShowChart, "Odds"),
        NavBarItem("ai_picks", Icons.Filled.AutoAwesome, "AI Picks"),
        NavBarItem("tracker", Icons.Filled.SportsScore, "Tracker"),
        NavBarItem("betslip", Icons.Filled.Receipt, "Betslip"),
        NavBarItem("profile", Icons.Filled.Person, "Profile")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PlaceBets", fontWeight = FontWeight.Bold, fontSize = 22.sp) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
                actions = {
                    Icon(Icons.Filled.AccountBalanceWallet, contentDescription = "Balance", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(end = 8.dp))
                    Text("$500.00", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 16.dp))
                }
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
            startDestination = "odds",
            modifier = Modifier.padding(padding)
        ) {
            composable("odds") { OddsScreen(navController) }
            composable("ai_picks") { AiPicksScreen() }
            composable("tracker") { TrackerScreen() }
            composable("betslip") { BetslipScreen() }
            composable("profile") { ProfileScreen() }
            composable("event_detail/{eventId}") { backStackEntry ->
                val eventId = backStackEntry.arguments?.getString("eventId")?.toIntOrNull() ?: 1
                EventDetailScreen(eventId, navController)
            }
        }
    }
}

data class NavBarItem(val route: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)

val sampleOdds = listOf(
    OddsEvent(1, "NFL", "Kansas City Chiefs", "San Francisco 49ers", "-110", "+105", "Sun 6:30 PM"),
    OddsEvent(2, "NBA", "Boston Celtics", "LA Lakers", "-150", "+130", "Mon 8:00 PM"),
    OddsEvent(3, "Soccer", "Real Madrid", "Barcelona", "+120", "-105", "Sat 3:00 PM"),
    OddsEvent(4, "NHL", "Edmonton Oilers", "Florida Panthers", "+115", "-125", "Fri 7:00 PM"),
    OddsEvent(5, "MLB", "New York Yankees", "LA Dodgers", "-135", "+115", "Thu 7:05 PM"),
    OddsEvent(6, "UFC", "Jon Jones", "Stipe Miocic", "-200", "+170", "Sat 10:00 PM")
)

val sampleAiPicks = listOf(
    AiPick(1, "Chiefs vs 49ers", "Chiefs ML", 0.87f, "+$87"),
    AiPick(2, "Celtics vs Lakers", "Over 215.5", 0.82f, "+$73"),
    AiPick(3, "Real Madrid vs Barcelona", "BTTS Yes", 0.79f, "+$65"),
    AiPick(4, "Oilers vs Panthers", "Oilers +1.5", 0.85f, "+$80"),
    AiPick(5, "Yankees vs Dodgers", "Under 8.5", 0.74f, "+$58")
)

val sampleTrackedBets = listOf(
    TrackedBet(1, "Chiefs vs 49ers", "Chiefs -3", "$50", "$95", "Active", ""),
    TrackedBet(2, "Celtics vs Lakers", "Over 215.5", "$30", "$57", "Active", ""),
    TrackedBet(3, "Real Madrid vs Barcelona", "Barcelona ML", "$25", "$48", "Won", "+$23"),
    TrackedBet(4, "Oilers vs Panthers", "Under 5.5", "$40", "$76", "Lost", "-$40"),
    TrackedBet(5, "Yankees vs Dodgers", "Yankees ML", "$35", "$61", "Active", "")
)

@Composable
fun OddsScreen(navController: NavHostController) {
    var selectedSport by remember { mutableStateOf("All") }
    val sports = listOf("All", "NFL", "NBA", "Soccer", "NHL", "MLB", "UFC")
    val filtered = if (selectedSport == "All") sampleOdds else sampleOdds.filter { it.sport == selectedSport }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Live Odds", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            sports.take(5).forEach { sport ->
                FilterChip(
                    selected = selectedSport == sport,
                    onClick = { selectedSport = sport },
                    label = { Text(sport, fontSize = 12.sp) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(filtered) { event ->
                OddsCard(event) { navController.navigate("event_detail/${event.id}") }
            }
        }
    }
}

@Composable
fun OddsCard(event: OddsEvent, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(event.sport, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Text(event.time, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(event.team1, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
                Button(
                    onClick = { },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(event.odds1, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(event.team2, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
                Button(
                    onClick = { },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f)),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(event.odds2, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun AiPicksScreen() {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("AI Powered Picks", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text("Machine learning model analyzing patterns", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Model Accuracy", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Last 30 days", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("78.4%", fontWeight = FontWeight.Bold, fontSize = 28.sp, color = MaterialTheme.colorScheme.secondary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(sampleAiPicks) { pick ->
                AiPickCard(pick)
            }
        }
    }
}

@Composable
fun AiPickCard(pick: AiPick) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(pick.event, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(pick.pick, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Potential: ${pick.potentialReturn}", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Confidence", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${(pick.confidence * 100).toInt()}%", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = { pick.confidence },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                color = MaterialTheme.colorScheme.secondary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
            Spacer(modifier = Modifier.height(10.dp))
            Button(
                onClick = { },
                modifier = Modifier.fillMaxWidth().height(42.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Add to Betslip", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
fun TrackerScreen() {
    var showActive by remember { mutableStateOf(true) }
    val bets = if (showActive) sampleTrackedBets.filter { it.status == "Active" } else sampleTrackedBets

    val totalProfit = sampleTrackedBets.sumOf { if (it.profit.startsWith("+")) it.profit.substring(1).removePrefix("$").toDouble() else -it.profit.removePrefix("-$").toDouble() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Bet Tracker", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = if (totalProfit >= 0) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Total P/L", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Active bets: ${sampleTrackedBets.count { it.status == "Active" }}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(
                    if (totalProfit >= 0) "+$${totalProfit}" else "-$${-totalProfit}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 28.sp,
                    color = if (totalProfit >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = showActive, onClick = { showActive = true }, label = { Text("Active") })
            FilterChip(selected = !showActive, onClick = { showActive = false }, label = { Text("All Bets") })
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(bets) { bet ->
                TrackedBetCard(bet)
            }
        }
    }
}

@Composable
fun TrackedBetCard(bet: TrackedBet) {
    val statusColor = when (bet.status) {
        "Won" -> MaterialTheme.colorScheme.primary
        "Lost" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.secondary
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(bet.event, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Badge(containerColor = statusColor.copy(alpha = 0.2f)) {
                    Text(bet.status, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Pick", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(bet.pick, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Stake", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(bet.stake, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Potential Win", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(bet.potentialWin, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                }
            }
            if (bet.profit.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "P/L: ${bet.profit}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = if (bet.profit.startsWith("+")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun BetslipScreen() {
    var betCount by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Filled.Receipt, contentDescription = null, modifier = Modifier.size(72.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(16.dp))
        Text("Your Betslip", fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Add picks from Odds or AI Picks", color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedButton(onClick = { }, shape = RoundedCornerShape(12.dp), modifier = Modifier.height(48.dp)) {
            Text("Browse Picks", fontSize = 15.sp)
        }
    }
}

@Composable
fun EventDetailScreen(eventId: Int, navController: NavHostController) {
    val event = sampleOdds.find { it.id == eventId } ?: sampleOdds.first()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Event Details", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(event.sport, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
                Text(event.team1, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text("vs", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(event.team2, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Text(event.time, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Select Your Bet", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Column {
                Text("${event.team1} ${event.odds1}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
        ) {
            Column {
                Text("${event.team2} ${event.odds2}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        OutlinedButton(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Get AI Analysis", fontSize = 15.sp)
        }
    }
}

@Composable
fun ProfileScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        Box(
            modifier = Modifier.size(80.dp).clip(RoundedCornerShape(40.dp)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text("Bettor", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("Balance: $500.00", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(24.dp))
        listOf("Deposit Funds", "Withdraw", "Bet History", "Settings").forEach { item ->
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
