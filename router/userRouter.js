const express = require('express');
const path = require('path');
const user = express.Router();
const { checkUserLogin } = require('../middleware/userSession');
const { checkUserSession } = require('../middleware/checkUserSession');

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
user.get('/home', checkUserLogin, userHomeControl.home);

// User Profile
user.get('/profile', checkUserLogin, userProfileControl.profile);
user.get('/editProfile', checkUserLogin, userProfileControl.editProfile)
user.post('/editProfilePost',checkUserLogin, userProfileControl.editProfilePost)

user.get('/address', checkUserLogin, userProfileControl.address);
user.post('/addAddress', checkUserLogin, userProfileControl.addAddress);
user.delete('/deleteAddress/:index', checkUserLogin, userProfileControl.deleteAddress);
user.get('/editAddress/:index', checkUserLogin, userProfileControl.editAddress);
user.post('/editAddress/:index',checkUserLogin, userProfileControl.editAddressPost);
user.put('/setDefaultAddress/:index', checkUserLogin, userProfileControl.setDefaultAddress)


user.get('/orderHistory', checkUserLogin, userProfileControl.orderHistory);

// Products
user.get('/all-products', checkUserLogin, userProductControl.AllproductsRender);
user.get('/productDetails/:id', checkUserLogin, userProductControl.productDetails);
user.get('/product-category/:id', checkUserLogin, userProductControl.productCategory);

// Cart
user.get('/cart', checkUserLogin, cartController.cart);
user.post('/cart/add/:productId', checkUserLogin, cartController.addToCart);
user.post('/cart/remove/:productId', checkUserLogin, cartController.removeFromCart);
user.post('/cart/update/:productId', checkUserLogin, cartController.updateQuantity);

//Wishlist
user.get('/wishlist', checkUserLogin, wishlistcontroller.wishlist)
user.post('/wishlist/add/:productId', checkUserLogin, wishlistcontroller.addToWishlist)
user.delete('/wishlist/delete/:productId',checkUserLogin, wishlistcontroller.deleteFromWishlist)
user.post('/wishlist/addToCart/:productId',checkUserLogin, wishlistcontroller.addToCart)

//Checkout
user.get('/checkout', checkUserLogin, checkoutController.checkout)
user.get('/addAddressCheckout', checkUserLogin, checkoutController.addNewAddress)
user.post('/addAddressCheckout', checkUserLogin, checkoutController.addNewAddressPost)

//Order
user.post('/placeOrder', checkUserLogin, orderController.placeOrder )
user.get('/orderConfirmed/:orderId', checkUserLogin, orderController.orderConfirmed)
user.post('/cancelOrder/:orderId', checkUserLogin, orderController.cancelOrder)

// Logout
user.post('/logout', userLoginControl.logout);

module.exports = user;
