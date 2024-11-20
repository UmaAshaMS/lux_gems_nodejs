// function to check the user sesesion only for login and register
async function checkAdminLogin(req, res, next) {
    console.log("inside log here");
    try {
        if (req.session.admin) {
            next()
        } else {
            res.redirect('/admin/adminLogin')
        }
    } catch (error) {
        console.log(error);

    }
}

module.exports = checkAdminLogin