const passport = require("passport");
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { validationResult, check } = require('express-validator');
const { calcHash, generateSalt } = require('../util/auth')



const prisma = new PrismaClient();

/**
 * ログイン状態チェック
 */
router.get("/check", (req, res, next) => {
  if (!req.user) {
    // 未ログインの場合
    const err = new Error("Unauthorized");
    err.status = 401;
    return next(err); // エラーハンドリングミドルウェアにエラーを渡す
  }

  // ユーザーがログインしている場合
  const isAdmin = req.user.isAdmin; // isAdminプロパティをチェック

  // レスポンスを返す
  if (isAdmin) {
    res.json({
      result: "OK",
      isAdmin: "true"
    });
  } else {
    res.json({
      result: "OK"
    });
  }
});





/**
 * ユーザ認証
 */
router.post("/login", passport.authenticate("local", {
  failWithError: true // passport によるログインに失敗したらエラーを発生させる
}), (req, res, next) => {
  // ログインが成功した場合
  if (req.user) {
    // 管理者かどうかをチェック
    const isAdmin = req.user.isAdmin; // 仮定される isAdmin プロパティ

    // レスポンスを返す
    res.json({
      result: "OK",
      isAdmin: isAdmin // true/false を返す
    });
  } else {
    // ログインに失敗した場合は、ここに到達しないはず
    res.status(500).json({
      message: "ログインに失敗しました"
    });
  }
});


/**
 * ユーザ新規作成
 */
router.post("/register", [
  // 入力値チェックミドルウェア
  check("email").notEmpty({ ignore_whitespace: true }),
  check("name").notEmpty({ ignore_whitespace: true }),
  check("password").notEmpty({ ignore_whitespace: true })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ result: "NG" });
  }

  const { email, name, password } = req.body;
  const salt = generateSalt();
  const hashed = calcHash(password, salt);

  try {
    // メールアドレスが重複していないかチェック
    const existingUser = await prisma.users.findUnique({
      where: {
        email: email
      }
    });

    if (existingUser) {
      // 重複している場合は409エラーを返す
      return res.status(409).json({ result: "NG" });
    }

    // 重複がない場合は新規登録を行う
    await prisma.users.create({
      data: {
        email,
        name,
        password: hashed,
        salt: salt
      }
    });
    return res.status(201).json({ result: "created" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ result: "NG" });
  }
});


router.get("/logout", (req, res, next) =>  {
  req.logout((err) => {
    res.status(200).json({message: "OK"});
  });
});



module.exports = router;
