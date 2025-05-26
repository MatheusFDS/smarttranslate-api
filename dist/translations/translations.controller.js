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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TranslationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationsController = void 0;
const common_1 = require("@nestjs/common");
const translations_service_1 = require("./translations.service");
let TranslationsController = TranslationsController_1 = class TranslationsController {
    translationsService;
    logger = new common_1.Logger(TranslationsController_1.name);
    constructor(translationsService) {
        this.translationsService = translationsService;
    }
    async translate(phrase, sourceLang, targetLang) {
        if (!phrase || phrase.trim() === '') {
            throw new common_1.BadRequestException('A frase para tradução (phrase) é obrigatória.');
        }
        if (!sourceLang || sourceLang.trim() === '') {
            throw new common_1.BadRequestException('O idioma de origem (sourceLang) é obrigatório.');
        }
        if (!targetLang || targetLang.trim() === '') {
            throw new common_1.BadRequestException('O idioma de destino (targetLang) é obrigatório.');
        }
        try {
            const result = await this.translationsService.getAiEnhancedTranslation(phrase, sourceLang, targetLang);
            return result;
        }
        catch (error) {
            this.logger.error(`Error in TranslationsController.translate for phrase "${phrase}": ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Ocorreu um erro inesperado ao processar sua solicitação de tradução.');
        }
    }
};
exports.TranslationsController = TranslationsController;
__decorate([
    (0, common_1.Get)('translate'),
    __param(0, (0, common_1.Query)('phrase')),
    __param(1, (0, common_1.Query)('sourceLang')),
    __param(2, (0, common_1.Query)('targetLang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "translate", null);
exports.TranslationsController = TranslationsController = TranslationsController_1 = __decorate([
    (0, common_1.Controller)('translations'),
    __metadata("design:paramtypes", [translations_service_1.TranslationsService])
], TranslationsController);
//# sourceMappingURL=translations.controller.js.map