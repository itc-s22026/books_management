const crypto = require('crypto');
const LocalStrategy = require('passport-local').Strategy;
const {PrismaClient} = require('@prisma/client');


const N = Math.pow(2, 17);
const maxmem = 144 * 1024 * 1024;
const keyLen = 192;
const saltSize = 64;

/**
 * Salt用のランダムバイト列生成
 */
const generateSalt = () => crypto.randomBytes(saltSize);

/**
 * パスワードハッシュ値計算
 * @param {string} plain
 * @param {Buffer} salt
 */
const calcHash = (plain, salt) => {
    const normalized = plain.normalize();
    const hash = crypto.scryptSync(normalized, salt, keyLen, {N, maxmem});
    if (!hash) {
        throw Error("ハッシュ値計算エラー");
    }
    return hash;
};

/**
 * Passport.js を設定する
 */
const authConfig = (passport) => {
    const prisma = new PrismaClient();
    passport.use(new LocalStrategy({
        usernameField: "email", passwordField: "password"
    }, async (email, password, done) => {
        try {
            const user = await prisma.users.findUnique({
                where: { email: email }
            });
            if (!user) {
                // ユーザが存在しない場合
                return done(null, false, { message: "Invalid username and/or password." });
            }

            // パスワードのハッシュ化
            const hashedPassword = calcHash(password, user.salt);

            // バイト列の長さを比較
            if (user.password.length !== hashedPassword.length) {
                return done(null, false, { message: "Invalid username and/or password." });
            }

            // ハッシュ化されたパスワードと保存されたパスワードの比較
            const passwordsMatch = crypto.timingSafeEqual(Buffer.from(user.password), hashedPassword);
            if (!passwordsMatch) {
                // パスワードが一致しない場合
                return done(null, false, { message: "Invalid username and/or password." });
            }

            // 認証成功
            return done(null, user);
        } catch (e) {
            return done(e);
        }
    }));
    // セッションストアに保存
    passport.serializeUser((user, done) => {
        process.nextTick(() => {
            done(null, {id: user.id, email: user.email});
        });
    });
    // セッションストアから復元
    passport.deserializeUser((user, done) => {
        process.nextTick(() => {
            return done(null, user);
        });
    });
};

module.exports = {
    generateSalt,
    calcHash,
    authConfig
};