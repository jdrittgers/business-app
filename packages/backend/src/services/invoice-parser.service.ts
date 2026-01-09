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
    this.anthropic = new Anthropic({ apiKey });
  }

  async parseInvoice(filePath: string, mimeType: string): Promise<ParsedInvoiceData> {
    try {
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Prepare media type for Claude
      const mediaType = this.getClaudeMediaType(mimeType);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
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
          ]
        }]
      });

      // Extract text response
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude API');
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from Claude response');
      }

      const parsedData: ParsedInvoiceData = JSON.parse(jsonMatch[0]);

      // Validate parsed data
      if (!parsedData.lineItems || parsedData.lineItems.length === 0) {
        throw new Error('No line items found in invoice');
      }

      return parsedData;

    } catch (error) {
      console.error('Invoice parsing error:', error);
      throw new Error(`Failed to parse invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getClaudeMediaType(mimeType: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
    if (mimeType === 'image/jpg' || mimeType === 'image/jpeg') return 'image/jpeg';
    if (mimeType === 'image/png') return 'image/png';
    if (mimeType === 'application/pdf') return 'image/jpeg'; // PDF will need conversion
    throw new Error(`Unsupported mime type: ${mimeType}`);
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
      "unit": "LB|GAL|BAG",
      "pricePerUnit": 0.50,
      "totalPrice": 500.00
    }
  ]
}

Rules:
- Use best judgment for product type based on name
- Normalize units to: LB (pounds), GAL (gallons), BAG (bags/units)
- Extract numeric values only (remove $ and commas)
- If date format is unclear, use YYYY-MM-DD
- If information is missing, omit the field or use null
- Return valid JSON only - NO markdown, NO code blocks, NO explanation text`;
  }
}
