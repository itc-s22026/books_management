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

router.post('/start', getUserId, async (req, res) => {
    try {
        const { bookId } = req.body;
        const { userId } = req;

        console.log('Received bookId:', bookId);
        console.log('Received userId:', userId);

        const book = await prisma.books.findUnique({ where: { id: bookId } });

        if (!book) {
            return res.status(400).json({ message: '指定された書籍が見つかりません' });
        }

        const existingRental = await prisma.rental.findFirst({
            where: {
                bookId: bookId,
                returnDate: null
            }
        });

        if (existingRental) {
            return res.status(409).json({ message: '指定された書籍はすでに貸し出されています' });
        }

        const newRental = await prisma.rental.create({
            data: {
                books: { connect: { id: bookId } },
                users: { connect: { id: userId } },
                rentalDate: new Date(),
                returnDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                returnDate: null
            }
        });

        res.status(201).json({
            id: newRental.id,
            bookId: newRental.bookId,
            rentalDate: newRental.rentalDate,
            returnDeadline: newRental.returnDeadline
        });
    } catch (error) {
        console.error('書籍貸出の処理中にエラーが発生しました:', error);
        res.status(400).json({ message: 'その他のエラーが発生しました' });
    }
});

router.put('/return', getUserId, async (req, res) => {
    try {
        const { rentalId } = req.body;
        const { userId } = req;

        console.log('Received rentalId:', rentalId);
        console.log('Received userId:', userId);

        const rental = await prisma.rental.findUnique({
            where: {
                id: rentalId,
                userId: userId,
                returnDate: null
            }
        });

        if (!rental) {
            return res.status(400).json({ message: 'NG' });
        }

        const updatedRental = await prisma.rental.update({
            where: { id: rentalId },
            data: {
                returnDate: new Date()
            }
        });

        res.status(200).json({ result: 'OK' });
    } catch (error) {
        console.error('書籍返却の処理中にエラーが発生しました:', error);
        res.status(400).json({ result: 'NG', message: '書籍返却中にエラーが発生しました' });
    }
});


router.get('/current', getUserId, async (req, res) => {
    try {
        const userId = req.userId;

        const rentalBooks = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: null
            },
            select: {
                id: true,
                bookId: true,
                rentalDate: true,
                returnDeadline: true,
                books: {
                    select: {
                        title: true,
                        author: true
                    }
                }
            }
        });

        // レスポンスデータの整形
        const formattedBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.books.title,
            // bookAuthor: rental.books.author,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({ rentalBooks: formattedBooks });
    } catch (error) {
        console.error('借用書籍一覧の取得中にエラーが発生しました:', error);
        res.status(400).json({ message: '借用書籍一覧の取得中にエラーが発生しました' });
    }
});

router.get('/history', getUserId, async (req, res) => {
    try {
        const userId = req.userId;

        const rentalHistory = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: { not: null }
            },
            select: {
                id: true,
                bookId: true,
                rentalDate: true,
                returnDate: true,
                books: {
                    select: {
                        title: true
                    }
                }
            }
        });

        const formattedHistory = rentalHistory.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.books ? rental.books.title : "Unknown",
            rentalDate: rental.rentalDate,
            returnDate: rental.returnDate
        }));

        res.status(200).json({ rentalHistory: formattedHistory });
    } catch (error) {
        console.error('借用書籍履歴の取得中にエラーが発生しました:', error);
        res.status(400).json({ message: '借用書籍履歴の取得中にエラーが発生しました' });
    }
});



module.exports = router;
