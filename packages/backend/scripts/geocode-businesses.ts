import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function geocodeBusinesses() {
  try {
    // Find all businesses with zipCode but no coordinates
    const businesses = await prisma.business.findMany({
      where: {
        zipCode: { not: null },
        OR: [
          { latitude: null },
          { longitude: null }
        ]
      }
    });

    console.log(`Found ${businesses.length} businesses to geocode`);

    for (const business of businesses) {
      console.log(`\nGeocoding ${business.name} (ZIP: ${business.zipCode})...`);

      try {
        const response = await axios.get(
          'https://api.mapbox.com/search/geocode/v6/forward',
          {
            params: {
              q: business.zipCode,
              country: 'US',
              types: 'postcode',
              access_token: process.env.MAPBOX_API_KEY
            }
          }
        );

        if (response.data.features && response.data.features.length > 0) {
          const [longitude, latitude] = response.data.features[0].geometry.coordinates;

          await prisma.business.update({
            where: { id: business.id },
            data: {
              latitude,
              longitude
            }
          });

          console.log(`✓ Updated ${business.name}: lat=${latitude}, lon=${longitude}`);
        } else {
          console.log(`✗ No coordinates found for ZIP ${business.zipCode}`);
        }
      } catch (error: any) {
        console.error(`✗ Error geocoding ${business.name}:`, error.message);
      }

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✓ Geocoding complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

geocodeBusinesses();
