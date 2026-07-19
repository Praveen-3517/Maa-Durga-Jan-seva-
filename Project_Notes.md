# 📝 Maa Durga Jan Seva Kendra - Project Notes

Ye notes aapke "Cyber Cafe Portal & WhatsApp Chatbot" project ko samajhne ke liye banaye gaye hain. Inme shuru se lekar aakhir tak sab kuch aasan bhasha (Hinglish) me samjhaya gaya hai.

---

## 🛠️ 1. Technologies Used (Kya kya use hua hai?)

Is project ko banane me **MERN Stack** ke foundational tools ka use hua hai (bina complex database ke).

1. **HTML5**: Website ka dhacha (structure) banane ke liye. Form, buttons, aur text dikhane ka kaam yahi karta hai.
2. **CSS3**: Website ko sundar banane ke liye. Colors, layout, aur design (Styling) CSS se aati hai.
3. **JavaScript (Vanilla JS)**: Frontend (Browser) par magic karne ke liye. Jaise bina page load kiye form submit karna, ya Chatbot me message bhejna.
4. **Node.js**: Ye wo engine hai jo aapke server ko aapke computer par chalata hai. Iske bina backend nahi chal sakta.
5. **Express.js**: Ye Node.js ka ek framework hai. Iska kaam hai server ko aasan banana, API routes (jaise `/upload` ya `/submissions`) handle karna, aur website ki files ko browser tak bhejna.
6. **Multer (NPM Package)**: Iska ek hi kaam hai - **File Uploads handle karna**. Jab koi apna Aadhar card ya photo form me dalta hai, toh Multer us file ko pakad kar `uploads` folder me save kar deta hai.
7. **FS Module (File System)**: Ye Node.js ka in-built feature hai. Humne koi badi database (jaise MongoDB) use nahi ki hai. Humne `fs` ka use karke saara data `data/submissions.json` file ke andar Text/JSON format me save kiya hai.

---

## 📁 2. Folder Structure (Kis file/folder ka kya kaam hai?)

Aapke project ka dhacha kuch aesa dikhta hai:

* `server.js`: **[Backend ka Dil]** Ye aapki main backend file hai. Saara server ka logic yahi likha hai (Form data receive karna, files save karna, admin login check karna).
* `package.json`: Isme project ki details hoti hain aur ye likha hota hai ki kon kon se packages (jaise express, multer) install hain.
* `public/` (Folder): **[Frontend ki Duniya]** Isme wo saari files hain jo user browser me dekhta hai.
  * `index.html`: Main website ka page (Jisme form aur chatbot hai).
  * `app.js`: Frontend ka JavaScript jo chatbot ko chalata hai aur form data backend ko bhejta hai.
  * `styles.css`: Website ki designing.
* `data/` (Folder): **[Database ka kaam]**
  * `submissions.json`: Jitne bhi log form bharte hain, unka naam, phone number aur kaam ki details yahan save hoti hain.
  * `settings.json`: Isme Admin ka password aur dukan ki basic settings save hoti hain.
* `uploads/` (Folder): Users jo bhi files (Photo, PDF) upload karte hain, wo is folder me aakar save ho jati hain.

---

## ⚙️ 3. How it Works (Shuru se Aakhir tak process)

Jab koi customer aapki website par aata hai, toh andar hi andar ye steps hote hain:

### Step 1: Website Khulna
Jab user `localhost:3000` (ya aapki website ka link) kholta hai, toh **Express.js** `public/index.html` file ko uthakar browser me bhej deta hai.

### Step 2: Form Bharna aur Submit Karna
User form me apna Naam, Mobile no., Kaam ka details dalta hai, aur Documents upload karta hai. Phir Submit button dabata hai.
Yahan `public/app.js` (Frontend JS) action me aata hai. Ye form ka data ek "FormData" object me pack karda hai aur ek `fetch()` request ke zariye backend (`/api/upload`) ko bhej deta hai.

### Step 3: Backend me Data aana (Multer & Express)
`server.js` me baitha **Multer** sabse pehle files ko pakadta hai aur unko naya naam dekar `uploads/` folder me save kar deta hai. 
Uske baad **Express.js** baaki text data (Naam, Mobile) ko pakadta hai.

### Step 4: Data Save hona (JSON Database)
Ab server us text data aur file ke raste (path) ko uthata hai, aur use `data/submissions.json` file me likh (save) deta hai taki wo future ke liye surakshit rahe. Server frontend ko wapas "Success" ka message bhejta hai.

### Step 5: Admin Panel dekhna
Jab aap (Maa Durga Jan Seva Kendra) apne admin panel me jate hain, toh server usi `submissions.json` file ko padhta hai aur saara data aapko table ke roop me dikha deta hai.

### Step 6: Chatbot Simulator
Jo Chatbot website me right side me hai, wo poori tarah se `public/app.js` se chalta hai. Jab user kuch likhta hai, toh JavaScript us text me keywords dhoondhti hai (jaise "address", "time", "photo"). Keyword milne par wo pehle se likha hua jawab (pre-defined response) wapas dikha deti hai. Ye backend par nahi jata, ye browser me hi fast kaam karta hai!
