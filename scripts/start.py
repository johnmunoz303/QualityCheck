"""Inicia Django, conserva la consola y abre el navegador solo cuando el servidor arranca."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import webbrowser

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description='Iniciar QualityCheck en este equipo.')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('El puerto debe estar entre 1024 y 65535.')
    if not (ROOT / 'frontend' / 'dist' / 'index.html').exists():
        print('Falta compilar React. Ejecuta Preparar.ps1 primero.', flush=True)
        return 1
    url = f'http://127.0.0.1:{args.port}/'
    print('Iniciando QualityCheck. Mantén esta ventana abierta.', flush=True)
    print('Ctrl+C detiene el servidor.', flush=True)
    environment = os.environ.copy()
    environment['PYTHONUNBUFFERED'] = '1'
    # La salida por pipe evita que Django consulte el registro de colores de Windows.
    server = subprocess.Popen(
        [sys.executable, '-u', 'manage.py', 'runserver', f'127.0.0.1:{args.port}', '--noreload', '--no-color'],
        cwd=ROOT / 'backend', env=environment,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding='utf-8', errors='replace',
    )
    ready = False
    try:
        for line in server.stdout:
            print(line, end='', flush=True)
            if not ready and 'Starting development server at' in line:
                ready = True
                print(f'\nQualityCheck iniciado: {url}', flush=True)
                if not args.no_browser:
                    try:
                        webbrowser.open(url)
                    except OSError:
                        print(f'Abre manualmente {url}', flush=True)
        code = server.wait()
        if not ready:
            print('El servidor no llegó a iniciar. Consulta el error anterior.', flush=True)
        return code if ready else (code or 1)
    except KeyboardInterrupt:
        print('\nDeteniendo QualityCheck…', flush=True)
        return 0
    finally:
        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


if __name__ == '__main__':
    raise SystemExit(main())
