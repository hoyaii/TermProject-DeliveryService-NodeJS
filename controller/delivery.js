const {  } = require('../models');
const db = require(process.cwd() + '/models');

// 사용자 ID로 배달 요청을 가져오는 함수
exports.getDeliveryRequestByUserId = async (req, res, next) => {
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴

    try {
        // 아직 수락되지 않은 배달 요청을 가져옴
        let [rows] = await db.query(
            "SELECT delivery_id, restaurant_id, delivery_address FROM Delivery WHERE delivery_person_id = ? AND status = 'notAccepted'",
            [userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 사용자 ID로 배달 이력을 가져오는 함수
exports.getDeliveryHistoryByUserId = async (req, res, next) => {
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴

    try {
        // 배달 완료된 배달 ID 리스트를 가져옴
        let [deliveryRows] = await db.query("SELECT delivery_id FROM Delivery WHERE delivery_person_id = ? AND status = 'finished'", [userId]);

        // 각 배달에 대한 상세 정보를 추가함
        let deliveryHistory = [];
        for (let i = 0; i < deliveryRows.length; i++) {
            const deliveryId = deliveryRows[i].delivery_id;
            let [orderRows] = await db.query("SELECT order_id, menu_id, restaurant_id, order_time FROM Orders WHERE delivery_id = ? AND status = 'finished'", [deliveryId]);

            for (let order of orderRows) {
                let [menuRows] = await db.query("SELECT name FROM Menu WHERE menu_id = ?", [order.menu_id]);
                let [restaurantRows] = await db.query("SELECT name FROM Restaurant WHERE restaurant_id = ?", [order.restaurant_id]);
                let [deliveryAddressRows] = await db.query("SELECT delivery_address FROM Delivery WHERE delivery_id = (SELECT delivery_id FROM Orders WHERE order_id = ?)", [order.order_id]);

                // 주문 시간을 원하는 형식으로 포맷한다
                let formattedOrderTime = formatDate(order.order_time);

                deliveryHistory.push({
                    orderId: order.order_id,
                    restaurantName: restaurantRows[0].name,
                    menuName: menuRows[0].name,
                    orderTime: formattedOrderTime,
                    deliveryAddress: deliveryAddressRows[0].delivery_address,
                });
            }
        }
        res.status(200).json(deliveryHistory);
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 배달 요청을 수락하는 함수
exports.acceptDeliveryRequest = async (req, res, next) => {
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴
    const { deliveryId } = req.body; // 요청 본문에서 배달 ID를 가져옴

    try {
        // 아직 수락되지 않은 주문 ID 리스트를 가져옴
        const [orderIds] = await db.query(
            "SELECT order_id FROM Orders WHERE delivery_id = ? AND status = 'notMatched'",
            [deliveryId]
        );

        // 배달과 주문 상태 업데이트
        if (orderIds.length > 0) {
            const orderId = orderIds[0].order_id;

            await db.query(
                "UPDATE Delivery SET status = 'accepted' WHERE delivery_id = ?",
                [deliveryId]
            );
            await db.query(
                "UPDATE Orders SET status = 'deliveryMatched' WHERE order_id = ?",
                [orderId]
            );
            await db.query(
                "UPDATE User SET status = 'notFree' WHERE user_id = ?",
                [userId]
            );

            res.status(200).send('배달 요청이 성공적으로 수락되었습니다.');
        } else {
            res.status(400).send('배달 요청을 수락할 수 없습니다.');
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 배달을 완료하는 함수
exports.finishDelivery = async (req, res, next) => {
    const deliveryId = req.body.deliveryId;
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴

    try {
        // 배달 상태와 주문 상태 업데이트
        // deliveryId를 가지고 orderId를 구한다
        let [rows] = await db.query("SELECT order_id FROM Orders WHERE delivery_id = ? AND status = ?", [deliveryId, "cooked"]);
        if (rows.length === 0) {
            return res.status(404).send('해당 배달 ID에 대한 주문이 없습니다.');
        }
        const orderId = rows[0].order_id;

        // 배달 상태를 업데이트한다
        [rows] = await db.query("UPDATE Delivery SET status = ? WHERE delivery_id = ?", ["finished", deliveryId]);

        // 주문 상태를 업데이트한다
        [rows] = await db.query("UPDATE Orders SET status = ? WHERE order_id = ?", ["finished", orderId]);

        // 유저 정보를 업데이트한다
        [rows] = await db.query("UPDATE User SET status = ? WHERE user_id = ?", ["free", userId]);

        res.status(200).send('배달 및 주문 상태가 성공적으로 업데이트되었습니다.');
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 사용자 ID로 배달 목록을 가져오는 함수
exports.getDeliveryListByUserId = async (req, res, next) => {
    const userId = req.user.user_id; // 세션에서 사용자 ID를 가져옴

    try {
        // 사용자가 수락한 배달 목록을 가져옴
        let [rows] = await db.query("SELECT delivery_id, restaurant_id, delivery_address FROM Delivery WHERE delivery_person_id = ? AND status = ?", [userId, "accepted"]);

        // 각 배달에 대한 restaurantAddress를 추가한다
        for (let i = 0; i < rows.length; i++) {
            const restaurantId = rows[i].restaurant_id;

            let [restaurantRows] = await db.query("SELECT address FROM Restaurant WHERE restaurant_id = ?", [restaurantId]);
            rows[0].restaurantAddress = restaurantRows[0].address;
        }

        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.requestDelivery = async (req, res, next) => {
    const userId = req.user.user_id // 세션에서 사용자 ID를 가져옴
    const restaurantId = req.body.restaurantId; // 요청 본문에서 식당 ID를 가져옴

    try {
        // 사용자의 주소를 가져옵니다.
        const userAddress = await db.query("SELECT address FROM User WHERE user_id = ?", [userId]);

        // 식당의 서비스 지역을 가져옵니다.
        const serviceAreaResult = await db.query("SELECT service_area FROM Restaurant WHERE restaurant_id = ?", [restaurantId]);
        const serviceArea = serviceAreaResult[0][0].service_area;

        // 서비스 지역에서 현재 사용 가능한 배달원을 모두 가져옵니다.
        const availableDeliveryPersons = await db.query("SELECT user_id FROM User WHERE service_area = ? AND status = 'free'", [serviceArea]);

        if (availableDeliveryPersons[0].length === 0) {
            console.log("배달 가능한 배달원이 존재하지 않습니다.");
            return res.status(400).json({ error: '배달 가능한 배달원이 존재하지 않습니다.' });
        }

        // 가능한 배달원 중에서 무작위로 한 명을 선택합니다.
        const randomIndex = Math.floor(Math.random() * availableDeliveryPersons[0].length);
        const selectedDeliveryPersonId = availableDeliveryPersons[0][randomIndex].user_id;

        // 새로운 배달 요청을 생성합니다.
        const result = await db.query(
            "INSERT INTO Delivery (restaurant_id, delivery_address, delivery_person_id, status) VALUES (?, ?, ?, ?)",
            [restaurantId, userAddress[0][0].address, selectedDeliveryPersonId, 'notAccepted']
        );

        // 새로 생성된 배달 요청의 ID를 가져옵니다.
        const deliveryId = result[0].insertId;

        res.status(200).json({ deliveryId: deliveryId });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// 날짜를 원하는 형식으로 포맷하는 함수
function formatDate(date) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}