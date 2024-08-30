const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const upload = require('../../middleware/multer')
const fs = require('fs');



// product page rendering
const getproduct = async (req, res) => {
    try {
        const searchQuery = req.query.searchQuery || ''
        const productDetails = await productSchema.find({ productName: { $regex: searchQuery, $options: 'i' } })
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

        res.render('admin/addProduct', { title: 'Add products', searchQuery, category })
    }
    catch (err) {
        console.log(`Error in rendering addProducts page ${err}`)
    }
}


//add product form submission
const addProductPost = async (req, res) => {
    console.log('post called')
    console.log('Image details', req.files); // Check if files are being processed
    console.log('Request body', req.body)


    try {
        // Handle image uploads (assuming req.files.productImage is an array of images)
        let productImages = [];
        // if (req.files && req.files.productImage) {
        //     productImages = req.files.productImage.map(file => file.filename); // Assuming you store filenames in the database
        //     console.log('Uploaded images:', productImages);
        // }
        req.files.forEach((img) => {
            productImages.push(img.path)
        })

        // Extract form data from the request body

        const { productName, productCategory, productPrice, stock, productDescription, productDiscount } = req.body
        // const productImages = req.files;

        // Check if a product with the same name and collection already exists
        const existingProduct = await productSchema.findOne({
            productName,
            productCategory
        });

        if (existingProduct) {
            // If product exists, send an error response or flash a message
            console.log(res.locals.error, res.locals.success)
            req.flash('error', 'A product with this name already exists in the selected collection.');
            console.log('Product exists')
            return res.redirect('/admin/addProduct');
        }

        // Create a product instance
        const productDetails = new productSchema({
            productName,
            productCategory,
            productPrice,
            stock,
            productDescription,
            productDiscount,
            productImage: productImages,
            isActive: true // Assuming the product is active when first created
        });

        await productDetails.save();
        console.log("Product Added")
        req.flash('success', 'Product added successfully')

        console.log('new product saved in db')
        // Redirect to the product list page
        res.redirect('/admin/Products');
    }
    catch (err) {
        console.error(`Error in saving product: ${err}`)
    }
}

const blockProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(404).json({ message: "Product not found" })
        }
        // Find product by productId
        const product = await productSchema.findById(productId)
        if (!product) {
            return res.send(404).json({ message: "Product does not exists." })
        }

        //Mark the product as blocked
        product.isActive = false
        await product.save();
        res.status(200).json({ message: "Product marked as blocked" });

    }
    catch (err) {
        console.error(`Error in blocking product, ${err}`)
    }
}

const unblockProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find product by productId
        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product does not exist." });
        }

        // Find category by product's category name
        const category = await categorySchema.findOne({ name: product.productCategory });
        if (!category) {
            return res.status(404).json({ message: "Category does not exist." });
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
            req.flash('error', 'Cannot unblock Product under a blocked category');
            return res.status(400).json({ success: false, message: "Cannot unblock product under a blocked category" });
        }
    } catch (err) {
        console.log(`Error in unblocking product: ${err}`);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const deleteProduct = async (req, res) => {
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
        res.render('admin/editProduct', { title: 'Edit Product', category, searchQuery, product })

    }
    catch (err) {
        console.error(`Error in rendering edit Product page, ${err} `)
    }
}


const editProductPost = async (req, res) => {
    console.log('Edit product form submitted');
    try {
        console.log('Request body:', req.body);

        // Extract deletedImages from request body
        const deletedImages = JSON.parse(req.body.deletedImages || '[]');

        // Handle image deletion
        deletedImages.forEach(imagePath => {
            try {
                const absolutePath = path.resolve(__dirname, '../../uploads', imagePath); 
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath); // Delete the image from the filesystem
                } else {
                    console.warn(`Image not found: ${absolutePath}`);
                }
            } catch (error) {
                console.error(`Error deleting image: ${imagePath}`, error);
            }
        });

        // Initialize an array to hold the image filenames
        let newProductImages = [];
        if (req.files && req.files.productImage) {
            // Map through uploaded files and get their filenames
            newProductImages = req.files.productImage.map(file => file.filename);
        }
        console.log(newProductImages);

        // Extract other form data
        const { productName, productCategory, productPrice, stock, productDescription, productDiscount } = req.body;
        const productId = req.params.id;

        // Find the product by its ID
        const product = await productSchema.findById(productId);
        if (!product) {
            req.flash('error', 'Product not found.');
            console.log('Product not found');
            return res.redirect('/admin/Products');
        }

        // Prepare the updated image list
        const updatedImages = [
            ...product.productImage.filter(img => !deletedImages.includes(img)), // Keep existing images not marked for deletion
            ...newProductImages // Add new images
        ];

        // Prepare the update data
        const updateData = {
            productName,
            productCategory,
            productPrice,
            stock,
            productDescription,
            productDiscount,
            productImage: updatedImages // Update the image list
        };

        // Update the product in the database
        const updatedProduct = await productSchema.findByIdAndUpdate(productId, updateData, { new: true });

        if (!updatedProduct) {
            throw new Error('Failed to update the product.');
        }
        console.log('Updated product:', updatedProduct);
        req.flash('success', 'Product updated successfully.');
        res.redirect('/admin/Products');
    } catch (err) {
        console.log(`Error in submitting edit product form: ${err}: ${err.stack}`);
        req.flash('error', 'An error occurred while updating the product.');
        res.redirect(`/admin/editProduct/${req.params.id}`);
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
}