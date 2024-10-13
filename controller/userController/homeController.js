const userSchema = require('../../model/userSchema')
const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')

const home = async(req, res) => {

    const searchQuery = req.query.search || '';

    const category = await categorySchema.find({
        name: { $regex: searchQuery, $options: 'i' } // Case-insensitive search for category name
    });

    // Find products matching the search term
    const products = await productSchema.find({
        name: { $regex: searchQuery, $options: 'i' } // Case-insensitive search for product name
    });


    res.render('user/home', { title: 'Home Page' , 
    category, 
    products,
    user: req.session.user,
    })
}




module.exports = {
    home,

}