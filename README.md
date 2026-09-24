# El Universo de Mire

Cada flor es una pequeña estrella. Una galaxia de flores amarillas en 3D, con Mire en el centro y treinta formas de decir «la mejor amiga».

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

- 60 flores en escritorio y 44 en dispositivos compactos, con doce geometrías: margarita, girasol, ranúnculo, tulipán, flor silvestre, estrella de oro, lirio, narciso, dalia, amapola, crisantemo y orquídea.
- Pétalos curvos con color por vértice y centros con semillas en espiral. Profundidad, iluminación cálida y cuatro ejes orbitales.
- Galaxia espiral con nebulosas animadas, polvo estelar, estrellas de brillo variable y estrellas fugaces ocasionales. Hasta 12.300 puntos de luz en escritorio y 6.600 en móvil.
- Introducción automática de 4,5 segundos, parallax con cursor o dedo, halo central y constelaciones sutiles. Las flores reservan espacio alrededor de la dedicatoria.
- Acercarse a una flor realza su color y tamaño y frena su órbita. Pulsarla revela su traducción durante cinco segundos.
- Máximo de cuatro etiquetas discretas en escritorio y dos en vertical; las demás aparecen al interactuar. El catálogo permite buscar treinta idiomas, ignora las tildes al buscar y admite escritura de derecha a izquierda.
- Pausa completa de la escena, respeto por `prefers-reduced-motion`, pausa al ocultar la pestaña o abrir el catálogo y alternativa legible si WebGL no está disponible.

## Estructura

```text
index.html                    Interfaz y contenido accesible
src/main.js                   Estados, idiomas y catálogo
src/style.css                 Tipografía, responsive y transiciones
src/scene/universe.js          Cámara, órbitas, raycasting y bucle
src/scene/flowers.js           Geometría procedural de las flores
src/scene/math.js              Aleatoriedad reproducible y suavizado
src/scene/galaxy.js            Distribución espiral de estrellas y flores
src/effects/galactic-atmosphere.js  Nebulosas, polvo estelar y estrellas fugaces
src/data/translations.js       Treinta idiomas
public/                       Icono y entrada compatible
```

## Rendimiento

Se agrupan las flores en dos `InstancedMesh` por variedad, con un tercer grupo para las variedades con tallo. Las partículas usan `BufferGeometry` y shaders. Geometrías reutilizadas, sin sombras dinámicas ni un postprocesado costoso. El halo simula el resplandor con sprites y mezcla aditiva.

La nebulosa se calcula en una textura pequeña ocho veces por segundo y se amplía suavemente. Las flores y las estrellas mantienen su propio ritmo de animación; así se evita recalcular el ruido procedural sobre cada píxel de pantalla en cada fotograma.

Se limita la densidad de píxeles a 1,75 en escritorio y 1,35 en pantallas compactas. Si se detectan fotogramas lentos, se reduce a 1 y se recortan partículas, conservando las flores. El rendimiento depende de la GPU y del navegador.

Las fuentes Cormorant Garamond y Manrope se solicitan a Google Fonts; hay fuentes serif y sans-serif de respaldo. El resto de la experiencia se sirve desde el propio proyecto, sin modelos ni imágenes externas.

## Publicar

Para que alguien lo vea desde su celular o laptop, comparte una dirección HTTPS de la web publicada. `localhost` solo apunta al dispositivo desde el que se abre; el enlace del repositorio muestra el código.

### Publicación manual en Netlify

1. Ejecuta `npm run build` para actualizar `dist/`.
2. Inicia sesión en [Netlify Drop](https://app.netlify.com/drop) y arrastra la carpeta `dist` completa. También puedes extraer el paquete de producción preparado localmente en `artifacts/universo-mire-web.zip` y arrastrar la carpeta extraída que contiene `index.html`.
3. Abre la dirección HTTPS que te entregue Netlify, comprueba que su visibilidad permita visitantes externos y comparte ese enlace con tu amiga. Podrá abrirlo en un navegador con WebGL, sin instalar nada y aunque tu computadora esté apagada.

El código fuente de GitHub puede seguir privado. La web publicada será accesible a quienes tengan su enlace si la configuras como pública. Para actualizarla, vuelve a generar `dist` y súbela en la sección Deploys del mismo proyecto.

También puedes conectar este repositorio a Netlify para despliegues automáticos: comando de construcción `npm run build`, directorio de publicación `dist`. El archivo `netlify.toml` ya contiene esos valores.

Para GitHub Pages, se necesita habilitar Pages y desplegar `dist`. GitHub Free admite Pages en repositorios públicos; servir desde un repositorio privado requiere un plan compatible. Subir el código por sí solo no publica una web.

Documentación: [Netlify: publicación manual](https://docs.netlify.com/deploy/create-deploys/#drag-and-drop) y [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Base conservada

La versión original utilizaba ocho flores SVG en una órbita plana. Esta reconstrucción conserva Mire, el amarillo/dorado, Cormorant Garamond y las ocho traducciones originales, y añade profundidad real con Three.js.

Referencias técnicas: [Three.js](https://threejs.org/docs/) y [despliegue de Vite](https://vite.dev/guide/static-deploy.html).
