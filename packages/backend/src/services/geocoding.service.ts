import axios from 'axios';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export class GeocodingService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENCAGE_API_KEY || '';
    this.baseUrl = 'https://api.opencagedata.com/geocode/v1/json';

    if (!this.apiKey) {
      console.warn('⚠️  OPENCAGE_API_KEY not set. Geocoding will fail.');
    }
  }

  /**
   * Geocode a US ZIP code to latitude/longitude
   * @param zipCode - 5-digit US ZIP code
   * @returns GeocodeResult with lat/lng
   */
  async geocodeZipCode(zipCode: string): Promise<GeocodeResult> {
    if (!this.apiKey) {
      throw new Error('Geocoding API key not configured');
    }

    // Validate ZIP code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      throw new Error('Invalid ZIP code format. Must be 5 digits (e.g., 43062)');
    }

    // Extract 5-digit ZIP (remove +4 extension if present)
    const zip5 = zipCode.split('-')[0];

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: `${zip5}, USA`,
          key: this.apiKey,
          countrycode: 'us',
          no_annotations: 1,
          limit: 1
        },
        timeout: 5000
      });

      if (response.data.results.length === 0) {
        throw new Error(`No results found for ZIP code: ${zip5}`);
      }

      const result = response.data.results[0];

      return {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        formattedAddress: result.formatted
      };
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Geocoding API quota exceeded. Please try again later.');
      }
      if (error.response?.status === 403) {
        throw new Error('Geocoding API key invalid or suspended.');
      }

      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode ZIP code: ${error.message}`);
    }
  }

  /**
   * Batch geocode multiple ZIP codes (with rate limiting)
   * Used for backfilling existing data
   */
  async geocodeZipCodeBatch(zipCodes: string[]): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();

    // Rate limit: 1 request per second for free tier
    for (const zipCode of zipCodes) {
      try {
        const result = await this.geocodeZipCode(zipCode);
        results.set(zipCode, result);

        // Wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to geocode ${zipCode}:`, error);
        // Continue with other ZIP codes
      }
    }

    return results;
  }
}
