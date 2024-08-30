const userSchema = require('../../model/userSchema')
const bcrypt = require('bcrypt')
const sendOTP = require('../../services/emailSender')
const generateOTP = require('../../services/generateOTP')

const passport = require('passport')
const auth = require('../../services/auth')




const login = (req, res) => {
    try {
        if (req.session.user) {
            res.render('user/home')
        }
        else {
            res.render('user/login', { title: 'Login', user: req.session.user, query: req.query, alertMessage: req.flash('error'), })
        }
    }
    catch (err) {
        console.log(`Error in rendering login page ${err}`)
    }
}

const loginPost = async (req, res) => {
    try {
        //find from the database
        const checkUser = await userSchema.findOne({ email: req.body.email })

        // Log the user found
        console.log('User found:', checkUser);

        if (!checkUser) {
            //if user not found, set flash message as alert and redirect
            req.flash('error', 'Invalid user credentials')
            console.log('Invalid user credentials')
            return res.redirect('/user/login')
        }
        if (checkUser.isBlocked) {
            // User is blocked, set flash message and redirect
            console.log("User blocked by admin")
            req.flash('error', 'Your account has been blocked. Please contact support.');
            return res.redirect('/user/login');
        }

        // Compare the provided password with the stored hashed password
        console.log("=========================",req.body.password)
        const isPasswordValid = await bcrypt.compare(req.body.password.trim(), checkUser.password);
        console.log(isPasswordValid)

        // // Log user and password
        // console.log('Provided password:', req.body.password);
        // console.log('Stored hashed password:', checkUser.password);

        if (isPasswordValid) {
            // If password is correct, redirect to home
            req.session.user = checkUser;
            res.redirect('/user/home');
        } else {
            // If password is incorrect, set flash message and redirect
            req.flash('error', 'Invalid user credentials');
            console.log('Invalid user credentials');
            res.redirect('/user/login');
        }

    }
    catch (err) {
        req.flash('error', 'An error occurred. Please try again later.'); // Set flash message for errors
        console.log(`Error in Login : ${err}`)
    }
}

const SignUp = (req, res) => {
    try {
        if (req.session.user) {
            res.redirect('/home')
        }
        else {
            res.render('user/Sign-Up', { title: 'Sign-Up', alertMessage: req.flash('error'), user: req.session.user })
        }
    }
    catch (err) {
        console.log(`Error in rendering Sign-Up page, ${err}`)
    }
}

const SignUpPost = async (req, res) => {

    const { name, phoneNumber, email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    console.log("Form Data:", req.body);
    //res.redirect('/user/login')
    try {
        console.log("Req received")

        if (!name || !phoneNumber || !email || !password) {
            console.error('All fields are required');

            return res.redirect('/user/Sign-Up');
        }
        const userData = {
            name: req.body.name,
            phoneNumber: req.body.phoneNumber,
            email: req.body.email,
            password: await bcrypt.hash(req.body.password.toString(), 10)
        }

        //check whether User exists or not
        const checkUserExists = await userSchema.findOne({ email: req.body.email })

        if (!checkUserExists) {
            // await userSchema.create(userData);
            // console.log('Data of the new user : ', userData)
            console.log('New User');
            const otp = generateOTP()
            sendOTP(userData.email, otp)
            req.flash('success', `OTP sent to the ${userData.email} `)
            console.log('OTP send to the user mail')

            req.session.otp = otp
            req.session.otpTime = Date.now()
            req.session.email = userData.email
            req.session.name = userData.name
            req.session.phoneNumber = userData.phoneNumber
            req.session.password = userData.password

            // if (emailRegex.test(req.body.email)) {
            //     // Generate and send OTP
            //     await generateAndSendOTP(email);
            // res.redirect('/user/OTP');  // Redirect to OTP verification page

            // }
            res.redirect('/user/OTPpage');  // Redirect to OTP verification page

        }
        else {
            req.flash('error', 'User already exists')
            console.log('User already exists.')
            res.redirect('/user/Sign-Up')
        }
    }
    catch (err) {
        console.error(`Error submitting data while Sign-Up, ${err}`)
    }
}

const otpPage = (req, res) => {
    try {

        res.render('user/OTPpage', {
            title: 'OTP Page',
            email: req.session.email,
            otpTime: req.session.otpTime,
            user: req.session.user
        })
    }
    catch (err) {
        console.log(`Error in rendering OTP Page: ${err}`)
    }
}

const otpPagePost = async (req, res) => {
    // console.log('Reached otppagePost')
    console.log(req.session)
    try {
        // console.log('Reached otppagePost try')
        if (req.session.otp !== undefined) {
            console.log(req.session.otp)
            const userData = {
                name: req.session.name,
                email: req.session.email,
                password: req.session.password,
                phoneNumber: req.session.phoneNumber
            }
            const userOtp = req.body.otp.trim();
            const sessionOtp = req.session.otp.trim();
            if (userOtp === sessionOtp) {

                // console.log('User entered OTP:', userOtp);
                // console.log('Session stored OTP:', sessionOtp);
                console.log('OTP matched')

                await userSchema
                    .insertMany(userData)
                    .then(() => {
                        console.log(`New user registered successfully`)
                        req.flash('success', 'user signup successfull')
                        res.redirect('/user/login')
                    })
                    .catch(err => {
                        console.log(`error while user signup ${err}`)
                    })
            } else {
                req.flash('error', 'Invaild OTP , Try Again')
                console.log('Error in OTP')
                res.redirect('/user/OTPpage')
            }
        }
    } catch (error) {
        console.log(`error while verifying otp${error}`)
    }
};

const resendOTPSignUp = async (req, res) => {
    try {
        const email = req.body.email; // Get email from request body
        const otp = generateOTP(); // Generate OTP

        await sendOTP(email, otp); // Ensure sendOTP returns a promise
        req.session.otp = otp;
        req.session.otpTime = Date.now();

        req.flash('success', 'OTP resent successfully');
        res.redirect('/user/OTPpage');
    } catch (error) {
        console.log(`Error while resending OTP: ${error}`);
        res.status(500).send('Internal Server Error');
    }

}

const googleAuth = (req, res,next) => {
    console.log('Reached google auth')
    try {
        passport.authenticate('google', {
            scope: ['email', 'profile']
        })(req, res, next);
    }
    catch (err) {
        console.log(`Error in google authentiction : ${err}`)
    }
}


const googleAuthCallback = (req, res, next) => {
    console.log('google callback reached')
    try {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.log(`Error on google auth callback: ${err}`);
                return next(err);
            }
            if (user.isBlocked) {
                req.flash('error', 'User access is blocked by admin')
                return res.redirect('/user/login')
            }
            if (!user) {
                return res.redirect('/user/login');
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                req.session.user = user.id;
                console.log('User logged in, redirecting to home');
                return res.redirect('/user/home');
            });
        })(req, res, next);
    } catch (err) {
        console.log(`Error on google callback ${err}`);
    }
}


const logout = (req, res) => {
    try {
        req.session.destroy(error => {
            if (error) {
                console.log(`Error in logout ${error}`)
            }
        })
        res.redirect('/user/home')
    } catch (error) {
        console.log(`Error in user logout ${error}`)
    }
}

module.exports = {
    login,
    loginPost,
    SignUp,
    SignUpPost,
    otpPage,
    otpPagePost,
    resendOTPSignUp,
    googleAuth,
    googleAuthCallback,
    logout
}