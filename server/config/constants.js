const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SALT_ROUNDS = process.env.BCRYPT_ROUNDS ? Number(process.env.BCRYPT_ROUNDS) : 10;

module.exports = {
    PORT,
    SALT_ROUNDS,
};
