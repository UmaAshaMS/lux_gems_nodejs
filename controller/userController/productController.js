const userSchema = require('../../model/userSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')
const mongoose = require('mongoose');

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


const AllproductsRender  = async(req,res) => {
    const searchQuery = req.query.query ? escapeRegex(req.query.query) : ''; 
    const categoryId = req.query.category || '';
    const page = parseInt(req.query.page) || 1; 
    const itemsPerPage = 8;
    const filterQuery = {};  

    // Retrieve non-blocked categories
    const categories = await categorySchema.find({ isBlocked: 0 });

    if (categoryId) {
        filterQuery.productCategory = categoryId;  // Filter by category
    }

    const totalProducts = await productSchema.countDocuments({
        isActive: 1,
        productName: { $regex: searchQuery, $options: 'i' },
        ...filterQuery
    });

    // Retrieve products that are active and belong to non-blocked categories
    const products = await productSchema.find({
        isActive: 1,
        productName: { $regex: searchQuery, $options: 'i' }
        // productCategory: { $in: validCategoryIds }
    }).skip((page - 1) * itemsPerPage)  
    .limit(itemsPerPage);

    const totalPages = Math.ceil(totalProducts / itemsPerPage);


    // Retrieve user from the session, or set to null if not present
    const user = req.session.user || null;
 
    try{
        res.render('user/AllProducts',{title:'Products', 
        category: categories,
        product: products,
        user,
        searchQuery,
        categoryId,
        currentPage: page,  
        totalPages: totalPages, 
        totalProducts: totalProducts
        
    })
    }
    catch(err){
        console.error('Error:' , err)
    }
} 

const productDetails = async (req,res) => {
    const category = await categorySchema.find()
    const user = req.session.user || null;
    const productID = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productID)) {
        return res.status(404).render('pageNotFound', { title: 'Page Not Found' });
    }

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
        const page = parseInt(req.query.page) || 1; 
        const searchQuery = req.query.query ? escapeRegex(req.query.query) : ''; 

    const itemsPerPage = 8;
    const filterQuery = {};
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(404).render('pageNotFound', { title: 'Page Not Found' });
        }

        const category = await categorySchema.find();
        const totalProducts = await productSchema.countDocuments({
            isActive: 1,
            productName: { $regex: searchQuery, $options: 'i' },
            ...filterQuery
        });

        const totalPages = Math.ceil(totalProducts / itemsPerPage);


        const categorySam = await categorySchema.findById(categoryId);

        if (!categorySam) {
            return res.status(404).render('pageNotFound',{ title: 'Page Not Found'})
        }

        const products = await productSchema.find({ 
            productCategory: categorySam._id,
            isActive: true,
        }).skip((page - 1) * itemsPerPage)  
        .limit(itemsPerPage);

        const user = req.session.user || null;

        res.render('user/AllProducts', {
            title: 'Products',
            category, 
            categorySam,
            product: products,
            user,
            categoryId,
            currentPage: page,  
            totalPages: totalPages, 
            totalProducts: totalProducts,
            searchQuery

        });
    } catch (err) {
        console.error('Error in loading category-wise products:', err);
        res.status(500).send('Internal Server Error'); // Send error response to client
    }
};

const filterProducts = async(req,res) => {
    const { hideOutOfStock, sortOption, categoryId } = req.body;

    let query = {isActive: true};

    // Filter out of stock products
    if (hideOutOfStock) {
        query.stock = { $gt: 0 };
    }
    if (categoryId) {
        query.productCategory = categoryId; 
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



module.exports ={
    AllproductsRender,
    productDetails,
    productCategory,
    filterProducts,
}