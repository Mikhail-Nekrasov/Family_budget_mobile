import { apiRequest } from '@/api/api-client';
import {
    parseHistoricalRates,
    type HistoricalRateResponse,
} from '@/models/historical-exchange-rate';

export async function fetchHistoricalRates(
  date: string,
  currencies: readonly string[],
): Promise<HistoricalRateResponse> {
  const codes = [...new Set(currencies)].sort();
  const query = new URLSearchParams({
    date,
    currencies: codes.join(','),
  });
  const response = await apiRequest(`/api/exchange-rates/history?${query}`);
  return parseHistoricalRates(response, date, codes);
}
