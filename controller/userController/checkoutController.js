const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const couponSchema = require('../../model/couponSchema')
const { ObjectId } = require('mongodb')


const applyCoupon = async(req,res) => {
    const { couponCode } = req.body;

    try {
        const coupon = await couponSchema.findOne({ code: couponCode });

        if (!coupon) {
            return res.status(400).json({ message: 'Invalid coupon code.' });
        }

        const discount = coupon.discount;
        const discountType = coupon.discountType;

        // Get current subtotal from session
        const subtotal = req.session.cart.subtotal || 0;
        let promotionAmount = 0;

        // Check if the subtotal meets the minimum amount required for the coupon
        if (coupon.minimumAmount && subtotal < coupon.minimumAmount) {
            return res.status(400).json({ message: `Minimum amount of ₹${coupon.minimumAmount} is required to apply this coupon.` });
        }

        // Calculate promotion amount based on discount type
        if (discountType === 'percent') {
            // Calculate percentage discount
            promotionAmount = (subtotal * discount) / 100; // discount is in %
        } else if (discountType === 'rs') {
            // Use fixed amount discount
            promotionAmount = discount; // discount is in Rs
        }

        // Store the calculated promotion amount in session
        req.session.cart.promotionAmount = promotionAmount;

        // Optionally, you could also recalculate the total amount here if needed
        const totalAmount = subtotal + req.session.cart.deliveryCharge - promotionAmount;

        // Send the discount amount back to the client
        res.json({ discount: promotionAmount, totalAmount });
    } catch (error) {
        console.error('Error applying coupon:', error);
}
}
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
            return res.status(404).json({ message: 'Cart not found' });
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

        // Delivery charge
        const deliveryCharge = 0.00; 

        // Initialize req.session.cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = {
                cartItems: [],
                subtotal: 0.00,
                deliveryCharge: 0.00,
                promotionAmount: 0.00
            };
        }

        // Update session cart
        req.session.cart.cartItems = cartItems;
        req.session.cart.subtotal = subtotal;
        req.session.cart.deliveryCharge = deliveryCharge;

        // Access promotionAmount safely
        const promotionAmount = req.session.cart.promotionAmount || 0.00; 

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
        res.status(500).json({ message: 'Internal Server Error' });
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
    applyCoupon,
    checkout,
    updateDefaultAddress,
    addNewAddress,
    addNewAddressPost,
}