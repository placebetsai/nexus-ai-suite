import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';

const categories = ['All', 'Bags', 'Shoes', 'Clothing', 'Accessories', 'Vintage'];

const products = [
  { id: '1', name: 'Vintage Chanel Bag', price: '$1,850', seller: '@fashionista_jane', category: 'Bags', condition: 'Excellent' },
  { id: '2', name: 'Gucci Ace Sneakers', price: '$420', seller: '@sneakerqueen', category: 'Shoes', condition: 'New' },
  { id: '3', name: 'Silk Hermes Scarf', price: '$290', seller: '@luxuryfinds', category: 'Accessories', condition: 'Like New' },
  { id: '4', name: 'YSL Blazer', price: '$680', seller: '@designerdeals', category: 'Clothing', condition: 'Good' },
  { id: '5', name: 'Prada Nylon Bag', price: '$520', seller: '@vintagevibes', category: 'Bags', condition: 'Excellent' },
  { id: '6', name: 'Balenciaga Track Boots', price: '$890', seller: '@streetwearking', category: 'Shoes', condition: 'New' },
];

export default function MarketplaceScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = products.filter(
    (p) =>
      (activeCategory === 'All' || p.category === activeCategory) &&
      (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search luxury finds..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.categories}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{filtered.length} items found</Text>
          <TouchableOpacity style={styles.sortBtn}>
            <Text style={styles.sortText}>{'\u21C5'} Sort</Text>
          </TouchableOpacity>
        </View>

        {filtered.map((product) => (
          <TouchableOpacity key={product.id} style={styles.productCard}>
            <View style={styles.productImage}>
              <Text style={styles.productEmoji}>{'\uD83D\uDDBC\uFE0F'}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSeller}>{product.seller}</Text>
              <View style={styles.productMeta}>
                <Text style={styles.productCondition}>{product.condition}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
            </View>
            <Text style={styles.productPrice}>{product.price}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.sellBanner}>
          <Text style={styles.sellBannerText}>{'\uD83D\uDCBC'} List Your Item</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: { fontSize: 18, marginRight: 10, color: '#666' },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 14, fontSize: 15 },
  categories: { paddingHorizontal: 16, paddingVertical: 12 },
  categoryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 10,
  },
  categoryBtnActive: { backgroundColor: '#E91E63' },
  categoryText: { color: '#999', fontSize: 13, fontWeight: '500' },
  categoryTextActive: { color: '#fff' },
  productList: { flex: 1, paddingHorizontal: 16 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCount: { color: '#666', fontSize: 13 },
  sortBtn: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: '#E91E63', fontSize: 13, fontWeight: '600' },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productEmoji: { fontSize: 28 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  productSeller: { fontSize: 12, color: '#E91E63', marginTop: 4 },
  productMeta: { flexDirection: 'row', marginTop: 8, gap: 8 },
  productCondition: {
    fontSize: 10,
    color: '#4CAF50',
    backgroundColor: '#4CAF5022',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  productCategory: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sellBanner: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  sellBannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
