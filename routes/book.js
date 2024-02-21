const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/list', async (req, res) => {
    try {
        // クエリパラメータからページ番号を取得し、デフォルト値を設定
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const pageSize = 10; // 1ページあたりの書籍数

        // ページ番号に基づいて書籍を取得
        const books = await prisma.books.findMany({
            take: pageSize,
            skip: (page - 1) * pageSize,
            select: {
                id: true,
                title: true,
                author: true,
            },
        });

        // 全書籍数を取得
        const totalBooks = await prisma.books.count();

        // 最大ページ数を計算
        const maxPage = Math.ceil(totalBooks / pageSize);

        // レスポンスを送信
        res.status(200).json({
            books: books,
            maxPage: maxPage,
        });
    } catch (error) {
        console.error('書籍一覧の取得中にエラーが発生しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;
