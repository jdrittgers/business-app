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
}

export class InvoiceParserService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not configured');
    }
    console.log('[InvoiceParser] Initializing with API key:', apiKey.substring(0, 10) + '...');
    this.anthropic = new Anthropic({ apiKey });
  }

  async parseInvoice(filePath: string, mimeType: string): Promise<ParsedInvoiceData> {
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

      const response = await this.anthropic.messages.create({
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
      "productName": "Product name",
      "quantity": 1000,
      "unit": "TON|LB|GAL|BAG",
      "pricePerUnit": 0.50,
      "totalPrice": 500.00
    }
  ]
}

Rules:
- Use best judgment for product type based on name
- Normalize units to: TON (tons), LB (pounds), GAL (gallons), BAG (bags/units)
- Extract numeric values only (remove $ and commas)
- If date format is unclear, use YYYY-MM-DD
- If information is missing, omit the field or use null
- Return valid JSON only - NO markdown, NO code blocks, NO explanation text`;
  }
}
