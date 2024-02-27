const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getUserId = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'ユーザーが認証されていません' });
    }

    const isAdmin = req.user.isAdmin;
    if (isAdmin) {
        return res.status(403).json({ message: '管理者権限がありません' });
    }

    req.userId = req.user.id;
    next();
};

const requireLogin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'ログインが必要です' });
    }
    next();
};

router.get('/list', requireLogin, async (req, res) => {
    try {
        // クエリパラメータからページ番号を取得し、デフォルト値を設定
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const pageSize = 10; // 1ページあたりの書籍数

        const books = await prisma.books.findMany({
            take: pageSize,
            skip: (page - 1) * pageSize,
            select: {
                id: true,
                title: true,
                author: true,

            },
        });

        const totalBooks = await prisma.books.count();

        const maxPage = Math.ceil(totalBooks / pageSize);

        res.status(200).json({
            books: books,
            maxPage: maxPage,
        });
    } catch (error) {
        console.error('書籍一覧の取得中にエラーが発生しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

router.get('/detail/:id', requireLogin, async (req, res) => {
    try {
        const bookId = req.params.id;

        const book = await prisma.books.findUnique({
            where: {
                id: parseInt(bookId),
            },
            include: {
                rental: {
                    include: {
                        users: true
                    }
                }
            },
        });

        if (!book) {
            return res.status(404).json({ message: '指定された書籍が見つかりません' });
        }

        // レスポンスデータを整形
        const responseData = {
            id: book.id,
            isbn13: book.isbn13,
            title: book.title,
            author: book.author,
            publishDate: book.publishDate,
            rentalInfo: null
        };

        if (book.rental.length > 0) {
            const latestRental = book.rental.find(r => !r.returnDate);

            if (latestRental) {
                responseData.rentalInfo = {
                    userName: latestRental.users.name,
                    rentalDate: latestRental.rentalDate,
                    returnDeadline: latestRental.returnDeadline
                };
            }
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error('書籍詳細の取得中にエラーが発生しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});



module.exports = router;