const userSchema = require('../../model/userSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')

const AllproductsRender  = async(req,res) => {
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
        user})
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
            return res.status(404).send('Product not found');
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

const productCategory = async(req,res) => {
    try{
    const categoryId = req.params.id
    const category = await categorySchema.find()

    const categorySam = await categorySchema.findById(categoryId)
    if(!category){
        return res.status(404).send('Category not found');
    }

    const products = await productSchema.find({ productCategory: categorySam._id });
    const user = req.session.user || null;

    
        res.render('user/AllProducts',{title:'Products', 
        category,
        categorySam,
        product: products,
        user})
    }
    catch(err){
        console.error('Error:' , err)
    }
}


module.exports ={
    AllproductsRender,
    productDetails,
    productCategory
}