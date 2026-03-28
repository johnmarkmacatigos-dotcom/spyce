import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { createPiPayment } from '../services/piAuth';

export function MarketplaceScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();

  const { data: products, isLoading } = useQuery({
    queryKey: ['marketplace', search, category],
    queryFn: () => api.marketplace.search(search, { category }).then(r => r.data),
    enabled: true,
  });

  const categories = ['All', 'digital', 'physical', 'service', 'nft'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Spyce Shop</Text>
        <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.push('CreateProduct')}>
          <Text style={styles.sellBtnText}>+ Sell</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search products..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.catRow}>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[styles.catBtn, (c === 'All' ? !category : category === c) && styles.catBtnActive]} onPress={() => setCategory(c === 'All' ? undefined : c)}>
            <Text style={styles.catText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products ?? []}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.push('ProductDetail', { productId: item.id })} />
        )}
      />
    </SafeAreaView>
  );
}

function ProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const pricePi = Number(product.priceMicroPi) / 1_000_000;
  const firstImage = product.mediaKeys?.[0];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {firstImage ? (
        <Image source={{ uri: `https://YOUR_CLOUDFRONT_DOMAIN/${firstImage}` }} style={styles.cardImg} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}><Text style={{ fontSize: 40 }}>📦</Text></View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{product.title}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>{pricePi.toFixed(2)} π</Text>
          <Text style={styles.cardRating}>⭐ {product.avgRating?.toFixed(1) ?? 'New'}</Text>
        </View>
        <Text style={styles.sellerName}>@{product.seller?.piUsername}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sellBtn: { backgroundColor: '#FF6B2B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sellBtnText: { color: '#fff', fontWeight: '700' },
  search: { marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', marginBottom: 12 },
  catRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)' },
  catBtnActive: { backgroundColor: '#FF6B2B' },
  catText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  grid: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' },
  cardImg: { width: '100%', aspectRatio: 1, resizeMode: 'cover' },
  cardImgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  cardInfo: { padding: 10, gap: 4 },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { color: '#FF6B2B', fontWeight: '800', fontSize: 14 },
  cardRating: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  sellerName: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
});