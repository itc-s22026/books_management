const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// userId を取得するミドルウェア
const getUserId = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'ユーザーが認証されていません' });
    }

    // ユーザーが管理者かどうかをチェック
    const isAdmin = req.user.isAdmin; // ユーザーオブジェクトから isAdmin を取得
    if (isAdmin) {
        return res.status(403).json({ message: '管理者権限がありません' });
    }

    req.userId = req.user.id; // ユーザーオブジェクトからユーザーIDを取得
    next();
};

router.post('/start', getUserId, async (req, res) => {
    try {
        const { bookId } = req.body;
        const { userId } = req;

        console.log('Received bookId:', bookId);
        console.log('Received userId:', userId);

        // 指定された書籍を取得
        const book = await prisma.books.findUnique({ where: { id: bookId } });

        if (!book) {
            return res.status(400).json({ message: '指定された書籍が見つかりません' });
        }

        // 指定された書籍がすでに貸し出されているかチェック
        const existingRental = await prisma.rental.findFirst({
            where: {
                bookId: bookId,
                returnDate: null
            }
        });

        if (existingRental) {
            return res.status(409).json({ message: '指定された書籍はすでに貸し出されています' });
        }

        // 書籍の貸し出し処理
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

        // 貸出情報を取得
        const rental = await prisma.rental.findUnique({
            where: {
                id: rentalId,
                userId: userId,
                returnDate: null // まだ返却されていない貸出を検索
            }
        });

        if (!rental) {
            return res.status(400).json({ message: 'NG' });
        }

        // 返却処理を行う
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

// GET /rental/current エンドポイント

router.get('/current', getUserId, async (req, res) => {
    try {
        const userId = req.userId;

        // ユーザーが現在借りている書籍の一覧を取得
        const rentalBooks = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: null // まだ返却されていない貸出情報を検索
            },
            select: {
                id: true,
                bookId: true,
                rentalDate: true,
                returnDeadline: true,
                books: { // booksモデルから選択するフィールドを指定
                    select: {
                        title: true, // 書籍のタイトルを選択
                        author: true // 書籍の著者を選択
                    }
                }
            }
        });

        // レスポンスデータの整形
        const formattedBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.books.title, // booksモデルのタイトルを参照
            // bookAuthor: rental.books.author, // booksモデルの著者を参照
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        // レスポンスを返す
        res.status(200).json({ rentalBooks: formattedBooks });
    } catch (error) {
        console.error('借用書籍一覧の取得中にエラーが発生しました:', error);
        res.status(400).json({ message: '借用書籍一覧の取得中にエラーが発生しました' });
    }
});

router.get('/history', getUserId, async (req, res) => {
    try {
        const userId = req.userId;

        // ユーザーが過去に借りていた書籍の履歴を取得
        const rentalHistory = await prisma.rental.findMany({
            where: {
                userId: userId,
                returnDate: { not: null } // 返却された貸出情報を検索
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

        // レスポンスデータの整形
        const formattedHistory = rentalHistory.map(rental => ({
            rentalId: rental.id,
            bookId: rental.bookId,
            bookName: rental.books ? rental.books.title : "Unknown", // books が null でないことを確認し、title をアクセスする
            rentalDate: rental.rentalDate,
            returnDate: rental.returnDate
        }));

        // レスポンスを返す
        res.status(200).json({ rentalHistory: formattedHistory });
    } catch (error) {
        console.error('借用書籍履歴の取得中にエラーが発生しました:', error);
        res.status(400).json({ message: '借用書籍履歴の取得中にエラーが発生しました' });
    }
});



module.exports = router;
