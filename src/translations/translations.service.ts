// src/translations/translations.service.ts

import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { LanguageServiceClient, protos } from '@google-cloud/language';
import IToken = protos.google.cloud.language.v1.IToken;
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import {
    GrammaticalType,
    TokenInfo,
    DisplayableTokenInfoBackend,
    PhraseAlignment,
    QuizQuestion,
    TranslationResponse
} from './translation.types';
import {
    getRandomColorHSL,
    getContrastYIQ
} from './translation.config';
import { buildGenerativePrompt } from './ai.prompts';

function generateHash(text: string, fromLang: string, toLang: string): string {
    return crypto.createHash('sha256').update(`${text}:${fromLang}:${toLang}`).digest('hex');
}

@Injectable()
export class TranslationsService {
    private readonly logger = new Logger(TranslationsService.name);
    private languageClient: LanguageServiceClient;
    private readonly projectResourceId: string;
    private readonly googleCloudLocationVertexAI: string;

    private vertexAI: VertexAI;
    private generativeModel: GenerativeModel;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.projectResourceId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID')!;
        if (!this.projectResourceId) {
            throw new Error("GOOGLE_CLOUD_PROJECT_ID must be set in .env");
        }
        this.googleCloudLocationVertexAI = this.configService.get<string>('GOOGLE_CLOUD_LOCATION_VERTEXAI', 'us-central1');
        this.languageClient = new LanguageServiceClient();

        try {
            this.vertexAI = new VertexAI({ project: this.projectResourceId, location: this.googleCloudLocationVertexAI });
            const modelName = this.configService.get<string>('GEMINI_MODEL_NAME', 'gemini-1.5-flash-001');
            this.generativeModel = this.vertexAI.getGenerativeModel({ model: modelName });
            this.logger.log(`Vertex AI Client and Model (${modelName}) initialized for location: ${this.googleCloudLocationVertexAI}`);
        } catch (error) {
            this.logger.error('Failed to initialize Vertex AI Client or Model:', error);
            throw new InternalServerErrorException('Erro na configuração do serviço de IA Generativa.');
        }
    }

    private async analyzeTextSyntax(text: string, languageCode: string): Promise<IToken[]> {
        if (!text || !text.trim()) return [];
        try {
            const [syntaxResponse] = await this.languageClient.analyzeSyntax({
                document: { content: text, type: 'PLAIN_TEXT', language: languageCode },
                encodingType: 'UTF8',
            });
            return syntaxResponse.tokens || [];
        } catch (error) {
            this.logger.error(`Error analyzing syntax for "${text.substring(0, 50)}..." (lang: ${languageCode}):`, error);
            return [];
        }
    }

    private mapPosTagToGrammaticalType(posTagString?: string): GrammaticalType {
        if (!posTagString) return 'unknown';
        const tag = posTagString.toUpperCase();
        switch (tag) {
            case 'ADJ': return 'adjective';
            case 'ADP': return 'preposition';
            case 'ADV': return 'adverb';
            case 'AUX': return 'verb';
            case 'CONJ': case 'CCONJ': case 'SCONJ': return 'conjunction';
            case 'DET': return 'determiner';
            case 'NOUN': return 'noun';
            case 'NUM': return 'noun';
            case 'PRON': return 'pronoun';
            case 'PART': return 'adverb';
            case 'PRT': return 'preposition';
            case 'PUNCT': return 'unknown';
            case 'VERB': return 'verb';
            case 'X':
            default: return 'unknown';
        }
    }

    private mapTokensToBasicTokenInfo(tokens: IToken[]): TokenInfo[] {
        return tokens.map(token => ({
            text: token.text?.content || '',
            grammaticalType: this.mapPosTagToGrammaticalType(token.partOfSpeech?.tag?.toString()),
            lemma: token.lemma || token.text?.content || '',
        }));
    }

    private applyColorsBasedOnPhraseAlignments(
        originalTokens: TokenInfo[],
        translatedTokens: TokenInfo[],
        phraseAlignments: PhraseAlignment[]
    ): {
        displayableOriginalTokens: DisplayableTokenInfoBackend[];
        displayableTranslatedTokens: DisplayableTokenInfoBackend[];
    } {
        const displayableOriginalTokens: DisplayableTokenInfoBackend[] = originalTokens.map(token => {
            const bgColor = getRandomColorHSL();
            return {
                ...token,
                backgroundColor: bgColor,
                textColor: getContrastYIQ(bgColor),
                isUnused: true,
            };
        });

        const displayableTranslatedTokens: DisplayableTokenInfoBackend[] = translatedTokens.map(token => {
            const bgColor = getRandomColorHSL();
            return {
                ...token,
                backgroundColor: bgColor,
                textColor: getContrastYIQ(bgColor),
            };
        });

        const usedOriginalIndices = new Set<number>();
        const usedTranslatedIndices = new Set<number>();

        for (const alignment of phraseAlignments.filter(a => a.source === 'ia_generated_alignment' && a.originalTokenIndices.length > 0 && a.translatedTokenIndices.length > 0)) {
            const sharedBackgroundColor = getRandomColorHSL();
            const sharedTextColor = getContrastYIQ(sharedBackgroundColor);

            alignment.originalTokenIndices.forEach(idx => {
                if (displayableOriginalTokens[idx]) {
                    displayableOriginalTokens[idx].backgroundColor = sharedBackgroundColor;
                    displayableOriginalTokens[idx].textColor = sharedTextColor;
                    displayableOriginalTokens[idx].isUnused = false;
                    usedOriginalIndices.add(idx);
                }
            });
            alignment.translatedTokenIndices.forEach(idx => {
                if (displayableTranslatedTokens[idx]) {
                    displayableTranslatedTokens[idx].backgroundColor = sharedBackgroundColor;
                    displayableTranslatedTokens[idx].textColor = sharedTextColor;
                    usedTranslatedIndices.add(idx);
                }
            });
        }

        displayableOriginalTokens.forEach((token, idx) => {
            if (!usedOriginalIndices.has(idx)) {
                const bgColor = getRandomColorHSL();
                token.backgroundColor = bgColor;
                token.textColor = getContrastYIQ(bgColor);
                token.isUnused = true;
            }
        });

        displayableTranslatedTokens.forEach((token, idx) => {
            if (!usedTranslatedIndices.has(idx)) {
                const bgColor = getRandomColorHSL();
                token.backgroundColor = bgColor;
                token.textColor = getContrastYIQ(bgColor);
            }
        });

        return { displayableOriginalTokens, displayableTranslatedTokens };
    }

    private parseGenerativeAiResponse(responseText: string): {
        translation: string | null;
        originalGrammarExplanation: string | null;
        translatedGrammarExplanation: string | null;
        segmentMappings: Array<{ original_segment: string; translated_segment: string }> | null;
        vocabularyQuiz: QuizQuestion[] | null;
    } {
        this.logger.debug(`Attempting to parse AI response (length: ${responseText.length}): "${responseText.substring(0, 600)}..."`);

        const translationRegex = /TRADUCAO:\s*([\s\S]*?)(?=\nGRAMATICA_ORIGINAL:|$)/im;
        const originalGrammarRegex = /GRAMATICA_ORIGINAL:\s*([\s\S]*?)(?=\nGRAMATICA_TRADUZIDA:|$)/im;
        const translatedGrammarRegex = /GRAMATICA_TRADUZIDA:\s*([\s\S]*?)(?=\nMAPEAMENTO_JSON:|$)/im;
        const jsonMappingRegex = /MAPEAMENTO_JSON:\s*```json\s*([\s\S]*?)\s*```/im;
        const jsonQuizRegex = /QUIZ_VOCABULARIO_JSON:\s*```json\s*([\s\S]*?)\s*```/im;

        const translationMatch = responseText.match(translationRegex);
        const originalGrammarMatch = responseText.match(originalGrammarRegex);
        const translatedGrammarMatch = responseText.match(translatedGrammarRegex);
        const jsonMappingMatch = responseText.match(jsonMappingRegex);
        const jsonQuizMatch = responseText.match(jsonQuizRegex);

        const translation = translationMatch?.[1]?.trim() ?? null;
        const originalGrammarExplanation = originalGrammarMatch?.[1]?.trim() ?? null;
        const translatedGrammarExplanation = translatedGrammarMatch?.[1]?.trim() ?? null;

        let segmentMappings: Array<{ original_segment: string; translated_segment: string }> | null = null;
        if (jsonMappingMatch && jsonMappingMatch[1]) {
            try {
                segmentMappings = JSON.parse(jsonMappingMatch[1].trim());
            } catch (e) {
                this.logger.error('Failed to parse segmentMappings JSON', e);
                this.logger.debug(`Problematic Mappings JSON: ${jsonMappingMatch[1].trim()}`);
            }
        }

        let vocabularyQuiz: QuizQuestion[] | null = null;
        if (jsonQuizMatch && jsonQuizMatch[1]) {
            try {
                const parsedQuiz = JSON.parse(jsonQuizMatch[1].trim());
                if (Array.isArray(parsedQuiz) && parsedQuiz.every(q =>
                    typeof q.question_prompt === 'string' &&
                    Array.isArray(q.options) && q.options.length > 0 &&
                    typeof q.correct_option_index === 'number' &&
                    typeof q.original_tested_word === 'string' &&
                    typeof q.correct_translation === 'string' &&
                    q.correct_option_index >= 0 && q.correct_option_index < q.options.length
                )) {
                    vocabularyQuiz = parsedQuiz.slice(0, 3);
                    if (parsedQuiz.length > 3) {
                        this.logger.warn(`AI generated ${parsedQuiz.length} quiz questions, trimmed to 3.`);
                    }
                     if (parsedQuiz.length === 0) {
                        this.logger.warn('Parsed vocabulary quiz is an empty array from AI. Treating as no quiz or an issue.');
                        vocabularyQuiz = [];
                    }
                } else {
                    this.logger.warn('Parsed vocabulary quiz has invalid structure or is not an array.');
                }
            } catch (e) {
                this.logger.error('Failed to parse vocabularyQuiz JSON', e);
                this.logger.debug(`Problematic Quiz JSON: ${jsonQuizMatch[1].trim()}`);
            }
        }

        if (!translation) this.logger.warn('Could not parse TRADUCAO from AI response.');
        if (!segmentMappings) this.logger.warn('Could not parse MAPEAMENTO_JSON from AI response.');
        if (!vocabularyQuiz) this.logger.warn('Could not parse QUIZ_VOCABULARIO_JSON or it was invalid/empty.');

        return {
            translation,
            originalGrammarExplanation,
            translatedGrammarExplanation,
            segmentMappings,
            vocabularyQuiz
        };
    }

    private findSegmentIndicesInTokens(segmentText: string, tokens: TokenInfo[]): number[] {
        if (!segmentText || segmentText.trim() === '' || !tokens || tokens.length === 0) {
            return [];
        }

        const normalizedSegment = segmentText.toLowerCase().trim();
        const segmentWords = normalizedSegment.split(/\s+/).filter(w => w.length > 0);
        if (segmentWords.length === 0) return [];

        for (let i = 0; i <= tokens.length - segmentWords.length; i++) {
            let match = true;
            const currentMatchIndices: number[] = [];
            for (let j = 0; j < segmentWords.length; j++) {
                if (tokens[i + j].text.toLowerCase() !== segmentWords[j]) {
                    match = false;
                    break;
                }
                currentMatchIndices.push(i + j);
            }
            if (match) {
                return currentMatchIndices;
            }
        }

        for (let i = 0; i < tokens.length; i++) {
            let concatenatedTokensText = "";
            const potentialIndices: number[] = [];
            for (let j = i; j < tokens.length; j++) {
                concatenatedTokensText += (potentialIndices.length > 0 ? " " : "") + tokens[j].text.toLowerCase();
                potentialIndices.push(j);
                if (concatenatedTokensText === normalizedSegment) {
                    this.logger.debug(`Segment "${segmentText}" found by CONCATENATION at indices: ${JSON.stringify(potentialIndices)}`);
                    return potentialIndices;
                }
                if (concatenatedTokensText.length > normalizedSegment.length + 15) {
                    break;
                }
            }
        }
        this.logger.warn(`Segment "${segmentText}" NOT found in tokens: ${JSON.stringify(tokens.map(t => t.text))}`);
        return [];
    }

    async getAiEnhancedTranslation(
        phrase: string,
        sourceLanguageCode: string,
        targetLanguageCode: string
    ): Promise<TranslationResponse> {
        const normalizedPhrase = phrase.toLowerCase().trim();
        if (!normalizedPhrase) {
            this.logger.error('Frase para tradução não pode ser vazia.');
            throw new BadRequestException("A frase para tradução não pode ser vazia.");
        }

        const phraseHash = generateHash(normalizedPhrase, sourceLanguageCode, targetLanguageCode);
        const cachedData = await this.prisma.translationHistory.findFirst({
            where: {
                originalTextHash: phraseHash,
                sourceLanguageCode: sourceLanguageCode,
                targetLanguageCode: targetLanguageCode,
            }
        });

        if (cachedData) {
            this.logger.log(`Cache hit for AI-processed translation: "${normalizedPhrase}"`);
            try {
                const ct = cachedData as any;
                const cachedTokensOriginal = JSON.parse(ct.tokensOriginalJson || '[]') as TokenInfo[];
                const cachedTokensTranslated = JSON.parse(ct.tokensTranslatedJson || '[]') as TokenInfo[];
                const cachedAlignments = JSON.parse(ct.alignmentsJson || '[]') as PhraseAlignment[];
                const cachedExplanations = JSON.parse(ct.explanationsJson || '[]') as string[];
                const cachedQuiz = ct.quizJson ? JSON.parse(ct.quizJson) as QuizQuestion[] : undefined;

                const { displayableOriginalTokens, displayableTranslatedTokens } =
                    this.applyColorsBasedOnPhraseAlignments(cachedTokensOriginal, cachedTokensTranslated, cachedAlignments);

                return {
                    originalText: ct.originalText,
                    translatedText: ct.translatedText,
                    sourceLanguageCode: ct.sourceLanguageCode,
                    targetLanguageCode: ct.targetLanguageCode,
                    tokensOriginal: displayableOriginalTokens,
                    tokensTranslated: displayableTranslatedTokens,
                    alignments: cachedAlignments,
                    explanations: cachedExplanations,
                    quiz: cachedQuiz,
                };
            } catch (e) {
                this.logger.error("Error parsing or using AI cached translation:", e);
            }
        }

        this.logger.log(`No cache, calling Generative AI for: "${normalizedPhrase}" (${sourceLanguageCode} -> ${targetLanguageCode})`);
        const prompt = buildGenerativePrompt(normalizedPhrase, sourceLanguageCode, targetLanguageCode);
        let aiResponseText: string;

        try {
            const result = await this.generativeModel.generateContent(prompt);
            const response = result.response;
            if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
                this.logger.error('Invalid AI response structure:', JSON.stringify(response));
                throw new Error("Invalid or empty response structure from AI");
            }
            aiResponseText = response.candidates[0].content.parts[0].text;
        } catch (error: any) {
            this.logger.error('Error calling Generative AI API:', error.message, error.stack);
            throw new InternalServerErrorException("Erro ao comunicar com a IA generativa.");
        }

        const parsedResponse = this.parseGenerativeAiResponse(aiResponseText);
        const { translation, originalGrammarExplanation, translatedGrammarExplanation, segmentMappings, vocabularyQuiz } = parsedResponse;

        if (!translation || !segmentMappings) {
            this.logger.error(`Failed to get essential data from parsed AI response. Translation: ${!!translation}, Mappings: ${!!segmentMappings}`);
            throw new InternalServerErrorException("IA não conseguiu processar a frase com todos os detalhes necessários (tradução ou mapeamentos ausentes).");
        }

        const tokensOriginalApi = await this.analyzeTextSyntax(normalizedPhrase, sourceLanguageCode);
        const tokensTranslatedApi = await this.analyzeTextSyntax(translation, targetLanguageCode);
        const finalTokensOriginal = this.mapTokensToBasicTokenInfo(tokensOriginalApi);
        const finalTokensTranslated = this.mapTokensToBasicTokenInfo(tokensTranslatedApi);

        const phraseAlignments: PhraseAlignment[] = [];
        const allOriginalIndicesUsed = new Set<number>();
        const allTranslatedIndicesUsed = new Set<number>();

        if (segmentMappings && Array.isArray(segmentMappings)) {
            for (const mapping of segmentMappings) {
                if (mapping.original_segment && mapping.translated_segment) {
                    const originalTokenIndices = this.findSegmentIndicesInTokens(mapping.original_segment, finalTokensOriginal);
                    const translatedTokenIndices = this.findSegmentIndicesInTokens(mapping.translated_segment, finalTokensTranslated);

                    if (originalTokenIndices.length > 0 || translatedTokenIndices.length > 0) {
                        phraseAlignments.push({
                            originalTokenIndices,
                            translatedTokenIndices,
                            originalTextSegment: mapping.original_segment,
                            translatedTextSegment: mapping.translated_segment,
                            source: 'ia_generated_alignment',
                        });
                        originalTokenIndices.forEach(idx => allOriginalIndicesUsed.add(idx));
                        translatedTokenIndices.forEach(idx => allTranslatedIndicesUsed.add(idx));
                    } else {
                        this.logger.warn(`Could not map AI segments to tokens: Orig: '${mapping.original_segment}', Trans: '${mapping.translated_segment}'`);
                    }
                } else {
                    this.logger.warn(`Invalid mapping object from AI: ${JSON.stringify(mapping)}`);
                }
            }
        } else {
            this.logger.warn('parsedResponse.segmentMappings is null or not an array. Skipping alignment creation from AI.');
        }

        finalTokensOriginal.forEach((token, index) => {
            if (!allOriginalIndicesUsed.has(index)) {
                phraseAlignments.push({
                    originalTokenIndices: [index],
                    translatedTokenIndices: [],
                    originalTextSegment: token.text,
                    translatedTextSegment: '',
                    source: 'unaligned',
                });
            }
        });
        finalTokensTranslated.forEach((token, index) => {
            if (!allTranslatedIndicesUsed.has(index)) {
                phraseAlignments.push({
                    originalTokenIndices: [],
                    translatedTokenIndices: [index],
                    originalTextSegment: '',
                    translatedTextSegment: token.text,
                    source: 'unaligned',
                });
            }
        });

        const { displayableOriginalTokens, displayableTranslatedTokens } =
            this.applyColorsBasedOnPhraseAlignments(finalTokensOriginal, finalTokensTranslated, phraseAlignments);

        const explanations: string[] = [];
        if (originalGrammarExplanation) explanations.push(`**Gramática (Original):** ${originalGrammarExplanation}`);
        if (translatedGrammarExplanation) explanations.push(`**Gramática (Traduzida):** ${translatedGrammarExplanation}`);

        const iaAlignmentsCount = phraseAlignments.filter(pa => pa.source === 'ia_generated_alignment').length;
        if (iaAlignmentsCount === 0 && segmentMappings && segmentMappings.length > 0) {
            explanations.push("**Alerta:** A IA forneceu mapeamentos, mas não puderam ser aplicados aos tokens para coloração detalhada.");
        } else if (iaAlignmentsCount > 0) {
            explanations.push("**Observação:** Cores aplicadas com base no mapeamento da IA.");
        } else {
            explanations.push("**Observação:** Cores aplicadas individualmente.");
        }

        const responseToFrontend: TranslationResponse = {
            originalText: normalizedPhrase,
            translatedText: translation,
            sourceLanguageCode,
            targetLanguageCode,
            tokensOriginal: displayableOriginalTokens,
            tokensTranslated: displayableTranslatedTokens,
            alignments: phraseAlignments,
            explanations,
            quiz: vocabularyQuiz || undefined,
        };

        try {
            await this.prisma.translationHistory.create({
                data: {
                    originalText: normalizedPhrase,
                    originalTextHash: phraseHash,
                    translatedText: responseToFrontend.translatedText,
                    sourceLanguageCode,
                    targetLanguageCode,
                    tokensOriginalJson: JSON.stringify(finalTokensOriginal),
                    tokensTranslatedJson: JSON.stringify(finalTokensTranslated),
                    alignmentsJson: JSON.stringify(phraseAlignments),
                    explanationsJson: JSON.stringify(responseToFrontend.explanations),
                    quizJson: vocabularyQuiz ? JSON.stringify(vocabularyQuiz) : null,
                },
            });
        } catch (dbError: any) {
            this.logger.error('Failed to save AI-enhanced translation to DB:', dbError.message, dbError.stack);
        }
        return responseToFrontend;
    }
}