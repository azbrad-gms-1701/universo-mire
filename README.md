# El Universo de Mire

Cada flor es una pequeña estrella. Una experiencia contemplativa de flores amarillas en 3D, con Mire en el centro y quince formas de decir «la mejor amiga».

## Ejecutar

Requiere Node.js 20.19+ o 22.12+ (comprobado con Node.js 24).

```sh
npm install
npm run dev
```

Para generar y revisar la versión de producción:

```sh
npm run build
npm run preview
```

El resultado está en `dist/`. Las rutas relativas permiten servirlo tanto en un dominio como dentro de una subcarpeta. `universo-mire.html` mantiene la entrada del proyecto original y dirige a la nueva experiencia. Los módulos ES requieren un servidor; no se debe abrir el HTML con `file://`.

## La experiencia

- 54 flores en escritorio y 40 en dispositivos compactos, con seis geometrías: margarita, girasol, ranúnculo, tulipán, flor silvestre y flor de fantasía.
- Pétalos curvos con color por vértice y centros con semillas en espiral. Profundidad, iluminación cálida y cuatro ejes orbitales.
- Introducción automática de 4,5 segundos, parallax con cursor o dedo, partículas en tres planos, halo central y constelaciones sutiles.
- Acercarse a una flor realza su color y tamaño y frena su órbita. Pulsarla revela su traducción durante cinco segundos.
- Máximo de cuatro etiquetas discretas en escritorio y dos en vertical; las demás aparecen al interactuar. El catálogo permite leer los quince idiomas con teclado o lector de pantalla.
- Pausa completa de la escena, respeto por `prefers-reduced-motion`, pausa al ocultar la pestaña o abrir el catálogo y alternativa legible si WebGL no está disponible.

## Estructura

```text
index.html                    Interfaz y contenido accesible
src/main.js                   Estados, idiomas y catálogo
src/style.css                 Tipografía, responsive y transiciones
src/scene/universe.js          Cámara, órbitas, raycasting y bucle
src/scene/flowers.js           Geometría procedural de las flores
src/scene/math.js              Aleatoriedad reproducible y suavizado
src/effects/atmosphere.js      Partículas, halo y constelaciones del núcleo
src/data/translations.js       Quince idiomas
public/                       Icono y entrada compatible
```

## Rendimiento

Se agrupan todas las flores en doce `InstancedMesh`; la escena completa utiliza unas 24 llamadas de dibujo. Las partículas usan `BufferGeometry` y shaders con movimiento independiente. Geometrías reutilizadas, sin sombras dinámicas ni un postprocesado costoso. El halo simula el resplandor con sprites y mezcla aditiva.

Se limita la densidad de píxeles a 1,75 en escritorio y 1,35 en pantallas compactas. Si se detectan fotogramas lentos, se reduce a 1 y se recortan partículas, conservando las flores. El rendimiento depende de la GPU y del navegador.

Las fuentes Cormorant Garamond y Manrope se solicitan a Google Fonts; hay fuentes serif y sans-serif de respaldo. El resto de la experiencia se sirve desde el propio proyecto, sin modelos ni imágenes externas.

## Publicar

Sube el contenido de `dist/` a un alojamiento estático. Para GitHub Pages, el repositorio necesita Pages habilitado y un despliegue de esa carpeta; subir el código por sí solo no activa una web pública.

## Base conservada

La versión original utilizaba ocho flores SVG en una órbita plana. Esta reconstrucción conserva Mire, el amarillo/dorado, Cormorant Garamond y las ocho traducciones originales, y añade profundidad real con Three.js.

Referencias técnicas: [Three.js](https://threejs.org/docs/) y [despliegue de Vite](https://vite.dev/guide/static-deploy.html).
