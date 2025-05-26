"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGenerativePrompt = buildGenerativePrompt;
function buildGenerativePrompt(phrase, sourceLang, targetLang) {
    return `Tarefa: Tradução, Análise Gramatical, Mapeamento de Segmentos para Coloração e Geração de Quiz de Vocabulário.

Frase Original: '${phrase}'
Idioma Original: '${sourceLang}'
Idioma Destino: '${targetLang}'

Por favor, execute as seguintes ações:
1.  Traduza a 'Frase Original' para o 'Idioma Destino'. Apresente apenas o texto traduzido puro para esta parte.
2.  Forneça uma explicação concisa (1-2 frases) da estrutura gramatical principal da 'Frase Original'.
3.  Forneça uma explicação concisa (1-2 frases) da estrutura gramatical principal da frase traduzida, destacando as principais diferenças ou semelhanças com a original.
4.  Identifique segmentos de palavras correspondentes entre a 'Frase Original' e a frase traduzida. Um segmento pode ser uma única palavra ou uma expressão composta (ex: 'gostaria de' correspondendo a 'would like'). Gere um mapeamento desses segmentos no seguinte formato JSON. O JSON deve ser uma lista de objetos, cada objeto com as chaves 'original_segment' e 'translated_segment'. Tente cobrir todas as partes das frases e garanta que o JSON seja válido.
    Exemplo de Mapeamento:
    \`\`\`json
    [
      {"original_segment": "Eu", "translated_segment": "I"},
      {"original_segment": "gostaria de", "translated_segment": "would like"},
      {"original_segment": "um café", "translated_segment": "a coffee"}
    ]
    \`\`\`
5.  Com base na 'Frase Original' e sua tradução, gere um quiz de vocabulário com exatamente 3 questões para ajudar na assimilação de novas palavras. Cada questão deve focar em uma palavra ou segmento curto da frase original, pedindo sua tradução para o idioma destino. Forneça duas opções de resposta incorretas e uma correta. As opções devem ser palavras ou segmentos curtos no idioma destino.
    Retorne o quiz no seguinte formato JSON:
    \`\`\`json
    [
      {
        "question_prompt": "Qual é a tradução de '[palavra/segmento_original]'?",
        "options": ["[opcao_incorreta1_traduzida]", "[opcao_correta_traduzida]", "[opcao_incorreta2_traduzida]"],
        "correct_option_index": 1, 
        "original_tested_word": "[palavra/segmento_original]",
        "correct_translation": "[opcao_correta_traduzida]"
      }
      // ... mais 2 objetos de questão, totalizando 3.
    ]
    \`\`\`
    Certifique-se de que as palavras testadas sejam relevantes para o aprendizado de vocabulário (evite palavras muito comuns ou triviais se houver alternativas melhores na frase) e que as opções incorretas sejam plausíveis, mas distintas da correta. A ordem da opção correta dentro do array "options" pode variar, ajuste o "correct_option_index" (base 0) de acordo.

Responda estruturando claramente cada parte usando os seguintes marcadores EXATOS:
TRADUCAO:
[Aqui a frase traduzida]

GRAMATICA_ORIGINAL:
[Aqui a explicação da gramática original]

GRAMATICA_TRADUZIDA:
[Aqui a explicação da gramática traduzida]

MAPEAMENTO_JSON:
\`\`\`json
[
  {"original_segment": "...", "translated_segment": "..."}
]
\`\`\`

QUIZ_VOCABULARIO_JSON:
\`\`\`json
[
  // As 3 questões do quiz aqui
]
\`\`\`
`;
}
//# sourceMappingURL=ai.prompts.js.map