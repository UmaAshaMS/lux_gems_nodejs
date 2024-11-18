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
        const email = await userSchema.findOne({ email: req.body.email });

        if (!email) {
            return res.status(400).json({success : false, message :'Please enter a registered email ID to proceed.'})
        }


        if (email.isBlocked) {
            return res.status(400).json({success: false, message:'Your account has been blocked by the admin. Please contact support.'})
        }

        // Generate and send OTP
        const otp = generateOTP();
        sendOTP(req.body.email, otp);
        // console.log(`OTP sent to the user mail ${req.body.email}`);

        // Save OTP and email in the session
        req.session.otp = otp;
        req.session.otpTime = Date.now() + (2 * 60 * 1000); // 2-minute expiry
        req.session.email = req.body.email;

        return res.status(200).json({success : true, message :`OTP sent to the user mail ${req.body.email}` })

    } catch (err) {
        console.error('Error in submitting forgot password page', err);
        res.status(500).json({success : false, message:'Something went wrong. Please try again later.'})
    }
};


const ForgotPasswordOtp = (req, res) => {
    try {
        const otpTime = req.session.otpTime
        res.render('user/ForgotPasswordOtp', { 
            title: 'Forgot-Password OTP', 
            user: req.session.user, 
            email: req.session.email,
            otpTime,
          
        })
    }
    catch (err) {
        console.log(`Error in rendering forgot Password OTP Page ${err} `)
    }
}

const ForgotPasswordOtpPost = (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.otp || !req.session.otpTime) {
            console.log('OTP or expiration time is missing in session.');
            return res.status(400).json({
                success: false,
                message: 'An error occurred. Please retry.',
            });
        }

        const currentTime = Date.now();

        if (currentTime > req.session.otpExpiration) {
            console.log('OTP expired.');
            return res.status(401).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        if (otp === req.session.otp) {
            console.log('OTP validated successfully.');
            delete req.session.otp; 
            delete req.session.otpExpiration;

            return res.status(200).json({
                success: true,
                message: 'OTP validated successfully.',
                redirectUrl: '/reset-password', // Send the URL for redirection
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.',
            });
        }
    } catch (error) {
        console.error(`Error in forgot OTP verification: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please retry.',
        });
    }
};



const resendOTPforgotPassword = async (req, res) => {
    try {
        const email = req.body.email; 
        const otp = generateOTP(); 

        await sendOTP(email, otp); // Send OTP to the user's email
        req.session.otp = otp;
        req.session.otpTime = Date.now() + (2 * 60 * 1000); 

        console.log(`OTP resent to ${email}`);

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully. Please check your email.',
        });
    } catch (error) {
        console.error(`Error while resending OTP: ${error}`);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP. Please try again later.',
        });
    }
};

const resetPassword = (req, res) => {
    try {
        res.render('user/resetPassword', { 
            title: 'Reset Password', 
            email: req.session.user, 
        })
    }
    catch (err) {
        console.log(`Error in rendering Reset Password Page ${err}`)
    }
}


const resetPasswordPost = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await userSchema.findOneAndUpdate(
            { email: req.session.user },
            { password: hashedPassword }
        );

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully!',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again later.',
        });
    }
};



module.exports = {
    ForgotPassword,
    ForgotPasswordpost,
    ForgotPasswordOtp,
    ForgotPasswordOtpPost,
    resendOTPforgotPassword,
    resetPassword,
    resetPasswordPost
}