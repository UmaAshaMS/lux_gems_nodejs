const userSchema = require('../model/userSchema')


// // function to check the user sesesion only for login and register
// async function checkUserLogin(req, res, next) {
//   console.log('In the midleware',req.session.user)

//     try {
//         if (req.session.user && req.session.user !== null && req.session.user !== '') {
//           console.log('if session : ',req.session.user)
//           const userDetails = await userSchema.findById(req.session.user)
//           if (userDetails && !userDetails.isBlocked) {
//             next()
//           } else {
//             console.log('If no session go to login page:', req.session.user)
//             req.session.user = ''
//             res.redirect('/login')
//           }
//         } else {
//           console.log('No session, redirecting to login page');
//           // res.redirect('/login'); 
//           next()

//         }
//       } catch (err) {
//         console.log(`Error in checkuser Middleware  ${err}`)
//       }
//     }
// module.exports = {
//     checkUserLogin,
// }



// function to check the user sesesion for other routes except home and product view page
async function checkUserSession(req, res, next) {
    try {
        if (req.session.user) {
            const user = await userSchema.findById(req.session.user)

            if (user.isBlocked) {
                req.session.user = ''
                res.redirect('/login')
            } else {
                next()
            }
        }
        else {
            res.redirect('/login')
        }
    } catch (error) {
        console.log("check user session ");
    }
}

// function to check the user sesesion in home page and product view page only
async function checkUserSessionBlocked(req, res, next) {
    try {
        if (req.session.user) {

            // get the data of the user
            const user = await userSchema.findById(req.session.user)

            if (user.isBlocked) {
                req.session.user = ''
                res.redirect('/login')
            } else {
                next()
            }

        } else {
            next()
        }
    } catch (error) {
        console.log(error);
    }
}


// function to check the user sesesion only for login and register
async function checkUserLogin(req, res, next) {
    try {
        if (req.session.user) {
            res.redirect('/home')
        } else {
            next()
        }
    } catch (error) {
        console.log(error);

    }
}



module.exports = {
    checkUserSession,
    checkUserSessionBlocked,
    checkUserLogin
}