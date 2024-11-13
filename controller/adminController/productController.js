const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const upload = require('../../middleware/multer')
const fs = require('fs');
const path = require('path');

const {ObjectId} = require('mongodb');
const { productCategory } = require('../userController/productController');



// product page rendering
const getproduct = async (req, res) => {
    try {
        const searchQuery = req.query.searchQuery || ''
        const productDetails = await productSchema.find({ productName: { $regex: searchQuery, $options: 'i' } }).populate('productCategory', 'name'); 
        if (productDetails.length === 0) {
            console.log('No product found')
        }
        res.render('admin/Products', { title: 'Products', searchQuery, products: productDetails })
    }
    catch (err) {
        console.log(`Error in rendering Product page ${err}`)
    }
}

//add product page rendering
const addProduct = async (req, res) => {
    // console.log("Add product form")
    try {
        const searchQuery = req.query.searchQuery || ''
        const category = await categorySchema.find({ isBlocked: false })
        res.render('admin/addProduct', { title: 'Add products', searchQuery,category})
    }
    catch (err) {
        console.log(`Error in rendering addProducts page ${err}`)
    }
}


//add product form submission
const addProductPost = async (req, res) => {
    req.body.productCategory = new ObjectId(req.body.productCategory)

    try {
        // Handle image uploads (assuming req.files.productImage is an array of images)
        let productImages = [];
        
        req.files.forEach((img) => {
            productImages.push(img.path)
        })

        const { productName, productCategory, productPrice, stock, productDescription, productDiscount } = req.body
        // const productImages = req.files;

        const category = await categorySchema.findOne({_id: new ObjectId(productCategory) });
        if (!category) {
            return res.status(400).json({ success: false, message: 'Selected category does not exist.' });
        }

        // Check if a product with the same name and collection already exists
        const existingProduct = await productSchema.findOne({
            productName,
            productCategory
        });
        if (existingProduct) {
            return res.status(400).json({ success: false, message: 'A product with this name already exists in the selected category.' });
        }

        // Create a product instance
        const productDetails = new productSchema({
            productName,
            productCategory : category._id,
            productPrice,
            stock,
            productDescription,
            productDiscount,
            productImage: productImages,
            isActive: true // Assuming the product is active when first created
        });

        await productDetails.save();
        return res.status(200).json({ success: true, message: 'New Product Added' });

    }
    catch (err) {
        console.error(`Error in saving product: ${err}`)
        return res.status(500).json({ success: false, message: 'An error occurred while saving the product.' });
    }
}

const blockProduct = async (req, res) => {
    req.body.productCategory = new ObjectId(req.body.productCategory)
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(400).json({success:false, message: "Product not found" })
        }
        // Find product by productId
        const product = await productSchema.findById(productId)
        if (!product) {
            return res.status(400).json({success:false, message: "Product does not exists." })
        }

        //Mark the product as blocked
        product.isActive = false
        await product.save();
        res.status(200).json({success:true, message: "Product marked as blocked" });

    }
    catch (err) {
        console.error(`Error in blocking product, ${err}`)
        res.status(500).json({ success: false, message: "Error in blocking product" });

    }
}

const unblockProduct = async (req, res) => {
    req.body.productCategory = new ObjectId(req.body.productCategory)
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(404).json({success:false, message: 'Product not found' });
        }

        // Find product by productId
        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({success:false, message: "Product does not exist." });
        }

        // Find category by product's category name
        const category = await categorySchema.findOne({ _id: new ObjectId(product.productCategory) });
        if (!category) {
            return res.status(404).json({success:false, message: "Category does not exist." });
        }

        // console.log('Category of the product selected: ', category.name);
        // console.log('Block status of the category:', category.isBlocked);

        // Mark the product as unblocked if the category is not blocked
        if (!category.isBlocked) {
            product.isActive = true;
            await product.save();
            return res.status(200).json({ success: true, message: "Product marked as Unblocked" });
        } else {
            console.log('Cannot unblock Product under a blocked category');
            return res.status(400).json({ success: false, message: "Cannot unblock product under a blocked category" });
        }
    } catch (err) {
        console.log(`Error in unblocking product: ${err}`);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const deleteProduct = async (req, res) => {
    req.body.productCategory = new ObjectId(req.body.productCategory)
    console.log('Req for delete')
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.send.status(404).json({ message: 'Product not found' })
        }
        //find product by productId
        const product = await productSchema.findByIdAndDelete(productId)
        if (!product) {
            res.send(404).json({ message: 'Product does not exists.' })
        }
        //respond as roduct deleted
        return res.status(200).json({ message: 'Product deleted.' })
    }
    catch (err) {
        console.log(`Error : ${err}`)
    }
}

const editProduct = async (req, res) => {
    try {
        const searchQuery = req.query.searchQuery || ''
        const category = await categorySchema.find({ isBlocked: false })
        const productId = req.params.id
        const product = await productSchema.findById(productId)

        if (!product) {
            return res.status(404).render('admin/Products', { message: 'Product not found' });
        }
        res.render('admin/editProduct', { title: 'Edit Product', category, searchQuery, product, productId })

    }
    catch (err) {
        console.error(`Error in rendering edit Product page, ${err} `)
    }
}

const editProductPost = async (req, res) => {
    try {

        let newProductImages = [];
        if (req.files && req.files.productImage) {
            // Map through uploaded files and get their filenames
            newProductImages = req.files.productImage.map(file => file.filename);
        }

        console.log('New images : ', newProductImages)
        console.log('req.files', req.files)

        // Extract other form data
        const { productName, productCategory, productPrice, stock, productDescription, productDiscount } = req.body;
        console.log('Req. body : ', req.body)
        const productId = req.params.id;

        // Find the product by its ID
        const product = await productSchema.findById(productId);
        if (!product) {
            console.log('Product not found');
            return res.status(400).json({success : false, message:'Product not found'});
        }

        // Fetch the category using productCategory from the form
        const category = await categorySchema.findOne({ _id: productCategory });
        console.log(category)
        if (!category) {
            return res.status(400).json({success: false, message:'Category not found'});
        }

        // Prepare the updated image list
        const updatedImages = [
            ...product.productImage,
            ...newProductImages 
        ];

        console.log('Updtaed Images : ',updatedImages)

        // Prepare the update data
        const updateData = {
            productName,
            productCategory: category._id, 
            productPrice,
            stock,
            productDescription,
            productDiscount,
            productImage: updatedImages 
        };
        console.log('updtae data', updateData)

        // Update the product in the database
        const updatedProduct = await productSchema.findByIdAndUpdate(productId, updateData, { new: true });
        console.log(updatedProduct)

        if (!updatedProduct) {
            throw new Error('Failed to update the product.');
        }
        res.status(200).json({success:true, message:'Product updated'});
    } catch (err) {
        console.error(`Error in submitting edit product form: ${err}`);
        res.status(200).json({success : false, message:'Product not updated'});
    }
};

const deleteImage = async (req, res) => {
    console.log('Reached delete image');
    try {
        let { imagePath, productId } = req.body;
        imagePath = imagePath.replace(/\//g, '\\');


        const normalizedImagePath = path.posix.normalize(imagePath); 

        const product = await productSchema.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Convert backend paths to Windows format for comparison
        const productImages = product.productImage.map(img => path.win32.normalize(img));

        // console.log("Frontend Image Path (Normalized):", normalizedImagePath);
        // console.log("Backend Image Paths (Normalized):", productImages);

        // Check if the normalized image path exists in the array
        const imageExists = productImages.includes(normalizedImagePath);

        if (!imageExists) {
            return res.status(404).json({ success: false, message: 'Image not found in product' });
        }

        // Filter out the matching image
        product.productImage = product.productImage.filter(img => path.win32.normalize(img) !== normalizedImagePath);

        await product.save();
        console.log('Updated product after image deletion:', product);

        return res.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    getproduct,
    addProduct,
    addProductPost,
    editProduct,
    editProductPost,
    blockProduct,
    unblockProduct,
    deleteProduct,
    deleteImage,
}