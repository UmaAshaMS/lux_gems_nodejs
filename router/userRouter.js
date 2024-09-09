const express = require('express')
const userSchema = require('../model/userSchema')
const user = express.Router()
const { checkUserLogin } = require('../middleware/userSession')
const {checkUserSession} = require('../middleware/checkUserSession')


const userLoginControl = require('../controller/userController/loginController')
const userHomeControl = require('../controller/userController/homeController')
const userProductControl = require('../controller/userController/productController')
const forgotPassword = require('../controller/userController/forgotPassword')
const userProfileControl = require('../controller/userController/profileController')

//user Login
user.get('/user/login', checkUserLogin,userLoginControl.login)
user.post('/user/login', checkUserLogin,userLoginControl.loginPost)
user.get('/user/Sign-Up', checkUserLogin,userLoginControl.SignUp)
user.post('/user/Sign-Up', checkUserLogin,userLoginControl.SignUpPost)
user.post('/user/OTPpage', checkUserLogin, userLoginControl.otpPagePost)
//resend otp in sign-up
user.post('/user/resendOTPsignUp', checkUserLogin, userLoginControl.resendOTPSignUp)

//Authentication
user.get('/auth/google', userLoginControl.googleAuth)
user.get('/auth/google/callback' ,userLoginControl.googleAuthCallback)

//Forgot Password
user.get('/user/Forgot-Password', checkUserLogin, forgotPassword.ForgotPassword)
user.post('/user/Forgot-Password', checkUserLogin, forgotPassword.ForgotPasswordpost)
user.get('/user/ForgotPasswordOtp', checkUserLogin, forgotPassword.ForgotPasswordOtp)
user.post('/user/ForgotPasswordOtp', checkUserLogin, forgotPassword.ForgotPasswordOtpPost)
user.get('/user/resetPassword', checkUserLogin, forgotPassword.resetPassword)
user.post('/user/resetPassword', checkUserLogin,forgotPassword.resetPasswordPost)
//resend otp in forgot password
user.post('/user/resendOTPforgotPassword',checkUserLogin, forgotPassword.resendOTPforgotPassword)


user.get('/user/home', checkUserLogin, userHomeControl.home)

//User Profile
user.get('/user/profile', checkUserLogin , userProfileControl.profile)
user.get('/user/address', checkUserLogin, userProfileControl.address)
user.post('/user/addAddress', checkUserLogin, userProfileControl.addAddress)
user.delete('/user/deleteAddress/:index', checkUserLogin, userProfileControl.deleteAddress)


//All Products 
user.get('/user/AllProducts',checkUserLogin, userProductControl.AllproductsRender)
user.get('/user/productDetails/:id',checkUserLogin, userProductControl.productDetails)
user.get('/user/productCategory/:id', checkUserLogin,userProductControl.productCategory)

//logout
user.post('/user/logout', userLoginControl.logout)





module.exports = user
