const express = require('express')
const admin = express.Router()
const checkAdminLogin = require('../middleware/adminSession')
const upload = require('../middleware/multer')

const adminLoginControl = require('../controller/adminController/loginController')
const adminDashboardControl = require('../controller/adminController/dashboardController')
const adminUsercontrol = require('../controller/adminController/userController')
const adminCategoryControl = require('../controller/adminController/categoryController')
const adminProductController = require('../controller/adminController/productController')
const adminOrderController = require('../controller/adminController/orderController')
const adminCouponController = require('../controller/adminController/couponcontroller')
const adminOfferController = require('../controller/adminController/offerController')

//Admin Login
admin.get('/adminLogin', adminLoginControl.adminLogin)
admin.post('/adminLogin', adminLoginControl.adminLoginPost)

//Dashboard
admin.get('/home', checkAdminLogin, adminDashboardControl.home)


//User Management
admin.get('/Customers', checkAdminLogin, adminUsercontrol.userDashboard)
admin.put('/blockUser/:userId', checkAdminLogin, adminUsercontrol.userBlock)
admin.put('/unblockUser/:userId', checkAdminLogin, adminUsercontrol.userUnblock)


//Category Management
admin.get('/Category', checkAdminLogin, adminCategoryControl.category)
admin.get('/Category/:id', checkAdminLogin, adminCategoryControl.getCategoryDetails);
admin.post('/addCategory', checkAdminLogin, adminCategoryControl.addCategory)

admin.put('/editCategory/:id', checkAdminLogin, adminCategoryControl.editCategory)
admin.put('/blockCategory/:id', checkAdminLogin, adminCategoryControl.blockCategory)
admin.put('/unblockCategory/:id', checkAdminLogin, adminCategoryControl.unblockCategory)
admin.delete('/deleteCategory/:id', checkAdminLogin, adminCategoryControl.deleteCategory)


//Product Management
admin.get('/Products', checkAdminLogin, adminProductController.getproduct)
admin.get('/addProduct', checkAdminLogin, adminProductController.addProduct)
admin.post('/addProduct', upload.array('productImage', 4),checkAdminLogin, adminProductController.addProductPost)
admin.get('/editProduct/:id', checkAdminLogin, adminProductController.editProduct)
admin.post('/editProduct/:id', upload.array('productImage',4), checkAdminLogin, adminProductController.editProductPost)
admin.delete('/deleteImage' , checkAdminLogin, adminProductController.deleteImage)
admin.put('/blockProduct/:id', checkAdminLogin, adminProductController.blockProduct)
admin.put('/unblockProduct/:id', checkAdminLogin, adminProductController.unblockProduct)
admin.delete('/deleteProduct/:id', checkAdminLogin, adminProductController.deleteProduct)

//order management
admin.get('/Orders', checkAdminLogin, adminOrderController.order )
admin.get('/orderDetails/:orderId', checkAdminLogin, adminOrderController.orderDetails)
admin.post('/cancelOrder/:orderId', checkAdminLogin, adminOrderController.cancelOrder)
admin.post('/changeStatus/:orderId', checkAdminLogin, adminOrderController.changeOrderStatus)
admin.post('/cancelProduct/:orderId/:productId', checkAdminLogin, adminOrderController.cancelProduct)
admin.post('/changeProductStatus/:orderId/:productId', checkAdminLogin, adminOrderController.changeProductStatus)
admin.post('/returnProduct/:orderId/:productId', checkAdminLogin, adminOrderController.returnProduct)



//Coupon Management
admin.get('/Coupons', checkAdminLogin, adminCouponController.coupon)
admin.get('/getCoupon/:id', checkAdminLogin , adminCouponController.couponID)
admin.post('/addCoupon', checkAdminLogin, adminCouponController.addCoupon)
admin.delete('/deleteCoupon/:id', checkAdminLogin, adminCouponController.deleteCoupon)
admin.post('/editCoupon/:id',checkAdminLogin, adminCouponController.editCoupon)
admin.put('/blockCoupon/:id', checkAdminLogin, adminCouponController.blockCoupon)
admin.put('/unblockCoupon/:id',checkAdminLogin, adminCouponController.unblockCoupon)


//Offer management
admin.get('/Offers', checkAdminLogin, adminOfferController.offers)
admin.post('/addOffer',checkAdminLogin, adminOfferController.addOfferPost)
admin.get('getOffer/:id', checkAdminLogin, adminOfferController.offerById)
admin.get('/editOffer/:id', checkAdminLogin, adminOfferController.editOffer)
admin.post('/editOfferPost/:id', checkAdminLogin, adminOfferController.editOfferPost)
admin.delete('/deleteOffer/:id', checkAdminLogin, adminOfferController.deleteOffer)

//Sales Report
admin.get('/salesReport', checkAdminLogin, adminDashboardControl.salesReport)
admin.post('/generateReport' ,checkAdminLogin, adminDashboardControl.generateReport)
admin.post('/downloadReport', checkAdminLogin, adminDashboardControl.downloadReport)

//Sales chart
admin.post('/salesChart', checkAdminLogin, adminDashboardControl.salesChart)

//Trending products
admin.get('/trendingProducts', checkAdminLogin, adminDashboardControl.trendingProducts)

//Admin Logout
admin.post('/logout', adminLoginControl.logout)



module.exports = admin