const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const couponSchema = require('../../model/couponSchema')
const walletSchema = require('../../model/walletSchema')
const orderSchema = require('../../model/orderSchema')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');
const addressSchema = require('../../model/addressSchema')
const paypal = require('@paypal/checkout-server-sdk');
const axios = require('axios');
const Razorpay = require("razorpay");
require('dotenv').config();


const getAvailableCoupon = async(req,res) => {
    try {
        const { orderAmount } = req.body; 

        const applicableCoupons = await couponSchema.find({
            minOrderAmount: { $lte: orderAmount },  
            usageLimit: { $gt: 0 } 
        });

        // Respond with the applicable coupons
        res.json({ applicableCoupons });
    } catch (error) {
        console.error('Error fetching applicable coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
}


const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        // Fetch the user's cart
        const cart = await cartSchema.findOne({ userId: userId }).populate('product.productId');
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found.' });
        }

        console.log('Cart : ', cart)

        // Calculate the total price of the cart
        let totalPrice = cart.product.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        console.log('Total price in the cart : ',totalPrice)

        // Validate the coupon
        const coupon = await couponSchema.findOne({ couponCode: couponCode.trim() });
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid coupon code.' });
        }

        console.log('Coupon details: ', coupon); 


        // Check if the coupon is expired
        if (new Date() > coupon.expiryDate) {
            return res.status(400).json({ message: 'Coupon has expired.' });
        }

        const deliveryCharge = totalPrice < 2000 ? 100 : 0;

        // Add delivery charge to order total
        totalPrice += deliveryCharge;

        // Check if the minimum amount requirement is met
        if (totalPrice < coupon.minimumAmount) {
            return res.status(400).json({ message: `A minimum of ${coupon.minimumAmount} is required to use this coupon.` });
        }

        // Check if the usage limit has been reached
        if (coupon.usageLimit <= 0) {
            return res.status(400).json({ message: 'Coupon usage limit has been reached.' });
        }

        // Calculate the discount amount
        let discountAmount = 0;
        console.log('Discounttype of couopn : ',coupon.discountType)
        console.log('Discount  : ', coupon.discount)
        if (coupon.discountType === 'Percentage') {
            discountAmount = (totalPrice * (coupon.discount / 100));
        } else if (coupon.discountType === 'Fixed Amount') {
            discountAmount = coupon.discount;
        }

        console.log('Discount amount : ',discountAmount)

        // Ensure the discount does not exceed the total price
        if (discountAmount > totalPrice) {
            discountAmount = totalPrice;
        }

        // Calculate final amount after discount
        let orderTotal = totalPrice - discountAmount;
        console.log('Order amount:', orderTotal)

       
        console.log('Final order amount (including delivery charge if applicable):', orderTotal);

        // Decrement the usage limit and save the updated coupon
        // coupon.usageLimit -= 1;
        // await coupon.save();

        req.session.cart.promotionAmount = discountAmount; // Store discount amount in session


        // Respond with the calculated amounts
        res.status(200).json({
            cart,
            message: 'Coupon applied successfully.',
            totalPrice: totalPrice.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            orderTotal: orderTotal.toFixed(2)
        });

    } catch (error) {
        console.error(`Error applying coupon: ${error}`);
        res.status(500).json({ message: 'An error occurred while applying the coupon.' });
    }
};



const checkout = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await userSchema.findById(userId)
        const category = await categorySchema.find({ isBlocked: 0 });
        const cart = await cartSchema.findOne({ userId: new ObjectId(userId) }).populate({
            path: 'product.productId',
            select: 'productName productPrice productImage productDiscount isActive'
        });

        const userWallet = await walletSchema.findOne({ userID: new ObjectId(userId) });


        // Check if cart exists
        if (!cart) {
            // return res.status(404).json({ message: 'Cart not found' });
            return res.render('user/cart', { title: 'Cart', cart, user, category })
        }

        const cartItems = cart.product || [];
        const activeCartItems = cartItems.filter(item => item.productId.isActive);

        if (activeCartItems.length === 0) {
            return res.status(400).json({success:false, message:'No active products in the cart. Cannot proceed to payment.'})
        }

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
        const subtotal = activeCartItems.reduce((total, item) => {
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
        req.session.cart.cartItems = activeCartItems;
        req.session.cart.subtotal = subtotal;
        req.session.cart.deliveryCharge = deliveryCharge;

        req.session.cart.promotionAmount  = 0.00; 

        req.session.address = defaultAddress || null;

        // console.log('------------Session:',req.session)
        // console.log(process.env.PAYPAL_CLIENT_ID.trim())

        if (req.headers['x-requested-with'] === 'XMLHttpRequest') { // Check if it's an AJAX request
            return res.json({
                success: true,
                cartItems,
                subtotal,
                deliveryCharge,
                wallet: userWallet,
            });
        }
        res.render('user/checkOut', {
            title: 'Checkout',
            user: user,
            cart,
            cartItems : activeCartItems,
            category,
            userAddress,
            defaultAddress : defaultAddress || null,
            selectedAddress: req.session.address,
            subtotal,
            deliveryCharge,
            promotionAmount : req.session.cart.promotionAmount,
            paypalClientId: process.env.PAYPAL_CLIENT_ID.trim(),
            instamojoApiKey: process.env.INSTAMOJO_API_KEY.trim(),
            wallet : userWallet 
        });
    } catch (error) {
        console.error(`Error in rendering checkout page: ${error}`);
        // res.status(500).json({ message: 'Internal Server Error' });
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

        const hasDefaultAddress = user.address.some(address => address.isDefault)


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
          isActive: true,
          isDefault: !hasDefaultAddress,
        };

        user.address.push(newAddress)
        // Save the address to the database
        await user.save();
    
        
        res.status(200).json({ message: 'Address added successfully'});

        console.log('New Address added successfully')
      } 
      catch (error) {
        console.log(`Failed to add address , error: ${error}`)
        res.status(500).json({ suucess : false, message: 'An error occured while adding address' });
      }
    }

const editAddressCheckout = async(req,res) => {
    try{
        const category = await categorySchema.find({ isBlocked: 0 });

        const user = await userSchema.findOne({ _id: req.session.user }, { address: 1 })
        if (!user || !user.address) {
            return res.status(404).json({success: false, message:"No Address found for this user"});
        }

        const addressId = req.params.addressId;

        const address = user.address.find(addr => addr._id.equals(addressId));

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        res.render('user/editAddressCheckout', {title:'Add new address', category, user:req.session.user, address})
    }
    catch(error){
        console.log(`Error in rendering edit address page in checkout : ${error} `)
        res.status(500).json({success:false, message:'Error in rendering edit address page in checkout'})
    }
}    

const editAdressCheckoutPost = async(req,res) => {
    try{

        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;

        const user = await userSchema.findOne({ _id: req.session.user }, { address: 1 })
        if (!user || !user.address) {
            return res.status(404).json({success: false, message:"No Address found for this user"});
        }

        const addressId = req.params.addressId
        const address = user.address.find(addr => addr._id.equals(addressId));

        address.fullName = fullName || address.fullName;
        address.phoneNumber = phoneNumber || address.phoneNumber;
        address.email = email || address.email;
        address.addressLine1 = addressLine1 || address.addressLine1;
        address.addressLine2 = addressLine2 || address.addressLine2;
        address.city = city || address.city;
        address.pincode = pincode || address.pincode;
        address.state = state || address.state;
        address.country = country || address.country;
        
        // Save the updated user document
        await user.save();

        res.status(200).json({ success: true, message: "Address updated successfully" });

        }
    catch(error){
        console.log(`Error in editing address in checkout page: ${error}`)
        res.status(500).json({success:false, message:'Error in editing address page in checkout'})
    }
}



const deleteAddressCheckout = async(req,res) => {
        try{
            const addressId = req.params.addressId;

            const user = await userSchema.findOne({ _id: req.session.user }, { address: 1 })
            if (!user || !user.address) {
                return res.status(404).json({success: false, message:"No Address found for this user"});
            }

        const addressIndex = user.address.findIndex(addr => addr._id.equals(addressId));

        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        user.address.splice(addressIndex, 1);
        await user.save();

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

        // console.log('cart',cart)

        const totalAmount = cart.product.reduce((acc, item) => {
            return acc + item.price * item.quantity;
        }, 0);

        const deliveryCharge = totalAmount < 2000 ? 100 : 0;
        const finalAmount = (totalAmount + deliveryCharge).toFixed(2);

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
                    value: finalAmount
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
        console.error(`Error in rendering PayPal: ${error}`);

    }
}


const renderRazorpay = async (req, res) => {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY
        });

        const userDetails = await userSchema.findById(req.session.user);
        const cart = await cartSchema.findOne({ userId: req.session.user });

        if (!cart) {
            return res.status(400).json({ error: "Cart not found" });
        }

        // Calculate total amount with delivery charge
        const totalAmount = cart.product.reduce((acc, item) => {
            return acc + item.price * item.quantity;
        }, 0);

        let discountAmount = 0
        const couponCode = req.body.couponCode
        if(couponCode){
            const coupon = await couponSchema.findOne({couponCode : couponCode })
            if(coupon){
                if(coupon.discountType ==="Fixed Amount"){
                    discountAmount = coupon.discount
                }
                else if(coupon.discountType === "Percentage"){
                    discountAmount = totalAmount * (coupon.discount / 100)
                }
            }
            else{
            return res.status(400).json({message:'Invalid Coupon Code'})
        }

        }
        
        
        const deliveryCharge = totalAmount < 2000 ? 100 : 0;
        const finalAmount = Math.round((totalAmount + deliveryCharge - discountAmount)) * 100;
        console.log('Final amount in paise', finalAmount)

        // Create Razorpay order
        const options = {
            amount: finalAmount,
            currency: "INR",
            receipt: `receipt_order_${Math.random() * 1000}`,
            payment_capture: 1 
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: "Razorpay order created",
            orderId: order.id,
            amount: order.amount, 
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error(`Error in rendering Razorpay: ${error}`);
        res.status(500).json({ error: "Failed to create Razorpay order" });
    }
};

const updateOrderPendingStatus = async(req,res) => {
        const { orderId, paymentId, status } = req.body;
        try {
            // Find the order in the database using orderId
            const order = await orderSchema.findById(orderId);
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            // order.paymentId = paymentId; 
            order.status = status; 
            console.log('Order status:', order.status)
    
            // Save the updated order
            await order.save();
    
            return res.json({ success: true, message: 'Order status updated successfully' });
        } catch (err) {
            console.error('Error updating order status:', err);
            return res.status(500).json({ success: false, message: 'Failed to update order status' });
        }
    };

module.exports = {
    getAvailableCoupon,
    applyCoupon,
    checkout,
    updateDefaultAddress,
    addNewAddress,
    addNewAddressPost,
    editAddressCheckout,
    editAdressCheckoutPost,
    deleteAddressCheckout,
    renderPaypal,
    renderRazorpay,
    updateOrderPendingStatus

}