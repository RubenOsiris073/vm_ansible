# Copilot Instructions for VM Ansible Project

## Project Overview
This is an Ansible-based infrastructure project for virtual machine provisioning, configuration, and management. Focus on simple, readable YAML files without emojis or complex syntax and without bash scripts, all in command.

## Architecture & Structure
- `playbooks/` - Main automation workflows organized by function (provision, configure, deploy)
- `roles/` - Reusable Ansible roles following the standard directory structure
- `inventory/` - Environment-specific host inventories (dev, staging, prod)
- `group_vars/` & `host_vars/` - Variable definitions organized by groups and individual hosts
- `filter_plugins/` - Custom Jinja2 filters for template processing
- `library/` - Custom Ansible modules for specialized tasks

## YAML Style Guidelines
- Keep YAML simple and readable - no fancy syntax or emojis
- Use clear, descriptive names for tasks and variables
- Always include `name:` field for every task
- Prefer explicit over implicit syntax
- Use consistent indentation (2 spaces)

## Key Patterns & Conventions

### Variable Hierarchy
Follow Ansible's variable precedence order. Environment-specific configs go in `inventory/group_vars/`, while role defaults use `roles/*/defaults/main.yml`.

### Role Structure
Each role follows standard layout: `tasks/main.yml`, `handlers/main.yml`, `defaults/main.yml`, `vars/main.yml`, `templates/`, `files/`.

### Playbook Organization
- Use `import_playbook` for modular playbook composition
- Tag tasks consistently: `--tags "provision,configure,deploy"`
- Include pre-tasks for validation and post-tasks for cleanup

### Template Naming
Jinja2 templates use `.j2` extension and match target filename: `nginx.conf.j2` → `nginx.conf`

## Comandos Esenciales (Always Include These)

### Comandos Básicos Diarios
```bash
# Validar sintaxis YAML
ansible-playbook --syntax-check playbooks/site.yml

# Ejecutar en modo prueba (dry-run)
ansible-playbook -C playbooks/site.yml -i inventory/hosts

# Ejecutar playbook real
ansible-playbook playbooks/site.yml -i inventory/hosts

# Ver hosts disponibles
ansible all -i inventory/hosts --list-hosts

# Ping a todos los hosts
ansible all -i inventory/hosts -m ping
```

### Gestión de Vault (Datos Sensibles)
```bash
# Crear archivo vault
ansible-vault create group_vars/all/vault.yml

# Editar archivo vault existente
ansible-vault edit group_vars/all/vault.yml

# Ejecutar playbook con vault
ansible-playbook playbooks/site.yml -i inventory/hosts --ask-vault-pass
```

### Debugging y Troubleshooting
```bash
# Modo verbose (útil para debugging)
ansible-playbook playbooks/site.yml -i inventory/hosts -vvv

# Ejecutar solo ciertas tareas por tags
ansible-playbook playbooks/site.yml -i inventory/hosts --tags "install,config"

# Ejecutar en un host específico
ansible-playbook playbooks/site.yml -i inventory/hosts --limit "servidor01"
```

### Estructura de Inventario Simple
```ini
[webservers]
web01 ansible_host=192.168.1.10
web02 ansible_host=192.168.1.11

[dbservers] 
db01 ansible_host=192.168.1.20
```

## Common Gotchas
- Always use `become: yes` explicitly rather than relying on defaults
- Quote variables in conditionals: `when: "{{ ansible_os_family }}" == "RedHat"`
- Use `changed_when: false` for read-only tasks to avoid unnecessary change reports
- Handlers only run once per play, even if notified multiple times

## Integration Points
- CI/CD pipelines expect `ansible-playbook` commands with specific inventory paths
- Monitoring integration through custom facts in `roles/*/tasks/main.yml`
- Log aggregation configured via templates in `roles/logging/templates/`