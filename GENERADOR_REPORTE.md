# Generador de Reporte DOCX

## Descripción

Script Python que genera un reporte completo en formato DOCX (.docx) basado en el contenido del repositorio y los archivos markdown.

## Características

- **Portada profesional** con título del proyecto y fecha de generación
- **Contenido del README.md** parseado y formateado
- **Estructura completa del repositorio** con árbol de directorios
- **Guía SSH y K3s** desde SSH_k3s_quick.md
- **Inventario de componentes**: Apps, Playbooks, Roles
- **Bloques de código** con formato monoespaciado
- **Secciones organizadas** con encabezados jerárquicos

## Requisitos

Instalar las dependencias de Python:

```bash
pip3 install python-docx markdown
```

## Uso

### Ejecución Simple

Desde la raíz del repositorio:

```bash
python3 scripts/generate_report.py
```

### Ejecución desde cualquier ubicación

```bash
cd /ruta/al/repositorio/vm_ansible
python3 scripts/generate_report.py
```

## Salida

El script genera un archivo DOCX con el siguiente formato de nombre:

```
RouterLab_Reporte_YYYYMMDD_HHMMSS.docx
```

Ejemplo: `RouterLab_Reporte_20251205_225831.docx`

## Contenido del Reporte

El reporte incluye las siguientes secciones:

1. **Portada**
   - Título del proyecto
   - Fecha y hora de generación
   - Información de Git (rama y commit)

2. **Índice**
   - Lista de secciones principales

3. **Contenido del README.md**
   - Arquitectura del sistema
   - Accesos y credenciales
   - Guías de inicio rápido
   - Comandos y configuraciones
   - APIs del sistema

4. **Estructura del Repositorio**
   - Árbol de directorios completo
   - Archivos principales

5. **Guía SSH y K3s**
   - Comandos SSH remotos
   - Gestión de Kubernetes
   - Comandos k3s específicos

6. **Inventario de Componentes**
   - Aplicaciones (apps/)
   - Playbooks de Ansible
   - Roles de Ansible

7. **Conclusión**
   - Resumen del proyecto

## Personalización

### Modificar profundidad del árbol de directorios

Editar el parámetro `max_depth` en la función `get_directory_structure`:

```python
structure = get_directory_structure(repo_path, max_depth=3)  # Cambiar 3 por el valor deseado
```

### Agregar nuevas secciones

Agregar código después de procesar los archivos markdown:

```python
doc.add_page_break()
add_heading(doc, 'Nueva Sección', 1)
doc.add_paragraph('Contenido de la nueva sección...')
```

### Excluir archivos del reporte

Modificar la lista de exclusión en `get_directory_structure`:

```python
items = [item for item in items if not item.startswith('.') 
         and item not in ['node_modules', '__pycache__', 'venv', 'nuevo_dir_a_excluir']]
```

## Notas Técnicas

- Los archivos generados se ignoran automáticamente en Git (ver `.gitignore`)
- El script detecta automáticamente la ruta del repositorio
- Los bloques de código se formatean con fuente `Courier New`
- Las listas markdown se convierten a listas con viñetas de Word
- Los encabezados mantienen su jerarquía (H1, H2, H3)

## Solución de Problemas

### Error: ModuleNotFoundError

Si falta alguna dependencia:

```bash
pip3 install --user python-docx markdown
```

### Error: Permission denied

Asegurarse de que el script sea ejecutable:

```bash
chmod +x scripts/generate_report.py
```

### Reporte vacío o incompleto

Verificar que existan los archivos markdown:

```bash
ls -l README.md SSH_k3s_quick.md
```

## Integración con Ansible

Puedes agregar una tarea en un playbook para generar el reporte automáticamente:

```yaml
- name: Generar reporte DOCX del proyecto
  command: python3 scripts/generate_report.py
  args:
    chdir: /ruta/al/repositorio
  delegate_to: localhost
  run_once: true
```

## Ejemplos de Uso

### Generar reporte y enviarlo por email

```bash
python3 scripts/generate_report.py
# Usar mutt, mail o similar para enviar el archivo generado
```

### Generar múltiples reportes con diferentes configuraciones

```bash
# Crear copia del script con diferentes parámetros
cp scripts/generate_report.py scripts/generate_report_extended.py
# Editar generate_report_extended.py y cambiar max_depth, secciones, etc.
python3 scripts/generate_report_extended.py
```

## Licencia

Este script es parte del proyecto RouterLab y sigue la misma licencia del repositorio.
