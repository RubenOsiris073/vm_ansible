document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    let adminToken = null;
    let selectedRole = null;

    const steps = {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3')
    };

    const dots = {
        1: document.getElementById('dot-1'),
        2: document.getElementById('dot-2'),
        3: document.getElementById('dot-3')
    };

    // Función para mostrar mensajes
    function showMessage(message, isError = false) {
        // Eliminar mensajes anteriores
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Crear nuevo mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = isError ? 'error-message' : 'success-message';
        messageDiv.textContent = message;
        
        // Insertar en el step activo
        const activeStep = document.querySelector('.step.active');
        activeStep.insertBefore(messageDiv, activeStep.querySelector('form') || activeStep.querySelector('.role-option') || activeStep.children[2]);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Función para cambiar de paso
    function changeStep(step) {
        // Ocultar todos los pasos
        Object.values(steps).forEach(stepEl => stepEl.classList.remove('active'));
        Object.values(dots).forEach(dot => dot.classList.remove('active'));
        
        // Mostrar el paso actual
        steps[step].classList.add('active');
        dots[step].classList.add('active');
        
        currentStep = step;
    }

    // Manejar autenticación de admin
    document.getElementById('admin-auth-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success && result.user.role === 'admin') {
                adminToken = result.user;
                showMessage('✓ Autenticación exitosa. Proceder a seleccionar rol.', false);
                setTimeout(() => changeStep(2), 1500);
            } else if (result.success && result.user.role !== 'admin') {
                showMessage('Acceso denegado. Solo administradores pueden registrar usuarios.', true);
            } else {
                showMessage(result.message || 'Credenciales incorrectas', true);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', true);
            console.error('Error:', error);
        }
    });

    // Manejar selección de roles
    document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remover selección anterior
            document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('selected'));
            
            // Seleccionar nueva opción
            this.classList.add('selected');
            selectedRole = this.dataset.role;
            
            // Habilitar botón siguiente
            document.getElementById('next-to-step3').disabled = false;
        });
    });

    // Función global para siguiente paso
    window.nextStep = function() {
        if (currentStep === 2 && selectedRole) {
            // Mostrar rol seleccionado en step 3
            const roleDisplay = document.getElementById('selected-role-display');
            const roleTexts = {
                admin: '👨‍💼 Administrador - Acceso completo',
                supervisor: '👨‍🏫 Supervisor - Operaciones completas sin gestión de usuarios',
                tecnico: '🔧 Técnico - Solo consultas y diagnóstico',
                operador: '⚡ Operador - Operaciones básicas de red',
                readonly: '👀 Solo Lectura - Solo visualización'
            };
            
            roleDisplay.innerHTML = `
                <div style="background: rgba(0, 122, 204, 0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #007acc;">
                    <strong>Rol seleccionado:</strong> ${roleTexts[selectedRole]}
                </div>
            `;
            
            changeStep(3);
        }
    };

    // Función global para paso anterior
    window.prevStep = function() {
        if (currentStep > 1) {
            changeStep(currentStep - 1);
        }
    };

    // Manejar registro de usuario
    document.getElementById('user-register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('user-password-confirm').value;
        
        // Validar contraseñas
        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden', true);
            return;
        }
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', true);
            return;
        }
        
        try {
            const response = await fetch('/api/admin/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminUser: adminToken,
                    newUser: {
                        email: email,
                        password: password,
                        role: selectedRole
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(`✓ Usuario registrado exitosamente con rol ${selectedRole}`, false);
                
                // Limpiar formulario
                document.getElementById('user-register-form').reset();
                
                // Volver al paso 1 después de un delay
                setTimeout(() => {
                    changeStep(1);
                    document.getElementById('admin-auth-form').reset();
                    adminToken = null;
                    selectedRole = null;
                    document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('selected'));
                    document.getElementById('next-to-step3').disabled = true;
                }, 3000);
            } else {
                showMessage(result.message || 'Error en el registro', true);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', true);
            console.error('Error:', error);
        }
    });

    console.log('Admin Register loaded');
});