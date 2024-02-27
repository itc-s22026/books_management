const { PrismaClient } = require('@prisma/client');
const express = require("express");
const router = express.Router();

const prisma = new PrismaClient();

async function isAdmin(req, res, next) {
    try {
        if (!req.user) {
            return res.status(403).json({message: 'ログインが必要です'});
        }

        const user = await prisma.users.findUnique({where: {id: req.user.id}});
        if (!user || !user.isAdmin) {
            return res.status(403).json({message: '管理者権限が必要です'});
        }

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
        res.status(201).json({ result: 'OK'});
    } catch (error) {
        console.error('書籍情報の登録に失敗しました:', error);
        res.status(400).json({ result: 'NG' });
    }
});

router.put('/book/update', async (req, res) => {
    try {
        const { bookId, isbn13, title, author, publishDate } = req.body;

        const updatedBook = await prisma.books.update({
            where: { id: bookId },
            data: {
                isbn13,
                title,
                author,
                publishDate
            }
        });

        res.status(200).json({ result: 'OK' });
    } catch (error) {
        console.error('書籍情報の更新に失敗しました:', error);
        res.status(400).json({ result: 'NG' });
    }
});

router.get('/rental/current', async (req, res) => {
    try {
        const rentalBooks = await prisma.rental.findMany({
            where: { returnDate: null },
            include: {
                users: true,
                books: true
            }
        });

        const formattedRentalBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            userId: rental.users.id,
            userName: rental.users.name,
            bookId: rental.books.id,
            bookName: rental.books.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({ rentalBooks: formattedRentalBooks });
    } catch (error) {
        console.error('貸出中書籍一覧の取得に失敗しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});

router.get('/rental/current/:uid', async (req, res) => {
    const { uid } = req.params;
    const userId = parseInt(uid);

    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザIDです' });
    }

    try {
        const user = await prisma.users.findUnique({
            where: { id: BigInt(userId) }
        });
        if (!user) {
            return res.status(404).json({ message: '指定されたユーザが見つかりません' });
        }

        const rentalBooks = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: null
            },
            include: {
                books: true
            }
        });

        const formattedRentalBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            bookId: rental.books.id,
            bookName: rental.books.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({
            userId: user.id,
            userName: user.name,
            rentalBooks: formattedRentalBooks
        });
    } catch (error) {
        console.error('特定ユーザの貸出中書籍一覧の取得に失敗しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
});


module.exports = router;
