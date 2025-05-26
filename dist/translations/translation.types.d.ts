export type GrammaticalType = 'verb' | 'noun' | 'adjective' | 'adverb' | 'preposition' | 'pronoun' | 'determiner' | 'conjunction' | 'interjection' | 'unknown';
export interface TokenInfo {
    text: string;
    grammaticalType: GrammaticalType;
    lemma: string;
}
export interface DisplayableTokenInfoBackend extends TokenInfo {
    backgroundColor: string;
    textColor: string;
    isUnused?: boolean;
}
export interface PhraseAlignment {
    originalTokenIndices: number[];
    translatedTokenIndices: number[];
    originalTextSegment: string;
    translatedTextSegment: string;
    source: 'glossary' | 'sequential' | 'unaligned' | 'ia_generated_alignment';
}
export interface QuizQuestion {
    question_prompt: string;
    options: string[];
    correct_option_index: number;
    original_tested_word: string;
    correct_translation: string;
}
export interface TranslationResponse {
    originalText: string;
    translatedText: string;
    sourceLanguageCode: string;
    targetLanguageCode: string;
    tokensOriginal: DisplayableTokenInfoBackend[];
    tokensTranslated: DisplayableTokenInfoBackend[];
    alignments: PhraseAlignment[];
    explanations: string[];
    quiz?: QuizQuestion[];
}
