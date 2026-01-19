import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma/client';
import { CommodityType } from '@business-app/shared';

interface NewsArticle {
  title: string;
  summary?: string;
  content?: string;
  source: string;
  sourceUrl?: string;
  publishedAt: Date;
}

interface SentimentAnalysis {
  sentimentScore: number; // -1.0 to 1.0
  sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  priceImpact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  relevantCommodities: CommodityType[];
  newsType: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  countriesMentioned: string[];
  topicTags: string[];
  analysis: string;
}

interface MarketAlert {
  id: string;
  title: string;
  summary: string;
  commodities: CommodityType[];
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  publishedAt: Date;
}

export class NewsSentimentService {
  private anthropic: Anthropic | null = null;
  private modelId: string = 'claude-3-5-sonnet-20241022';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  // ===== Analyze News Article =====

  async analyzeNews(article: NewsArticle): Promise<SentimentAnalysis> {
    const prompt = this.buildAnalysisPrompt(article);

    try {
      if (!this.anthropic) {
        return this.getDefaultSentiment(article);
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

      let response = '';
      for (const block of message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }

      return this.parseSentimentResponse(response, article);
    } catch (error) {
      console.error('News sentiment analysis error:', error);
      return this.getDefaultSentiment(article);
    }
  }

  private buildAnalysisPrompt(article: NewsArticle): string {
    return `Analyze this agricultural commodity market news article for sentiment and impact.

ARTICLE:
Title: ${article.title}
Source: ${article.source}
Published: ${article.publishedAt.toISOString()}
${article.summary ? `Summary: ${article.summary}` : ''}
${article.content ? `Content: ${article.content.substring(0, 2000)}` : ''}

Analyze this news and respond in the following format (use exact field names):

SENTIMENT_SCORE: [number from -1.0 to 1.0, where -1.0 is extremely bearish and 1.0 is extremely bullish]
SENTIMENT_LABEL: [BULLISH or BEARISH or NEUTRAL]
PRICE_IMPACT: [POSITIVE or NEGATIVE or NEUTRAL - how this affects commodity prices]
COMMODITIES: [comma-separated list of affected commodities: CORN, SOYBEANS, WHEAT]
NEWS_TYPE: [one of: TRADE, WEATHER, POLICY, SUPPLY, DEMAND, TECHNICAL, ECONOMIC, OTHER]
IMPORTANCE: [HIGH or MEDIUM or LOW - how significant is this for markets]
COUNTRIES: [comma-separated list of countries mentioned that affect ag markets]
TOPICS: [comma-separated list of key topics: tariffs, drought, exports, ethanol, etc.]
ANALYSIS: [2-3 sentence analysis of how this news affects commodity prices and farmer marketing decisions]

Be specific about price direction implications. Consider factors like:
- Trade policy impacts on exports
- Weather effects on production
- Policy changes affecting demand (ethanol mandates, subsidies)
- Global supply competition (South American production)
- Currency movements affecting export competitiveness`;
  }

  private parseSentimentResponse(response: string, article: NewsArticle): SentimentAnalysis {
    const result: SentimentAnalysis = {
      sentimentScore: 0,
      sentimentLabel: 'NEUTRAL',
      priceImpact: 'NEUTRAL',
      relevantCommodities: [],
      newsType: 'OTHER',
      importance: 'MEDIUM',
      countriesMentioned: [],
      topicTags: [],
      analysis: ''
    };

    try {
      // Parse sentiment score
      const scoreMatch = response.match(/SENTIMENT_SCORE:\s*([-\d.]+)/i);
      if (scoreMatch) {
        result.sentimentScore = Math.max(-1, Math.min(1, parseFloat(scoreMatch[1])));
      }

      // Parse sentiment label
      const labelMatch = response.match(/SENTIMENT_LABEL:\s*(BULLISH|BEARISH|NEUTRAL)/i);
      if (labelMatch) {
        result.sentimentLabel = labelMatch[1].toUpperCase() as 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      }

      // Parse price impact
      const impactMatch = response.match(/PRICE_IMPACT:\s*(POSITIVE|NEGATIVE|NEUTRAL)/i);
      if (impactMatch) {
        result.priceImpact = impactMatch[1].toUpperCase() as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      }

      // Parse commodities
      const commoditiesMatch = response.match(/COMMODITIES:\s*([^\n]+)/i);
      if (commoditiesMatch) {
        const commodities = commoditiesMatch[1].split(',').map(c => c.trim().toUpperCase());
        result.relevantCommodities = commodities.filter(c =>
          ['CORN', 'SOYBEANS', 'WHEAT'].includes(c)
        ) as CommodityType[];
      }

      // Parse news type
      const typeMatch = response.match(/NEWS_TYPE:\s*(\w+)/i);
      if (typeMatch) {
        result.newsType = typeMatch[1].toUpperCase();
      }

      // Parse importance
      const importanceMatch = response.match(/IMPORTANCE:\s*(HIGH|MEDIUM|LOW)/i);
      if (importanceMatch) {
        result.importance = importanceMatch[1].toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
      }

      // Parse countries
      const countriesMatch = response.match(/COUNTRIES:\s*([^\n]+)/i);
      if (countriesMatch) {
        result.countriesMentioned = countriesMatch[1].split(',').map(c => c.trim()).filter(c => c);
      }

      // Parse topics
      const topicsMatch = response.match(/TOPICS:\s*([^\n]+)/i);
      if (topicsMatch) {
        result.topicTags = topicsMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(t => t);
      }

      // Parse analysis
      const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]+?)(?=$)/i);
      if (analysisMatch) {
        result.analysis = analysisMatch[1].trim();
      }
    } catch (error) {
      console.error('Error parsing sentiment response:', error);
    }

    return result;
  }

  private getDefaultSentiment(article: NewsArticle): SentimentAnalysis {
    // Simple keyword-based fallback sentiment
    const text = (article.title + ' ' + (article.summary || '')).toLowerCase();

    let score = 0;
    let commodities: CommodityType[] = [];

    // Commodity detection
    if (text.includes('corn')) commodities.push(CommodityType.CORN);
    if (text.includes('soybean') || text.includes('bean')) commodities.push(CommodityType.SOYBEANS);
    if (text.includes('wheat')) commodities.push(CommodityType.WHEAT);

    // Sentiment keywords
    const bullishKeywords = ['rally', 'surge', 'jump', 'rise', 'gain', 'higher', 'bullish', 'shortage', 'drought', 'cut', 'reduced', 'tight', 'strong demand', 'export sales'];
    const bearishKeywords = ['drop', 'fall', 'decline', 'lower', 'bearish', 'surplus', 'ample', 'bumper', 'record crop', 'weak demand', 'tariff'];

    for (const keyword of bullishKeywords) {
      if (text.includes(keyword)) score += 0.2;
    }
    for (const keyword of bearishKeywords) {
      if (text.includes(keyword)) score -= 0.2;
    }

    score = Math.max(-1, Math.min(1, score));

    return {
      sentimentScore: score,
      sentimentLabel: score > 0.2 ? 'BULLISH' : score < -0.2 ? 'BEARISH' : 'NEUTRAL',
      priceImpact: score > 0.2 ? 'POSITIVE' : score < -0.2 ? 'NEGATIVE' : 'NEUTRAL',
      relevantCommodities: commodities.length > 0 ? commodities : [CommodityType.CORN, CommodityType.SOYBEANS],
      newsType: 'OTHER',
      importance: 'MEDIUM',
      countriesMentioned: [],
      topicTags: [],
      analysis: 'Sentiment analysis based on keyword matching. AI analysis unavailable.'
    };
  }

  // ===== Store Analyzed News =====

  async storeAnalyzedNews(article: NewsArticle, sentiment: SentimentAnalysis): Promise<void> {
    await prisma.marketNews.create({
      data: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        source: article.source,
        sourceUrl: article.sourceUrl,
        publishedAt: article.publishedAt,
        newsType: sentiment.newsType,
        relevantCommodities: sentiment.relevantCommodities,
        isBreakingNews: sentiment.importance === 'HIGH',
        importance: sentiment.importance,
        sentimentScore: sentiment.sentimentScore,
        sentimentLabel: sentiment.sentimentLabel,
        priceImpact: sentiment.priceImpact,
        aiAnalysis: sentiment.analysis,
        countriesMentioned: sentiment.countriesMentioned,
        topicTags: sentiment.topicTags,
        analyzedAt: new Date()
      }
    });
  }

  // ===== Get Recent Market Alerts =====

  async getRecentAlerts(commodityType?: CommodityType, hours: number = 24): Promise<MarketAlert[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const where: any = {
      publishedAt: { gte: since },
      importance: { in: ['HIGH', 'MEDIUM'] }
    };

    if (commodityType) {
      where.relevantCommodities = { has: commodityType };
    }

    const news = await prisma.marketNews.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: 20
    });

    return news.map(n => ({
      id: n.id,
      title: n.title,
      summary: n.summary || n.aiAnalysis || '',
      commodities: n.relevantCommodities as CommodityType[],
      sentiment: (n.sentimentLabel || 'NEUTRAL') as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
      importance: (n.importance || 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
      publishedAt: n.publishedAt
    }));
  }

  // ===== Analyze Special Events (Tweets, Breaking News) =====

  async analyzeSpecialEvent(
    eventType: 'TWEET' | 'POLICY' | 'TRADE_TALK' | 'WEATHER_EVENT',
    content: string,
    source: string
  ): Promise<SentimentAnalysis & { urgency: 'IMMEDIATE' | 'SOON' | 'MONITOR' }> {
    const prompt = `Analyze this ${eventType.toLowerCase().replace('_', ' ')} for agricultural commodity market impact.

EVENT TYPE: ${eventType}
SOURCE: ${source}
CONTENT: ${content}

This is a special market-moving event. Analyze urgency and impact:

SENTIMENT_SCORE: [number from -1.0 to 1.0]
SENTIMENT_LABEL: [BULLISH or BEARISH or NEUTRAL]
PRICE_IMPACT: [POSITIVE or NEGATIVE or NEUTRAL]
COMMODITIES: [CORN, SOYBEANS, WHEAT - comma separated]
URGENCY: [IMMEDIATE if markets will react within hours, SOON if within days, MONITOR if uncertain]
IMPORTANCE: [HIGH or MEDIUM or LOW]
ANALYSIS: [How should farmers react? Should they accelerate marketing or wait?]

Consider:
- For TWEET: Author credibility, historical market reactions to similar statements
- For POLICY: Implementation timeline, scope of impact
- For TRADE_TALK: Countries involved, commodities affected, likelihood of resolution
- For WEATHER_EVENT: Growing regions affected, crop stage, severity`;

    try {
      if (!this.anthropic) {
        const baseSentiment = await this.analyzeNews({
          title: content,
          source,
          publishedAt: new Date()
        });
        return { ...baseSentiment, urgency: 'MONITOR' };
      }

      const message = await this.anthropic.messages.create({
        model: this.modelId,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });

      let response = '';
      for (const block of message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }

      const sentiment = this.parseSentimentResponse(response, {
        title: content,
        source,
        publishedAt: new Date()
      });

      // Extract urgency
      const urgencyMatch = response.match(/URGENCY:\s*(IMMEDIATE|SOON|MONITOR)/i);
      const urgency = urgencyMatch
        ? urgencyMatch[1].toUpperCase() as 'IMMEDIATE' | 'SOON' | 'MONITOR'
        : 'MONITOR';

      // Set high importance for special events
      if (urgency === 'IMMEDIATE') {
        sentiment.importance = 'HIGH';
      }

      return { ...sentiment, urgency };
    } catch (error) {
      console.error('Special event analysis error:', error);
      const baseSentiment = this.getDefaultSentiment({
        title: content,
        source,
        publishedAt: new Date()
      });
      return { ...baseSentiment, urgency: 'MONITOR' };
    }
  }

  // ===== Analyze Trade Policy News (China, Tariffs, etc.) =====

  async analyzeTradePolicyNews(headline: string, details?: string): Promise<{
    affectedCommodities: CommodityType[];
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    priceImpactEstimate: { corn: number; soybeans: number; wheat: number }; // % impact estimate
    urgency: 'IMMEDIATE' | 'SOON' | 'MONITOR';
    marketingRecommendation: string;
  }> {
    const prompt = `Analyze this trade policy news for agricultural market impact:

HEADLINE: ${headline}
${details ? `DETAILS: ${details}` : ''}

Respond with:
AFFECTED_COMMODITIES: [CORN, SOYBEANS, WHEAT - comma separated]
SENTIMENT: [BULLISH or BEARISH or NEUTRAL]
CORN_IMPACT: [estimated price impact as percentage, e.g., -5 or +3]
SOYBEANS_IMPACT: [estimated price impact as percentage]
WHEAT_IMPACT: [estimated price impact as percentage]
URGENCY: [IMMEDIATE, SOON, or MONITOR]
RECOMMENDATION: [What should farmers do? 1-2 sentences for marketing decision]

Base estimates on historical trade war impacts:
- 2018 China tariffs: Soybeans dropped ~20%, Corn dropped ~10%
- Trade deal announcements: Typically +5-10% rally
- Tariff threats: Usually -5-15% depending on severity`;

    try {
      if (!this.anthropic) {
        return {
          affectedCommodities: [CommodityType.CORN, CommodityType.SOYBEANS],
          sentiment: 'NEUTRAL',
          priceImpactEstimate: { corn: 0, soybeans: 0, wheat: 0 },
          urgency: 'MONITOR',
          marketingRecommendation: 'Monitor trade developments closely.'
        };
      }

      const message = await this.anthropic.messages.create({
        model: this.modelId,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      let response = '';
      for (const block of message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }

      // Parse response
      const commoditiesMatch = response.match(/AFFECTED_COMMODITIES:\s*([^\n]+)/i);
      const sentimentMatch = response.match(/SENTIMENT:\s*(BULLISH|BEARISH|NEUTRAL)/i);
      const cornMatch = response.match(/CORN_IMPACT:\s*([-+]?\d+)/i);
      const soyMatch = response.match(/SOYBEANS_IMPACT:\s*([-+]?\d+)/i);
      const wheatMatch = response.match(/WHEAT_IMPACT:\s*([-+]?\d+)/i);
      const urgencyMatch = response.match(/URGENCY:\s*(IMMEDIATE|SOON|MONITOR)/i);
      const recMatch = response.match(/RECOMMENDATION:\s*([^\n]+)/i);

      const commodities = commoditiesMatch
        ? commoditiesMatch[1].split(',').map(c => c.trim().toUpperCase()).filter(c => ['CORN', 'SOYBEANS', 'WHEAT'].includes(c)) as CommodityType[]
        : [CommodityType.SOYBEANS];

      return {
        affectedCommodities: commodities,
        sentiment: sentimentMatch ? sentimentMatch[1].toUpperCase() as 'BULLISH' | 'BEARISH' | 'NEUTRAL' : 'NEUTRAL',
        priceImpactEstimate: {
          corn: cornMatch ? parseInt(cornMatch[1]) : 0,
          soybeans: soyMatch ? parseInt(soyMatch[1]) : 0,
          wheat: wheatMatch ? parseInt(wheatMatch[1]) : 0
        },
        urgency: urgencyMatch ? urgencyMatch[1].toUpperCase() as 'IMMEDIATE' | 'SOON' | 'MONITOR' : 'MONITOR',
        marketingRecommendation: recMatch ? recMatch[1].trim() : 'Monitor trade developments and consider hedging strategies.'
      };
    } catch (error) {
      console.error('Trade policy analysis error:', error);
      return {
        affectedCommodities: [CommodityType.CORN, CommodityType.SOYBEANS],
        sentiment: 'NEUTRAL',
        priceImpactEstimate: { corn: 0, soybeans: 0, wheat: 0 },
        urgency: 'MONITOR',
        marketingRecommendation: 'Monitor trade developments closely.'
      };
    }
  }

  // ===== Get Aggregated Sentiment Score =====

  async getAggregatedSentiment(commodityType: CommodityType, days: number = 7): Promise<{
    averageScore: number;
    label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    articleCount: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    topBullishStory: string | null;
    topBearishStory: string | null;
    trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const news = await prisma.marketNews.findMany({
      where: {
        publishedAt: { gte: since },
        relevantCommodities: { has: commodityType }
      },
      orderBy: { publishedAt: 'desc' }
    });

    if (news.length === 0) {
      return {
        averageScore: 0,
        label: 'NEUTRAL',
        articleCount: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        topBullishStory: null,
        topBearishStory: null,
        trendDirection: 'STABLE'
      };
    }

    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let topBullishStory: string | null = null;
    let topBearishStory: string | null = null;
    let maxBullishScore = 0;
    let minBearishScore = 0;

    for (const article of news) {
      const score = Number(article.sentimentScore) || 0;
      totalScore += score;

      if (article.sentimentLabel === 'BULLISH') {
        bullishCount++;
        if (score > maxBullishScore) {
          maxBullishScore = score;
          topBullishStory = article.title;
        }
      } else if (article.sentimentLabel === 'BEARISH') {
        bearishCount++;
        if (score < minBearishScore) {
          minBearishScore = score;
          topBearishStory = article.title;
        }
      } else {
        neutralCount++;
      }
    }

    const averageScore = totalScore / news.length;

    // Calculate trend by comparing first half vs second half
    const midpoint = Math.floor(news.length / 2);
    const recentArticles = news.slice(0, midpoint);
    const olderArticles = news.slice(midpoint);

    const recentAvg = recentArticles.reduce((sum, a) => sum + (Number(a.sentimentScore) || 0), 0) / (recentArticles.length || 1);
    const olderAvg = olderArticles.reduce((sum, a) => sum + (Number(a.sentimentScore) || 0), 0) / (olderArticles.length || 1);

    let trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (recentAvg - olderAvg > 0.1) trendDirection = 'IMPROVING';
    else if (olderAvg - recentAvg > 0.1) trendDirection = 'DECLINING';

    return {
      averageScore,
      label: averageScore > 0.15 ? 'BULLISH' : averageScore < -0.15 ? 'BEARISH' : 'NEUTRAL',
      articleCount: news.length,
      bullishCount,
      bearishCount,
      neutralCount,
      topBullishStory,
      topBearishStory,
      trendDirection
    };
  }
}
