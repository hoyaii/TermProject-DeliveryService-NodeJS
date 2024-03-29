const { User, Order } = require('../models');
const db = require(process.cwd() + '/models');

// 배달원 정보를 추가하는 함수
exports.addDeliveryPersonInfo = async (req, res, next) => {
    const { serviceArea, email } = req.body;

    try {
        // 배달원의 서비스 지역과 상태를 업데이트
        await db.query(
            "UPDATE User SET service_area = ?, status = 'free' WHERE email = ?",
            [serviceArea, email]
        );
        res.status(200).send('배달원 정보가 성공적으로 업데이트되었습니다.');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('배달원 정보 업데이트에 실패하였습니다.');
        next(error);
    }
};

exports.getRole = async (req, res, next) => {
    const { email } = req.body;

    try {
        let [rows] = await db.query(
            "SELECT role FROM User WHERE email = ?",
            [email]
        );
        if (rows.length > 0) {
            res.status(200).json({ role: rows[0].role });
        } else {
            res.status(400).send('사용자 역할을 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('사용자 역할 조회에 실패하였습니다.');
        next(error);
    }
};

// 사용자 역할을 가져오는 함수
exports.getName = async (req, res, next) => {
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴.

    try {
        // 주어진 이메일로 사용자 역할을 조회
        let [rows] = await db.query(
            "SELECT username FROM User WHERE user_id = ?",
            [userId]
        );

        if (rows.length > 0) {
            res.status(200).json({ name: rows[0].username });
        } else {
            res.status(400).send('사용자를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('사용자 이름 조회에 실패하였습니다.');
        next(error);
    }
};