const dotenv = require('dotenv').config()

const adminLogin = (req, res) => {
    try {
        if (req.session.admin) {
            res.setHeader('Cache-Control', 'no-store'); // Prevent caching
            // console.log('Session set:', req.session.admin);  // Log session data
            res.redirect('/admin/home')
        }
        else {
            res.render('admin/adminLogin', { title: 'Admin Login' })
        }
    }
    catch (err) {
        console.log(`Error in rendering admin login page ${err}`)
    }
}

const adminLoginPost = async (req, res) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    try {
        if (req.body.email === process.env.EMAIL && req.body.password === process.env.PASSWORD) {
            req.session.admin = req.body.email;
            if (emailRegex.test(req.body.email)) {
                res.redirect('/admin/home');
            }
            else{
                res.redirect('/admin/adminLogin')
            }
        }
        else {
            res.redirect('/admin/adminLogin')
        }
    }
    catch (err) {
        console.log(`Error in admin login ${err}`)
        res.status(500).send('Internal Server Error');

    }
}


// Handle admin logout
const logout = (req, res) => {
    try {
        const userData = req.session.admin;
        // Destroy admin session
        // req.session.destroy((err) => {
        //     if (err) {
        //         // Log any error that occurs during session destruction
        //         console.log(`error during session logout${err}`)
        //         // res.redirect('/admin/home')
        //     }
        //     else{
        //     // Redirect to admin dashboard after logout
        //     // res.clearCookie('connect.sid'); // Clear the session cookie
        //     res.redirect('/admin/adminLogin')
        //     }
        // })

        req.session.admin= null
        // res.clearCookie('connect.sid');
        res.redirect('/admin/adminLogin');
    } catch (error) {
        // Log any error that occurs during logout
        console.log(`Error on admin logout ${error}`)
    }
}

module.exports = {
    adminLogin,
    adminLoginPost,
    logout
}