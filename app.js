// const createError = require('http-errors');
// const express = require('express');
// const path = require('path');
// const cookieParser = require('cookie-parser');
// const logger = require('morgan');
// const session = require('express-session');
// const flash = require('connect-flash');
//
// const indexRouter = require('./routes/index');
// const usersRouter = require('./routes/users');
//
// const app = express();
//
// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');
//
// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
//
// app.use('/', indexRouter);
// app.use('/users', usersRouter);
// app.use(flash());
//
// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });
//
// app.use(session({
//   secret: 'your-secret-key',
//   resave: false,
//   saveUninitialized: false
// }));
//
// app.use((req, res, next) => {
//   res.locals.success_msg = req.flash('success_msg');
//   res.locals.error_msg = req.flash('error_msg');
//   next();
// });
//
//
// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });
//
// module.exports = app;



const passport = require('passport');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const authConfig = require('./util/auth');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
// const { authConfig } = require('./authConfig'); // authConfigをインポートする

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// session
app.use(session({
  secret: "B02CGO2YqVlyDXbfQ7a6CX3zNLSHzLkXM0BjRqfhIoSiVxtH",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 }
}));
// passport
app.use(passport.authenticate("session"));
authConfig(passport);
// cors
app.use(cors({
  origin: "http://localhost:3040",
  credentials: true
}));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// 404
app.use((req, res, next) => {
  res.status(404).json({ message: "not found." });
});

/**
 * error handler
 * 様々な場所でエラーが発生、または発生させて
 * こちらでまとめて対処するための関数。
 *
 * @type express.ErrorRequestHandler
 */
const errorHandler = (err, req, res, next) => {
  // デフォルトは内部サーバーエラーとしておく。
  let message = "Internal Server Error";
  if (err.status === 401) {
    // ここに来る場合は、未認証によるエラーなのでメッセージを書き換える。
    message = "unauthenticated";
  } else {
    // エラーの詳細はクライアントに返さないので、ここで吐き出しておく。
    console.error(err);
  }
  res.status(err.status || 500).json({ message });
};
app.use(errorHandler);

module.exports = app;
