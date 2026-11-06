# Integrantes:
- Jose Revete
- Ian Garcia

# Apuntar al objetivo

Juego de práctica de lanzamiento de esferas en 3D para CI4321 (Fase 1). La
escena se construye en TypeScript usando WebGL2 y la biblioteca FixedFunction
entregada con el proyecto.

## Escena

- Campo plano marrón sobre un fondo azul cielo.
- Torreta gris oscuro con cuerpo, orugas, torreta, cañón e indicador de fuerza.
- Proyectil esférico negro.
- Tres objetivos esféricos anaranjado rojizo.
- Vista previa de la trayectoria parabólica, actualizada al cambiar la posición,
  elevación o fuerza.

## Controles

| Tecla | Acción |
| --- | --- |
| `←` / `→` | Mover horizontalmente la torreta dentro de sus límites |
| `↑` / `↓` | Subir o bajar el cañón entre 5° y 90° |
| `1`, `2`, `3` | Elegir nivel de fuerza |
| `F` | Alternar el nivel de fuerza |
| `Espacio` | Disparar si la esfera está disponible |
| `R` | Reiniciar torreta, proyectil y objetivos |

Solo existe un proyectil en vuelo. Su posición se calcula de forma analítica
(cinemática cerrada) a partir del tiempo transcurrido desde el disparo, y el
instante exacto de impacto con el suelo se resuelve de antemano, por lo que un
mismo disparo dura lo mismo y cae en el mismo lugar sin importar la tasa de
fotogramas. Al tocar el suelo o un objetivo, el proyectil vuelve a estar
disponible.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173` en un navegador con soporte WebGL2.

## Validación

```bash
npm run build
```

El comando verifica los tipos con TypeScript y genera la aplicación con Vite.
El archivo `src/vendor/ff/ff.ts` no se modifica.
