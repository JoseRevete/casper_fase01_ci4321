// Constantes de la escena: colores, medidas de la torreta/cañón y ajustes de jugabilidad.
// Las mallas, el render y el loop del juego están en main.ts.

export type Color = readonly [number, number, number, number];

// Tamaño del canvas en píxeles
export const ANCHO_CANVAS = 1024;
export const ALTO_CANVAS = 768;

export const PASO_BYTES = 6 * 4; // 4 bytes por float
export const DESPLAZAMIENTO_NORMAL_BYTES = 3 * 4;

// Colores de la escena.
export const COLOR_CIELO: Color = [0.35, 0.65, 0.9, 1];
export const COLOR_SUELO: Color = [0.36, 0.2, 0.09, 1];
export const COLOR_CASCO: Color = [0.17, 0.19, 0.21, 1];
export const COLOR_CABINA: Color = [0.24, 0.26, 0.29, 1];
export const COLOR_CANON: Color = [0.11, 0.12, 0.14, 1];
export const COLOR_ORUGA: Color = [0.07, 0.08, 0.09, 1];
export const BARRA_ACTIVA: Color = [0.25, 0.8, 0.2, 1];
export const BARRA_INACTIVA: Color = [0.05, 0.22, 0.07, 1];
export const COLOR_PROYECTIL: Color = [0.015, 0.015, 0.015, 1];
export const COLOR_OBJETIVO: Color = [0.9, 0.18, 0.05, 1];
export const COLOR_TRAYECTORIA: Color = [0.85, 0.95, 0.35, 1];

// Brillo metálico para el casco, la cabina y el cañón del tanque.
export const BRILLO_METAL: Color = [0.4, 0.4, 0.44, 1];
export const BRILLO_METAL_INTENSIDAD = 28;

// Medidas de la torreta y el cañón, en unidades del mundo.
export const LARGO_CANON = 2.2;
export const BASE_CANON_Y = 1.45;
export const BASE_CANON_Z = 3.8;
export const RADIO_PROYECTIL = 0.18;

// Ajustes de jugabilidad.
export const LIMITE_TORRETA = 4; // Recorrido horizontal, +/- unidades
export const ELEVACION_MINIMA_GRADOS = 5;
export const ELEVACION_MAXIMA_GRADOS = 90;
export const ELEVACION_INICIAL_GRADOS = 35;
export const FUERZA_INICIAL = 2;
export const VELOCIDAD_HORIZONTAL = 3.2; // Unidades por segundo
export const VELOCIDAD_ANGULAR = 1.2; // Radianes por segundo
export const VELOCIDADES_POR_FUERZA = [7, 10, 13] as const; // Velocidad de disparo según el nivel de fuerza (1, 2, 3)
export const GRAVEDAD = 9.8;
export const DT_MAXIMO = 0.1; // Si la pestaña estuvo en segundo plano, evita que la física pegue un salto
