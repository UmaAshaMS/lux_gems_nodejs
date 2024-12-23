const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const { ObjectId } = require('mongodb')

const cart = async (req, res) => {
    try {
        const user = req.session.user
        const category = await categorySchema.find({ isBlocked: 0 })
        const cart = await cartSchema.findOne({ userId: new ObjectId(user) }).populate('product.productId');
        const hasActiveProducts = cart && cart.product && cart.product.length > 0 && cart.product.some(item => item.productId.isActive);

        res.render('user/cart', { title: 'Cart', cart, user, category, hasActiveProducts })
    }
    catch (error) {
        console.log(`Error in rendering cart page, ${error}`)
    }
}

const addToCart = async (req, res) => {
    console.log('reached add to cart')

    try {
        console.log('reached add to cart try')
        const user = req.session.user || null;
        console.log(req.session.user)
        const productId = req.params.productId;

        // Check if the user is authenticated
        if (!user) {
            return res.status(401).json({ message: 'User not authenticated. Please log in to add items to your cart.' });
        }

        // Validate the productId
        if (!ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid Product ID' });
        }

        const productAvailability = await productSchema.findOne({
            _id: new ObjectId(productId),
            isActive: true,
            stock: { $gt: 0 },
        });

        if (!productAvailability) {
            return res.status(400).json({ message: 'Product is out of stock or not available' });
        }

        // Find the cart for the user
        let cart = await cartSchema.findOne({ userId: new ObjectId(user) });

        if (cart) {
            // Check if the product already exists in the cart
            const existingProduct = cart.product.find((item) => {
                return item && item.productId && item.productId.equals(new ObjectId(productId));
            });

            if (existingProduct) {
                // Check if the existing quantity exceeds the allowed maximum
                if (existingProduct.quantity >= 10) {
                    return res.status(400).json({ message: 'Maximum quantity of 10 reached for this product.' });
                }

                // Check if adding one more will exceed the stock available
                if (existingProduct.quantity + 1 > productAvailability.stock) {
                    return res.status(400).json({ message: 'Insufficient stock to add more of this product.' });
                }

                // If the product exists, increase the quantity
                existingProduct.quantity += 1;

                // Calculate the new price if there's a discount
                if (productAvailability.productDiscount) {
                    const discountAmount = (productAvailability.productDiscount / 100) * productAvailability.productPrice; 
                    existingProduct.price = (productAvailability.productPrice - discountAmount).toFixed(2); // Change 'productPrice' to 'price'
                }

            } else {
                // If the product does not exist, add it as a new item
                const discountAmount = productAvailability.productDiscount ? (productAvailability.productDiscount / 100) * productAvailability.productPrice : 0;
                const newCartItem = {
                    productId: new ObjectId(productId),
                    productName: productAvailability.productName,
                    quantity: 1,
                    price: (productAvailability.productPrice - discountAmount).toFixed(2), // Ensure you use 'price' here
                    category: productAvailability.productCategory,
                };

                cart.product.push(newCartItem);
            }
        } else {
            // Create a new cart if none exists for the user
            const discountAmount = productAvailability.productDiscount ? (productAvailability.productDiscount / 100) * productAvailability.productPrice : 0;
            const newCartItem = {
                productId: new ObjectId(productId),
                productName: productAvailability.productName,
                quantity: 1,
                price: (productAvailability.productPrice - discountAmount).toFixed(2), // Ensure you use 'price' here
                category: productAvailability.productCategory,
            };
            cart = new cartSchema({
                userId: new ObjectId(user),
                product: [newCartItem],
            });
        }

        // Save the updated cart
        await cart.save();

        res.status(200).json({ message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error(`Error in adding product to cart: ${error}`);
        res.status(500).json({ message: 'An error occurred while adding the product to the cart.' });
    }
};




const removeFromCart = async (req, res) => {
    try {
        const user = req.session.user || null;
        const productId = req.params.productId

        if (!user) {
            return res.status(401).json({ message: 'User not authenticated. Please log in to remove items from your cart.' });
        }

        // Validate the productId
        if (!ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid Product ID' });
        }

        // Find the cart for the user
        let cart = await cartSchema.findOne({ userId: new ObjectId(user) });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        // Find the product in the cart
        const productIndex = cart.product.findIndex(item => item.productId.equals(new ObjectId(productId)));
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        cart.product.splice(productIndex, 1); 
        // Save the updated cart
        await cart.save();

        // Respond with a success message
        res.status(200).json({ message: 'Product removed from cart successfully.' });

    }
    catch (error) {
        console.log(`Error in removing product from cart, ${error}`)
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updateQuantity = async (req, res) => {
    const { productId } = req.params;
    const { change } = req.body;
    const user = req.session.user || null;

    try {
        // Find the cart for the user
        const cart = await cartSchema.findOne({ userId: new ObjectId(user) });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the product in the cart
        const item = cart.product.find(p => p.productId.toString() === productId);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        // Find the product to check stock
        const product = await productSchema.findById(productId);

        if (!product || product.isActive === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if the product is blocked
        if (!product.isActive) {
            return res.status(400).json({ success: false, message: 'Insufficient Stock (Product is blocked).' });
        }
        
        // Calculate new quantity
        const newQuantity = item.quantity + change;

        // Check if new quantity is valid
        if (newQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity cannot be less than 1' });
        }

        // Set a maximum limit for the quantity in the cart
        const maxQuantity = 10;
        if (newQuantity > maxQuantity) {
            return res.status(400).json({ success: false, message: `Quantity cannot exceed ${maxQuantity}` });
        }

        if (newQuantity >= product.stock) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // Update quantity in cart
        item.quantity = newQuantity;

        // Save updated cart
        await cart.save();

        // // Update stock of the product
        // product.stock -= change;

        // // Save updated product
        // await product.save();

        res.json({ success: true, message: 'Quantity updated successfully!' });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
module.exports = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
}
