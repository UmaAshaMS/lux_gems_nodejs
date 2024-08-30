const userSchema = require('../../model/userSchema');
const user = require('../../router/userRouter');


const userDashboard = async (req, res) => {
    try {
        const searchQuery = req.query.searchQuery || ''
        userDetails = await userSchema.find({ name: { $regex: searchQuery, $options: 'i' } })
        res.render('admin/customers', { title: 'Customers', userDetails, searchQuery });

    }
    catch (err) {
        console.log(`Error in rendering User page ${err}`)
    }
}

const userBlock = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(userId)
        if (!userId) {
            return res.status(404).json({ message: "User id not found" })
        }
        //blocking the given id
        const blockedUser = await userSchema.findByIdAndUpdate(userId, { isBlocked: true })


        if (blockedUser) {
            console.log('user blocked')
            return res.status(200).json({ message: "User blocked" })
        } else {
            return res.status(404).json({ message: "User not found" })
        }
    } catch (err) {
        console.log("Error on blocking the user:", err)
        return res.status(500).json({ message: "Internal server error" })
    }
}

const userUnblock = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(404).json({ message: "User id not found" })
        }
        //unblocking the given id
        const unblockedUser = await userSchema.findByIdAndUpdate(userId, { isBlocked: false })
        console.log(`Blocked user: ${unblockedUser}`); // Debug log


        if (unblockedUser) {
            return res.status(200).json({ message: "User blocked" })
        } else {
            return res.status(404).json({ message: "User not found" })
        }
    } catch (err) {
        console.log("Error on blocking the user:", err)
        return res.status(500).json({ message: "Internal server error" })
    }
}









module.exports = {

    userDashboard,
    userBlock,
    userUnblock,
}