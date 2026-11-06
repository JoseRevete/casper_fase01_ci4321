import './style.css';
import { mat3, mat4 } from 'gl-matrix';
import { ATTRIB, createFixedFunction, LIGHTING } from './vendor/ff/ff';
import {
  VELOCIDAD_ANGULAR,
  BARRA_INACTIVA,
  BARRA_ACTIVA,
  BASE_CANON_Y,
  BASE_CANON_Z,
  COLOR_CANON,
  LARGO_CANON,
  COLOR_CABINA,
  ALTO_CANVAS,
  ANCHO_CANVAS,
  type Color,
  ELEVACION_INICIAL_GRADOS,
  FUERZA_INICIAL,
  VELOCIDADES_POR_FUERZA,
  GRAVEDAD,
  COLOR_SUELO,
  VELOCIDAD_HORIZONTAL,
  COLOR_CASCO,
  DT_MAXIMO,
  ELEVACION_MAXIMA_GRADOS,
  BRILLO_METAL_INTENSIDAD,
  BRILLO_METAL,
  ELEVACION_MINIMA_GRADOS,
  DESPLAZAMIENTO_NORMAL_BYTES,
  COLOR_PROYECTIL,
  RADIO_PROYECTIL,
  COLOR_CIELO,
  PASO_BYTES,
  COLOR_OBJETIVO,
  COLOR_ORUGA,
  COLOR_TRAYECTORIA,
  LIMITE_TORRETA,
} from './constants';

type Graficos = ReturnType<typeof createFixedFunction>;
type Vector3 = [number, number, number];

const GRADOS_A_RADIANES = Math.PI / 180;
const ELEVACION_MINIMA = ELEVACION_MINIMA_GRADOS * GRADOS_A_RADIANES;
const ELEVACION_MAXIMA = ELEVACION_MAXIMA_GRADOS * GRADOS_A_RADIANES;

interface Objeto3D {
  vao: WebGLVertexArrayObject;
  bufferVertices: WebGLBuffer;
  cantidad: number;
  modo: GLenum;
  tipoIndice: GLenum;
}

interface Objetivo {
  posicion: Vector3;
  radio: number;
  activo: boolean;
}

const estado = {
  torretaX: 0,
  elevacion: ELEVACION_INICIAL_GRADOS * GRADOS_A_RADIANES,
  fuerza: FUERZA_INICIAL,
  proyectilDisponible: true,
  posicionProyectil: [0, 0, 0] as Vector3,
  posicionLanzamientoProyectil: [0, 0, 0] as Vector3,
  velocidadLanzamientoProyectil: [0, 0, 0] as Vector3,
  tiempoVueloProyectil: 0,
  tiempoAterrizajeProyectil: 0,
  objetivos: [] as Objetivo[],
};

const teclas = new Set<string>();
let disparoPresionado = false;
let reinicioPresionado = false;

function obtenerContexto(lienzo: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = lienzo.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 is not available.');
  return gl;
}

function crearObjeto3D(
  gl: WebGL2RenderingContext,
  vertices: Float32Array,
  indices: Uint16Array,
  modo: GLenum = gl.TRIANGLES,
): Objeto3D {
  const bufferVertices = gl.createBuffer();
  const bufferIndices = gl.createBuffer();
  const vao = gl.createVertexArray();
  if (!bufferVertices || !bufferIndices || !vao) throw new Error('Unable to create WebGL malla.');

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(ATTRIB.POSITION);
  gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, PASO_BYTES, 0);
  gl.enableVertexAttribArray(ATTRIB.NORMAL);
  gl.vertexAttribPointer(ATTRIB.NORMAL, 3, gl.FLOAT, false, PASO_BYTES, DESPLAZAMIENTO_NORMAL_BYTES);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, bufferVertices, cantidad: indices.length, modo, tipoIndice: gl.UNSIGNED_SHORT };
}

function crearObjeto3DCubo(gl: WebGL2RenderingContext): Objeto3D {
  const vertices: number[] = [];
  const indices: number[] = [];
  const caras: Array<{ normal: Vector3; esquinas: Vector3[] }> = [
    { normal: [0, 0, 1], esquinas: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    { normal: [0, 0, -1], esquinas: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
    { normal: [1, 0, 0], esquinas: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    { normal: [-1, 0, 0], esquinas: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, 1, 0], esquinas: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, -1, 0], esquinas: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  ];
  caras.forEach(({ normal, esquinas }) => {
    const inicio = vertices.length / 6;
    esquinas.forEach(([x, y, z]) => vertices.push(x, y, z, ...normal));
    indices.push(inicio, inicio + 1, inicio + 2, inicio, inicio + 2, inicio + 3);
  });
  return crearObjeto3D(gl, new Float32Array(vertices), new Uint16Array(indices));
}

function crearObjeto3DEsfera(gl: WebGL2RenderingContext, secciones = 20, niveles = 12): Objeto3D {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let nivel = 0; nivel <= niveles; nivel += 1) {
    const anguloVertical = (nivel / niveles) * Math.PI;
    const y = Math.cos(anguloVertical);
    const anillo = Math.sin(anguloVertical);
    for (let seccion = 0; seccion <= secciones; seccion += 1) {
      const anguloHorizontal = (seccion / secciones) * Math.PI * 2;
      const x = anillo * Math.cos(anguloHorizontal);
      const z = anillo * Math.sin(anguloHorizontal);
      vertices.push(x, y, z, x, y, z);
    }
  }
  for (let nivel = 0; nivel < niveles; nivel += 1) {
    for (let seccion = 0; seccion < secciones; seccion += 1) {
      const row = secciones + 1;
      const a = nivel * row + seccion;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return crearObjeto3D(gl, new Float32Array(vertices), new Uint16Array(indices));
}

// El cilindro queda orientado sobre el eje Z, con radio 0.5 y longitud 1.
function crearObjeto3DCilindro(gl: WebGL2RenderingContext, segmentos = 20): Objeto3D {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentos; i += 1) {
    const anguloHorizontal = (i / segmentos) * Math.PI * 2;
    const nx = Math.cos(anguloHorizontal);
    const ny = Math.sin(anguloHorizontal);
    vertices.push(nx * 0.5, ny * 0.5, -0.5, nx, ny, 0);
    vertices.push(nx * 0.5, ny * 0.5, 0.5, nx, ny, 0);
  }
  for (let i = 0; i < segmentos; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const centroTrasero = vertices.length / 6;
  vertices.push(0, 0, -0.5, 0, 0, -1);
  const anilloTrasero = vertices.length / 6;
  for (let i = 0; i <= segmentos; i += 1) {
    const anguloHorizontal = (i / segmentos) * Math.PI * 2;
    vertices.push(Math.cos(anguloHorizontal) * 0.5, Math.sin(anguloHorizontal) * 0.5, -0.5, 0, 0, -1);
  }
  for (let i = 0; i < segmentos; i += 1) indices.push(centroTrasero, anilloTrasero + i + 1, anilloTrasero + i);

  const centroFrontal = vertices.length / 6;
  vertices.push(0, 0, 0.5, 0, 0, 1);
  const anilloFrontal = vertices.length / 6;
  for (let i = 0; i <= segmentos; i += 1) {
    const anguloHorizontal = (i / segmentos) * Math.PI * 2;
    vertices.push(Math.cos(anguloHorizontal) * 0.5, Math.sin(anguloHorizontal) * 0.5, 0.5, 0, 0, 1);
  }
  for (let i = 0; i < segmentos; i += 1) indices.push(centroFrontal, anilloFrontal + i, anilloFrontal + i + 1);

  return crearObjeto3D(gl, new Float32Array(vertices), new Uint16Array(indices));
}

function crearObjeto3DPlano(gl: WebGL2RenderingContext): Objeto3D {
  const vertices = new Float32Array([
    -8, 0, -12, 0, 1, 0, 8, 0, -12, 0, 1, 0, 8, 0, 6, 0, 1, 0, -8, 0, 6, 0, 1, 0,
  ]);
  return crearObjeto3D(gl, vertices, new Uint16Array([0, 2, 1, 0, 3, 2]));
}

function crearObjeto3DParalelogramo(gl: WebGL2RenderingContext): Objeto3D {
  const vertices: number[] = [];
  const indices: number[] = [];
  const caras: Array<{ normal: Vector3; esquinas: Vector3[] }> = [
    { normal: [0, 0, 1], esquinas: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.7, 0.5, 0.5], [-0.3, 0.5, 0.5]] },
    { normal: [0, 0, -1], esquinas: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.3, 0.5, -0.5], [0.7, 0.5, -0.5]] },
    { normal: [0, 1, 0], esquinas: [[-0.3, 0.5, 0.5], [0.7, 0.5, 0.5], [0.7, 0.5, -0.5], [-0.3, 0.5, -0.5]] },
    { normal: [0, -1, 0], esquinas: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
    { normal: [1, 0, 0], esquinas: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.7, 0.5, -0.5], [0.7, 0.5, 0.5]] },
    { normal: [-1, 0, 0], esquinas: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.3, 0.5, 0.5], [-0.3, 0.5, -0.5]] },
  ];
  caras.forEach(({ normal, esquinas }) => {
    const inicio = vertices.length / 6;
    esquinas.forEach(([x, y, z]) => vertices.push(x, y, z, ...normal));
    indices.push(inicio, inicio + 1, inicio + 2, inicio, inicio + 2, inicio + 3);
  });
  return crearObjeto3D(gl, new Float32Array(vertices), new Uint16Array(indices));
}

function crearObjeto3DTrayectoria(gl: WebGL2RenderingContext): Objeto3D {
  const vertices = new Float32Array(24 * 6);
  const indices = new Uint16Array(24);
  for (let indice = 0; indice < indices.length; indice += 1) indices[indice] = indice;
  return crearObjeto3D(gl, vertices, indices, gl.LINE_STRIP);
}

function configurarEstado(gl: WebGL2RenderingContext, lienzo: HTMLCanvasElement): void {
  lienzo.width = ANCHO_CANVAS;
  lienzo.height = ALTO_CANVAS;
  gl.viewport(0, 0, lienzo.width, lienzo.height);
  gl.clearColor(...COLOR_CIELO);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
}

function configurarEscena(ff: Graficos): void {
  ff.enable(LIGHTING);
  ff.setGlobalAmbient([0.3, 0.3, 0.3, 1]);
  ff.setLight(0, { position: [-1, 2, 1, 0], diffuse: [1, 1, 1, 1] });
  ff.enableLight(0);
  ff.setViewMatrix(mat4.lookAt(mat4.create(), [0, 7, 13], [0, 0.5, -4], [0, 1, 0]));
  ff.setProjectionMatrix(mat4.perspective(mat4.create(), Math.PI / 4, ANCHO_CANVAS / ALTO_CANVAS, 0.1, 100));
}

function configurarControles(): void {
  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Space' && !event.repeat) disparoPresionado = true;
    if (event.code === 'KeyR' && !event.repeat) reinicioPresionado = true;
    if (!event.repeat && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) estado.fuerza = Number(event.code.slice(-1));
    if (event.code === 'KeyF' && !event.repeat) estado.fuerza = estado.fuerza % 3 + 1;
    teclas.add(event.code);
  });
  window.addEventListener('keyup', (event) => teclas.delete(event.code));
}

function crearObjetivosIniciales(): Objetivo[] {
  return [
    { posicion: [-3.1, 1.25, -1.5], radio: 0.65, activo: true },
    { posicion: [0.4, 2, -4.5], radio: 0.7, activo: true },
    { posicion: [3, 2.8, -8], radio: 0.75, activo: true },
  ];
}

function reiniciarJuego(): void {
  estado.torretaX = 0;
  estado.elevacion = ELEVACION_INICIAL_GRADOS * GRADOS_A_RADIANES;
  estado.fuerza = FUERZA_INICIAL;
  estado.proyectilDisponible = true;
  estado.objetivos = crearObjetivosIniciales();
}

function direccionCanon(): Vector3 {
  return [0, Math.sin(estado.elevacion), -Math.cos(estado.elevacion)];
}

function posicionReposoProyectil(): Vector3 {
  const direccion = direccionCanon();
  return [
    estado.torretaX + direccion[0] * (LARGO_CANON + RADIO_PROYECTIL),
    BASE_CANON_Y + direccion[1] * (LARGO_CANON + RADIO_PROYECTIL),
    BASE_CANON_Z + direccion[2] * (LARGO_CANON + RADIO_PROYECTIL),
  ];
}

// Calcula cuándo el proyectil toca el suelo.
function calcularTiempoAterrizaje(alturaLanzamiento: number, velocidadVerticalLanzamiento: number): number {
  const a = 0.5 * GRAVEDAD;
  const b = -velocidadVerticalLanzamiento;
  const c = RADIO_PROYECTIL - alturaLanzamiento;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function disparar(): void {
  if (!estado.proyectilDisponible) return;
  const direccion = direccionCanon();
  const velocidad = VELOCIDADES_POR_FUERZA[estado.fuerza - 1];
  const posicionLanzamiento = posicionReposoProyectil();
  const velocidadLanzamiento = direccion.map((componente) => componente * velocidad) as Vector3;
  estado.posicionLanzamientoProyectil = posicionLanzamiento;
  estado.velocidadLanzamientoProyectil = velocidadLanzamiento;
  estado.tiempoVueloProyectil = 0;
  estado.tiempoAterrizajeProyectil = calcularTiempoAterrizaje(posicionLanzamiento[1], velocidadLanzamiento[1]);
  estado.posicionProyectil = posicionLanzamiento;
  estado.proyectilDisponible = false;
}

function actualizarObjeto3DTrayectoria(gl: WebGL2RenderingContext, objeto3D: Objeto3D): void {
  const direccion = direccionCanon();
  const velocidad = VELOCIDADES_POR_FUERZA[estado.fuerza - 1];
  const inicio = posicionReposoProyectil();
  const puntos = 24;
  const tiempoMaximo = direccion[2] < -0.001 ? Math.min(4, (inicio[2] + 12) / (velocidad * -direccion[2])) : 1.4;
  const vertices = new Float32Array(puntos * 6);
  for (let indice = 0; indice < puntos; indice += 1) {
    const t = (indice / (puntos - 1)) * tiempoMaximo;
    const x = inicio[0] + direccion[0] * velocidad * t;
    const y = Math.max(RADIO_PROYECTIL, inicio[1] + direccion[1] * velocidad * t - 0.5 * GRAVEDAD * t * t);
    const z = inicio[2] + direccion[2] * velocidad * t;
    const desplazamiento = indice * 6;
    vertices.set([x, y, z, 0, 1, 0], desplazamiento);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, objeto3D.bufferVertices);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
}

function actualizar(deltaTiempo: number): void {
  if (teclas.has('ArrowLeft')) estado.torretaX -= VELOCIDAD_HORIZONTAL * deltaTiempo;
  if (teclas.has('ArrowRight')) estado.torretaX += VELOCIDAD_HORIZONTAL * deltaTiempo;
  if (teclas.has('ArrowUp')) estado.elevacion += VELOCIDAD_ANGULAR * deltaTiempo;
  if (teclas.has('ArrowDown')) estado.elevacion -= VELOCIDAD_ANGULAR * deltaTiempo;
  estado.torretaX = Math.max(-LIMITE_TORRETA, Math.min(LIMITE_TORRETA, estado.torretaX));
  estado.elevacion = Math.max(ELEVACION_MINIMA, Math.min(ELEVACION_MAXIMA, estado.elevacion));

  if (disparoPresionado) disparar();
  disparoPresionado = false;
  if (reinicioPresionado) reiniciarJuego();
  reinicioPresionado = false;

  if (estado.proyectilDisponible) return;
  estado.tiempoVueloProyectil = Math.min(estado.tiempoVueloProyectil + deltaTiempo, estado.tiempoAterrizajeProyectil);
  const t = estado.tiempoVueloProyectil;
  const [lx, ly, lz] = estado.posicionLanzamientoProyectil;
  const [vx, vy, vz] = estado.velocidadLanzamientoProyectil;
  estado.posicionProyectil = [lx + vx * t, ly + vy * t - 0.5 * GRAVEDAD * t * t, lz + vz * t];
  if (estado.tiempoVueloProyectil >= estado.tiempoAterrizajeProyectil) {
    estado.proyectilDisponible = true;
    return;
  }
  for (const objetivo of estado.objetivos) {
    if (!objetivo.activo) continue;
    const dx = estado.posicionProyectil[0] - objetivo.posicion[0];
    const dy = estado.posicionProyectil[1] - objetivo.posicion[1];
    const dz = estado.posicionProyectil[2] - objetivo.posicion[2];
    const distanciaImpacto = objetivo.radio + RADIO_PROYECTIL;
    if (dx * dx + dy * dy + dz * dz <= distanciaImpacto * distanciaImpacto) {
      objetivo.activo = false;
      estado.proyectilDisponible = true;
      return;
    }
  }
}

const modelo = mat4.create();
const matrizNormal = mat3.create();

const MATERIAL_MATE: { specular: Color; shininess: number } = { specular: [0, 0, 0, 1], shininess: 0 };

// Esta función evita repetir la misma configuración cada vez que dibujo una pieza.
function dibujarObjeto(
  gl: WebGL2RenderingContext,
  ff: Graficos,
  objeto3D: Objeto3D,
  color: Color,
  transformacion: (matriz: mat4) => void,
  material: { specular: Color; shininess: number } = MATERIAL_MATE,
): void {
  ff.setMaterial({ ambient: color, diffuse: color, specular: material.specular, shininess: material.shininess });
  mat4.identity(modelo);
  transformacion(modelo);
  ff.setModelMatrix(modelo);
  ff.setNormalMatrix(mat3.normalFromMat4(matrizNormal, modelo));
  gl.bindVertexArray(objeto3D.vao);
  ff.drawElements(objeto3D.modo, objeto3D.cantidad, objeto3D.tipoIndice, 0);
}

function dibujandoAMondonguito(
  gl: WebGL2RenderingContext,
  ff: Graficos,
  cubo: Objeto3D,
  barra: Objeto3D,
  esfera: Objeto3D,
  cilindro: Objeto3D,
): void {
  const x = estado.torretaX;
  const metal = { specular: BRILLO_METAL, shininess: BRILLO_METAL_INTENSIDAD };

  for (const lado of [-0.9, 0.9]) {
    dibujarObjeto(gl, ff, cubo, COLOR_ORUGA, (m) => {
      mat4.translate(m, m, [x + lado, 0.3, BASE_CANON_Z]);
      mat4.scale(m, m, [0.45, 0.55, 1.5]);
    });
  }

  dibujarObjeto(gl, ff, cubo, COLOR_CASCO, (m) => { mat4.translate(m, m, [x, 0.65, BASE_CANON_Z]); mat4.scale(m, m, [2.4, 0.65, 1.8]); }, metal);
  dibujarObjeto(gl, ff, cubo, COLOR_CABINA, (m) => { mat4.translate(m, m, [x, 1.15, BASE_CANON_Z]); mat4.scale(m, m, [1.35, 0.45, 1.25]); }, metal);
  dibujarObjeto(gl, ff, cilindro, COLOR_CANON, (m) => {
    mat4.translate(m, m, [x, BASE_CANON_Y, BASE_CANON_Z]);
    mat4.rotateX(m, m, estado.elevacion);
    mat4.translate(m, m, [0, 0, -LARGO_CANON / 2]);
    mat4.scale(m, m, [0.28, 0.28, LARGO_CANON]);
  }, metal);
  dibujarObjeto(gl, ff, cilindro, COLOR_CANON, (m) => {
    mat4.translate(m, m, [x, BASE_CANON_Y, BASE_CANON_Z]);
    mat4.rotateX(m, m, estado.elevacion);
    mat4.translate(m, m, [0, 0, -LARGO_CANON]);
    mat4.scale(m, m, [0.38, 0.38, 0.3]);
  }, metal);

  for (let nivel = 0; nivel < 3; nivel += 1) {
    dibujarObjeto(gl, ff, barra, nivel < estado.fuerza ? BARRA_ACTIVA : BARRA_INACTIVA, (m) => {
      mat4.translate(m, m, [x + 1.15, 0.85 + nivel * 0.22, BASE_CANON_Z + 0.93]);
      mat4.scale(m, m, [0.45, 0.12, 0.08]);
    });
  }
  if (estado.proyectilDisponible) {
    dibujarObjeto(gl, ff, esfera, COLOR_PROYECTIL, (m) => {
      const [px, py, pz] = posicionReposoProyectil();
      mat4.translate(m, m, [px, py, pz]);
      mat4.scale(m, m, [RADIO_PROYECTIL, RADIO_PROYECTIL, RADIO_PROYECTIL]);
    });
  }
}

function renderizar(
  gl: WebGL2RenderingContext,
  ff: Graficos,
  figuras: { cubo: Objeto3D; barra: Objeto3D; plano: Objeto3D; esfera: Objeto3D; trayectoria: Objeto3D; cilindro: Objeto3D },
): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  dibujarObjeto(gl, ff, figuras.plano, COLOR_SUELO, (m) => mat4.identity(m));
  dibujandoAMondonguito(gl, ff, figuras.cubo, figuras.barra, figuras.esfera, figuras.cilindro);
  if (estado.proyectilDisponible) {
    actualizarObjeto3DTrayectoria(gl, figuras.trayectoria);
    dibujarObjeto(gl, ff, figuras.trayectoria, COLOR_TRAYECTORIA, (m) => mat4.identity(m));
  }
  if (!estado.proyectilDisponible) {
    dibujarObjeto(gl, ff, figuras.esfera, COLOR_PROYECTIL, (m) => {
      mat4.translate(m, m, estado.posicionProyectil);
      mat4.scale(m, m, [RADIO_PROYECTIL, RADIO_PROYECTIL, RADIO_PROYECTIL]);
    });
  }
  for (const objetivo of estado.objetivos) {
    if (!objetivo.activo) continue;
    dibujarObjeto(gl, ff, figuras.esfera, COLOR_OBJETIVO, (m) => {
      mat4.translate(m, m, objetivo.posicion);
      mat4.scale(m, m, [objetivo.radio, objetivo.radio, objetivo.radio]);
    });
  }
}

function ejecutar(lienzo: HTMLCanvasElement): void {
  const gl = obtenerContexto(lienzo);
  const ff = createFixedFunction(gl, { debug: true });
  const figuras = {
    cubo: crearObjeto3DCubo(gl),
    barra: crearObjeto3DParalelogramo(gl),
    plano: crearObjeto3DPlano(gl),
    esfera: crearObjeto3DEsfera(gl),
    trayectoria: crearObjeto3DTrayectoria(gl),
    cilindro: crearObjeto3DCilindro(gl),
  };
  configurarEstado(gl, lienzo);
  configurarEscena(ff);
  configurarControles();
  reiniciarJuego();

  let ultimoTiempo: number | null = null;
  function cuadro(ahora: number): void {
    if (ultimoTiempo === null) ultimoTiempo = ahora;
    const deltaTiempo = Math.min((ahora - ultimoTiempo) / 1000, DT_MAXIMO);
    ultimoTiempo = ahora;
    actualizar(deltaTiempo);
    renderizar(gl, ff, figuras);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}

const lienzo = document.createElement('canvas');
document.getElementById('stage')!.append(lienzo);
ejecutar(lienzo);
