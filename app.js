const express=require('express')
const bcrypt=require('bcrypt')
const userModel=require('./models/user')
const postModel=require('./models/post')
const jwt=require('jsonwebtoken')
const cookie=require('cookie-parser')
const cookieParser = require('cookie-parser')
const app=express();
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.set("view engine", "ejs")


app.get('/', (req, res)=>{
    res.render("index")
})

app.get('/login', (req, res)=>{
    res.render("login")
})

app.post('/login', async(req, res)=>{
    let {email, password}=req.body;
    let user=await userModel.findOne({email})
    if(!user) return res.status(400).send("Something went wrong");

    bcrypt.compare(password, user.password, (err, result)=>{
        if(result) {
            let token=jwt.sign({email:email, userid:user._id}, "secreeetkeyrandomm")
            res.cookie("token", token)
            res.status(200).redirect('/profile')
        
        }
            else res.redirect('/login')
    })
})

app.get('/logout', (req, res)=>{
    res.cookie("token", "");
    res.redirect('/login')
})
app.get('/profile', isLoggedIn, async(req, res)=>{
    if(req.user){
        let user=await userModel.findOne({email:req.user.email}).populate("posts")
        
        console.log(user)
        res.render("profile", {user})
    }
    
})

function isLoggedIn(req, res, next){
    if(req.cookies.token==="") res.redirect("/login")
        else{
    let data=jwt.verify(req.cookies.token, "secreeetkeyrandomm")
    req.user=data;
    }
    next();
}

app.post('/register', async(req, res)=>{
    let {username, name, email, password, age}=req.body;
     let user=await userModel.findOne({email})
     if(user) return res.status(500).send("user Already exists with this email id!")
        if(!email || !name || !password || !username || !age){
            res.redirect('/')

            bcrypt.genSalt(10, (err, salt)=>{
                bcrypt.hash(password, salt, async(err, result)=>{
                   let user=await userModel.create({username, name, email, password:result, age})
        
                   let token=jwt.sign({email:email, userid:user._id}, "secreeetkeyrandomm");
                   res.cookie("token", token);
                   res.send("User Registered Sucessfully")
                   
                   console.log(user)
                })
            })
        }
   

})

app.post('/post', isLoggedIn, async(req, res)=>{
    let user=await userModel.findOne({email:req.user.email})
    let {content}=req.body;
    let post=await postModel.create({
        user:user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile')
})

app.get('/like/:id',isLoggedIn, async (req, res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user")
    
    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1)
    }
    await post.save()
    res.redirect("/profile")
})

app.get('/edit/:id', isLoggedIn, async(req, res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user")
    res.render("edit", {post})
})

app.post('/edit/:id', isLoggedIn, async(req, res)=>{
    let post=await postModel.findOneAndUpdate({_id:req.params.id}, {content:req.body.content})
    res.redirect("/profile")
})
app.listen(3000, (req, res)=>{
    console.log("It's working")
})