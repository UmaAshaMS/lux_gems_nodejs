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

const couponID = async(req,res) => {
    try{
        const couponID = req.params.id;
        const coupon = await couponSchema.findById(couponID);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json(coupon); // Send the coupon data as JSON
    }
    catch(error){
        console.log(`Error in getting coupon based on ID, ${error}`)
    }
}

const addCoupon = async(req,res) => {
    try{
        const {couponCode, couponDiscount, discountType, minimumAmount, expiryDate, usageLimit  } = req.body


        if(!couponCode || !couponDiscount || !expiryDate || minimumAmount < 0 || minimumAmount == null || isNaN(minimumAmount)){
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

const editCoupon = async(req,res) => {
    try{
        const couponID = req.params.id
        const { couponCode, couponDiscount, discountType, minimumAmount, expiryDate, usageLimit } = req.body;

        // Find the coupon by ID
        const coupon = await couponSchema.findById(couponID);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Update the coupon's fields with the new data
        coupon.couponCode = couponCode || coupon.couponCode;
        coupon.discountType = discountType || coupon.discountType;
        coupon.discount = couponDiscount || coupon.discount;
        coupon.minimumAmount = minimumAmount >= 0 ? minimumAmount : coupon.minimumAmount;
        coupon.expiryDate = expiryDate || coupon.expiryDate;
        coupon.usageLimit = usageLimit || coupon.usageLimit;

        // Save the updated coupon
        await coupon.save();
        res.status(200).json({ message: 'Coupon updated successfully!' });
    }
    catch(error){
        console.log(`Error in editing coupon,${error}`)
    }
}

const blockCoupon = async(req,res) => {
    try{

    }
    catch(error){
        console.log(`Error in blocking coupon, ${error}`)
    }
}

const unblockCoupon = async(req,res) => {
    try{

    }
    catch(error){
        console.log(`Error in unblocking coupon,${error}`)
    }
}
module.exports = {
    coupon,
    couponID,
    addCoupon,
    deleteCoupon,
    editCoupon,
    blockCoupon,
    unblockCoupon

}