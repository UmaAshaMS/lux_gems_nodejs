const userSchema = require('../../model/userSchema')
const bcrypt = require('bcrypt')
const sendOTP = require('../../services/emailSender')
const generateOTP = require('../../services/generateOTP')


const ForgotPassword = (req, res) => {
    try {
        req.session.user = ''
        res.render('user/Forgot-Password', { title: 'Forgot-Password', user: req.session.user })
    }
    catch (err) {
        console.log(`Error in rendering forgot Password Page ${err} `)
    }
}

const ForgotPasswordpost = async (req, res) => {
    try {
        const email = await userSchema.findOne({ email: req.body.email })
        if (!email) {
            req.flash('error', 'Email Id is not registered. Please enter a registered Email.')
            console.log('Email Id is not registered. Please enter a registered Email.')
            return res.redirect('/Sign-Up')
        }
        if (email.isBlocked) {
            req.flash('error', 'User blocked by admin')
            console.log('User blockedd by admin')
            return res.redirect('/login')
        }
        const otp = generateOTP()
        sendOTP(req.body.email, otp)
        req.flash('success', `OTP sent to the ${req.body.email} `)
        console.log(`OTP send to the user mail ${req.body.email}`)

        req.session.otp = otp
        console.log(req.session.otp)
        // req.session.otpTime = Date.now()
        req.session.otpTime = Date.now() + (5 * 60 * 1000); 
        req.session.email = req.body.email

        res.render('user/ForgotPasswordOtp')
    }
    catch (err) {
        console.error('Error in submitting forgot password page', err)
    }
}

const ForgotPasswordOtp = (req, res) => {
    try {
        res.render('user/ForgotPasswordOtp', { 
            title: 'Forgot-Password OTP', 
            user: req.session.user, 
            email: req.session.email,
            otpTime: req.session.otpTime,
          
        })
    }
    catch (err) {
        console.log(`Error in rendering forgot Password OTP Page ${err} `)
    }
}

const ForgotPasswordOtpPost = (req, res) => {
    try {
        if (req.session.otp !== undefined) {
            if (req.body.otp === req.session.otp) {
                res.render('user/resetpassword', { title: 'Reset Password' ,user:req.session.user})
            } else {
            req.flash('error', 'Invaild OTP')
            res.redirect('/ForgotPasswordOtp')
            }
        } else {
            req.flash('error', 'An error ocuured. Please retry.')
            console.log('An error ocuured. Please retry.')
            res.redirect('/Forgot-Password')
        }
    } catch (error) {
        console.log(`Error in forgot otp verification ${error}`)
    }
}

const resendOTPforgotPassword = async(req, res) => {
    try {
        const email = req.body.email; // Get email from request body
        // console.log('Received email:', email); // Log email to verify it is received
        const otp = generateOTP(); // Generate OTP
       

        await sendOTP(email, otp); 
        req.session.otp = otp;
        req.session.otpTime = Date.now() + (5 * 60 * 1000); // OTP valid for 5 minutes

        req.flash('success', 'OTP resent successfully');
        res.redirect('/forgotPasswordOtp'); // Redirect to password recovery OTP pag
    } catch (error) {
        console.log(`Error while resending OTP: ${error}`);
        res.status(500).send('Internal Server Error');
    }
}


const resetPassword = (req, res) => {
    try {
        res.render('user/resetPassword', { 
            title: 'Reset Password', 
            user: req.session.user, 
            email: req.session.email,
        })
    }
    catch (err) {
        console.log(`Error in rendering Reset Password Page ${err}`)
    }
}

const resetPasswordPost = async(req, res) => {
    try {
        console.log(req.body.password)
        const password = await bcrypt.hash(req.body.password, 10)
        const update = await userSchema.updateOne({ email: req.session.email },{ password: password })
        if (update) {
            req.flash('success', 'Password updated successfully')
            console.log('Password updated successfully.')
            res.redirect('/login')
        } else {
        req.flash('error', 'Error in setting new password.')
        console.log('Error in setting new password.')
        res.redirect('/login')
        }
    } catch (error) {
        console.log(`Error in reset password post ${error}`)
    }
}


module.exports = {
    ForgotPassword,
    ForgotPasswordpost,
    ForgotPasswordOtp,
    ForgotPasswordOtpPost,
    resendOTPforgotPassword,
    resetPassword,
    resetPasswordPost
}