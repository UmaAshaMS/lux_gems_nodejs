const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')
const mongoose = require('mongoose')

const category = async (req, res) => {
    try {

        const searchQuery = req.query.searchQuery || ''
        const categoryDetails = await categorySchema.find({ name: { $regex: searchQuery, $options: 'i' } })
        if (categoryDetails.length === 0) {
            console.log('No category found')
        }
        res.render('admin/Category', { title: 'Category', categoryDetails, searchQuery })

    }
    catch (err) {
        console.log(`Error in rendering Category page ${err}`)
    }
}

const getCategoryDetails = async (req, res) => {
    try {
        const category = await categorySchema.findById(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json(category);
    } catch (err) {
        console.error(`Error fetching category details: ${err}`);
        res.status(500).json({ message: "Server Error" });
    }
};

const addCategory = async (req, res) => {
    try {
        const { categoryName } = req.body;

        const existingCategory = await categorySchema.findOne({ 
            name: { $regex: new RegExp(`^${categoryName}$`, 'i') } // 'i' for case-insensitive search
        });

        if (existingCategory) {
            // If the category exists, return an error response or handle it as needed
            return res.redirect('/admin/category');
        }
        // Save the new category to the database
        const newCategory = new categorySchema({
            name: categoryName
        });
        await newCategory.save();

        // Redirect back to the category page or send a success response
        res.redirect('/admin/category');
    } catch (err) {
        console.log(`Error in adding category: ${err}`);
        req.flash('error', 'Server Error');
        res.redirect('/admin/category');
    }

};

// Edit category
const editCategory = async (req, res) => {
    try {
        // Destructure the name from request body and trim whitespace
        const { name } = req.body;
        
        // Check if the category name is valid
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: "Category name is required and cannot be empty" });
        }

        // Check if the name contains numbers
        const containsNumber = /\d/.test(name);
        if (containsNumber) {
            return res.status(400).json({ success: false, message: "Category name should not contain numbers" });
        }

        const formattedName = name.trim();

        // Find the category by ID
        const category = await categorySchema.findById(req.params.id);
        
        // If category is not found, return 404
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check if the new name already exists
        const existingCategory = await categorySchema.findOne({
            name: { $regex: new RegExp("^" + formattedName + "$", "i") } // case-insensitive regex
        });

        // If the new name exists, return 400 error
        if (existingCategory && existingCategory._id.toString() !== category._id.toString()) {
            return res.status(400).json({ success: false, message: "Category name already exists" }); 
        }

        // Update the category name
        category.name = formattedName;
        await category.save();
        
        // Return success message
        return res.status(200).json({ success: true, message: "Category updated successfully" });

    } catch (err) {
        console.error(`Error in editing category: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};


const blockCategory = async (req, res) => {
    try {
        const categoryID = req.params.id;
        if (!categoryID) {
            return res.status(404).json({ message: "Category ID not found" });
        }

        // Convert categoryID to ObjectId
        const objectIdCategoryID = new mongoose.Types.ObjectId(categoryID);

        // Find the category by ID
        const category = await categorySchema.findById(objectIdCategoryID);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Mark the category as blocked
        category.isBlocked = true

        const products = await productSchema.find({ productCategory: objectIdCategoryID  });
        console.log(`Products found for category: ${products.length}`); 

        // Also block all products associated with this category
        const updateResult = await productSchema.updateMany(
            { productCategory: objectIdCategoryID }, 
            { $set: { isActive: false } }  
        );

        // console.log(`Products blocked: ${updateResult.modifiedCount}`); 

        await category.save();

        res.status(200).json({ message: "Category marked as blocked" });
    } catch (err) {
        console.error(`Error blocking category: ${err}`);
        res.status(500).json({ message: "Server Error" });
    }
};

const unblockCategory = async (req, res) => {
    try {
        const categoryID = req.params.id;
        if (!categoryID) {
            return res.status(404).json({ message: "Category ID not found" });
        }

        // Find the category by ID
        const category = await categorySchema.findById(categoryID);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Mark the category as unblocked
        category.isBlocked = false
        await category.save();

        // Also unblock all products associated with this category
        const updateResult = await productSchema.updateMany(
            { productCategory: categoryID },  
            { $set: { isActive: true } }  
        );

        res.status(200).json({ message: "Category marked as Unblocked" });
    } catch (err) {
        console.error(`Error unblocking category: ${err}`);
        res.status(500).json({ message: "Server Error" });
    }
}


const deleteCategory = async (req, res) => {
    try {
        const categoryID = req.params.id;
        if (!categoryID) {
            return res.status(400).json({ message: "Category ID not provided" });
        }

        const deletedCategory = await categorySchema.findByIdAndDelete(categoryID);
        console.log(deletedCategory)

        if (!deletedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        return res.status(200).json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error(`Error deleting category: ${err}`);
        return res.status(500).json({ message: "Server Error" });
    }
};







module.exports = {
    category,
    getCategoryDetails,
    addCategory,
    editCategory,
    blockCategory,
    unblockCategory,
    deleteCategory,
}