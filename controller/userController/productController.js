const userSchema = require('../../model/userSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')

const AllproductsRender  = async(req,res) => {
    const searchQuery = req.query.query || ''; 

    // Retrieve non-blocked categories
    const categories = await categorySchema.find({ isBlocked: 0 });

    // Retrieve products that are active and belong to non-blocked categories
    const products = await productSchema.find({
        isActive: 1,
        productName: { $regex: searchQuery, $options: 'i' }
        // productCategory: { $in: validCategoryIds }
    });

    // Retrieve user from the session, or set to null if not present
    const user = req.session.user || null;
 
    try{
        res.render('user/AllProducts',{title:'Products', 
        category: categories,
        product: products,
        user,
        searchQuery})
    }
    catch(err){
        console.error('Error:' , err)
    }
} 

const productDetails = async (req,res) => {
    const category = await categorySchema.find()
    const user = req.session.user || null;
    const productID = req.params.id;

    try{
        // Fetch product details
        const product = await productSchema.findById(productID).populate('productCategory', 'name').exec();
        if (!product) {
            return res.status(404).render('pageNotFound', { title: 'Page Not Found' });
        }

        // Fetch recommended products (same category)
        const recommendations = await productSchema.find({
            productCategory: product.productCategory,
            _id: { $ne: productID } // Exclude the current product
        }).limit(4).exec();
        res.render('user/productDetails',{title:'Product Details', category, product, user, recommendations})
    }
    catch(err){
        console.log(`Error : ${err}`)
    }
}

const productCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await categorySchema.find();

        const categorySam = await categorySchema.findById(categoryId);

        if (!categorySam) {
            return res.status(404).render('pageNotFound',{ title: 'Page Not Found'})
        }

        const products = await productSchema.find({ productCategory: categorySam._id });

        const user = req.session.user || null;

        res.render('user/AllProducts', {
            title: 'Products',
            category, 
            categorySam,
            product: products,
            user
        });
    } catch (err) {
        console.error('Error in loading category-wise products:', err);
        res.status(500).send('Internal Server Error'); // Send error response to client
    }
};

const filterProducts = async(req,res) => {
    const { hideOutOfStock, sortOption } = req.body;

    let query = {};

    // Filter out of stock products
    if (hideOutOfStock) {
        query.stock = { $gt: 0 };
    }

    let products = await productSchema.find(query);

    // Sort based on the sortOption value
    switch (sortOption) {
        case "priceLowHigh":
            products = products.sort((a, b) => a.productPrice - b.productPrice);
            break;
        case "priceHighLow":
            products = products.sort((a, b) => b.productPrice - a.productPrice);
            break;
        case "averageRating":
            products = products.sort((a, b) => b.rating - a.rating);
            break;
        case "aToZ":
            products = products.sort((a, b) => a.productName.localeCompare(b.productName));
            break;
        case "zToA":
            products = products.sort((a, b) => b.productName.localeCompare(a.productName));
            break;
        case "newArrivals":
            products = products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case "popularity":
            const orders = await orderSchema.aggregate([
                { $unwind: "$items" },
                { $group: {
                    _id: "$items.productId",
                    orderCount: { $sum: "$items.quantity" } 
                }},
                { $sort: { orderCount: -1 } } 
            ]);
            // console.log("Aggregated Orders for Popularity:", orders);

            // Create a map of productId to orderCount
            const popularityMap = {};
            orders.forEach(order => {
                popularityMap[order._id] = order.orderCount;
            });

            // Sort products based on popularity
            products = products.sort((a, b) => (popularityMap[b._id] || 0) - (popularityMap[a._id] || 0));
            break;

    }

    res.json(products);
}

const search = async(req,res) => {

}

module.exports ={
    AllproductsRender,
    productDetails,
    productCategory,
    filterProducts,
    search
}