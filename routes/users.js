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
    const err = new Error("NG");
    err.status = 401;
    return next(err);
  }

  const isAdmin = req.user.isAdmin;

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
  failWithError: true
}), (req, res, next) => {
  if (req.user) {
    const isAdmin = req.user.isAdmin;

    res.json({
      result: "OK",
      isAdmin: isAdmin
    });
  } else {
    res.status(500).json({
      message: "ログインに失敗しました"
    });
  }
});


/**
 * ユーザ新規作成
 */
router.post("/register", [
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
    const existingUser = await prisma.users.findUnique({
      where: {
        email: email
      }
    });

    if (existingUser) {
      return res.status(409).json({ result: "NG" });
    }

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
