document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const roleSelect = document.getElementById('role');
    const superiorCodeGroup = document.getElementById('superior-code-group');
    const superiorCodeInput = document.getElementById('superior-code');

    // Manejo del formulario de registro
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
    // Obtener valores de los campos
    const nombre = document.getElementById('nombre').value.trim();
    const apellidoPaterno = document.getElementById('apellido-paterno').value.trim();
    const apellidoMaterno = document.getElementById('apellido-materno').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const captchaValue = document.getElementById('captcha').value;
    const role = roleSelect ? roleSelect.value : 'usuario';
    const superiorCode = superiorCodeInput ? superiorCodeInput.value.trim() : '';

        // Validar formulario
        if (!validateForm(nombre, apellidoPaterno, apellidoMaterno, email, password, confirmPassword, captchaValue, role, superiorCode)) {
            return;
        }

        // Crear objeto con los datos del usuario
        const userData = {
            nombre: nombre,
            apellidoPaterno: apellidoPaterno,
            apellidoMaterno: apellidoMaterno,
            email: email,
            password: password,
            fechaRegistro: new Date().toISOString()
        };
        // Añadir rol y código de superior si aplica
        userData.role = role;
        if (role === 'administrador') {
            userData.superiorCode = superiorCode;
        }
        
        // Simular proceso de registro
        console.log('Datos de registro:', userData);
        
        // Mostrar mensaje de éxito
        showSuccessMessage();
        
        // Limpiar formulario
        registerForm.reset();
        // Asegurar que el campo de código de superior se oculte al resetear
        if (superiorCodeGroup) {
            superiorCodeGroup.classList.add('hidden');
            if (superiorCodeInput) superiorCodeInput.removeAttribute('required');
        }
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    });

    // Función de validación completa
    function validateForm(nombre, apellidoPaterno, apellidoMaterno, email, password, confirmPassword, captcha, role, superiorCode) {
        
        // Validar campos vacíos
        if (!nombre || !apellidoPaterno || !apellidoMaterno || !email || !password || !confirmPassword) {
            showError('Todos los campos son obligatorios.');
            return false;
        }

        // Validar longitud del nombre
        if (nombre.length < 2) {
            showError('El nombre debe tener al menos 2 caracteres.');
            return false;
        }

        // Validar apellidos
        if (apellidoPaterno.length < 2) {
            showError('El apellido paterno debe tener al menos 2 caracteres.');
            return false;
        }

        if (apellidoMaterno.length < 2) {
            showError('El apellido materno debe tener al menos 2 caracteres.');
            return false;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Por favor, ingresa un correo electrónico válido.');
            return false;
        }

        // Validar fortaleza de contraseña
        if (password.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres.');
            return false;
        }

        // Validar que la contraseña tenga al menos una letra y un número
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
            showError('La contraseña debe contener al menos una letra y un número.');
            return false;
        }

        // Validar confirmación de contraseña
        if (password !== confirmPassword) {
            showError('Las contraseñas no coinciden.');
            document.getElementById('confirm-password').focus();
            return false;
        }

        // Validar captcha
        if (captcha !== '8') {
            showError('Captcha incorrecto. La respuesta correcta es 8.');
            document.getElementById('captcha').focus();
            return false;
        }

        // Si el rol es administrador, validar el código del superior
        if (role === 'administrador') {
            if (!superiorCode || superiorCode.length < 3) {
                showError('Si seleccionas Administrador debes proporcionar el código de un superior (mínimo 3 caracteres).');
                if (superiorCodeInput) superiorCodeInput.focus();
                return false;
            }
            // Nota: la verificación real del código debe hacerse en el servidor.
        }

        return true;
    }

    // Función para mostrar mensajes de error
    function showError(message) {
        // Remover mensaje anterior si existe
        removeMessage();

        // Crear nuevo mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
        
        // Insertar antes del formulario
        const formContainer = document.querySelector('.form-container');
        formContainer.insertBefore(errorDiv, registerForm);

        // Scroll hacia arriba para ver el mensaje
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remover después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Función para mostrar mensaje de éxito
    function showSuccessMessage() {
        removeMessage();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = '<strong>¡Éxito!</strong> Cuenta creada exitosamente. Redirigiendo al login...';
        
        const formContainer = document.querySelector('.form-container');
        formContainer.insertBefore(successDiv, registerForm);

        // Scroll hacia arriba para ver el mensaje
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Función para remover mensajes existentes
    function removeMessage() {
        const existingMessage = document.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Validación en tiempo real para la confirmación de contraseña
    document.getElementById('confirm-password').addEventListener('input', function() {
        const password = document.getElementById('register-password').value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.style.borderColor = '#ff6b6b';
        } else {
            this.style.borderColor = '#e1e8ed';
        }
    });

    // Validación en tiempo real para el email
    document.getElementById('register-email').addEventListener('blur', function() {
        const email = this.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.style.borderColor = '#ff6b6b';
        } else {
            this.style.borderColor = '#e1e8ed';
        }
    });

    // Mostrar/ocultar campo de código de superior según el rol
    if (roleSelect && superiorCodeGroup && superiorCodeInput) {
        roleSelect.addEventListener('change', function() {
            if (this.value === 'administrador') {
                superiorCodeGroup.classList.remove('hidden');
                superiorCodeInput.setAttribute('required', 'required');
                superiorCodeInput.focus();
            } else {
                superiorCodeGroup.classList.add('hidden');
                superiorCodeInput.removeAttribute('required');
                superiorCodeInput.value = '';
            }
        });
        // Inicial: ocultar si no es admin
        if (roleSelect.value !== 'administrador') {
            superiorCodeGroup.classList.add('hidden');
            superiorCodeInput.removeAttribute('required');
        }
    }
});