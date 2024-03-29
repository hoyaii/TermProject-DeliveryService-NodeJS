const express = require('express');
const { isLoggedIn } = require('../middlewares');
const { createRestaurant, getRestaurantByOwnerId, createMenu,getMenu,updateMenu, deleteMenu, getOrderByRestaurantId, updateRestaurant,
    getMatchedOrderByRestaurantId, finishOrder,
    getRestaurantByQuery
} = require('../controller/restaurants');

const router = express.Router();

// 음식점 등록
router.post('/', isLoggedIn, createRestaurant);

// 음식점 정보 조회 by query string -> 검색 함수에서 주소 수정해야함
router.get('/search', isLoggedIn, getRestaurantByQuery);

// 음식점 정보 조회 by ownerId
router.get('/', isLoggedIn,getRestaurantByOwnerId);

// 음식점 업데이트
router.put('/:restaurantId', isLoggedIn, updateRestaurant)

// 메뉴 등록
router.post('/:restaurantId/menus', isLoggedIn, createMenu);

// 메뉴 조회
router.get('/:restaurantId/menus', isLoggedIn, getMenu)

// 메뉴 수정
router.put('/menus/:menuId', isLoggedIn, updateMenu)

// 메뉴 삭제
router.delete('/menus/:menuId', isLoggedIn, deleteMenu)

// 주문 이력과 조회
router.get('/:restaurantId/orders', isLoggedIn, getOrderByRestaurantId);

// 주문 이력 조회 - 배달 매칭 됨
router.get('/:restaurantId/orders/matched', isLoggedIn, getMatchedOrderByRestaurantId);

// 주문 완료 처리
router.put('/:orderId/finish', isLoggedIn, finishOrder)

module.exports = router;
