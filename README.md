# QualityCheck

Aplicación académica de gestión y evaluación de la calidad de software: React + Django REST Framework + SQLite. Interfaz en español, acceso por sesión, persistencia real y módulos de proyectos, requisitos, casos de prueba, ejecuciones, defectos, indicadores y evaluaciones.

## Inicio en Windows

Requisitos: Python 3.11 o superior; Node.js 22.12 o superior con npm; PowerShell. Se verificó con Python 3.13 y Node 22.22. La primera preparación requiere Internet para descargar dependencias.

Desde una terminal situada en esta carpeta:

```powershell
.\Preparar.ps1
.\Iniciar.ps1
```

Abra **http://127.0.0.1:8000**. La aplicación sirve React y la API desde el mismo origen; no es necesario iniciar dos servidores para la demostración. La terminal debe permanecer abierta; Ctrl+C detiene el servidor.

**En este equipo ya preparado:** haga doble clic en `Iniciar.cmd`. Se abrirá una consola que debe permanecer abierta y el navegador se abrirá al arrancar Django. Si la ventana se cierra o se detiene el servidor, localhost deja de funcionar. Este iniciador evita el bloqueo de archivos PowerShell y el problema de detección de colores de algunas terminales Windows.

Para elegir otro puerto: `.venv\Scripts\python.exe scripts/start.py --port 8001`. La dirección será `http://127.0.0.1:8001/`. Para arrancar sin abrir un navegador automáticamente, añada `--no-browser`.

Si PowerShell bloquea la ejecución de archivos, puede usar el modo manual de abajo sin cambiar la política del equipo.

### Acceso local inicial

- Usuario: `admin`
- Contraseña: `QualityCheck2026!`

Es una cuenta de demostración local. Puede definir `$env:QC_DEMO_PASSWORD` **antes de la primera ejecución** de `seed_demo` para elegir otra contraseña. Las ejecuciones posteriores no cambian contraseñas ni sobrescriben datos. Para cambiarla posteriormente: `.venv\Scripts\python.exe backend\manage.py changepassword admin`.

### Preparación manual

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --index-url https://pypi.org/simple -r backend/requirements.txt
cd frontend
npm.cmd ci
npm.cmd run build
cd ../backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py seed_demo
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload
```

### Desarrollo con recarga de React

Terminal 1: iniciar Django en el puerto 8000. Terminal 2: `cd frontend` y `npm.cmd run dev`. Abrir la URL que imprime Vite (normalmente http://127.0.0.1:5173). Su proxy dirige `/api` a Django y mantiene las sesiones y CSRF en el mismo origen. Use siempre el mismo hostname durante una sesión.

## Uso

1. Iniciar sesión y crear un proyecto, o seleccionar el ejemplo incluido.
2. Registrar requisitos y prioridades.
3. Crear casos vinculados a requisitos del mismo proyecto.
4. Ejecutar las pruebas en el producto evaluado y registrar el resultado, ejecutor y evidencia textual. QualityCheck **registra pruebas manuales; no ejecuta automáticamente otro software**.
5. Documentar defectos y responsables; anotar corrección y verificación antes de resolverlos.
6. Consultar indicadores calculados a partir de los registros.
7. Registrar evaluaciones con criterio, método, meta, resultado, ambiente, muestra, evidencia y limitaciones.
8. Abrir el informe, exportar JSON o usar **Imprimir / PDF** y elegir «Guardar como PDF» en el navegador.

## Datos y persistencia

`backend/db.sqlite3` contiene la información. Al cerrar el navegador o detener el servidor los registros permanecen. Para respaldarlos, detenga el servidor y copie ese archivo. No se guarda la información del negocio en localStorage: solo se recuerda el proyecto seleccionado.

`seed_demo` crea un escenario marcado como **demostración**: Inventario de una tienda, con 8 requisitos, 10 casos y ejecuciones, 3 defectos y 3 evaluaciones. Todas esas evidencias son ficticias. No incluye un sistema de inventario independiente.

## Verificaciones reproducibles

```powershell
.\Verificar.ps1
```

También puede ejecutar por separado, desde esta carpeta:

```powershell
.\.venv\Scripts\python.exe scripts/verify.py
cd frontend
npm.cmd test
npm.cmd run build
```

El script de Python guarda el resultado de 30 pruebas de integración/lógica, mediciones locales de API y la verificación de lectura desde un intérprete nuevo en `docs/evidencias/`. Las pruebas de React verifican 8 recorridos con una API simulada; no sustituyen las pruebas manuales en un navegador real. `scripts/http_check.py` comprueba además el recorrido completo mediante 19 solicitudes HTTP reales sobre una copia temporal de SQLite.

Análisis estático reproducible:

```powershell
.\.venv\Scripts\python.exe -m pip install ruff==0.14.14
.\.venv\Scripts\ruff.exe check backend scripts
```

## Límites del prototipo

- Un perfil administrador; todos los administradores pueden gestionar todos los proyectos. No hay aislamiento por organización.
- Evidencia textual; sin carga de archivos, notificaciones, IA, integraciones externas ni automatización de pruebas de otros productos.
- No hay borrado de registros desde la interfaz/API; conserva trazabilidad y ejecuciones históricas.
- El informe exporta JSON y usa la impresión del navegador para PDF; no genera un archivo DOCX ni un PDF desde el servidor.
- El servidor de desarrollo está configurado para demostración local. Una publicación en Internet requiere configuración de producción, secretos, HTTPS y un servidor adecuado.
- La revisión visual en navegador quedó pendiente por el bloqueo de localhost en el entorno de construcción. API, compilación, pruebas de React y pruebas de backend tienen evidencia verificable.
