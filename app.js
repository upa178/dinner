const express = require('express');
const mysql = require('mysql');

//セッション管理をしてくれるパッケージ
const session = require('express-session');
//パスワードをハッシュ化するためのbcrypt
const bcrypt = require('bcrypt');

const app = express();
app.use(express.static('public'));



//配列型のフォームデータを受け取れるようにする
app.use(express.urlencoded({extended: false}));


//SQL接続情報
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'upa178usa',
  database: 'dinner'
});

//セッションを使用する準備
app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
)

//SQLへの接続ができない時にエラーを表示する
connection.connect((err) => {
    if (err) {
      console.log('error connecting: ' + err.stack);
      return;
    }
  });

  //セッション管理
app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    console.log('ログインしていません');
    res.locals.username = "ゲスト";
  } else {
    console.log('ログインしています');
    res.locals.username = req.session.username;
  }
  next();
});


app.get('/', (req, res) => {
  res.render('top.ejs');
});

//空欄がある場合にエラーを表示する
app.post('/create', 
  (req, res, next) => {
    console.log("入力値のからチェック");

    const username = req.body.username;
    const mailaddress = req.body.mailaddress;
    const password = req.body.password;

    const errors = [];

    if(username == ''){
      errors.push('ユーザーネームが空欄です');
    }
    if(mailaddress == ''){
      errors.push('メールアドレスが空欄です');
    }
    if(password == ''){
      errors.push('パスワードが空欄です');
    }

    console.log(errors);

    if(errors.length > 0){
      res.render('new.ejs', {errors: errors});
    }else{
      next();
    }
  },
//メールアドレスの重複を防ぐ
  (req, res, next) => {
    const mailaddress = req.body.mailaddress;
    const errors = [];

    connection.query(
      'SELECT * FROM users WHERE mailaddress = ?',
      [mailaddress],
      (error, results) => {
        if(results.length > 0){
          errors.push("ユーザー登録に失敗しました");
          res.render('new.ejs', {errors: errors});
        }else {
          next();
        }
      }
    )
  },

  (req, res, next) => {
    const password = req.body.password;
    const passwordVer = req.body.passwordver;
    const errors = [];
    
    if(password === passwordVer){
      next();
    }else {
      errors.push("パスワードが一致しません");
      res.render('new.ejs', {errors: errors});
    }
  },

  (req, res) => {
    //パスワードのハッシュ化
    const mailaddress = req.body.mailaddress;
    const username = req.body.username;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (mailaddress, username, password) VALUES (?, ?, ?)',
        [[mailaddress], [username], [hash]],
        (error, results) => {
          connection.query(
            'SELECT * FROM users',
            (error, results) => {
              console.log(results)
              req.session.userId = results[0].id;
              req.session.mailaddress = results[0].mailaddress;
              req.session.username = req.body.username;
              res.redirect('/');
            }
          );
        }
      );
    });
});

app.get('/login', (req, res) => {
  const errors = [];
  res.render('login.ejs', {errors: errors});
});

app.post('/login', 
  (req, res) => {
    const mailaddress = req.body.mailaddress;
    const errors = [];
    connection.query(
      'SELECT * FROM users WHERE mailaddress = ?',
      [mailaddress],
      (error, results) => {
        if(results.length > 0){
          const password = req.body.password;
          const hash = results[0].password;

          bcrypt.compare(password, hash, (error, equal) => {
            if(equal){
              req.session.userId = results[0].id;
              req.session.mailaddress = results[0].mailaddress;
              req.session.username = results[0].username;
              res.redirect('/');
            }else{
              console.log('NG');
              errors.push('ログインに失敗しました');
              console.log(errors);
              res.render('login.ejs', {errors: errors});
            }
          });
        }else {
          console.log('NNNg');
          res.redirect('/login');
        }
      }
    );
});

app.get('/new', (req, res) => {
  res.render('new.ejs', {errors: []});
});



app.get('/dinner', (req, res) => {
  const errors = [];
  if(req.session.userId === undefined){
    res.render('login.ejs', {errors: errors});
  }else{
    res.render('dinner.ejs');
  }
});



//ログインしている時のみ登録できるようになっている。
app.post('/createdinner', (req, res) => {
  console.log(req.body.recipe);
  connection.query('INSERT INTO dinners (dinnername, recipe, mailaddress) VALUES (?, ?, ?)',
  [[req.body.dinnername], [req.body.recipe], [req.session.mailaddress]],
  
  (error, results) => {
    connection.query(
      'SELECT * FROM dinners',
      (error, results) => {
        res.render('dinner.ejs', {items: results});
      }
    );
  }
  );
});


app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/');
  });
});

//リスト表示
app.get('/list', (req, res) => {
  const errors = [];
  if(req.session.userId === undefined){
    res.render('login.ejs', {errors: errors});
  }else{
    connection.query(
      'SELECT * FROM dinners WHERE mailaddress = ?',
      [req.session.mailaddress],
      (error, results) => {
        console.log(results);
        res.render('list.ejs', {items: results});
      }
    )}
});




app.listen(3000);