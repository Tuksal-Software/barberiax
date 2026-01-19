const bcrypt = require('bcryptjs');
const password = process.argv[2] || 'qweasd123';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash:', hash);
