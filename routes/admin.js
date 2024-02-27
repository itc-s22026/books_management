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
        res.status(201).json({ result: 'OK'});
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

router.get('/rental/current', async (req, res) => {
    try {
        // 全ユーザの貸出中書籍一覧を取得
        const rentalBooks = await prisma.rental.findMany({
            where: { returnDate: null }, // 返却日がnullのもの＝貸出中のものを取得
            include: {
                users: true, // ユーザ情報を取得
                books: true // 書籍情報を取得
            }
        });

        // レスポンスデータを整形
        const formattedRentalBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            userId: rental.users.id,
            userName: rental.users.name,
            bookId: rental.books.id,
            bookName: rental.books.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({ rentalBooks: formattedRentalBooks }); // 貸出中書籍一覧を返す
    } catch (error) {
        console.error('貸出中書籍一覧の取得に失敗しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' }); // エラーを返す
    }
});

router.get('/rental/current/:uid', async (req, res) => {
    const { uid } = req.params; // リクエストパラメータからユーザIDを取得
    const userId = parseInt(uid); // 文字列から数値に変換

    // 数値に変換できない場合はエラーを返す
    if (isNaN(userId)) {
        return res.status(400).json({ message: '無効なユーザIDです' });
    }

    try {
        // ユーザの存在を確認
        const user = await prisma.users.findUnique({
            where: { id: BigInt(userId) } // 数値をBigIntに変換して検索
        });
        if (!user) {
            return res.status(404).json({ message: '指定されたユーザが見つかりません' });
        }

        // ユーザの貸出中書籍一覧を取得
        const rentalBooks = await prisma.rental.findMany({
            where: {
                userId: userId, // 数値として検索
                returnDate: null // 返却日がnullのもの＝貸出中のものを取得
            },
            include: {
                books: true // 書籍情報を取得
            }
        });

        // レスポンスデータを整形
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
        }); // 貸出中書籍一覧を返す
    } catch (error) {
        console.error('特定ユーザの貸出中書籍一覧の取得に失敗しました:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました' }); // エラーを返す
    }
});


module.exports = router;
