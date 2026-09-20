package com.marketpicks.app

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
import com.marketpicks.app.ui.theme.MarketPicksTheme

data class Stock(val symbol: String, val name: String, val price: String, val change: String, val changePercent: String, val isUp: Boolean)
data class Holding(val symbol: String, val name: String, val shares: Int, val avgPrice: String, val currentPrice: String, val profit: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MarketPicksTheme {
                MarketPicksApp()
            }
        }
    }
}

@Composable
fun MarketPicksApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomItems = listOf(
        NavBarItem("watchlist", Icons.Filled.Star, "Watchlist"),
        NavBarItem("charts", Icons.Filled.CandlestickChart, "Charts"),
        NavBarItem("portfolio", Icons.Filled.AccountBalance, "Portfolio"),
        NavBarItem("search", Icons.Filled.Search, "Search"),
        NavBarItem("profile", Icons.Filled.Person, "Profile")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("MarketPicks", fontWeight = FontWeight.Bold, fontSize = 22.sp) },
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
            startDestination = "watchlist",
            modifier = Modifier.padding(padding)
        ) {
            composable("watchlist") { WatchlistScreen(navController) }
            composable("charts") { ChartsScreen() }
            composable("portfolio") { PortfolioScreen() }
            composable("search") { SearchScreen() }
            composable("profile") { ProfileScreen() }
            composable("stock_detail/{symbol}") { backStackEntry ->
                val symbol = backStackEntry.arguments?.getString("symbol") ?: "AAPL"
                StockDetailScreen(symbol, navController)
            }
        }
    }
}

data class NavBarItem(val route: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)

val watchlistStocks = listOf(
    Stock("AAPL", "Apple Inc.", "$178.52", "+2.34", "+1.33%", true),
    Stock("GOOGL", "Alphabet Inc.", "$141.80", "-0.92", "-0.64%", false),
    Stock("MSFT", "Microsoft Corp.", "$404.87", "+5.12", "+1.28%", true),
    Stock("AMZN", "Amazon.com Inc.", "$178.25", "+1.87", "+1.06%", true),
    Stock("NVDA", "NVIDIA Corp.", "$875.28", "+12.45", "+1.44%", true),
    Stock("TSLA", "Tesla Inc.", "$193.57", "-3.28", "-1.67%", false),
    Stock("META", "Meta Platforms", "$505.75", "+8.92", "+1.79%", true),
    Stock("JPM", "JPMorgan Chase", "$198.47", "+1.23", "+0.62%", true)
)

val portfolioHoldings = listOf(
    Holding("AAPL", "Apple Inc.", 50, "$165.00", "$178.52", "+$676.00"),
    Holding("MSFT", "Microsoft Corp.", 25, "$380.00", "$404.87", "+$621.75"),
    Holding("NVDA", "NVIDIA Corp.", 15, "$650.00", "$875.28", "+$3,379.20"),
    Holding("GOOGL", "Alphabet Inc.", 30, "$135.00", "$141.80", "+$204.00")
)

@Composable
fun WatchlistScreen(navController: NavHostController) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Watchlist", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("${watchlistStocks.size} stocks", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Market Status", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("S&P 500: 5,021.84", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
                Badge(containerColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.2f)) {
                    Text("Open", color = MaterialTheme.colorScheme.tertiary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(watchlistStocks) { stock ->
                StockRow(stock) { navController.navigate("stock_detail/${stock.symbol}") }
            }
        }
    }
}

@Composable
fun StockRow(stock: Stock, onClick: () -> Unit) {
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
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Text(stock.symbol.take(2), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(stock.symbol, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(stock.name, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(stock.price, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(
                    "${stock.change} (${stock.changePercent})",
                    fontSize = 12.sp,
                    color = if (stock.isUp) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun ChartsScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Charts", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth().height(280.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Box(modifier = Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.CandlestickChart, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("AAPL - Apple Inc.", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("$178.52 (+1.33%)", color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Interactive chart coming soon", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("1D", "1W", "1M", "3M", "1Y", "ALL").forEach { period ->
                FilterChip(
                    selected = period == "1M",
                    onClick = { },
                    label = { Text(period, fontSize = 12.sp) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text("Key Stats", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Open", "$176.18", Modifier.weight(1f))
            StatCard("High", "$179.32", Modifier.weight(1f))
            StatCard("Low", "$175.80", Modifier.weight(1f))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Volume", "58.2M", Modifier.weight(1f))
            StatCard("Mkt Cap", "$2.78T", Modifier.weight(1f))
            StatCard("P/E", "29.1", Modifier.weight(1f))
        }
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

@Composable
fun PortfolioScreen() {
    val totalValue = portfolioHoldings.sumOf { it.shares * it.currentPrice.replace("$", "").replace(",", "").toDouble() }
    val totalProfit = portfolioHoldings.sumOf { it.profit.replace("+", "").replace("$", "").replace(",", "").toDouble() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Portfolio", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(12.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Total Value", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("$${String.format("%,.2f", totalValue)}", fontWeight = FontWeight.Bold, fontSize = 32.sp, color = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "+$${String.format("%,.2f", totalProfit)} (+4.82%) today",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.tertiary,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Holdings", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(portfolioHoldings) { holding ->
                HoldingCard(holding)
            }
        }
    }
}

@Composable
fun HoldingCard(holding: Holding) {
    val isUp = holding.profit.startsWith("+")
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Text(holding.symbol.take(2), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(holding.symbol, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text("${holding.shares} shares @ ${holding.avgPrice}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(holding.currentPrice, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(holding.profit, fontSize = 13.sp, color = if (isUp) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun SearchScreen() {
    var searchQuery by remember { mutableStateOf("") }
    val searchResults = watchlistStocks.filter {
        it.symbol.contains(searchQuery, ignoreCase = true) || it.name.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Search Stocks", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search by symbol or name") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            shape = RoundedCornerShape(12.dp),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (searchQuery.isNotEmpty()) {
            Text("${searchResults.size} results", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(8.dp))
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(if (searchQuery.isEmpty()) watchlistStocks.take(4) else searchResults) { stock ->
                StockRow(stock) { }
            }
        }
    }
}

@Composable
fun StockDetailScreen(symbol: String, navController: NavHostController) {
    val stock = watchlistStocks.find { it.symbol == symbol } ?: watchlistStocks.first()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Stock Detail", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Text(stock.symbol.take(2), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(stock.symbol, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(stock.name, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(stock.price, fontWeight = FontWeight.Bold, fontSize = 36.sp)
        Text(
            "${stock.change} (${stock.changePercent})",
            fontSize = 16.sp,
            color = if (stock.isUp) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth().height(180.dp),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.CandlestickChart, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Price Chart", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Filled.Star, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Add to Watchlist", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Filled.ShoppingCart, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Buy", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
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
        Text("Investor", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("Premium Plan", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(24.dp))
        listOf("Account Settings", "Linked Brokers", "Notifications", "Help & Support").forEach { item ->
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
