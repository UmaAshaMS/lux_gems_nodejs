const couponSchema = require('../../model/couponSchema')

const coupon = async(req,res) => {
    try{
        const searchQuery = req.query.searchQuery || ''
        const couponDetails = await couponSchema.find()
        res.render('admin/Coupon',{title:'Coupons', searchQuery, couponDetails})
    }
    catch(error){
        console.log(`Error in rendering coupon page, ${error}`)
    }
}

const addCoupon = async(req,res) => {
    try{
        const {couponCode, couponDiscount, discountType, minimumAmount, expiryDate, usageLimit  } = req.body

        if(!couponCode || !couponDiscount || !expiryDate){
           return res.status(400).json({message:'All feilds are required.'})
        }
        const isExists = await couponSchema.findOne({couponCode:couponCode})

        if(isExists){
            return res.status(400).json({message:'Coupon code already exists.'})
        }
        console.log("Coupon existence check:", isExists);

        const newCoupon = new couponSchema({
            couponCode,
            discountType,
            discount:couponDiscount,
            minimumAmount,
            expiryDate,
            usageLimit
        })

        await newCoupon.save()
        res.status(200).json({message:'New coupon added successfully!'})

    }
    catch(error){
        console.log(`Error in adding new coupon, ${error}`)
    }

}

const deleteCoupon = async(req,res) => {
    try{
        const couponId = req.params.id
        const deletedCoupon = await couponSchema.findByIdAndDelete(couponId);
        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.status(200).json({message:'Coupon deleted Successfully'})
    }
    catch(error){
        console.log(`Error in deleting coupon, ${error}`)
    }
}
module.exports = {
    coupon,
    addCoupon,
    deleteCoupon,

}