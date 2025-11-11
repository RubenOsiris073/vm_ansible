document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Solo mostrar formulario de login por defecto
    loginForm.classList.add('active');
    registerForm.classList.remove('active');

    // Función para mostrar mensajes
    function showMessage(message, isError = false) {
        // Eliminar mensajes anteriores
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Crear nuevo mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = isError ? 'error-message' : 'success-message';
        messageDiv.textContent = message;
        
        // Insertar antes del formulario activo
        const activeForm = document.querySelector('.form.active');
        activeForm.parentNode.insertBefore(messageDiv, activeForm);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Manejo del formulario de login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage('¡Login exitoso! Redirigiendo...', false);
                // Redirigir después de un breve delay
                setTimeout(() => {
                    window.location.href = result.redirect || '/';
                }, 1500);
            } else {
                showMessage(result.message || 'Error en el login', true);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', true);
            console.error('Error:', error);
        }
    });

    // Manejo del formulario de registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const captchaValue = document.getElementById('captcha').value;
        if (captchaValue !== '8') {
            showMessage('Captcha incorrecto. La respuesta correcta es 8.', true);
            document.getElementById('captcha').focus();
            return;
        }

        const formData = {
            nombre: document.getElementById('nombre').value,
            apellido_paterno: document.getElementById('apellido-paterno').value,
            apellido_materno: document.getElementById('apellido-materno').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            captcha: captchaValue
        };
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage('¡Registro exitoso!', false);
                // Limpiar formulario
                registerForm.reset();
                // Cambiar a login después de un delay
                setTimeout(() => {
                    registerForm.classList.remove('active');
                    loginForm.classList.add('active');
                    document.getElementById('form-title').textContent = 'Iniciar Sesión';
                }, 2000);
            } else {
                showMessage(result.message || 'Error en el registro', true);
            }
        } catch (error) {
            showMessage('Error de conexión. Intenta nuevamente.', true);
            console.error('Error:', error);
        }
    });
});