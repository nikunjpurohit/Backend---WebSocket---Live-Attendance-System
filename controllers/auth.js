const User = require('../models/user');
const {z }= require('zod');
const jwt = require('jsonwebtoken');

//define the zod schema for signup
const signupSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters long')
    .max(50, 'Name must be at most 50 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['teacher', 'student'], {
    errorMap: () => ({ message: 'Role must be either teacher or student' }),
  }),
});


const register = async (req,res) => {
    try{
        // validate request body using zod schema
        const validatedData = signupSchema.parse(req.body);
        console.log(validatedData);

        // check for existing email
        const emailExists = await User.findOne({ email: validatedData.email });
        console.log(emailExists)
        if(emailExists){
            return res.status(400).json({success : false , error: 'Email already exists' });
        }
        // create new user
        const user = await User.create(validatedData);
        console.log(user);
        return res.status(201).json({success : true , data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }, });

    }catch(error){
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message, // Returns first validation error
      });
    }

    // Catch unexpected server errors
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }

}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
})

const login = async (req,res )=>{
    try{
        //validate request body using zod schema
        const validatedData = loginSchema.parse(req.body);
        //check for existing email
        const user = await User.findOne({ email: validatedData.email });
        if(!user){
            return res.status(401).json({success : false , error: 'Invalid credentials' });
        }
        //compare passwords
        const isPasswordValid = await user.comparePassword(validatedData.password);
        if(!isPasswordValid){
            return res.status(401).json({success : false , error: 'Invalid credentials' });
        }
        //generate token
        const token = jwt.sign({userId: user._id , name: user.name, role: user.role},process.env.JWT_SECRET,{
            expiresIn: '1d',
        });
        //send response
        return res.status(200).json({success : true , data: {
        token
      }, });

    }catch(error){
        if(error instanceof z.ZodError){
            return res.status(400).json({
                success: false,
                error: error.errors[0].message,
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Invalid email or password',
        });
    }
    
}


module.exports = {
  register,
  login,
}