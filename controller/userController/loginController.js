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
        // Find the user in the database by email
        const checkUser = await userSchema.findOne({ email: req.body.email });

        // Log the found user details
        console.log('User found:', checkUser);

        if (!checkUser) {
            // If the user is not found, set a flash message and redirect
            req.flash('error', 'Invalid user credentials');
            console.log('Invalid user credentials - user not found.');
            return res.redirect('/user/login');
        }

        if (checkUser.isBlocked) {
            // If the user is blocked, set a flash message and redirect
            console.log('User blocked by admin.');
            req.flash('error', 'Your account has been blocked. Please contact support.');
            return res.redirect('/user/login');
        }

        // Log the provided password before comparison
        console.log('Provided password:', req.body.password.trim());
        console.log('Stored hashed password:', checkUser.password);

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(req.body.password.trim(), checkUser.password);
        console.log('Password comparison result:', isPasswordValid);

        if (isPasswordValid) {
            // If the password is correct, set the session user and redirect to home
            req.session.user = checkUser;
            res.redirect('/user/home');
        } else {
            // If the password is incorrect, set a flash message and redirect
            req.flash('error', 'Invalid user credentials');
            console.log('Invalid user credentials - password mismatch.');
            res.redirect('/user/login');
        }
    } catch (err) {
        // Handle any unexpected errors
        req.flash('error', 'An error occurred. Please try again later.');
        console.log(`Error in Login: ${err}`);
    }
};

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

    try {
        console.log("Req received");

        // Extract password and confirm password from array
        const [password1, password2] = password;

        // Check if all fields are provided
        if (!name || !phoneNumber || !email || !password1 || !password2) {
            console.error('All fields are required');
            req.flash('error', 'All fields are required');
            return res.redirect('/user/Sign-Up');
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            console.error('Invalid email format');
            req.flash('error', 'Invalid email format');
            return res.redirect('/user/Sign-Up');
        }

        // Check if passwords match
        if (password1 !== password2) {
            console.error('Passwords do not match');
            req.flash('error', 'Passwords do not match');
            return res.redirect('/user/Sign-Up');
        }

        // Check if user already exists
        const checkUserExists = await userSchema.findOne({ email });

        if (checkUserExists) {
            req.flash('error', 'User already exists');
            console.log('User already exists.');
            return res.redirect('/user/Sign-Up');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password1, 10);

        const userData = new userSchema({
            name,
            phoneNumber,
            email,
            password: hashedPassword,
            isVerified : false,
        });

        await userData.save();

        // Generate and send OTP
        const otp = generateOTP();
        await sendOTP(email, otp); 

        req.flash('success', `OTP sent to ${email}`);
        console.log('OTP sent to the user email.');

        // Store necessary data in the session
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.email = email;
        


        // Render the OTP verification page
        res.render('user/OTPpage', {
            title: 'OTP Page',
            email: req.session.email,
            otpTime: req.session.otpTime,
        })
        
    } catch (err) {
        console.error(`Error submitting data during Sign-Up: ${err}`);
        req.flash('error', 'An error occurred during sign-up. Please try again.');
        res.redirect('/user/Sign-Up');
    }
};


const otpPagePost = async (req, res) => {
    // console.log('Reached otppagePost')
    console.log('Session data in OTP page : ',req.session)
    const {otp} = req.body
    try {
        console.log('Reached otppagePost try')
        if (req.session.otp === otp && Date.now() - req.session.otpTime < 300000) {
            console.log(req.session.otpTime, req.session.otp)

            const user = await userSchema.findOne({email : req.session.email})
            if(user){
                user.isVerified = true;
                await user.save();
                console.log(user)
            
                //Set user data
                req.session.user = user

                //Clear OTP from the session
                req.session.otp = null;
                req.session.otpTime = null;
            
                req.flash('sucess', 'Welcome!...New user verification successful');
                console.log('New user verification successful');
                res.redirect('/user/home');
                }
            else{
                console.log('User not found')
                req.flash('User Not found')
                res.redirect('/user/Sign-Up');

            }
        }
        else{
            req.flash('error', 'Invaild OTP , Try Again')
            console.log('Error in OTP')
            res.redirect('/user/Sign-Up')
        }    
            
    } catch (error) {
        console.log(`error while verifying otp${error}`)
        req.flash('error', 'Error in OTP verification')
        res.redirect('/user/Sign-Up')
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
    otpPagePost,
    resendOTPSignUp,
    googleAuth,
    googleAuthCallback,
    logout
}