const userSchema = require('../../model/userSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')
const couponSchema = require('../../model/couponSchema')
const walletSchema = require('../../model/walletSchema')
const bcrypt = require('bcrypt')


const profile = async (req, res) => {
    try {
        const userID = req.session.user; // Get user ID from session
        const category = await categorySchema.find(); // Get categories

        // Find the user
        const userData = await userSchema.findOne({ _id: userID }, { _id: 0 });

        let defaultAddress = null;

        // Check if the user has any addresses and if any of them is marked as default
        if (userData && userData.address && userData.address.length > 0) {
            defaultAddress = userData.address.find(addr => addr.isDefault === true);
        }

        res.render('user/profile', {
            title: 'User Profile',
            category,
            address: defaultAddress,
            user: req.session.user,
            userData
        });
    } catch (error) {
        console.log(`Error in loading profile page: ${error}`);
        res.status(500).send('Something went wrong');
    }
};

const address = async (req, res) => {
    const category = await categorySchema.find();
    let address = null
    const userID = req.session.user
    try {
        const userData = await userSchema.findOne({ _id: userID }, { address: 1 })
        if (userData.address.length > 0)
            address = userData.address
    }
    catch (error) {
        console.log("Error in fetching address:", error)
    }
    res.render('user/address', { title: ' Add Address', category, user: req.session.user, address })
}

const addAddress = async (req, res) => {
    const userID = req.session.user
    try {
        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;
        console.log('Form details in adding address', req.body.fullName)

        const user = await userSchema.findOne({ _id: userID })

        const newAddress = {
            fullName,
            phoneNumber,
            email,
            addressLine1,
            addressLine2,
            city,
            pincode,
            state,
            country,
        };

        user.address.push(newAddress)
        // Save the address to the database
        await user.save();


        res.status(200).json({ message: 'Address added successfully' });
        console.log('New Address added successfully')
    }
    catch (error) {
        console.log(`Failed to add address , error: ${error}`)
        res.status(500).json({ message: 'An error occured while adding address' });
    }
}

const deleteAddress = async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10)
        const userID = req.session.user
        const user = await userSchema.findOne({ _id: userID }, { address: 1 })
        user.address.splice(index, 1)
        await user.save()
        res.status(200).json({ message: 'Address deleted successfully' });

    }
    catch (error) {
        console.log(`Error in deleting address : ${error}`)
        res.status(500).json({ error: 'An error occurred while deleting the address' });

    }
}

const editAddress = async (req, res) => {
    try {
        const category = await categorySchema.find();
        const index = req.params.index
        const user = req.session.user
        const userData = await userSchema.findOne({ _id: user }, { address: 1 })
        const address = userData.address[index]
        res.render('user/editAddress', { title: ' Edit Address', category, user: req.session.user, address, index })
    }
    catch (error) {
        console.log(`Error in loading edit address page : ${error}`)
    }
}

const editAddressPost = async (req, res) => {
    try {
        const userID = req.session.user
        const index = req.params.index
        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;
        const user = await userSchema.findOne({ _id: userID }, { address: 1 });

        if (user) {
            user.address[index] = {
                fullName,
                phoneNumber,
                email,
                addressLine1,
                addressLine2,
                city,
                pincode,
                state,
                country
            };

            await user.save();
            res.redirect('/address');
        } else {
            res.status(404).send('User not found');
        }
    }
    catch (error) {
        console.log(`Error in editing user address, ${error} `)
    }
}

const setDefaultAddress = async (req, res) => {
    try {
        const { index } = req.params;
        const userID = req.session.user
        const user = await userSchema.findById(userID);

        if (user.address && user.address.length > index) {
            // Mark all addresses as non-default
            user.address.forEach(address => address.isDefault = false);

            // Set the selected address as default
            user.address[index].isDefault = true;

            await user.save();

            res.json({ message: 'Default address set successfully' });
        } else {
            res.status(400).json({ message: 'Invalid address index' });
        }

    }
    catch (error) {
        console.log(`Error in setting default address,${error}`)
    }
}

const orderHistory = async (req, res) => {
    try {
        const category = await categorySchema.find();
        const orders = await orderSchema.find({userId: req.session.user}).sort({ createdAt: -1 });
        const user = req.session.user

        const orderDetails = orders.map(order => {
            const orderDate = new Date(order.orderDate);
            const expectedDeliveryDate = new Date(orderDate);
            expectedDeliveryDate.setDate(orderDate.getDate() + 10);

            // Define the return policy (e.g., 7 days for returns)
            const returnPolicyDays = 7;

            // Calculate the return date
            const returnDate = new Date(expectedDeliveryDate);
            returnDate.setDate(expectedDeliveryDate.getDate() + returnPolicyDays);

            // Format the return date
            const formattedReturnDate = returnDate.toDateString();

            const currentDate = new Date();
            const returnWindowClosed = currentDate > returnDate;

            return {
                ...order.toObject(), // Convert Mongoose document to plain object
                expectedDeliveryDate: expectedDeliveryDate.toDateString(),
                formattedReturnDate,
                returnWindowClosed,
                returnDate
            };
        });


        res.render('user/orderHistory', {
            title: 'Order History',
            category,
            user,
            orders: orderDetails,
            
        })
    }
    catch (error) {
        console.log(`Error in rendering order history page, ${error}`)
    }
}

const editProfile = async (req, res) => {
    try {
        const category = await categorySchema.find();
        const userId = req.session.user
        const user = await userSchema.findById(userId, { address: 0 })

        res.render('user/editProfile', { title: 'Edit User Profile', category, user })
    }
    catch (error) {
        console.log(`Error in rendering user profile edit page, ${error}`)
    }
}

const editProfilePost = async (req, res) => {
    try {
        const userId = req.session.user
        const { fullName, phoneNumber, currentPassword, confirmPassword, newPassword } = req.body

        const user = await userSchema.findById(userId, { address: 0 })

        if (newPassword) {
            const isPasswordValid = await bcrypt.compare(currentPassword.trim(), user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
        }


        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            // res.status(400).send('New passwords do not match')
            return redirect('editProfile');
        }

        user.name = fullName;
        user.phoneNumber = phoneNumber;

        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save()

        res.redirect('profile')
    }
    catch (error) {
        console.log(`Error in saving edited profile info,${error}`)
    }
}

const rewards = async (req, res) => {
    try {
        const user = req.session.user
        const category = await categorySchema.find()
        const coupons = await couponSchema.find()


        res.render('user/Rewards', { title: 'Rewards', user, category, coupons })
    }
    catch (error) {
        console.log(`Error in rendering rewards page, ${error}`)
    }
}

const wallet = async (req, res) => {
    try {
        const user = req.session.user
        const category = await categorySchema.find()
        const wallet = await walletSchema.findOne({userID:user})
        res.render('user/Wallet', { title: 'Wallet', user, category, wallet : wallet || { balance: 0 } })

    }
    catch (error) {
        console.log(`Error in rendering wallet page, ${error}`)
    }
}


module.exports = {
    profile,
    editProfile,
    editProfilePost,
    address,
    addAddress,
    deleteAddress,
    editAddress,
    editAddressPost,
    setDefaultAddress,
    orderHistory,
    rewards,
    wallet
}