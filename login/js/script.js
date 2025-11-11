document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const formTitle = document.getElementById('form-title');

    // Función para mostrar el formulario de login
    function showLogin() {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        formTitle.textContent = 'Iniciar Sesión';
    }

    // Función para mostrar el formulario de registro
    function showRegister() {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        formTitle.textContent = 'Crear Cuenta';
    }

    // Event listeners para los botones
    btnLogin.addEventListener('click', showLogin);
    btnRegister.addEventListener('click', showRegister);

    // Validación del captcha
    registerForm.addEventListener('submit', function(e) {
        const captchaValue = document.getElementById('captcha').value;
        if (captchaValue !== '8') {
            e.preventDefault();
            alert('Captcha incorrecto. La respuesta correcta es 8.');
            document.getElementById('captcha').focus();
        }
    });

    // Manejo del formulario de login
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Aquí puedes agregar la lógica de autenticación
        console.log('Login:', { email, password });
        alert('Formulario de login enviado. Revisar consola.');
    });

    // Manejo del formulario de registro
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellido-paterno').value,
            apellidoMaterno: document.getElementById('apellido-materno').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value
        };
        
        // Aquí puedes agregar la lógica de registro
        console.log('Registro:', formData);
        alert('Formulario de registro enviado. Revisar consola.');
    });
});