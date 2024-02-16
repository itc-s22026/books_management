const passport = require("passport");
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validationResult, check } = require('express-validator');




const prisma = new PrismaClient();

/**
 * ログイン状態チェック
 */
router.get("/", (req, res, next) => {
  if (!req.user) {
    // 未ログインなら、Error オブジェクトを作って、ステータスを設定してスロー
    const err = new Error("unauthenticated");
    err.status = 401;
    throw err;
  }
  // ここに来れるなら、ログイン済み。
  res.json({
    message: "logged in"
  });
});

/**
 * ユーザ認証
 */
router.post("/login", passport.authenticate("local", {
  failWithError: true // passport によるログインに失敗したらエラーを発生させる
}), (req, res, next) => {
  // ここに来れるなら、ログインは成功していることになる。
  res.json({
    message: "OK"
  });
});

router.get("/login", (req, res) => {
  res.render("login"); // ユーザ登録ページを表示するための処理を追加する
});

/**
 * ユーザ新規作成
 */
router.post("/signup", [
  // 入力値チェックミドルウェア
  check("email").notEmpty({ ignore_whitespace: true }),
  check("name").notEmpty({ ignore_whitespace: true }),
  check("password").notEmpty({ ignore_whitespace: true })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name, password } = req.body;
  const salt = generateSalt();
  const hashed = calcHash(password, salt);

  try {
    await prisma.users.create({
      data: {
        email,
        name,
        password: hashed,
        salt: salt
      }
    });
    return res.status(201).json({ message: "created!" });
  } catch (e) {
    switch (e.code) {
      case "P2002":
        return res.status(400).json({ message: "username is already registered" });
      default:
        console.error(e);
        return res.status(500).json({ message: "unknown error" });
    }
  }
});

router.get("/signup", (req, res) => {
  res.render("signup"); // ユーザ登録ページを表示するための処理を追加する
});

// ランダムな文字列を生成する関数
function generateSalt() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

// パスワードをハッシュ化する関数
function calcHash(password, salt) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex');
}


module.exports = router;