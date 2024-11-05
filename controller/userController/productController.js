const userSchema = require('../../model/userSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')

const AllproductsRender  = async(req,res) => {
    const searchQuery = req.query.query || ''; 

    // Retrieve non-blocked categories
    const categories = await categorySchema.find({ isBlocked: 0 });

    // Retrieve products that are active and belong to non-blocked categories
    const products = await productSchema.find({
        isActive: 1,
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



module.exports ={
    AllproductsRender,
    productDetails,
    productCategory
}