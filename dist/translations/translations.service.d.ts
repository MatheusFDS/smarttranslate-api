import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TranslationResponse } from './translation.types';
export declare class TranslationsService {
    private prisma;
    private configService;
    private readonly logger;
    private languageClient;
    private readonly projectResourceId;
    private readonly googleCloudLocationVertexAI;
    private vertexAI;
    private generativeModel;
    constructor(prisma: PrismaService, configService: ConfigService);
    private analyzeTextSyntax;
    private mapPosTagToGrammaticalType;
    private mapTokensToBasicTokenInfo;
    private applyColorsBasedOnPhraseAlignments;
    private parseGenerativeAiResponse;
    private findSegmentIndicesInTokens;
    getAiEnhancedTranslation(phrase: string, sourceLanguageCode: string, targetLanguageCode: string): Promise<TranslationResponse>;
}
