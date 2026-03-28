import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import FastImage from 'react-native-fast-image';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';
import { apiGet } from '../../services/api';

const PRODUCT_TYPES = [
  { key: 'all', icon: '🌐', label: 'All' },
  { key: 'digital', icon: '💾', label: 'Digital' },
  { key: 'physical', icon: '📦', label: 'Physical' },
  { key: 'service', icon: '🛠️', label: 'Services' },
  { key: 'nft', icon: '🖼️', label: 'NFTs' },
];

function ProductCard({ product }: { product: any }) {
  const piPrice = (Number(product.priceMicroPi) / 1_000_000).toFixed(4);
  const cdnBase = process.env.EXPO_PUBLIC_CDN_URL || '';
  const imageUrl = product.mediaKeys?.[0] ? `${cdnBase}/${product.mediaKeys[0]}` : null;

  return (
    <TouchableOpacity style={styles.productCard} onPress={() => router.push(`/marketplace/${product.id}`)} activeOpacity={0.85}>
      <View style={styles.productImageWrap}>
        {imageUrl ? (
          <FastImage source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#1A1A1A', '#111']} style={styles.productImagePlaceholder}>
            <Text style={styles.productTypeBig}>
              {PRODUCT_TYPES.find(t => t.key === product.productType)?.icon || '📦'}
            </Text>
          </LinearGradient>
        )}
        {product.boostedUntil && new Date(product.boostedUntil) > new Date() && (
          <View style={styles.boostBadge}><Text style={styles.boostText}>⚡ Boosted</Text></View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <View style={styles.sellerRow}>
          <FastImage
            source={{ uri: `https://ui-avatars.com/api/?name=${product.seller.displayName}&background=FF6B2B&color=fff&size=24` }}
            style={styles.sellerAvatar}
          />
          <Text style={styles.sellerName}>@{product.seller.piUsername}</Text>
          {product.seller.isVerified && <Text style={styles.verifiedMark}>✓</Text>}
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.piPrice}>π{piPrice}</Text>
            <Text style={styles.salesCount}>{product.totalSales} sold</Text>
          </View>
          {product.avgRating > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.ratingText}>{product.avgRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', debouncedQuery, activeType],
    queryFn: () => apiGet(`/marketplace/products?q=${debouncedQuery}&type=${activeType === 'all' ? '' : activeType}`),
    staleTime: 60_000,
  });

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce
    setTimeout(() => setDebouncedQuery(text), 400);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛍️ Spyce Market</Text>
        <TouchableOpacity style={styles.sellBtn} onPress={() => router.push('/marketplace/create')}>
          <Text style={styles.sellBtnText}>+ Sell</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search products..."
          placeholderTextColor="#FFFFFF33"
        />
      </View>

      {/* Type Filter */}
      <FlatList
        horizontal
        data={PRODUCT_TYPES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFilterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.typeChip, activeType === item.key && styles.typeChipActive]}
            onPress={() => setActiveType(item.key)}
          >
            <Text style={styles.typeIcon}>{item.icon}</Text>
            <Text style={[styles.typeLabel, activeType === item.key && styles.typeLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.typeFilter}
      />

      {/* Product Grid */}
      {isLoading ? (
        <ActivityIndicator color="#FF6B2B" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySub}>Be the first to sell on Spyce Market!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sellBtn: { backgroundColor: '#FF6B2B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  sellBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  typeFilter: { maxHeight: 46 },
  typeFilterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#333' },
  typeChipActive: { backgroundColor: '#FF6B2B22', borderColor: '#FF6B2B' },
  typeIcon: { fontSize: 13 },
  typeLabel: { color: '#FFFFFF66', fontSize: 12, fontWeight: '600' },
  typeLabelActive: { color: '#FF6B2B' },
  gridContent: { padding: 12, gap: 8 },
  gridRow: { gap: 8 },
  productCard: { flex: 1, backgroundColor: '#141414', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E1E1E' },
  productImageWrap: { position: 'relative' },
  productImage: { width: '100%', height: 160 },
  productImagePlaceholder: { height: 160, alignItems: 'center', justifyContent: 'center' },
  productTypeBig: { fontSize: 48 },
  boostBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF6B2B', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  boostText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  productInfo: { padding: 10 },
  productTitle: { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  sellerAvatar: { width: 16, height: 16, borderRadius: 8 },
  sellerName: { color: '#FFFFFF66', fontSize: 11 },
  verifiedMark: { color: '#FF6B2B', fontSize: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  piPrice: { color: '#FFD700', fontWeight: '800', fontSize: 15 },
  salesCount: { color: '#FFFFFF44', fontSize: 10, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starIcon: { fontSize: 12 },
  ratingText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#FFFFFF55', fontSize: 13, marginTop: 6 },
});
