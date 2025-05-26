// src/translations/translations.controller.ts
import { Controller, Get, Query, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { TranslationResponse } from './translation.types';

@Controller('translations')
export class TranslationsController {
    private readonly logger = new Logger(TranslationsController.name);

    constructor(private readonly translationsService: TranslationsService) {}

    @Get('translate')
    async translate(
        @Query('phrase') phrase: string,
        @Query('sourceLang') sourceLang: string,
        @Query('targetLang') targetLang: string,
    ): Promise<TranslationResponse> {
        if (!phrase || phrase.trim() === '') {
            throw new BadRequestException('A frase para tradução (phrase) é obrigatória.');
        }
        if (!sourceLang || sourceLang.trim() === '') {
            throw new BadRequestException('O idioma de origem (sourceLang) é obrigatório.');
        }
        if (!targetLang || targetLang.trim() === '') {
            throw new BadRequestException('O idioma de destino (targetLang) é obrigatório.');
        }

        try {
            const result = await this.translationsService.getAiEnhancedTranslation(phrase, sourceLang, targetLang);
            return result;
        } catch (error) {
            this.logger.error(
                `Error in TranslationsController.translate for phrase "${phrase}": ${error.message}`,
                error.stack
            );

            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Ocorreu um erro inesperado ao processar sua solicitação de tradução.');
        }
    }
}