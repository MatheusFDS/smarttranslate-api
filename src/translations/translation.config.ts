// src/translations/translation.config.ts

export function getRandomColorHSL(): string {
    const h = Math.floor(Math.random() * 361); // Hue de 0 a 360
    const s = Math.floor(Math.random() * (100 - 40 + 1)) + 40; // Saturação de 40% a 100%
    const l = Math.floor(Math.random() * (70 - 40 + 1)) + 40; // Luminosidade de 40% a 70%
    return `hsl(${h}, ${s}%, ${l}%)`;
}

export function getContrastYIQ(hslColor: string): 'black' | 'white' {
    const parts = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!parts) return 'black';

    let h = parseInt(parts[1], 10);
    let s = parseInt(parts[2], 10) / 100;
    let l = parseInt(parts[3], 10) / 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}