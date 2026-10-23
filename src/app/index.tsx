import { useState } from 'react';
import { Button, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function addIncome() {
    const normalizedAmount = amount.trim().replace(',', '.');

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Enter an amount with up to two decimal places.');
      return;
    }

    const value = Number(normalizedAmount);

    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setBalance((currentBalance) => currentBalance + value);
    setAmount('');
    setError('');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title">Family Budget</ThemedText>

        <ThemedText>
          Track your income and expenses.
        </ThemedText>

        <ThemedView style={styles.balance}>
          <ThemedText>Total balance</ThemedText>
          <ThemedText type="title">{balance.toFixed(2)}</ThemedText>
        </ThemedView>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          placeholderTextColor="#888888"
          keyboardType="decimal-pad"
          accessibilityLabel="Income amount"
        />

        {error !== '' && (
          <ThemedText style={styles.error}>{error}</ThemedText>
        )}

        <Button title="Add income" onPress={addIncome} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  balance: {
    marginTop: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 16,
    gap: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#172033',
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
  },
  error: {
    color: '#C62828',
  },
});