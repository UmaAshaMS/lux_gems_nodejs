const express = require('express');
const path = require('path');
const user = express.Router();
const { checkUserLogin, checkUserSessionBlocked, checkUserSession } = require('../middleware/userSession');


const userLoginControl = require('../controller/userController/loginController');
const userHomeControl = require('../controller/userController/homeController');
const userProductControl = require('../controller/userController/productController');
const forgotPassword = require('../controller/userController/forgotPassword');
const userProfileControl = require('../controller/userController/profileController');
const cartController = require('../controller/userController/cartController');
const checkoutController = require('../controller/userController/checkoutController')
const orderController = require('../controller/userController/orderController')
const wishlistcontroller = require('../controller/userController/wishlistController')

// Serve static files from the 'uploads' directory
user.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// User Login
user.get('/login', checkUserLogin, userLoginControl.login);
user.post('/login', checkUserLogin, userLoginControl.loginPost);
user.get('/sign-up', checkUserLogin, userLoginControl.SignUp);
user.post('/sign-up', checkUserLogin, userLoginControl.SignUpPost);
user.post('/otp-page', checkUserLogin, userLoginControl.otpPagePost);
user.post('/resend-otp-sign-up', checkUserLogin, userLoginControl.resendOTPSignUp);

// Authentication
user.get('/auth/google', userLoginControl.googleAuth);
user.get('/auth/google/callback', userLoginControl.googleAuthCallback);

// Forgot Password
user.get('/forgot-password', checkUserLogin, forgotPassword.ForgotPassword);
user.post('/forgot-password', checkUserLogin, forgotPassword.ForgotPasswordpost);
user.get('/forgot-password-otp', checkUserLogin, forgotPassword.ForgotPasswordOtp);
user.post('/forgot-password-otp', checkUserLogin, forgotPassword.ForgotPasswordOtpPost);
user.get('/reset-password', checkUserLogin, forgotPassword.resetPassword);
user.post('/reset-password', checkUserLogin, forgotPassword.resetPasswordPost);
user.post('/resend-otp-forgot-password', checkUserLogin, forgotPassword.resendOTPforgotPassword);

// Home
user.get('/home', checkUserSessionBlocked, userHomeControl.home);

//Private route starts here
// User Profile
user.get('/profile', checkUserSession, userProfileControl.profile);
user.get('/editProfile', checkUserSession, userProfileControl.editProfile)
user.post('/editProfilePost',checkUserSession, userProfileControl.editProfilePost)

user.get('/address', checkUserSession, userProfileControl.address);
user.post('/addAddress', checkUserSession, userProfileControl.addAddress);
user.delete('/deleteAddress/:index', checkUserSession, userProfileControl.deleteAddress);
user.get('/editAddress/:index', checkUserSession, userProfileControl.editAddress);
user.post('/editAddress/:index',checkUserSession, userProfileControl.editAddressPost);
user.put('/setDefaultAddress/:index', checkUserSession, userProfileControl.setDefaultAddress)

user.get('/rewards', checkUserSession, userProfileControl.rewards)
user.get('/wallet', checkUserSession, userProfileControl.wallet)
user.post('/addMoneyToWallet' , checkUserSession, userProfileControl.addMoneyToWallet)


user.get('/orderHistory', checkUserSession, userProfileControl.orderHistory);

// Products
user.get('/all-products', checkUserSessionBlocked, userProductControl.AllproductsRender);
user.get('/productDetails/:id', checkUserSessionBlocked, userProductControl.productDetails);
user.get('/product-category/:id', checkUserSessionBlocked, userProductControl.productCategory);
user.post('/filterProducts',checkUserSessionBlocked, userProductControl.filterProducts)

// Cart
user.get('/cart', checkUserSession, cartController.cart);
user.post('/cart/add/:productId', checkUserSession, cartController.addToCart);
user.post('/cart/remove/:productId', checkUserSession, cartController.removeFromCart);
user.post('/cart/update/:productId', checkUserSession, cartController.updateQuantity);

//Wishlist
user.get('/wishlist', checkUserSession, wishlistcontroller.wishlist)
user.post('/wishlist/add/:productId', checkUserSession, wishlistcontroller.addToWishlist)
user.delete('/wishlist/delete/:productId',checkUserSession, wishlistcontroller.deleteFromWishlist)
user.post('/wishlist/addToCart/:productId',checkUserSession, wishlistcontroller.addToCart)

//Coupon
user.post('/getAvailableCoupon', checkUserSession, checkoutController.getAvailableCoupon)
user.post('/applyCoupon', checkUserSession, checkoutController.applyCoupon)

//Checkout
user.get('/checkout', checkUserSession, checkoutController.checkout)
user.get('/addAddressCheckout', checkUserSession, checkoutController.addNewAddress)
user.post('/addAddressCheckout', checkUserSession, checkoutController.addNewAddressPost)
user.get('/editAddressCheckout/:addressId', checkUserSession, checkoutController.editAddressCheckout)
user.post('/editAddressCheckout/:addressId',checkUserSession, checkoutController.editAdressCheckoutPost)
user.delete('/deleteAddressCheckout/:addressId', checkUserSession, checkoutController.deleteAddressCheckout)
user.post('/renderPaypal', checkUserSession, checkoutController.renderPaypal)
user.post('/renderRazorPay', checkUserSession, checkoutController.renderRazorpay)
user.post('/updateOrderPendingStatus',checkUserSession , checkoutController.updateOrderPendingStatus)

//Order
user.post('/placeOrder', checkUserSession, orderController.placeOrder )
user.get('/orderConfirmed/:orderId', checkUserSession, orderController.orderConfirmed)
user.post('/cancelOrder/:orderId/:itemId', checkUserSession, orderController.cancelOrder)
user.post('/returnOrder/:orderId/:productId',checkUserSession, orderController.returnOrder)
user.get('/downloadInvoice/:orderId', checkUserSession, orderController.downloadInvoice)
user.post('/reInitiatePayment', checkUserSession, orderController.reInitiatePayment)

// Logout
user.post('/logout', userLoginControl.logout);

module.exports = user;
