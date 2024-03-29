const passport = require('passport');
const bcrypt = require('bcrypt');
const db = require(process.cwd() + '/models');

// 사용자 가입 처리 함수
exports.join = async (req, res, next) => {
    const { email, username, password, role, phoneNumber, address } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM User WHERE email=?', [email]);
        if (rows.length > 0) {
            return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
        }
        const hash = await bcrypt.hash(password, 12); // 비밀번호 해싱
        await db.execute('INSERT INTO User (email, username, password, role, phone_number, address) VALUES (?, ?, ?, ?, ?, ?)', [email, username, hash, role, phoneNumber, address]); // 사용자 정보 DB에 저장
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

// 사용자 로그인 처리 함수
exports.login = (req, res, next) => {
    passport.authenticate('local', (authErr, user, info) => {
        if (authErr) {
            console.error(authErr);
            return next(authErr);
        }
        if (!user) {
            return res.status(401).json({ error: info.message });
        }
        return req.login(user, (loginErr) => { // 사용자 정보 세션에 저장
            if (loginErr) {
                console.error(loginErr);
                return next(loginErr);
            }
            return res.json({ success: true });
        });
    })(req, res, next);
};

// 사용자 로그아웃 처리 함수
exports.logout = (req, res) => {
    req.logout(); // 사용자 정보 세션에서 제거
    res.redirect('/login.html');
};