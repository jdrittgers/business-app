import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma/client';
import {
  CommodityType,
  MarketingSignal,
  MarketingSignalType,
  StrategyRecommendation,
  MarketOutlook,
  AIAnalysisType,
  SignalStrength
} from '@business-app/shared';

interface BreakEvenSummary {
  commodityType: CommodityType;
  breakEvenPrice: number;
  totalBushels: number;
  soldBushels: number;
  remainingBushels: number;
}

interface PositionSummary {
  contractType: string;
  commodityType: CommodityType;
  bushels: number;
  price?: number;
}

export class AIAnalysisService {
  private anthropic: Anthropic | null = null;
  private modelId: string = 'claude-3-5-sonnet-20241022';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  // ===== Signal Explanation =====

  async generateSignalExplanation(signal: MarketingSignal): Promise<string> {
    const prompt = this.buildSignalExplanationPrompt(signal);

    const response = await this.callAI(
      signal.businessId,
      'SIGNAL_EXPLANATION',
      prompt
    );

    // Store the AI analysis on the signal
    if (response) {
      await prisma.marketingSignal.update({
        where: { id: signal.id },
        data: {
          aiAnalysis: response,
          aiAnalyzedAt: new Date()
        }
      });
    }

    return response;
  }

  private buildSignalExplanationPrompt(signal: MarketingSignal): string {
    const strengthDescriptions: Record<SignalStrength, string> = {
      STRONG_BUY: 'Strong opportunity to take action',
      BUY: 'Good opportunity to consider action',
      HOLD: 'Maintain current position',
      SELL: 'Caution advised',
      STRONG_SELL: 'High risk situation'
    };

    const signalTypeDescriptions: Record<MarketingSignalType, string> = {
      CASH_SALE: 'sell grain at current cash market prices',
      BASIS_CONTRACT: 'lock in the basis component while leaving futures price open',
      HTA_RECOMMENDATION: 'lock in futures price while leaving basis open (Hedge-to-Arrive)',
      ACCUMULATOR_STRATEGY: 'accumulator contract management',
      ACCUMULATOR_INQUIRY: 'check with elevator for accumulator contract pricing',
      PUT_OPTION: 'purchase put options for downside protection',
      CALL_OPTION: 'purchase call options for upside participation',
      COLLAR_STRATEGY: 'implement a collar strategy (buy put, sell call)',
      TRADE_POLICY: 'respond to trade policy news (tariffs, trade deals, etc.)',
      WEATHER_ALERT: 'respond to weather events affecting crop conditions',
      BREAKING_NEWS: 'respond to breaking news affecting agricultural markets'
    };

    // Build fundamental context section if available
    let fundamentalSection = '';
    if (signal.marketContext) {
      const ctx = signal.marketContext;
      if (ctx.fundamentalScore !== undefined || ctx.stocksToUseRatio !== undefined) {
        fundamentalSection = `
FUNDAMENTAL ANALYSIS:
- Overall Fundamental Score: ${ctx.fundamentalScore !== undefined ? `${ctx.fundamentalScore > 0 ? '+' : ''}${ctx.fundamentalScore}` : 'N/A'} (range: -100 bearish to +100 bullish)
- Fundamental Outlook: ${ctx.fundamentalOutlook || 'N/A'}
${ctx.stocksToUseRatio !== undefined ? `- Stocks-to-Use Ratio: ${(ctx.stocksToUseRatio * 100).toFixed(1)}% (lower = tighter supply = bullish)` : ''}
${ctx.exportPace !== undefined ? `- Export Pace vs USDA: ${ctx.exportPace > 0 ? '+' : ''}${(ctx.exportPace * 100).toFixed(0)}%` : ''}
${ctx.cropConditions !== undefined ? `- Crop Conditions (Good/Excellent): ${ctx.cropConditions.toFixed(0)}%` : ''}
${ctx.newsSentiment ? `- Recent News Sentiment: ${ctx.newsSentiment}` : ''}
${ctx.keyFundamentalFactors && ctx.keyFundamentalFactors.length > 0 ? `- Key Factors: ${ctx.keyFundamentalFactors.join('; ')}` : ''}
`;
      }
    }

    return `You are an agricultural marketing advisor helping a farmer understand a marketing signal. Explain this signal in clear, actionable terms.

SIGNAL DETAILS:
- Type: ${signal.signalType} (${signalTypeDescriptions[signal.signalType]})
- Commodity: ${signal.commodityType}
- Strength: ${signal.strength} (${strengthDescriptions[signal.strength]})
- Current Price: $${signal.currentPrice.toFixed(2)}/bushel
- Break-Even Price: $${signal.breakEvenPrice.toFixed(2)}/bushel
- Profit Margin: $${signal.priceAboveBreakeven.toFixed(2)}/bushel (${(signal.percentAboveBreakeven * 100).toFixed(1)}% above break-even)
${signal.targetPrice ? `- Target Price: $${signal.targetPrice.toFixed(2)}/bushel` : ''}

TECHNICAL MARKET CONTEXT:
${signal.marketContext ? `
- Futures Price: $${signal.marketContext.futuresPrice?.toFixed(2) || 'N/A'}
- Futures Contract: ${signal.marketContext.futuresMonth || 'N/A'}
- Price Trend: ${signal.marketContext.futuresTrend || 'N/A'}
- Basis Level: ${signal.marketContext.basisLevel?.toFixed(2) || 'N/A'}
- Basis vs Historical: ${signal.marketContext.basisVsHistorical || 'N/A'}
- RSI: ${signal.marketContext.rsiValue?.toFixed(0) || 'N/A'}
- Volatility: ${signal.marketContext.volatility ? (signal.marketContext.volatility * 100).toFixed(1) + '%' : 'N/A'}
` : 'Not available'}
${fundamentalSection}
RULE-BASED RATIONALE:
${signal.rationale || 'Not provided'}

RECOMMENDED ACTION:
${signal.recommendedAction || 'Not specified'}
${signal.recommendedBushels ? `Recommended Bushels: ${signal.recommendedBushels.toLocaleString()}` : ''}

Please provide:
1. A brief explanation (2-3 sentences) of why this signal was generated considering BOTH technical and fundamental factors
2. How the fundamental outlook (supply/demand, exports, crop conditions) supports or conflicts with this signal
3. The potential risks of acting vs not acting on this signal
4. Any market conditions, seasonal timing, or news events to consider
5. A clear recommendation with specific next steps and percentage to sell

Keep the response concise (under 250 words) and farmer-friendly. Avoid jargon where possible. Be specific about how fundamentals affect the decision.`;
  }

  // ===== Strategy Recommendation =====

  async generateStrategyRecommendation(
    businessId: string,
    breakEvens: BreakEvenSummary[],
    currentPositions: PositionSummary[],
    riskTolerance: string,
    fundamentalData?: {
      commodityType: CommodityType;
      fundamentalScore: number;
      outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      keyFactors: string[];
      stocksToUse?: number;
      exportPace?: number;
      cropConditions?: number;
    }[]
  ): Promise<StrategyRecommendation> {
    const prompt = this.buildStrategyPrompt(breakEvens, currentPositions, riskTolerance, fundamentalData);

    const response = await this.callAI(
      businessId,
      'STRATEGY_RECOMMENDATION',
      prompt
    );

    // Parse the AI response into structured format
    return this.parseStrategyResponse(response, breakEvens);
  }

  private buildStrategyPrompt(
    breakEvens: BreakEvenSummary[],
    positions: PositionSummary[],
    riskTolerance: string,
    fundamentalData?: {
      commodityType: CommodityType;
      fundamentalScore: number;
      outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      keyFactors: string[];
      stocksToUse?: number;
      exportPace?: number;
      cropConditions?: number;
    }[]
  ): string {
    const totalProjected = breakEvens.reduce((sum, be) => sum + be.totalBushels, 0);
    const totalSold = breakEvens.reduce((sum, be) => sum + be.soldBushels, 0);
    const totalRemaining = breakEvens.reduce((sum, be) => sum + be.remainingBushels, 0);
    const percentSold = totalProjected > 0 ? (totalSold / totalProjected) * 100 : 0;

    const breakEvenDetails = breakEvens.map(be =>
      `- ${be.commodityType}: Break-even $${be.breakEvenPrice.toFixed(2)}/bu, ` +
      `${be.remainingBushels.toLocaleString()} bushels remaining of ${be.totalBushels.toLocaleString()} total`
    ).join('\n');

    const positionDetails = positions.length > 0
      ? positions.map(p =>
          `- ${p.contractType} ${p.commodityType}: ${p.bushels.toLocaleString()} bushels` +
          (p.price ? ` @ $${p.price.toFixed(2)}` : '')
        ).join('\n')
      : 'No current positions';

    // Build fundamental data section
    let fundamentalSection = '';
    if (fundamentalData && fundamentalData.length > 0) {
      fundamentalSection = `

FUNDAMENTAL MARKET ANALYSIS:
${fundamentalData.map(fd => `
${fd.commodityType}:
  - Fundamental Score: ${fd.fundamentalScore > 0 ? '+' : ''}${fd.fundamentalScore} (range: -100 bearish to +100 bullish)
  - Outlook: ${fd.outlook}
  ${fd.stocksToUse !== undefined ? `- Stocks-to-Use: ${(fd.stocksToUse * 100).toFixed(1)}%` : ''}
  ${fd.exportPace !== undefined ? `- Export Pace vs USDA: ${fd.exportPace > 0 ? '+' : ''}${(fd.exportPace * 100).toFixed(0)}%` : ''}
  ${fd.cropConditions !== undefined ? `- Crop Conditions (G/E): ${fd.cropConditions.toFixed(0)}%` : ''}
  - Key Factors: ${fd.keyFactors.slice(0, 3).join('; ')}`).join('\n')}

IMPORTANT FUNDAMENTALS CONTEXT:
- Low stocks-to-use ratio (<10% corn, <6% beans) = BULLISH (tight supply, higher prices likely)
- High stocks-to-use ratio (>15% corn, >12% beans) = BEARISH (ample supply, lower prices likely)
- Export pace ahead of USDA = BULLISH demand
- Poor crop conditions = BULLISH (reduced yield expectations)
`;
    }

    return `You are an agricultural marketing strategist with deep knowledge of USDA fundamentals, supply/demand dynamics, and seasonal patterns. Based on the following farm operation data AND fundamental market analysis, recommend an optimal marketing strategy.

OPERATION OVERVIEW:
- Total Projected Production: ${totalProjected.toLocaleString()} bushels
- Already Marketed: ${totalSold.toLocaleString()} bushels (${percentSold.toFixed(1)}%)
- Remaining to Market: ${totalRemaining.toLocaleString()} bushels

BREAK-EVEN PRICES BY COMMODITY:
${breakEvenDetails}

CURRENT MARKETING POSITIONS:
${positionDetails}

RISK TOLERANCE: ${riskTolerance}
${fundamentalSection}

Please provide a comprehensive marketing recommendation that INCORPORATES THE FUNDAMENTAL ANALYSIS:

1. **Summary**: A 2-3 sentence overview that references specific fundamental factors (stocks-to-use, export pace, etc.)

2. **Specific Recommendations**: For each commodity with remaining bushels, provide:
   - Recommended marketing tool (cash sale, basis contract, HTA, options, accumulator)
   - Percentage of remaining bushels to market NOW
   - Priority level (HIGH, MEDIUM, LOW)
   - Brief reasoning that incorporates BOTH price vs break-even AND fundamental outlook
   - Whether to be aggressive (bearish fundamentals) or patient (bullish fundamentals)

3. **Risk Assessment**: Key risks to consider based on fundamental factors (ending stocks changes, export demand, weather, trade policy)

4. **30-Day Action Items**: Specific steps incorporating upcoming USDA reports, seasonal patterns, and export sales data

Format your response as follows:
SUMMARY: [your summary referencing fundamental factors]

RECOMMENDATIONS:
[commodity]: [tool] - [percentage]% - [priority] - [reasoning including fundamentals]

RISK_ASSESSMENT: [your assessment with fundamental risks]

ACTION_ITEMS: [your items with specific dates if applicable]`;
  }

  private parseStrategyResponse(response: string, breakEvens: BreakEvenSummary[]): StrategyRecommendation {
    // Default structure if parsing fails
    const defaultRecommendation: StrategyRecommendation = {
      summary: response.substring(0, 500),
      recommendations: [],
      riskAssessment: '',
      timelineNotes: '',
      generatedAt: new Date()
    };

    try {
      // Extract summary
      const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i);
      if (summaryMatch) {
        defaultRecommendation.summary = summaryMatch[1].trim();
      }

      // Extract recommendations
      const recsMatch = response.match(/RECOMMENDATIONS:\s*([\s\S]*?)(?=RISK_ASSESSMENT:|$)/i);
      if (recsMatch) {
        const recsText = recsMatch[1].trim();
        const recLines = recsText.split('\n').filter(line => line.trim());

        for (const line of recLines) {
          // Parse format: CORN: CASH_SALE - 20% - HIGH - reasoning
          const match = line.match(/(\w+):\s*(\w+)\s*-\s*(\d+)%?\s*-\s*(\w+)\s*-\s*(.+)/i);
          if (match) {
            const [, commodity, tool, percentage, priority, reasoning] = match;
            const breakEven = breakEvens.find(be =>
              be.commodityType.toUpperCase() === commodity.toUpperCase()
            );

            if (breakEven) {
              defaultRecommendation.recommendations.push({
                action: `${tool} for ${percentage}% of remaining ${commodity}`,
                commodityType: breakEven.commodityType,
                bushels: Math.round(breakEven.remainingBushels * (parseInt(percentage) / 100)),
                toolType: this.mapToolType(tool),
                priority: priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
                reasoning: reasoning.trim()
              });
            }
          }
        }
      }

      // Extract risk assessment
      const riskMatch = response.match(/RISK_ASSESSMENT:\s*([\s\S]*?)(?=ACTION_ITEMS:|$)/i);
      if (riskMatch) {
        defaultRecommendation.riskAssessment = riskMatch[1].trim();
      }

      // Extract action items
      const actionsMatch = response.match(/ACTION_ITEMS:\s*([\s\S]*?)$/i);
      if (actionsMatch) {
        defaultRecommendation.timelineNotes = actionsMatch[1].trim();
      }
    } catch (error) {
      console.error('Error parsing strategy response:', error);
    }

    return defaultRecommendation;
  }

  private mapToolType(tool: string): MarketingSignalType {
    const toolMap: Record<string, MarketingSignalType> = {
      'CASH': MarketingSignalType.CASH_SALE,
      'CASH_SALE': MarketingSignalType.CASH_SALE,
      'BASIS': MarketingSignalType.BASIS_CONTRACT,
      'BASIS_CONTRACT': MarketingSignalType.BASIS_CONTRACT,
      'HTA': MarketingSignalType.HTA_RECOMMENDATION,
      'HEDGE_TO_ARRIVE': MarketingSignalType.HTA_RECOMMENDATION,
      'ACCUMULATOR': MarketingSignalType.ACCUMULATOR_STRATEGY,
      'PUT': MarketingSignalType.PUT_OPTION,
      'PUT_OPTION': MarketingSignalType.PUT_OPTION,
      'CALL': MarketingSignalType.CALL_OPTION,
      'CALL_OPTION': MarketingSignalType.CALL_OPTION,
      'COLLAR': MarketingSignalType.COLLAR_STRATEGY
    };

    return toolMap[tool.toUpperCase()] || MarketingSignalType.CASH_SALE;
  }

  // ===== Market Outlook =====

  async generateMarketOutlook(commodityType: CommodityType): Promise<MarketOutlook> {
    const prompt = this.buildMarketOutlookPrompt(commodityType);

    const response = await this.callAI(
      'system',
      'MARKET_OUTLOOK',
      prompt
    );

    return this.parseMarketOutlookResponse(response, commodityType);
  }

  private buildMarketOutlookPrompt(commodityType: CommodityType): string {
    return `You are a grain market analyst. Provide a market outlook for ${commodityType}.

Please analyze the following aspects:

1. **Short-Term Outlook** (next 30 days): Key factors affecting prices
2. **Medium-Term Outlook** (next 3-6 months): Seasonal patterns and expected moves
3. **Key Factors**: List 3-5 key factors currently influencing prices
4. **Price Targets**: Provide support, resistance, and fair value estimates
5. **Technical Analysis**: Brief assessment of trend and momentum

Format your response as:
SHORT_TERM: [outlook]
MEDIUM_TERM: [outlook]
KEY_FACTORS: [factor1]; [factor2]; [factor3]
SUPPORT: [price]
RESISTANCE: [price]
FAIR_VALUE: [price]
TREND: [BULLISH/BEARISH/NEUTRAL]

Note: Base your analysis on general market knowledge and seasonal patterns.`;
  }

  private parseMarketOutlookResponse(response: string, commodityType: CommodityType): MarketOutlook {
    // Default values based on commodity
    const defaults: Record<CommodityType, { support: number; resistance: number; fair: number }> = {
      CORN: { support: 4.00, resistance: 5.00, fair: 4.50 },
      SOYBEANS: { support: 10.00, resistance: 14.00, fair: 12.00 },
      WHEAT: { support: 5.00, resistance: 7.00, fair: 6.00 }
    };

    const defaultOutlook: MarketOutlook = {
      commodityType,
      shortTermOutlook: 'Market conditions are relatively stable.',
      mediumTermOutlook: 'Seasonal patterns suggest moderate volatility ahead.',
      keyFactors: ['Supply levels', 'Export demand', 'Weather conditions'],
      priceTargets: {
        support: defaults[commodityType].support,
        resistance: defaults[commodityType].resistance,
        fairValue: defaults[commodityType].fair
      },
      technicalIndicators: {
        trend: 'NEUTRAL',
        rsi: 50,
        movingAverages: {
          ma20: defaults[commodityType].fair,
          ma50: defaults[commodityType].fair,
          ma200: defaults[commodityType].fair
        }
      },
      generatedAt: new Date()
    };

    try {
      // Parse short-term outlook
      const shortMatch = response.match(/SHORT_TERM:\s*([\s\S]*?)(?=MEDIUM_TERM:|$)/i);
      if (shortMatch) {
        defaultOutlook.shortTermOutlook = shortMatch[1].trim();
      }

      // Parse medium-term outlook
      const mediumMatch = response.match(/MEDIUM_TERM:\s*([\s\S]*?)(?=KEY_FACTORS:|$)/i);
      if (mediumMatch) {
        defaultOutlook.mediumTermOutlook = mediumMatch[1].trim();
      }

      // Parse key factors
      const factorsMatch = response.match(/KEY_FACTORS:\s*([\s\S]*?)(?=SUPPORT:|$)/i);
      if (factorsMatch) {
        defaultOutlook.keyFactors = factorsMatch[1].split(';').map(f => f.trim()).filter(f => f);
      }

      // Parse price targets
      const supportMatch = response.match(/SUPPORT:\s*\$?([\d.]+)/i);
      if (supportMatch) {
        defaultOutlook.priceTargets.support = parseFloat(supportMatch[1]);
      }

      const resistanceMatch = response.match(/RESISTANCE:\s*\$?([\d.]+)/i);
      if (resistanceMatch) {
        defaultOutlook.priceTargets.resistance = parseFloat(resistanceMatch[1]);
      }

      const fairMatch = response.match(/FAIR_VALUE:\s*\$?([\d.]+)/i);
      if (fairMatch) {
        defaultOutlook.priceTargets.fairValue = parseFloat(fairMatch[1]);
      }

      // Parse trend
      const trendMatch = response.match(/TREND:\s*(BULLISH|BEARISH|NEUTRAL)/i);
      if (trendMatch) {
        defaultOutlook.technicalIndicators.trend = trendMatch[1].toUpperCase() as 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      }
    } catch (error) {
      console.error('Error parsing market outlook:', error);
    }

    return defaultOutlook;
  }

  // ===== Core AI Call =====

  private async callAI(
    businessId: string,
    analysisType: AIAnalysisType,
    prompt: string
  ): Promise<string> {
    const startTime = Date.now();
    let response = '';
    let tokensUsed = 0;
    let successful = false;
    let errorMessage: string | undefined;

    try {
      if (!this.anthropic) {
        // Return a helpful fallback message if no API key
        return this.getFallbackResponse(analysisType, prompt);
      }

      const message = await this.anthropic.messages.create({
        model: this.modelId,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Extract text from response
      for (const block of message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }

      tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);
      successful = true;
    } catch (error: any) {
      console.error('AI API error:', error);
      errorMessage = error.message;
      response = this.getFallbackResponse(analysisType, prompt);
    }

    const latencyMs = Date.now() - startTime;

    // Log the analysis
    await prisma.aIAnalysisLog.create({
      data: {
        businessId,
        analysisType,
        prompt: prompt.substring(0, 5000), // Truncate for storage
        response: response.substring(0, 10000),
        modelUsed: this.modelId,
        tokensUsed,
        latencyMs,
        successful,
        errorMessage
      }
    });

    return response;
  }

  private getFallbackResponse(analysisType: AIAnalysisType, prompt: string): string {
    switch (analysisType) {
      case 'SIGNAL_EXPLANATION':
        return `This signal was generated based on your break-even prices and current market conditions. ` +
          `Review the rationale provided and consider consulting with your marketing advisor for personalized guidance. ` +
          `Market conditions change rapidly, so timely action is recommended if the signal aligns with your marketing goals.`;

      case 'STRATEGY_RECOMMENDATION':
        return `SUMMARY: A balanced approach is recommended based on your current marketing position and risk tolerance. ` +
          `Consider selling a portion of remaining bushels when prices exceed your break-even plus target margin.\n\n` +
          `RISK_ASSESSMENT: Price volatility remains a key risk. Diversifying marketing tools can help manage exposure.\n\n` +
          `ACTION_ITEMS: Review your break-even calculations, set price alerts for target levels, and consult with your marketing advisor.`;

      case 'MARKET_OUTLOOK':
        return `SHORT_TERM: Markets are responding to current supply and demand fundamentals.\n` +
          `MEDIUM_TERM: Seasonal patterns suggest monitoring weather and export pace.\n` +
          `KEY_FACTORS: Supply levels; Export demand; Weather; Currency movements; Global production\n` +
          `TREND: NEUTRAL`;

      default:
        return 'Analysis unavailable. Please try again later or consult with your marketing advisor.';
    }
  }

  // ===== Batch Analysis for New Signals =====

  async enrichSignalsWithAI(signals: MarketingSignal[]): Promise<void> {
    for (const signal of signals) {
      if (!signal.aiAnalysis) {
        try {
          await this.generateSignalExplanation(signal);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to enrich signal ${signal.id}:`, error);
        }
      }
    }
  }
}
