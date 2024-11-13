const userSchema = require('../../model/userSchema')
const bcrypt = require('bcrypt')
const sendOTP = require('../../services/emailSender')
const generateOTP = require('../../services/generateOTP')
const flash = require('connect-flash');


const passport = require('passport')
const auth = require('../../services/auth')




const login = (req, res) => {
    try {
        res.render('user/login', { title: 'Login', user: req.session.user, query: req.query, alertMessage: req.flash('error'), })
    }
    catch (err) {
        console.log(`Error in rendering login page ${err}`)
    }
}

const loginPost = async (req, res) => {
    try {
        const { userEmail, userPassword } = req.body;

        const checkUser = await userSchema.findOne({ email: req.body.userEmail });

        if (!checkUser) {
            return res.status(400).json({success:false, message:'Invalid User credentials - user not found'})
        }

        if (checkUser.isBlocked) {
            return res.status(400).json({success:false, message:'Your account has been blocked. Please contact support.'})
        }

        const isPasswordValid = await bcrypt.compare(req.body.userPassword.trim(), checkUser.password);

        if (isPasswordValid) {
            req.session.user = checkUser._id; 
            return res.status(200).json({success:true, message:'User logged in', redirect:'/home'}); 
        } else {
            req.flash('error', 'Invalid user credentials');
            return res.status(400).json({success:false, message:'Invalid user credentials- Password mismatch'})
        }
    } catch (err) {
        console.log(`Error in Login: ${err.message || err}`);
        return res.status(400).json({success:false, message:'An error occured, Please try again later.'}); 
    }
};


const SignUp = (req, res) => {
    try {
        res.render('user/Sign-Up', { title: 'Sign-Up', alertMessage: req.flash('error'), user: req.session.user })    
    }
    catch (err) {
        console.log(`Error in rendering Sign-Up page, ${err}`)
    }
}

const SignUpPost = async (req, res) => {
    const { name, phoneNumber, email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {

        // Extract password and confirm password from array
        const [password1, password2] = password;

        // Check if all fields are provided
        if (!name || !phoneNumber || !email || !password1 || !password2) {
            console.error('All fields are required');
            req.flash('error', 'All fields are required');
            return res.status(400).json({success:false, message:'All feilds are required.'});
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            console.error('Invalid email format');
            req.flash('error', 'Invalid email format');
            return res.status(400).json({success:false, message:'Invalid email format'});
        }

        // Check if passwords match
        if (password1 !== password2) {
            console.error('Passwords do not match');
            req.flash('error', 'Passwords do not match');
            return res.redirect('user/Sign-Up');
        }

        // Check if user already exists
        const checkUserExists = await userSchema.findOne({ email });

        if (checkUserExists) {
            req.flash('error', 'User already exists');
            console.log('User already exists.');
            return res.redirect('user/Sign-Up');
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
        res.render('user/OTPpage',{ 
            title: 'OTP Page',
            email: req.session.email,
            otpTime: req.session.otpTime,
        })
        
    } catch (err) {
        console.error(`Error submitting data during Sign-Up: ${err}`);
        req.flash('error', 'An error occurred during sign-up. Please try again.');
        res.redirect('Sign-Up');
    }
};


const otpPagePost = async (req, res) => {
    const {otp} = req.body
    try {
        // console.log('Reached otppagePost try')
        if (String(req.session.otp) === String(otp) && Date.now() - req.session.otpTime < 300000) {
            const user = await userSchema.findOne({email : req.session.email})
            if(user){
                user.isVerified = true;
                await user.save();
            
                //Set user data
                req.session.user = user._id

                //Clear OTP from the session
                req.session.otp = null;
                req.session.otpTime = null;
            
                // req.flash('sucess', 'Welcome!...New user verification successful');
                console.log('New user verification successful');
                res.redirect('/home');
                }
            else{
                console.log('User not found')
                res.redirect('/Sign-Up');

            }
        }
        else{
            console.log('Error in OTP:')
            res.redirect('/Sign-Up')
        }    
            
    } catch (error) {
        console.log(`error while verifying otp${error}`)
        res.redirect('/Sign-Up')
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
        res.redirect('user/OTPpage');
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
                return res.redirect('/login')
            }
            if (!user) {
                return res.redirect('/login');
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                req.session.user = user.id;
                console.log('User logged in, redirecting to home');
                return res.redirect('/home');
            });
        })(req, res, next);
    } catch (err) {
        console.log(`Error on google callback ${err}`);
    }
}


const logout = (req, res) => {
    try {
        // req.session.destroy(error => {
        //     if (error) {
        //         console.log(`Error in logout ${error}`)
        //     }
        // })
        req.session.user = null
        res.redirect('home')
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