import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

interface ParsedInvoiceData {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  lineItems: ParsedLineItem[];
}

interface ParsedLineItem {
  productType: 'FERTILIZER' | 'CHEMICAL' | 'SEED';
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  ratePerAcre?: number;  // Application rate (e.g., 2 oz/acre)
  rateUnit?: string;     // Unit for rate (OZ, PT, QT, GAL, LB)
  commodityType?: 'CORN' | 'SOYBEANS' | 'WHEAT';  // For SEED items only
}

export class InvoiceParserService {
  private anthropic: Anthropic | null = null;

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable not configured');
      }
      console.log('[InvoiceParser] Initializing with API key:', apiKey.substring(0, 10) + '...');
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  async parseInvoice(filePath: string, mimeType: string): Promise<ParsedInvoiceData> {
    const anthropic = this.getAnthropicClient();
    try {
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Prepare media type for Claude
      const mediaType = this.getClaudeMediaType(mimeType);

      console.log('[InvoiceParser] Calling Claude API with model: claude-sonnet-4-20250514');
      console.log('[InvoiceParser] File type:', mimeType, 'Media type:', mediaType);

      // Build content array with proper types
      const isPdf = mimeType === 'application/pdf';
      const contentBlocks: any[] = [
        isPdf ? {
          type: 'document',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        } : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        },
        {
          type: 'text',
          text: this.getParsingPrompt()
        }
      ];

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: contentBlocks
        }]
      });

      // Extract text response
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude API');
      }

      // Parse JSON response
      console.log('[InvoiceParser] Raw Claude response:', textContent.text);

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[InvoiceParser] Could not extract JSON from response:', textContent.text);
        throw new Error('Could not extract JSON from Claude response');
      }

      console.log('[InvoiceParser] Extracted JSON:', jsonMatch[0]);

      const parsedData: ParsedInvoiceData = JSON.parse(jsonMatch[0]);

      console.log('[InvoiceParser] Parsed data:', JSON.stringify(parsedData, null, 2));

      // Validate parsed data
      if (!parsedData.lineItems || parsedData.lineItems.length === 0) {
        console.error('[InvoiceParser] No line items in parsed data:', parsedData);
        throw new Error('No line items found in invoice');
      }

      console.log('[InvoiceParser] Successfully parsed', parsedData.lineItems.length, 'line items');

      return parsedData;

    } catch (error) {
      console.error('Invoice parsing error:', error);
      throw new Error(`Failed to parse invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getClaudeMediaType(mimeType: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf' {
    if (mimeType === 'image/jpg' || mimeType === 'image/jpeg') return 'image/jpeg';
    if (mimeType === 'image/png') return 'image/png';
    if (mimeType === 'image/webp') return 'image/webp';
    if (mimeType === 'image/gif') return 'image/gif';
    if (mimeType === 'application/pdf') return 'application/pdf';

    throw new Error(`Unsupported mime type: ${mimeType}. Supported formats: JPG, PNG, WEBP, GIF, PDF`);
  }

  private getParsingPrompt(): string {
    return `You are an agricultural invoice parser. Extract structured data from this invoice image/PDF.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.

Identify the product type for each line item:
- FERTILIZER: MAP, DAP, MESZ, POTASH, LIME, UREA, UAN, SULFUR, Anhydrous Ammonia, etc.
- CHEMICAL: Herbicides, pesticides, fungicides, insecticides (Roundup, Liberty, Atrazine, 2,4-D, Glyphosate, etc.)
- SEED: Corn seed, soybean seed, wheat seed, hybrid names, variety names

Extract:
{
  "vendorName": "Company name",
  "invoiceNumber": "Invoice number",
  "invoiceDate": "YYYY-MM-DD",
  "totalAmount": 12345.67,
  "lineItems": [
    {
      "productType": "FERTILIZER|CHEMICAL|SEED",
      "productName": "Product name/hybrid number",
      "quantity": 1000,
      "unit": "TON|LB|GAL|BAG",
      "pricePerUnit": 0.50,
      "totalPrice": 500.00,
      "ratePerAcre": 2.5,
      "rateUnit": "OZ|PT|QT|GAL|LB",
      "commodityType": "CORN|SOYBEANS|WHEAT"
    }
  ]
}

Rules:
- Use best judgment for product type based on name
- Normalize units to: TON (tons), LB (pounds), GAL (gallons), BAG (bags/units)
- Extract numeric values only (remove $ and commas)
- If date format is unclear, use YYYY-MM-DD
- If information is missing, omit the field or use null
- For chemicals, look for application rate info (e.g., "2 oz/acre", "1 pt/acre", "32 oz/A")
- ratePerAcre is the numeric rate, rateUnit is OZ, PT, QT, GAL, or LB
- Return valid JSON only - NO markdown, NO code blocks, NO explanation text

CRITICAL - PRICING:
- ALWAYS use the NET/DISCOUNTED price, NOT the list price or MSRP
- Agricultural invoices often show: List Price -> Discounts -> Net Price
- Look for columns labeled: "Net", "Net Price", "Extended", "Total", "Amount Due", "Discounted Price", "Your Price", "Final Price"
- If you see both a list price and a discounted/net price, USE THE LOWER DISCOUNTED PRICE
- For seed invoices, use the price AFTER any early order discounts, replant discounts, volume discounts, or dealer discounts
- The pricePerUnit should be calculated from the net/discounted total, not the list price
- If totalPrice shows a discounted amount, calculate pricePerUnit = totalPrice / quantity

CRITICAL - SEED COMMODITY TYPE:
For SEED items, you MUST identify the commodityType field as CORN, SOYBEANS, or WHEAT.
Look for these clues on the invoice:
- Section headers like "CORN SEED", "SOYBEAN SEED", "SOY", "WHEAT SEED"
- Product descriptions containing "corn", "soybean", "soy", "wheat"
- Brand patterns:
  * CORN: DeKalb (DKC62-08), Pioneer 4-digit (P1197, P0987), NK corn, LG corn
  * SOYBEANS: Asgrow (AG36X6), Pioneer with X trait (P21A50X), NK soybeans (NKS30-T8), Credenz, Xitavo, Golden Harvest soybeans
  * WHEAT: Any wheat variety names
- Seed count per bag: Corn ~80,000 seeds/bag, Soybeans ~140,000 seeds/bag
- Invoice sections or groupings that indicate the crop type
- ALWAYS set commodityType for SEED items - never leave it blank`;
  }
}
