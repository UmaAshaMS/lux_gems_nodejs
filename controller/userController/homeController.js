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

const addAddress = async(req,res) => {
    console.log('----------------------------------------')
    try {
        console.log('Reached add address post...........')


        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;
        console.log('Form details in adding address', req.body.fullName)

        const user = await userSchema.findOne(req.session.user)
        console.log('Session user : ', req.session.user)

        
        const newAddress = {
          fullName,
          phoneNumber,
          email,
          addressLine1,
          addressLine2,
          city,
          pincode,
          state,
          country,
        };

        console.log('CONSOLING NEW ADDRESS FROM THE FORM : ',newAddress)
    
        user.address.push(newAddress)
        // Save the address to the database
        await user.save();
    
        req.flash('success','New Address added successfully')
        console.log('New Address added successfully')
      } 
      catch (error) {
        req.flash('error','Failed to add address')
        console.log(`Failed to add address , error: ${error}`)
      }
    }

module.exports = {
    home,
    profile,
    address,
    addAddress,
}