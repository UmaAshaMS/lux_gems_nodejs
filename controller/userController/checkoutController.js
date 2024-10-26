const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const couponSchema = require('../../model/couponSchema')
const walletSchema = require('../../model/walletSchema')
const { ObjectId } = require('mongodb')
const addressSchema = require('../../model/addressSchema')
const paypal = require('@paypal/checkout-server-sdk');



// const applyCoupon = async (req, res) => {
//     const { couponCode } = req.body;
//     console.log('------------------coupon code', req.body);

//     try {
//         const coupon = await couponSchema.findOne({ couponCode: couponCode });
//         console.log('Coupon Found:', coupon);

//         if (!coupon) {
//             return res.status(400).json({ message: 'Invalid coupon code.' });
//         }

//         const discount = coupon.discount;
//         const discountType = coupon.discountType;

//         // Get current subtotal from session
//         const subtotal = req.session.cart.subtotal || 0;
//         let promotionAmount = req.session.cart.promotionAmount || 0; // Initialize promotion amount from session
//         let totalAmount = subtotal + req.session.cart.deliveryCharge - promotionAmount; // Calculate initial total

//         // Check if the subtotal meets the minimum amount required for the coupon
//         if (coupon.minimumAmount && subtotal < coupon.minimumAmount) {
//             return res.status(400).json({ message: `Minimum amount of ₹${coupon.minimumAmount} is required to apply this coupon.` });
//         }

//         // Calculate potential promotion amount based on discount type
//         let newPromotionAmount = 0;
//         if (discountType === 'Percentage') {
//             // Calculate percentage discount
//             newPromotionAmount = (subtotal * discount) / 100; 
//         } else if (discountType === 'Fixed Amount') {
//             // Use fixed amount discount
//             newPromotionAmount = discount; 
//         }

//         console.log('-------------New Promotion Amount:', newPromotionAmount);

//         // Check if applying this coupon keeps the total above zero
//         const potentialTotalAmount = totalAmount - newPromotionAmount;

//         if (potentialTotalAmount < 0) {
//             return res.status(400).json({ message: 'Applying this coupon will result in a total below zero.' });
//         }

//         // Add new promotion amount to the total promotion amount
//         promotionAmount += newPromotionAmount;

//         // Store the updated promotion amount in session
//         req.session.cart.promotionAmount = promotionAmount;

//         // Recalculate the total amount here after applying the coupon
//         totalAmount = subtotal + req.session.cart.deliveryCharge - promotionAmount;

//         // Send the discount amount back to the client
//         res.json({ discount: promotionAmount, totalAmount });
//     } catch (error) {
//         console.error('Error applying coupon:', error);
//         return res.status(500).json({ message: 'Internal server error.' });
//     }
// }

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body; 
        const userId = req.session.user;

        // Fetch the user's cart
        const cart = await cartSchema.findOne({ userId: userId }).populate('product.productId');
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found.' });
        }

        // Calculate the total price of the cart
        let totalPrice = cart.product.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Validate the coupon
        const coupon = await couponSchema.findOne({ code: couponCode });
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid coupon code.' });
        }

        // Check if the coupon is expired
        if (new Date() > coupon.expiryDate) {
            return res.status(400).json({ message: 'Coupon has expired.' });
        }

        // Calculate the discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (totalPrice * (coupon.discountAmount / 100)).toFixed(2);
        } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountAmount;
        }

        // Ensure the discount does not exceed the total price
        if (discountAmount > totalPrice) {
            discountAmount = totalPrice;
        }

        // Calculate final amount after discount
        const finalAmount = (totalPrice - discountAmount).toFixed(2);

        // Respond with the calculated amounts
        res.status(200).json({ 
            message: 'Coupon applied successfully.', 
            totalPrice: totalPrice, 
            discountAmount: discountAmount, 
            finalAmount: finalAmount 
        });

    } catch (error) {
        console.error(`Error applying coupon: ${error}`);
        res.status(500).json({ message: 'An error occurred while applying the coupon.' });
    }
};


const checkout = async (req, res) => {
    console.log('Reached checkout')
    try {
        const userId = req.session.user;
        const category = await categorySchema.find({ isBlocked: 0 });
        const cart = await cartSchema.findOne({ userId: new ObjectId(userId) }).populate({
            path: 'product.productId',
            select: 'productName productPrice productImage productDiscount'
        });

        const userWallet = await walletSchema.findOne({ userID: new ObjectId(userId) });


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

        if (req.body.selectedAddress) {
            req.session.address = userAddress.address.find(addr => addr._id.toString() === req.body.selectedAddress);
        } else if (defaultAddress) {
            req.session.address = defaultAddress;
        }

        // Calculate subtotal
        const subtotal = cartItems.reduce((total, item) => {
            const productPrice = item.productId.productPrice || 0;
            const productDiscount = item.productId.productDiscount || 0;
            return total + ((productPrice - productPrice * (productDiscount/100)) * item.quantity);
        }, 0);


        let deliveryCharge = 100.00; // Default delivery charge is ₹100
        if (subtotal > 2000) {
            deliveryCharge = 0.00; // Free delivery for orders over ₹2000
        }

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

        // console.log('------------Session:',req.session)
        // console.log(process.env.PAYPAL_CLIENT_ID.trim())
        res.render('user/checkOut', {
            title: 'Checkout',
            user: req.session.user,
            cart,
            cartItems,
            category,
            userAddress,
            defaultAddress,
            selectedAddress: req.session.address,
            subtotal,
            deliveryCharge,
            promotionAmount,
            paypalClientId: process.env.PAYPAL_CLIENT_ID.trim(),
            wallet : userWallet 
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

    const editAdressCheckout = async(req,res) => {
        try{

        }
        catch(error){
            console.log(`Error in editing address in checkout page: ${error}`)
        }
    }

    const deleteAddressCheckout = async(req,res) => {
        console.log('Reached delete address checkout')
        try{
            const addressId = req.params.id;
            const result = await addressSchema.findByIdAndDelete(addressId);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        res.json({ success: true, message: 'Address deleted successfully.' });
        }
        catch(error){
            console.log(`Error in deleting address in checkout: ${error}`)
        }
    }
const renderPaypal = async(req,res) => {

    const environment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
    const client = new paypal.core.PayPalHttpClient(environment);

    try{
        const userDetails = await userSchema.findById(req.session.user);
        console.log(userDetails)
        const cart = await cartSchema.findOne({ userId: req.session.user })

        console.log('cart',cart)

        const totalAmount = cart.product.reduce((acc, item) => {
            return acc + item.price * item.quantity;
        }, 0);

        const deliveryCharge = totalAmount < 2000 ? 100 : 0;
        const finalAmount = totalAmount + deliveryCharge;

        console.log('Total amiunt', totalAmount)
        console.log('Final amount', finalAmount)



        if (!cart) {
            return res.status(400).json({ error: "Cart not found" });
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: "USD",
                    value: finalAmount.toFixed(2)
                },
                description: "Purchase from LUXGEMS"
            }],
            application_context: {
                brand_name: "LUXGEMS",
                return_url: "http://localhost:5000/payment-success",
                cancel_url: "http://localhost:5000/payment-cancel"
            }
        });
        const order = await client.execute(request);
        return res.status(200).json({
            success: "PayPal order created",
            orderID: order.result.id,
            totalAmount: cart.payableAmount
        });

    }
    catch(error){
        console.error(`Error in rendering PayPal: ${JSON.stringify(error)}`);

    }
}

module.exports = {
    applyCoupon,
    checkout,
    updateDefaultAddress,
    addNewAddress,
    addNewAddressPost,
    editAdressCheckout,
    deleteAddressCheckout,
    renderPaypal

}