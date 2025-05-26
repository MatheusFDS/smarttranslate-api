"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TranslationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = require("crypto");
const config_1 = require("@nestjs/config");
const language_1 = require("@google-cloud/language");
const vertexai_1 = require("@google-cloud/vertexai");
const translation_config_1 = require("./translation.config");
const ai_prompts_1 = require("./ai.prompts");
function generateHash(text, fromLang, toLang) {
    return crypto.createHash('sha256').update(`${text}:${fromLang}:${toLang}`).digest('hex');
}
let TranslationsService = TranslationsService_1 = class TranslationsService {
    prisma;
    configService;
    logger = new common_1.Logger(TranslationsService_1.name);
    languageClient;
    projectResourceId;
    googleCloudLocationVertexAI;
    vertexAI;
    generativeModel;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.projectResourceId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID');
        if (!this.projectResourceId) {
            throw new Error("GOOGLE_CLOUD_PROJECT_ID must be set in .env");
        }
        this.googleCloudLocationVertexAI = this.configService.get('GOOGLE_CLOUD_LOCATION_VERTEXAI', 'us-central1');
        this.languageClient = new language_1.LanguageServiceClient();
        try {
            this.vertexAI = new vertexai_1.VertexAI({ project: this.projectResourceId, location: this.googleCloudLocationVertexAI });
            const modelName = this.configService.get('GEMINI_MODEL_NAME', 'gemini-1.5-flash-001');
            this.generativeModel = this.vertexAI.getGenerativeModel({ model: modelName });
            this.logger.log(`Vertex AI Client and Model (${modelName}) initialized for location: ${this.googleCloudLocationVertexAI}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize Vertex AI Client or Model:', error);
            throw new common_1.InternalServerErrorException('Erro na configuração do serviço de IA Generativa.');
        }
    }
    async analyzeTextSyntax(text, languageCode) {
        if (!text || !text.trim())
            return [];
        try {
            const [syntaxResponse] = await this.languageClient.analyzeSyntax({
                document: { content: text, type: 'PLAIN_TEXT', language: languageCode },
                encodingType: 'UTF8',
            });
            return syntaxResponse.tokens || [];
        }
        catch (error) {
            this.logger.error(`Error analyzing syntax for "${text.substring(0, 50)}..." (lang: ${languageCode}):`, error);
            return [];
        }
    }
    mapPosTagToGrammaticalType(posTagString) {
        if (!posTagString)
            return 'unknown';
        const tag = posTagString.toUpperCase();
        switch (tag) {
            case 'ADJ': return 'adjective';
            case 'ADP': return 'preposition';
            case 'ADV': return 'adverb';
            case 'AUX': return 'verb';
            case 'CONJ':
            case 'CCONJ':
            case 'SCONJ': return 'conjunction';
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
    mapTokensToBasicTokenInfo(tokens) {
        return tokens.map(token => ({
            text: token.text?.content || '',
            grammaticalType: this.mapPosTagToGrammaticalType(token.partOfSpeech?.tag?.toString()),
            lemma: token.lemma || token.text?.content || '',
        }));
    }
    applyColorsBasedOnPhraseAlignments(originalTokens, translatedTokens, phraseAlignments) {
        const displayableOriginalTokens = originalTokens.map(token => {
            const bgColor = (0, translation_config_1.getRandomColorHSL)();
            return {
                ...token,
                backgroundColor: bgColor,
                textColor: (0, translation_config_1.getContrastYIQ)(bgColor),
                isUnused: true,
            };
        });
        const displayableTranslatedTokens = translatedTokens.map(token => {
            const bgColor = (0, translation_config_1.getRandomColorHSL)();
            return {
                ...token,
                backgroundColor: bgColor,
                textColor: (0, translation_config_1.getContrastYIQ)(bgColor),
            };
        });
        const usedOriginalIndices = new Set();
        const usedTranslatedIndices = new Set();
        for (const alignment of phraseAlignments.filter(a => a.source === 'ia_generated_alignment' && a.originalTokenIndices.length > 0 && a.translatedTokenIndices.length > 0)) {
            const sharedBackgroundColor = (0, translation_config_1.getRandomColorHSL)();
            const sharedTextColor = (0, translation_config_1.getContrastYIQ)(sharedBackgroundColor);
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
                const bgColor = (0, translation_config_1.getRandomColorHSL)();
                token.backgroundColor = bgColor;
                token.textColor = (0, translation_config_1.getContrastYIQ)(bgColor);
                token.isUnused = true;
            }
        });
        displayableTranslatedTokens.forEach((token, idx) => {
            if (!usedTranslatedIndices.has(idx)) {
                const bgColor = (0, translation_config_1.getRandomColorHSL)();
                token.backgroundColor = bgColor;
                token.textColor = (0, translation_config_1.getContrastYIQ)(bgColor);
            }
        });
        return { displayableOriginalTokens, displayableTranslatedTokens };
    }
    parseGenerativeAiResponse(responseText) {
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
        let segmentMappings = null;
        if (jsonMappingMatch && jsonMappingMatch[1]) {
            try {
                segmentMappings = JSON.parse(jsonMappingMatch[1].trim());
            }
            catch (e) {
                this.logger.error('Failed to parse segmentMappings JSON', e);
                this.logger.debug(`Problematic Mappings JSON: ${jsonMappingMatch[1].trim()}`);
            }
        }
        let vocabularyQuiz = null;
        if (jsonQuizMatch && jsonQuizMatch[1]) {
            try {
                const parsedQuiz = JSON.parse(jsonQuizMatch[1].trim());
                if (Array.isArray(parsedQuiz) && parsedQuiz.every(q => typeof q.question_prompt === 'string' &&
                    Array.isArray(q.options) && q.options.length > 0 &&
                    typeof q.correct_option_index === 'number' &&
                    typeof q.original_tested_word === 'string' &&
                    typeof q.correct_translation === 'string' &&
                    q.correct_option_index >= 0 && q.correct_option_index < q.options.length)) {
                    vocabularyQuiz = parsedQuiz.slice(0, 3);
                    if (parsedQuiz.length > 3) {
                        this.logger.warn(`AI generated ${parsedQuiz.length} quiz questions, trimmed to 3.`);
                    }
                    if (parsedQuiz.length === 0) {
                        this.logger.warn('Parsed vocabulary quiz is an empty array from AI. Treating as no quiz or an issue.');
                        vocabularyQuiz = [];
                    }
                }
                else {
                    this.logger.warn('Parsed vocabulary quiz has invalid structure or is not an array.');
                }
            }
            catch (e) {
                this.logger.error('Failed to parse vocabularyQuiz JSON', e);
                this.logger.debug(`Problematic Quiz JSON: ${jsonQuizMatch[1].trim()}`);
            }
        }
        if (!translation)
            this.logger.warn('Could not parse TRADUCAO from AI response.');
        if (!segmentMappings)
            this.logger.warn('Could not parse MAPEAMENTO_JSON from AI response.');
        if (!vocabularyQuiz)
            this.logger.warn('Could not parse QUIZ_VOCABULARIO_JSON or it was invalid/empty.');
        return {
            translation,
            originalGrammarExplanation,
            translatedGrammarExplanation,
            segmentMappings,
            vocabularyQuiz
        };
    }
    findSegmentIndicesInTokens(segmentText, tokens) {
        if (!segmentText || segmentText.trim() === '' || !tokens || tokens.length === 0) {
            return [];
        }
        const normalizedSegment = segmentText.toLowerCase().trim();
        const segmentWords = normalizedSegment.split(/\s+/).filter(w => w.length > 0);
        if (segmentWords.length === 0)
            return [];
        for (let i = 0; i <= tokens.length - segmentWords.length; i++) {
            let match = true;
            const currentMatchIndices = [];
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
            const potentialIndices = [];
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
    async getAiEnhancedTranslation(phrase, sourceLanguageCode, targetLanguageCode) {
        const normalizedPhrase = phrase.toLowerCase().trim();
        if (!normalizedPhrase) {
            this.logger.error('Frase para tradução não pode ser vazia.');
            throw new common_1.BadRequestException("A frase para tradução não pode ser vazia.");
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
                const ct = cachedData;
                const cachedTokensOriginal = JSON.parse(ct.tokensOriginalJson || '[]');
                const cachedTokensTranslated = JSON.parse(ct.tokensTranslatedJson || '[]');
                const cachedAlignments = JSON.parse(ct.alignmentsJson || '[]');
                const cachedExplanations = JSON.parse(ct.explanationsJson || '[]');
                const cachedQuiz = ct.quizJson ? JSON.parse(ct.quizJson) : undefined;
                const { displayableOriginalTokens, displayableTranslatedTokens } = this.applyColorsBasedOnPhraseAlignments(cachedTokensOriginal, cachedTokensTranslated, cachedAlignments);
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
            }
            catch (e) {
                this.logger.error("Error parsing or using AI cached translation:", e);
            }
        }
        this.logger.log(`No cache, calling Generative AI for: "${normalizedPhrase}" (${sourceLanguageCode} -> ${targetLanguageCode})`);
        const prompt = (0, ai_prompts_1.buildGenerativePrompt)(normalizedPhrase, sourceLanguageCode, targetLanguageCode);
        let aiResponseText;
        try {
            const result = await this.generativeModel.generateContent(prompt);
            const response = result.response;
            if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
                this.logger.error('Invalid AI response structure:', JSON.stringify(response));
                throw new Error("Invalid or empty response structure from AI");
            }
            aiResponseText = response.candidates[0].content.parts[0].text;
        }
        catch (error) {
            this.logger.error('Error calling Generative AI API:', error.message, error.stack);
            throw new common_1.InternalServerErrorException("Erro ao comunicar com a IA generativa.");
        }
        const parsedResponse = this.parseGenerativeAiResponse(aiResponseText);
        const { translation, originalGrammarExplanation, translatedGrammarExplanation, segmentMappings, vocabularyQuiz } = parsedResponse;
        if (!translation || !segmentMappings) {
            this.logger.error(`Failed to get essential data from parsed AI response. Translation: ${!!translation}, Mappings: ${!!segmentMappings}`);
            throw new common_1.InternalServerErrorException("IA não conseguiu processar a frase com todos os detalhes necessários (tradução ou mapeamentos ausentes).");
        }
        const tokensOriginalApi = await this.analyzeTextSyntax(normalizedPhrase, sourceLanguageCode);
        const tokensTranslatedApi = await this.analyzeTextSyntax(translation, targetLanguageCode);
        const finalTokensOriginal = this.mapTokensToBasicTokenInfo(tokensOriginalApi);
        const finalTokensTranslated = this.mapTokensToBasicTokenInfo(tokensTranslatedApi);
        const phraseAlignments = [];
        const allOriginalIndicesUsed = new Set();
        const allTranslatedIndicesUsed = new Set();
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
                    }
                    else {
                        this.logger.warn(`Could not map AI segments to tokens: Orig: '${mapping.original_segment}', Trans: '${mapping.translated_segment}'`);
                    }
                }
                else {
                    this.logger.warn(`Invalid mapping object from AI: ${JSON.stringify(mapping)}`);
                }
            }
        }
        else {
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
        const { displayableOriginalTokens, displayableTranslatedTokens } = this.applyColorsBasedOnPhraseAlignments(finalTokensOriginal, finalTokensTranslated, phraseAlignments);
        const explanations = [];
        if (originalGrammarExplanation)
            explanations.push(`**Gramática (Original):** ${originalGrammarExplanation}`);
        if (translatedGrammarExplanation)
            explanations.push(`**Gramática (Traduzida):** ${translatedGrammarExplanation}`);
        const iaAlignmentsCount = phraseAlignments.filter(pa => pa.source === 'ia_generated_alignment').length;
        if (iaAlignmentsCount === 0 && segmentMappings && segmentMappings.length > 0) {
            explanations.push("**Alerta:** A IA forneceu mapeamentos, mas não puderam ser aplicados aos tokens para coloração detalhada.");
        }
        else if (iaAlignmentsCount > 0) {
            explanations.push("**Observação:** Cores aplicadas com base no mapeamento da IA.");
        }
        else {
            explanations.push("**Observação:** Cores aplicadas individualmente.");
        }
        const responseToFrontend = {
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
        }
        catch (dbError) {
            this.logger.error('Failed to save AI-enhanced translation to DB:', dbError.message, dbError.stack);
        }
        return responseToFrontend;
    }
};
exports.TranslationsService = TranslationsService;
exports.TranslationsService = TranslationsService = TranslationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], TranslationsService);
//# sourceMappingURL=translations.service.js.map