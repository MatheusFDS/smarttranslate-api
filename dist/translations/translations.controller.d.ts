import { TranslationsService } from './translations.service';
import { TranslationResponse } from './translation.types';
export declare class TranslationsController {
    private readonly translationsService;
    private readonly logger;
    constructor(translationsService: TranslationsService);
    translate(phrase: string, sourceLang: string, targetLang: string): Promise<TranslationResponse>;
}
