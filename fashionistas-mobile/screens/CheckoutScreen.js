import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';

export default function CheckoutScreen() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const scaleAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(0);

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      setExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
    } else {
      setExpiry(cleaned);
    }
  };

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 2000);
  };

  const reset = () => {
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setName('');
    setSuccess(false);
    scaleAnim.setValue(1);
    fadeAnim.setValue(0);
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Animated.View style={[styles.successContent, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <Text style={styles.successIcon}>{'\u2705'}</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successAmount}>$2,450.00</Text>
          <Text style={styles.successItem}>GG Marmont Bag</Text>
          <Text style={styles.successSubtext}>Order confirmed. Shipping in 2-3 days.</Text>

          <View style={styles.orderDetails}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Order ID</Text>
              <Text style={styles.orderValue}>#FSH-2026-0847</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Payment</Text>
              <Text style={styles.orderValue}>**** 4242</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Status</Text>
              <Text style={[styles.orderValue, { color: '#4CAF50' }]}>Confirmed</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.continueBtn} onPress={reset}>
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Complete your purchase</Text>
      </View>

      <View style={styles.orderSummary}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryItem}>
          <View style={styles.summaryImage}>
            <Text>{'\uD83D\uDC5C'}</Text>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryName}>GG Marmont Bag</Text>
            <Text style={styles.summarySeller}>@luxury授权店</Text>
          </View>
          <Text style={styles.summaryPrice}>$2,450</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>$2,450.00</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>Free</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#fff' }]}>Total</Text>
          <Text style={[styles.summaryValue, { fontWeight: 'bold', color: '#E91E63', fontSize: 20 }]}>
            $2,450.00
          </Text>
        </View>
      </View>

      <View style={styles.paymentForm}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <Text style={styles.fakeNotice}>{'\u26A0\uFE0F'} Demo mode - No real payment processed</Text>

        <Text style={styles.inputLabel}>Cardholder Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Jane Fashionista"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.inputLabel}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor="#555"
          value={cardNumber}
          onChangeText={formatCardNumber}
          keyboardType="numeric"
          maxLength={19}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Expiry</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              placeholderTextColor="#555"
              value={expiry}
              onChangeText={formatExpiry}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              placeholderTextColor="#555"
              value={cvv}
              onChangeText={setCvv}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.payBtn, processing && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={processing}
        >
          <Text style={styles.payBtnText}>
            {processing ? 'Processing...' : 'Pay Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  orderSummary: {
    margin: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center' },
  summaryImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryInfo: { flex: 1 },
  summaryName: { fontSize: 15, color: '#fff', fontWeight: '600' },
  summarySeller: { fontSize: 12, color: '#E91E63', marginTop: 4 },
  summaryPrice: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { color: '#999', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14 },
  paymentForm: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  fakeNotice: {
    color: '#FF9800',
    fontSize: 12,
    backgroundColor: '#FF980022',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: { color: '#999', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0f0f23',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  payBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  payBtnDisabled: { backgroundColor: '#999' },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  successContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  successContent: { alignItems: 'center' },
  successIcon: { fontSize: 80, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  successAmount: { fontSize: 36, fontWeight: 'bold', color: '#E91E63', marginTop: 16 },
  successItem: { fontSize: 16, color: '#ccc', marginTop: 8 },
  successSubtext: { fontSize: 13, color: '#666', marginTop: 8 },
  orderDetails: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  orderLabel: { color: '#999', fontSize: 14 },
  orderValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  continueBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
