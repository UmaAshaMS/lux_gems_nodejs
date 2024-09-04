const userSchema = require('../../model/userSchema')
const categorySchema = require('../../model/categorySchema')


const home = async(req, res) => {
    const category = await categorySchema.find();

    res.render('user/home', { title: 'Home Page' , category, user: req.session.user})
}

const profile = async(req,res) => {
    const category = await categorySchema.find();
    res.render('user/profile', {title: 'User Profile', category, user: req.session.user})
}

const address = async(req,res) => {
    const category = await categorySchema.find();
    res.render('user/address', {title:' Add Address', category, user: req.session.user})
}

module.exports = {
    home,
    profile,
    address,
}