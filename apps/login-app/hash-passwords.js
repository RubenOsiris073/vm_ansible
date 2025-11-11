const bcrypt = require('bcrypt');

async function hashPassword() {
    const plainPassword = 'admin123';
    const saltRounds = 10;
    
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log('Contraseña original:', plainPassword);
        console.log('Hash generado:', hashedPassword);
        
        // Verificar que funciona
        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        console.log('Verificación exitosa:', isValid);
    } catch (error) {
        console.error('Error:', error);
    }
}

hashPassword();