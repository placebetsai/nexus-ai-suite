package com.fashionistas.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.fashionistas.app.ui.theme.FashionistasTheme

data class ClosetItem(val id: Int, val name: String, val type: String, val color: Color, val price: String)
data class MarketItem(val id: Int, val name: String, val seller: String, val price: String, val rating: Float)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FashionistasTheme {
                FashionistasApp()
            }
        }
    }
}

@Composable
fun FashionistasApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomItems = listOf(
        NavBarItem("closet", Icons.Filled.Checkroom, "Closet"),
        NavBarItem("camera", Icons.Filled.CameraAlt, "Camera"),
        NavBarItem("marketplace", Icons.Filled.Store, "Marketplace"),
        NavBarItem("outfits", Icons.Filled.Style, "Outfits"),
        NavBarItem("profile", Icons.Filled.Person, "Profile")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fashionistas", fontWeight = FontWeight.Bold, fontSize = 22.sp) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Filled.Notifications, contentDescription = "Notifications")
                    }
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
            startDestination = "closet",
            modifier = Modifier.padding(padding)
        ) {
            composable("closet") { ClosetScreen(navController) }
            composable("camera") { CameraScreen() }
            composable("marketplace") { MarketplaceScreen(navController) }
            composable("outfits") { OutfitsScreen() }
            composable("profile") { ProfileScreen() }
            composable("item_detail/{itemId}") { backStackEntry ->
                val itemId = backStackEntry.arguments?.getString("itemId")?.toIntOrNull() ?: 1
                ItemDetailScreen(itemId, navController)
            }
        }
    }
}

data class NavBarItem(val route: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)

val closetItems = listOf(
    ClosetItem(1, "Vintage Leather Jacket", "Outerwear", Color(0xFF8B4513), "$120"),
    ClosetItem(2, "White Sneakers", "Shoes", Color(0xFFF5F5DC), "$85"),
    ClosetItem(3, "Denim Jeans", "Pants", Color(0xFF4169E1), "$45"),
    ClosetItem(4, "Black T-Shirt", "Tops", Color(0xFF2F2F2F), "$20"),
    ClosetItem(5, "Silk Scarf", "Accessories", Color(0xFFFFB6C1), "$35"),
    ClosetItem(6, "Canvas Backpack", "Bags", Color(0xFF8FBC8F), "$55"),
    ClosetItem(7, "Sunglasses", "Accessories", Color(0xFF2F2F4F), "$60"),
    ClosetItem(8, "Running Shorts", "Activewear", Color(0xFF4682B4), "$25")
)

val marketItems = listOf(
    MarketItem(1, "Designer Handbag", "StyleQueen", "$299", 4.8f),
    MarketItem(2, "Vintage Boots", "RetroFinds", "$145", 4.5f),
    MarketItem(3, "Gold Necklace", "LuxeGems", "$89", 4.9f),
    MarketItem(4, "Linen Shirt", "CasualCo", "$38", 4.3f),
    MarketItem(5, "Wool Beanie", "WinterWear", "$22", 4.6f)
)

data class NavBarItem2(val route: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)

@Composable
fun ClosetScreen(navController: NavHostController) {
    var syncState by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("My Closet (${closetItems.size} items)", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Button(
                onClick = { syncState = !syncState },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (syncState) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                )
            ) {
                Icon(Icons.Filled.Sync, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(if (syncState) "Synced" else "Sync with Marketplace", fontSize = 13.sp)
            }
        }

        if (syncState) {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Closet synced with marketplace", fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(closetItems) { item ->
                ClosetItemCard(item) {
                    navController.navigate("item_detail/${item.id}")
                }
            }
        }
    }
}

@Composable
fun ClosetItemCard(item: ClosetItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(item.color.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Checkroom, contentDescription = null, tint = item.color, modifier = Modifier.size(28.dp))
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(item.type, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(item.price, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                Text("In Closet", fontSize = 11.sp, color = Color(0xFF4CAF50))
            }
        }
    }
}

@Composable
fun CameraScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(140.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.CameraAlt, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(modifier = Modifier.height(20.dp))
        Text("Snap Your Outfit", fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Take a photo of your outfit or browse fashion looks", color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = { },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.height(50.dp).fillMaxWidth(0.6f)
        ) {
            Icon(Icons.Filled.CameraAlt, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Open Camera", fontSize = 16.sp)
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(
            onClick = { },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.height(50.dp).fillMaxWidth(0.6f)
        ) {
            Icon(Icons.Filled.PhotoLibrary, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Gallery", fontSize = 16.sp)
        }
    }
}

@Composable
fun MarketplaceScreen(navController: NavHostController) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Marketplace", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Discover and shop trending fashion", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(selected = true, onClick = { }, label = { Text("All") })
            FilterChip(selected = false, onClick = { }, label = { Text("Tops") })
            FilterChip(selected = false, onClick = { }, label = { Text("Shoes") })
            FilterChip(selected = false, onClick = { }, label = { Text("Accessories") })
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(marketItems) { item ->
                MarketItemCard(item)
            }
        }
    }
}

@Composable
fun MarketItemCard(item: MarketItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Box(
                modifier = Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.ShoppingBag, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(item.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    Text("by ${item.seller}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(item.price, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("${item.rating}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun OutfitsScreen() {
    val outfits = listOf("Casual Friday", "Date Night", "Workout Ready", "Beach Vibes")
    Column(modifier = Modifier.padding(16.dp)) {
        Text("My Outfits", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(12.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(outfits) { outfit ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Style, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(outfit, fontWeight = FontWeight.Medium)
                    }
                }
            }
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
            modifier = Modifier.size(80.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text("Fashionista", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("@styleguru", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(24.dp))
        listOf("Wardrobe Stats", "Style Insights", "Favorites", "Settings").forEach { item ->
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
fun ItemDetailScreen(itemId: Int, navController: NavHostController) {
    val item = closetItems.find { it.id == itemId } ?: closetItems.first()
    var showSellDialog by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Item Details", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Box(
            modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)).background(item.color.copy(alpha = 0.25f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Checkroom, contentDescription = null, tint = item.color, modifier = Modifier.size(64.dp))
        }

        Spacer(modifier = Modifier.height(20.dp))
        Text(item.name, fontWeight = FontWeight.Bold, fontSize = 24.sp)
        Text(item.type, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Condition: Like New", fontSize = 13.sp, color = Color(0xFF4CAF50))
        Text(item.price, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { showSellDialog = true },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
        ) {
            Icon(Icons.Filled.AttachMoney, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sell This Item", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = { },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Filled.Style, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Add to Outfit", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }
    }

    if (showSellDialog) {
        AlertDialog(
            onDismissRequest = { showSellDialog = false },
            title = { Text("Sell on Marketplace") },
            text = { Text("List '${item.name}' on the marketplace? You can set the price and condition.") },
            confirmButton = {
                TextButton(onClick = { showSellDialog = false }) { Text("List Item") }
            },
            dismissButton = {
                TextButton(onClick = { showSellDialog = false }) { Text("Cancel") }
            }
        )
    }
}
