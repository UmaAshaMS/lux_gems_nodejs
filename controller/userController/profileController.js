const userSchema = require('../../model/userSchema')
const categorySchema = require('../../model/categorySchema')

const profile = async(req,res) => {
    const userID = req.session.user;
    const category = await categorySchema.find();
    const defaultAddress = await userSchema.findOne({_id:userID},{address:1, _id:0})
    let address = null;
    // Check if defaultAddress exists and has an address field with at least one entry
    if (defaultAddress && defaultAddress.address && defaultAddress.address.length > 0) {
        address = defaultAddress.address[0]; 
    }
    
    // const address = await userSchema.findOne({_id:userID},{address:1, _id:0})

    res.render('user/profile', {title: 'User Profile', category, address,user: req.session.user})
}

const address = async(req,res) => {
    const category = await categorySchema.find();
    let address = null
    const userID = req.session.user
    try{
        const userData = await userSchema.findOne({_id: userID}, {address : 1})
        if(userData.address.length>0)
        address = userData.address
    }
    catch(error){
        console.log("Error in fetching address:", error)
    }
    
    res.render('user/address', {title:' Add Address', category, user: req.session.user,address})
}

const addAddress = async(req,res) => {
    const userID = req.session.user
    try {
        const { fullName, phoneNumber, email, addressLine1, addressLine2, city, pincode, state, country } = req.body;
        console.log('Form details in adding address', req.body.fullName)

        const user = await userSchema.findOne({_id:userID})

        console.log("..........................")
        console.log(user)

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

        user.address.push(newAddress)
        // Save the address to the database
        await user.save();
    
        req.flash('success','New Address added successfully')
        res.status(200).json({ message: 'Address added successfully' });
        console.log('New Address added successfully')
      } 
      catch (error) {
        req.flash('error','Failed to add address')
        console.log(`Failed to add address , error: ${error}`)
        res.status(500).json({ message: 'An error occured while adding address' });
      }
    }

const deleteAddress = async(req,res) => {
    try{
        const index = parseInt(req.params.index, 10)
        const userID = req.session.user 
        const user = await userSchema.findOne({_id:userID},{address:1})
        console.log('===============================================================')
        console.log(user)
        user.address.splice(index,1)
        await user.save()
        res.status(200).json({ message: 'Address deleted successfully' });

    }
    catch(error){
        console.log(`Error in deleting address : ${error}`)
        res.status(500).json({ error: 'An error occurred while deleting the address' });
        
    }
}


module.exports = {
    profile,
    address,
    addAddress,
    deleteAddress,
}