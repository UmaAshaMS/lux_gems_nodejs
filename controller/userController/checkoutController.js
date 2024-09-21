const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const { ObjectId } = require('mongodb')

const checkout = async (req, res) => {
    try {
        const userId = req.session.user;
        const category = await categorySchema.find({ isBlocked: 0 });
        const cart = await cartSchema.findOne({ userId: new ObjectId(userId) }).populate({
            path: 'product.productId',
            select: 'productName productPrice productImage'
        });

        // Check if cart exists
        if (!cart) {
            return res.status(404).json({message:'Cart not found'});
        }

        const cartItems = cart.product || [];
        const userAddress = await userSchema.findOne({ _id: userId }, { address: 1, _id: 0 });

        let defaultAddress = null;
        if (userAddress && userAddress.address && userAddress.address.length > 0) {
            defaultAddress = userAddress.address.find(addr => addr.isDefault === true);
        }

        // Calculate subtotal
        const subtotal = cartItems.reduce((total, item) => {
            const productPrice = item.productId.productPrice || 0;
            return total + (productPrice * item.quantity);
        }, 0);

        // Delivery charge and promotion amount
        const deliveryCharge = 0.00; 
        const promotionAmount = 0.00; 

        req.session.cart = {
            cartItems,
            subtotal,
            deliveryCharge,
            promotionAmount
        };

        req.session.address = defaultAddress || null;

        res.render('user/checkOut', {
            title: 'Checkout',
            user: req.session.user,
            cart,
            cartItems,
            category,
            userAddress,
            defaultAddress,
            selectedAddress: defaultAddress,
            subtotal,
            deliveryCharge,
            promotionAmount
        });
    } catch (error) {
        console.error(`Error in rendering checkout page: ${error}`);
        res.status(500).json({message:'Internal Server Error'});
    }
};

const updateDefaultAddress = async(req,res) => {
    try{
        const { addressId } = req.body;
        const userId = req.session.user; 

    // Find the user and update the default address
    userSchema.findByIdAndUpdate(userId, { defaultAddress: addressId }, (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update address.' });
        }
        res.json({ success: true, message: 'Default address updated.' });
    });
    }
    catch(error){
        console.log(`Error in selecting default address in checkout page, ${error}`)
    }
}

const addNewAddress = async(req,res) => {
    try{
        const category = await categorySchema.find({ isBlocked: 0 });
        res.render('user/addAddressCheckout' , {title:'Add new address', category, user:req.session.user})
    }
    catch(error){
        console.log(`Error in rendering adding new address page in checkout, ${error}`)
    }
}
const addNewAddressPost = async(req,res) => {
    const userID = req.session.user
    try {
        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;
        console.log('Form details in adding address', req.body.fullName)

        const user = await userSchema.findOne({_id:userID})

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
    
        
        res.status(200).json({ message: 'Address added successfully'});
        console.log('New Address added successfully')
      } 
      catch (error) {
        console.log(`Failed to add address , error: ${error}`)
        res.status(500).json({ message: 'An error occured while adding address' });
      }
    }

module.exports = {
    checkout,
    updateDefaultAddress,
    addNewAddress,
    addNewAddressPost,
}