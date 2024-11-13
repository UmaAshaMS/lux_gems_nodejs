const userSchema = require('../model/userSchema')


// function to check the user sesesion only for login and register
async function checkUserLogin(req, res, next) {
    try {
        if (req.session.user) {
          const userDetails = await userSchema.findById(req.session.user)
          if (userDetails && !userDetails.isBlocked) {
            next()
          } else {
            req.session.user = ''
            res.redirect('/login')
          }
        } else {
          next()
        }
      } catch (err) {
        console.log(`Error in checkuser Middleware  ${err}`)
      }
    }
module.exports = {
    checkUserLogin,
}