import { apiRequest } from '@/api/api-client';
import {
    parseExchangeRateSnapshot,
    type ExchangeRateSnapshot,
} from '@/models/exchange-rate-snapshot';

export async function fetchExchangeRateSnapshot():
  Promise<ExchangeRateSnapshot> {
  const response = await apiRequest('/api/exchange-rates');

  return parseExchangeRateSnapshot(response);
}