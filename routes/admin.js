const { PrismaClient } = require('@prisma/client');
const express = require("express");
const router = express.Router();

const prisma = new PrismaClient();

async function isAdmin(req, res, next) {
    try {
        // ユーザがログインしていることを確認
        if (!req.user) {
            return res.status(403).json({message: 'ログインが必要です'});
        }

        // ユーザが管理者であるかをデータベースから検証
        const user = await prisma.users.findUnique({where: {id: req.user.id}});
        if (!user || !user.isAdmin) {
            return res.status(403).json({message: '管理者権限が必要です'});
        }

        // 管理者の場合は、次のミドルウェアに進む
        next();
    } catch (error) {
        console.error('管理者権限の確認中にエラーが発生しました:', error);
        res.status(500).json({message: 'サーバーエラーが発生しました'});
    }
}

router.use(isAdmin);

router.post('/book/create', async (req, res) => {
    try {
        const { isbn13, title, author, publishDate } = req.body;
        const Books = await prisma.books.create({
            data: {
                isbn13,
                title,
                author,
                publishDate
            }
        });
        res.status(201).json({ result: 'OK', Books });
    } catch (error) {
        console.error('書籍情報の登録に失敗しました:', error);
        res.status(400).json({ result: 'NG' });
    }
});

// 書籍情報更新エンドポイント
router.put('/book/update', async (req, res) => {
    try {
        // リクエストデータから書籍情報を取得
        const { bookId, isbn13, title, author, publishDate } = req.body;

        // 書籍情報を更新
        const updatedBook = await prisma.books.update({
            where: { id: bookId },
            data: {
                isbn13,
                title,
                author,
                publishDate
            }
        });

        res.status(200).json({ result: 'OK' }); // 更新成功を返す
    } catch (error) {
        console.error('書籍情報の更新に失敗しました:', error);
        res.status(400).json({ result: 'NG' }); // エラーを返す
    }
});


module.exports = router;
