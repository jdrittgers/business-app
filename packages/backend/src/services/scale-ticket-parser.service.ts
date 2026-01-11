import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

interface ParsedScaleTicketData {
  loadNumber?: string;
  ticketDate?: string;
  netBushels?: number;
  moisture?: number;
  testWeight?: number;
  commodityType?: 'CORN' | 'SOYBEANS' | 'WHEAT';
  buyer?: string;
}

export class ScaleTicketParserService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not configured');
    }
    console.log('[ScaleTicketParser] Initializing with API key:', apiKey.substring(0, 10) + '...');
    this.anthropic = new Anthropic({ apiKey });
  }

  async parseScaleTicket(filePath: string, mimeType: string): Promise<ParsedScaleTicketData> {
    try {
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Prepare media type for Claude
      const mediaType = this.getClaudeMediaType(mimeType);

      console.log('[ScaleTicketParser] Calling Claude API with model: claude-sonnet-4-20250514');
      console.log('[ScaleTicketParser] File type:', mimeType, 'Media type:', mediaType);

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
      console.log('[ScaleTicketParser] Raw Claude response:', textContent.text);

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[ScaleTicketParser] Could not extract JSON from response:', textContent.text);
        throw new Error('Could not extract JSON from Claude response');
      }

      console.log('[ScaleTicketParser] Extracted JSON:', jsonMatch[0]);

      const parsedData: ParsedScaleTicketData = JSON.parse(jsonMatch[0]);

      console.log('[ScaleTicketParser] Parsed data:', JSON.stringify(parsedData, null, 2));

      // Validate parsed data
      if (!parsedData.netBushels || parsedData.netBushels <= 0) {
        console.error('[ScaleTicketParser] Invalid or missing netBushels in parsed data:', parsedData);
        throw new Error('Could not extract net bushels from scale ticket');
      }

      console.log('[ScaleTicketParser] Successfully parsed scale ticket');

      return parsedData;

    } catch (error) {
      console.error('Scale ticket parsing error:', error);
      throw new Error(`Failed to parse scale ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    return `You are a scale ticket parser for agricultural grain sales. Extract structured data from this scale ticket image/PDF.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.

Identify the commodity type:
- CORN: Corn, Maize
- SOYBEANS: Soybeans, Soy, SB
- WHEAT: Wheat, Wht

Extract:
{
  "loadNumber": "Ticket/Load number",
  "ticketDate": "YYYY-MM-DD",
  "netBushels": 1000.00,
  "moisture": 15.5,
  "testWeight": 56.0,
  "commodityType": "CORN|SOYBEANS|WHEAT",
  "buyer": "Elevator/Buyer name"
}

Rules:
- netBushels: Net weight in bushels (required - this is critical)
- moisture: Moisture percentage (e.g., 15.5 for 15.5%)
- testWeight: Test weight in pounds per bushel
- commodityType: Best guess based on ticket content
- ticketDate: Convert to YYYY-MM-DD format
- Extract numeric values only (remove units and special characters)
- If information is missing, omit the field or use null
- Return valid JSON only - NO markdown, NO code blocks, NO explanation text`;
  }
}
